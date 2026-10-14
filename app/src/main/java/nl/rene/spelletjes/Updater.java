package nl.rene.spelletjes;

import android.app.PendingIntent;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.Arrays;
import java.util.UUID;

/**
 * Updates from a public online location:
 *  - game content (index.html) is downloaded and used automatically,
 *  - a new app build (APK) is offered for installation when native code changed.
 */
final class Updater {
    static final String BASE = "https://raw.githubusercontent.com/renevanes/renes-spelletjes/main/";
    /** Raise this whenever Java code or the manifest changes, so a new APK is required. */
    static final int NATIVE_LEVEL = 10;
    /** Public half of the update-signing key (ECDSA P-256). Web updates without a valid signature are refused. */
    private static final String UPDATE_KEY = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5ruxwDdUwyAvzGhij5dg1uGHwqGWmKXZUuHnIChMYbcMpyc7XG/fJbne/KgqSgnZLcEplJZnpV1ykItelb6JaQ==";
    private static final String HOST = "raw.githubusercontent.com";
    private static final int MAX_JSON = 64 * 1024, MAX_WEB = 8 * 1024 * 1024, MAX_APK = 60 * 1024 * 1024;
    static final String ACTION_INSTALL_STATUS = "nl.rene.spelletjes.INSTALL_STATUS";

    private final MainActivity act;
    private final SharedPreferences prefs;
    private volatile String apkPath = null;
    private volatile boolean busy = false;

    Updater(MainActivity a) {
        act = a;
        prefs = a.getSharedPreferences("updates", 0);
    }

    @SuppressWarnings("deprecation")
    long installedCode() {
        try {
            PackageInfo pi = act.getPackageManager().getPackageInfo(act.getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
        } catch (PackageManager.NameNotFoundException e) {
            return 0;
        }
    }

    private File webFile() { return new File(new File(act.getFilesDir(), "web"), "index.html"); }
    long webCode() { return prefs.getLong("webCode", 0); }
    /** Where in-app feedback is sent (announced in update.json, so it can be set up or changed without a new APK). */
    String feedbackUrl() { return prefs.getString("feedbackUrl", null); }
    void rememberFeedbackUrl(JSONObject o) {
        String fb = o.optString("feedbackUrl", "");
        if (fb.startsWith("https://") && fb.length() < 300) prefs.edit().putString("feedbackUrl", fb).apply();
        else if (o.has("feedbackUrl")) prefs.edit().remove("feedbackUrl").apply();
    }
    /** Fetch update.json just to learn the feedback address (used when it is not known yet). */
    void loadFeedbackUrl() {
        try { rememberFeedbackUrl(new JSONObject(new String(get(BASE + "update.json?t=" + System.currentTimeMillis(), null, MAX_JSON), StandardCharsets.UTF_8))); } catch (Exception ignored) {}
    }
    /** Forget the downloaded web bundle (used when it keeps crashing): the built-in version is used again. */
    void dropWeb() { webFile().delete(); prefs.edit().remove("webCode").remove("webSig").apply(); }
    long currentCode() { return Math.max(installedCode(), webCode()); }

    /** Downloaded game content, or null to use the version inside the app. */
    String loadHtml() {
        File f = webFile();
        if (!f.exists()) return null;
        if (webCode() <= installedCode()) {           // the installed app is newer: drop the old download
            f.delete();
            prefs.edit().remove("webCode").apply();
            return null;
        }
        try (InputStream in = new FileInputStream(f)) {
            byte[] html = readAll(in, -1, null, MAX_WEB);
            if (!verify(html, prefs.getString("webSig", ""))) throw new SecurityException("signature");
            return new String(html, StandardCharsets.UTF_8);
        } catch (Exception e) {
            f.delete();                                   // damaged or tampered: fall back to the built-in game
            prefs.edit().remove("webCode").remove("webSig").apply();
            return null;
        }
    }

    void setMode(String m) { prefs.edit().putString("mode", m).apply(); }
    @SuppressWarnings("deprecation")
    boolean shouldAutoCheck() {
        String mode = prefs.getString("mode", "auto");
        if ("manual".equals(mode)) return false;
        if ("wifi".equals(mode)) {
            try { android.net.ConnectivityManager cm = (android.net.ConnectivityManager) act.getSystemService(android.content.Context.CONNECTIVITY_SERVICE); if (cm == null || cm.isActiveNetworkMetered()) return false; } catch (Exception e) { return false; }
        }
        return System.currentTimeMillis() - prefs.getLong("lastCheck", 0) > 30 * 60 * 1000L;
    }

    void check(final boolean manual) {
        if (busy) return;
        busy = true;
        new Thread(() -> {
            try {
                prefs.edit().putLong("lastCheck", System.currentTimeMillis()).apply();
                JSONObject o = new JSONObject(new String(get(BASE + "update.json?t=" + System.currentTimeMillis(), null, MAX_JSON), StandardCharsets.UTF_8));
                rememberFeedbackUrl(o);
                long code = o.getLong("versionCode");
                String name = o.optString("versionName", "");
                String notes = o.optString("notes", "");
                if (code <= currentCode()) {
                    if (manual) act.js("window.onUpdate&&onUpdate({type:'none'})");
                    return;
                }
                if (o.optInt("nativeLevel", 1) > NATIVE_LEVEL) {
                    apkPath = safePath(o.getString("apk"));
                    act.js("window.onUpdate&&onUpdate({type:'apk',name:" + JSONObject.quote(name) + ",notes:" + JSONObject.quote(notes) + "})");
                    return;
                }
                byte[] html = get(BASE + safePath(o.getString("web")) + "?v=" + code, null, MAX_WEB);
                if (!sha256(html).equalsIgnoreCase(o.optString("webSha256", ""))) throw new Exception("checksum");
                String sig = o.optString("webSig", "");
                if (!verify(html, sig)) throw new SecurityException("signature");
                File f = webFile();
                f.getParentFile().mkdirs();
                File tmp = new File(f.getParentFile(), "index.tmp");
                try (OutputStream out = new FileOutputStream(tmp)) { out.write(html); }
                if (!tmp.renameTo(f)) throw new Exception("rename");
                prefs.edit().putLong("webCode", code).putString("webSig", sig).apply();
                act.js("window.onUpdate&&onUpdate({type:'web',name:" + JSONObject.quote(name) + ",notes:" + JSONObject.quote(notes) + "})");
            } catch (Exception e) {
                if (manual) act.js("window.onUpdate&&onUpdate({type:'error'})");
            } finally {
                busy = false;
            }
        }).start();
    }

    void installApk() {
        final String path = apkPath;
        if (path == null || busy) return;
        PackageManager pm = act.getPackageManager();
        if (Build.VERSION.SDK_INT >= 26 && !pm.canRequestPackageInstalls()) {
            act.js("window.onUpdateProgress&&onUpdateProgress(-2)");
            act.runOnUiThread(() -> act.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + act.getPackageName()))));
            return;
        }
        busy = true;
        new Thread(() -> {
            try {
                byte[] apk = get(BASE + path + "?t=" + System.currentTimeMillis(), this::progress, MAX_APK);
                if (!sameApp(apk)) throw new SecurityException("apk");
                String token = UUID.randomUUID().toString();
                prefs.edit().putString("installToken", token).apply();
                PackageInstaller pi = pm.getPackageInstaller();
                PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                params.setAppPackageName(act.getPackageName());
                if (Build.VERSION.SDK_INT >= 31) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
                int id = pi.createSession(params);
                try (PackageInstaller.Session s = pi.openSession(id)) {
                    try (OutputStream out = s.openWrite("update.apk", 0, apk.length)) {
                        out.write(apk);
                        s.fsync(out);
                    }
                    Intent i = new Intent(act, MainActivity.class).setAction(ACTION_INSTALL_STATUS).putExtra("token", token);
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
                    PendingIntent p = PendingIntent.getActivity(act, 1, i, flags);
                    s.commit(p.getIntentSender());
                }
                act.js("window.onUpdateProgress&&onUpdateProgress(100)");
            } catch (Exception e) {
                act.js("window.onUpdateProgress&&onUpdateProgress(-1)");
            } finally {
                busy = false;
            }
        }).start();
    }

    private void progress(int pct) { act.js("window.onUpdateProgress&&onUpdateProgress(" + pct + ")"); }

    interface Progress { void on(int pct); }

    /** Only accept status callbacks that carry the secret of our own install session. */
    boolean validInstallToken(String t) {
        String mine = prefs.getString("installToken", null);
        return mine != null && mine.equals(t);
    }

    private static String safePath(String p) throws Exception {
        if (p == null || !p.matches("[A-Za-z0-9._/-]{1,100}") || p.contains("..") || p.startsWith("/")) throw new SecurityException("path");
        return p;
    }

    private static boolean verify(byte[] data, String sigB64) {
        try {
            if (sigB64 == null || sigB64.isEmpty()) return false;
            PublicKey key = KeyFactory.getInstance("EC").generatePublic(new X509EncodedKeySpec(android.util.Base64.decode(UPDATE_KEY, android.util.Base64.DEFAULT)));
            Signature v = Signature.getInstance("SHA256withECDSA");
            v.initVerify(key); v.update(data);
            return v.verify(android.util.Base64.decode(sigB64, android.util.Base64.DEFAULT));
        } catch (Exception e) {
            return false;
        }
    }

    /** The downloaded APK must be this same app, signed with the same key. */
    @SuppressWarnings("deprecation")
    private boolean sameApp(byte[] apk) {
        File f = new File(act.getCacheDir(), "check.apk");
        try {
            try (OutputStream out = new FileOutputStream(f)) { out.write(apk); }
            PackageManager pm = act.getPackageManager();
            int flag = Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
            PackageInfo a = pm.getPackageArchiveInfo(f.getPath(), flag), me = pm.getPackageInfo(act.getPackageName(), flag);
            if (a == null || !act.getPackageName().equals(a.packageName)) return false;
            android.content.pm.Signature[] sa, sm;
            if (Build.VERSION.SDK_INT >= 28) {
                if (a.signingInfo == null || me.signingInfo == null) return false;
                sa = a.signingInfo.getApkContentsSigners(); sm = me.signingInfo.getApkContentsSigners();
            } else { sa = a.signatures; sm = me.signatures; }
            return sa != null && sm != null && sa.length > 0 && Arrays.equals(sa, sm);
        } catch (Exception e) {
            return false;
        } finally {
            f.delete();
        }
    }

    private static byte[] get(String url, Progress p, int max) throws Exception {
        URL u = new URL(url);
        if (!"https".equals(u.getProtocol()) || !HOST.equals(u.getHost())) throw new SecurityException("host");
        HttpURLConnection c = (HttpURLConnection) u.openConnection();
        c.setInstanceFollowRedirects(false);
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setUseCaches(false);
        c.setRequestProperty("Cache-Control", "no-cache");
        try {
            if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
            if (c.getContentLength() > max) throw new SecurityException("size");
            try (InputStream in = c.getInputStream()) { return readAll(in, c.getContentLength(), p, max); }
        } finally {
            c.disconnect();
        }
    }

    private static byte[] readAll(InputStream in, int total, Progress p, int max) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n, done = 0, last = -1;
        while ((n = in.read(buf)) > 0) {
            out.write(buf, 0, n);
            done += n;
            if (done > max) throw new SecurityException("size");
            if (p != null && total > 0) {
                int pct = (int) (done * 100L / total);
                if (pct != last && pct < 100) { last = pct; p.on(pct); }
            }
        }
        return out.toByteArray();
    }

    private static String sha256(byte[] b) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(b);
        StringBuilder sb = new StringBuilder();
        for (byte x : d) sb.append(String.format("%02x", x));
        return sb.toString();
    }
}
