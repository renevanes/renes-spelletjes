package nl.rene.spelletjes;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.graphics.Color;
import android.graphics.Insets;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowInsets;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

public class MainActivity extends Activity {
    private static final int FELT = Color.parseColor("#0f3d2a");
    private WebView web;
    private OnBackInvokedCallback backCallback;
    Updater updater;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        updater = new Updater(this);

        // Root container paints behind the status/navigation bars (edge-to-edge on Android 15+)
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(FELT);
        getWindow().getDecorView().setBackgroundColor(FELT);
        if (Build.VERSION.SDK_INT < 35) {
            getWindow().setStatusBarColor(FELT);
            getWindow().setNavigationBarColor(Color.parseColor("#0c2e20"));
        }

        web = new WebView(this);
        web.setBackgroundColor(FELT);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        // hardening: the game only needs its own bundled page (assets stay readable)
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setGeolocationEnabled(false);
        s.setSaveFormData(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= 26) s.setSafeBrowsingEnabled(true);
        WebView.setWebContentsDebuggingEnabled(false);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        web.setWebViewClient(new LocalOnlyClient(this));
        web.addJavascriptInterface(new Bridge(this, root), "Android");
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

        // Keep the game clear of status bar, navigation bar and camera cutout
        root.setOnApplyWindowInsetsListener(new InsetsHandler());

        if (Build.VERSION.SDK_INT >= 33) registerBack();

        loadContent();   // game state lives in localStorage, so a fresh load is always safe
        handleInstallStatus(getIntent());
        handleGameIntent(getIntent());
    }

    // ---- home-screen shortcuts: open one game directly ----
    private String pendingGame = null;
    private boolean pageReady = false;
    void pageLoaded() {
        pageReady = true;
        if (pendingGame != null) { String g = pendingGame; pendingGame = null; openGame(g); }
    }
    private void handleGameIntent(Intent intent) {
        if (intent == null) return;
        String id = intent.getStringExtra("game");
        if (!Shortcuts.validId(id)) return;          // only plain game ids ever reach the page
        intent.removeExtra("game");
        Shortcuts.used(this, id);
        if (pageReady) openGame(id); else pendingGame = id;
    }
    private void openGame(String id) { js("window.openGame&&openGame('" + id + "')"); }

    // ---- backup files via the system file picker (Drive, Downloads, ...) ----
    static final int REQ_SAVE = 41, REQ_OPEN = 42;
    private String pendingSave = null;
    void saveFile(String name, String text) {
        pendingSave = text;
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE, name);
        try { startActivityForResult(i, REQ_SAVE); } catch (Exception e) { js("window.onBackupSaved&&onBackupSaved(false)"); }
    }
    void openFile() {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
        try { startActivityForResult(i, REQ_OPEN); } catch (Exception e) { js("window.onBackupLoaded&&onBackupLoaded(null)"); }
    }
    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        final android.net.Uri uri = (res == RESULT_OK && data != null) ? data.getData() : null;
        if (req == REQ_SAVE) {
            final String text = pendingSave; pendingSave = null;
            if (uri == null || text == null) { js("window.onBackupSaved&&onBackupSaved(false)"); return; }
            new Thread(() -> {
                boolean ok = false;
                try (java.io.OutputStream out = getContentResolver().openOutputStream(uri, "wt")) { out.write(text.getBytes(java.nio.charset.StandardCharsets.UTF_8)); ok = true; } catch (Exception ignored) {}
                js("window.onBackupSaved&&onBackupSaved(" + ok + ")");
            }).start();
        } else if (req == REQ_OPEN) {
            if (uri == null) { js("window.onBackupLoaded&&onBackupLoaded(null)"); return; }
            new Thread(() -> {
                String text = null;
                try (java.io.InputStream in = getContentResolver().openInputStream(uri)) {
                    java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream(); byte[] buf = new byte[16384]; int n, tot = 0;
                    while ((n = in.read(buf)) > 0) { tot += n; if (tot > 8 * 1024 * 1024) throw new Exception("size"); bo.write(buf, 0, n); }
                    text = new String(bo.toByteArray(), java.nio.charset.StandardCharsets.UTF_8);
                } catch (Exception ignored) {}
                js("window.onBackupLoaded&&onBackupLoaded(" + (text == null ? "null" : org.json.JSONObject.quote(text)) + ")");
            }).start();
        }
    }

    /** Loads the newest game content: a downloaded update if there is one, otherwise the built-in version. */
    void loadContent() {
        String html = updater.loadHtml();
        pageReady = false;
        if (html != null) web.loadDataWithBaseURL("file:///android_asset/", html, "text/html", "utf-8", null);
        else web.loadUrl("file:///android_asset/index.html");
    }

    /** Run JavaScript in the page from any thread. */
    void js(String code) {
        runOnUiThread(() -> { if (web != null) web.evaluateJavascript(code, null); });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleInstallStatus(intent);
        handleGameIntent(intent);
    }

    @SuppressWarnings("deprecation")
    private void handleInstallStatus(Intent intent) {
        if (intent == null || !Updater.ACTION_INSTALL_STATUS.equals(intent.getAction())) return;
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -999);
        // this activity is exported: only trust status intents from our own install session
        if (!updater.validInstallToken(intent.getStringExtra("token"))) return;
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null && (confirm.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION)) == 0) startActivity(confirm);
        } else if (status != PackageInstaller.STATUS_SUCCESS) {
            js("window.onUpdateProgress&&onUpdateProgress(-1)");
        }
    }

    /** Never navigate away from the game: the JavaScript bridge must only ever be visible to our own page. */
    static final class LocalOnlyClient extends WebViewClient {
        static long lastCrash = 0;
        private final MainActivity act;
        LocalOnlyClient(MainActivity a) { act = a; }
        @Override public void onPageFinished(WebView v, String url) { act.pageLoaded(); }
        // the page's renderer crashed or was killed: start fresh instead of closing the app
        @Override public boolean onRenderProcessGone(WebView v, android.webkit.RenderProcessGoneDetail d) {
            // two crashes in a minute: the downloaded web update is probably broken, fall back to the built-in version
            long now = System.currentTimeMillis();
            if (now - lastCrash < 60_000) { try { act.updater.dropWeb(); } catch (Exception ignored) {} }
            lastCrash = now;
            act.recreate(); return true;
        }
        private boolean block(Uri u) {
            if (u != null && "file".equals(u.getScheme()) && u.getPath() != null && u.getPath().startsWith("/android_asset/")) return false;
            if (u != null && "https".equals(u.getScheme())) {
                try { act.startActivity(new Intent(Intent.ACTION_VIEW, u).addCategory(Intent.CATEGORY_BROWSABLE)); } catch (Exception ignored) {}
            }
            return true;
        }
        @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return block(r.getUrl()); }
        @Override @SuppressWarnings("deprecation") public boolean shouldOverrideUrlLoading(WebView v, String url) { return block(Uri.parse(url)); }
    }

    static final class InsetsHandler implements View.OnApplyWindowInsetsListener {
        @Override
        @SuppressWarnings("deprecation")
        public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                v.setPadding(i.left, i.top, i.right, i.bottom);
                return WindowInsets.CONSUMED;
            }
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        }
    }

    private void registerBack() {
        backCallback = this::handleBack;
        getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
    }

    private void handleBack() {
        web.evaluateJavascript("(window.appBack && window.appBack()) ? 'yes' : 'no'", value -> {
            if (value == null || !value.contains("yes")) finish();
        });
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        handleBack(); // Android 12 and older
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'))", null);
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        if (updater.shouldAutoCheck()) updater.check(false);
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null)
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        super.onDestroy();
    }

    static final class Bridge {
        private final Context ctx;
        private final MainActivity act;
        private final View root;
        Bridge(MainActivity a, View r) { act = a; root = r; ctx = a.getApplicationContext(); }

        @JavascriptInterface
        public void setShortcuts(String json) { if (json != null && json.length() < 2_000_000) Shortcuts.setDynamic(ctx, json); }

        @JavascriptInterface
        public void setUpdateMode(String m) { if ("auto".equals(m) || "wifi".equals(m) || "manual".equals(m)) act.updater.setMode(m); }

        @JavascriptInterface
        public void saveFile(String name, String text) {
            if (text == null || text.length() > 8 * 1024 * 1024) return;
            final String n = name != null && name.matches("[A-Za-z0-9 ._-]{1,60}") ? name : "backup.json";
            act.runOnUiThread(() -> act.saveFile(n, text));
        }

        @JavascriptInterface
        public void openFile() { act.runOnUiThread(act::openFile); }

        /** Send in-app feedback (JSON) to the feedback service; the answer arrives in window.onFeedbackSent(ok). */
        @JavascriptInterface
        public boolean sendFeedback(final String json) {
            if (json == null || json.length() > 20000) return false;
            new Thread(() -> {
                boolean ok = false;
                try {
                    String url = act.updater.feedbackUrl();
                    if (url == null) { act.updater.loadFeedbackUrl(); url = act.updater.feedbackUrl(); }
                    if (url != null) {
                        java.net.HttpURLConnection c = (java.net.HttpURLConnection) new java.net.URL(url).openConnection();
                        c.setRequestMethod("POST"); c.setDoOutput(true); c.setConnectTimeout(10000); c.setReadTimeout(15000);
                        c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                        c.setRequestProperty("X-App", "renes-spelletjes");
                        try (java.io.OutputStream o = c.getOutputStream()) { o.write(json.getBytes(java.nio.charset.StandardCharsets.UTF_8)); }
                        ok = c.getResponseCode() / 100 == 2;
                        c.disconnect();
                    }
                } catch (Exception ignored) {}
                act.js("window.onFeedbackSent&&onFeedbackSent(" + ok + ")");
            }).start();
            return true;
        }

        @JavascriptInterface
        public void shareText(String subject, String text) {
            if (text == null || text.length() > 100000) return;
            Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_SUBJECT, subject == null ? "" : subject).putExtra(Intent.EXTRA_TEXT, text);
            act.runOnUiThread(() -> { try { act.startActivity(Intent.createChooser(i, "Delen")); } catch (Exception ignored) {} });
        }

        @JavascriptInterface
        public boolean canPinShortcut() { return Shortcuts.canPin(ctx); }

        @JavascriptInterface
        public boolean pinShortcut(String id, String label, String png) { return Shortcuts.pin(ctx, id, label, png); }

        @JavascriptInterface
        public void keepScreenOn(boolean on) {
            act.runOnUiThread(() -> {
                if (on) act.getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else act.getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        @JavascriptInterface
        public void checkUpdates() { act.updater.check(true); }

        @JavascriptInterface
        public void installUpdate() { act.updater.installApk(); }

        @JavascriptInterface
        public void reloadContent() { act.runOnUiThread(act::loadContent); }

        @JavascriptInterface
        public String updateInfo() {
            return "{\"installed\":" + act.updater.installedCode() + ",\"web\":" + act.updater.webCode() + ",\"native\":" + Updater.NATIVE_LEVEL + "}";
        }

        @JavascriptInterface
        public void setBarColor(String hex) {
            final int c;
            try { c = Color.parseColor(hex); } catch (IllegalArgumentException e) { return; }
            act.runOnUiThread(() -> {
                root.setBackgroundColor(c);
                act.getWindow().getDecorView().setBackgroundColor(c);
                if (Build.VERSION.SDK_INT < 35) {
                    act.getWindow().setStatusBarColor(c);
                    act.getWindow().setNavigationBarColor(c);
                }
                if (Build.VERSION.SDK_INT >= 30 && act.getWindow().getInsetsController() != null) {   // dark icons on a light bar
                    boolean light = (0.299 * Color.red(c) + 0.587 * Color.green(c) + 0.114 * Color.blue(c)) > 170;
                    int f = android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                    act.getWindow().getInsetsController().setSystemBarsAppearance(light ? f : 0, f);
                }
            });
        }

        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void vibrate(int ms) {
            ms = Math.max(1, Math.min(ms, 400));          // never trust values from the page
            Vibrator v = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(Math.max(1, ms), VibrationEffect.DEFAULT_AMPLITUDE));
            else v.vibrate(ms);
        }
    }
}
