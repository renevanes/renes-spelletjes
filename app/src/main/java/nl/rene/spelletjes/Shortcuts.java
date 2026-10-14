package nl.rene.spelletjes;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/** Home-screen shortcuts that open one game directly. */
final class Shortcuts {
    private Shortcuts() {}

    static boolean validId(String id) { return id != null && id.matches("[a-z]{1,12}"); }

    static Intent launchIntent(Context ctx, String id) {
        return new Intent(ctx, MainActivity.class).setAction(Intent.ACTION_VIEW)
                .putExtra("game", id).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    }

    private static Icon icon(String pngB64) {
        if (pngB64 == null) return null;
        int i = pngB64.indexOf(',');
        byte[] b = Base64.decode(i >= 0 ? pngB64.substring(i + 1) : pngB64, Base64.DEFAULT);
        if (b.length > 512 * 1024) return null;
        Bitmap bmp = BitmapFactory.decodeByteArray(b, 0, b.length);
        if (bmp == null) return null;
        return Build.VERSION.SDK_INT >= 26 ? Icon.createWithAdaptiveBitmap(bmp) : Icon.createWithBitmap(bmp);
    }

    private static ShortcutInfo info(Context ctx, String id, String label, String png, int rank) {
        String name = label == null ? id : label.length() > 24 ? label.substring(0, 24) : label;
        ShortcutInfo.Builder b = new ShortcutInfo.Builder(ctx, "game-" + id)
                .setShortLabel(name).setLongLabel(name).setIntent(launchIntent(ctx, id)).setRank(rank);
        Icon ic = icon(png);
        if (ic != null) b.setIcon(ic);
        return b.build();
    }

    /** Long-press menu on the app icon: [{id,label,png}] in order of preference. */
    static void setDynamic(Context ctx, String json) {
        if (Build.VERSION.SDK_INT < 25) return;
        try {
            ShortcutManager sm = ctx.getSystemService(ShortcutManager.class);
            if (sm == null) return;
            JSONArray a = new JSONArray(json);
            int max = Math.min(sm.getMaxShortcutCountPerActivity(), 4);
            List<ShortcutInfo> list = new ArrayList<>();
            for (int i = 0; i < a.length() && list.size() < max; i++) {
                JSONObject o = a.getJSONObject(i);
                String id = o.optString("id");
                if (!validId(id)) continue;
                list.add(info(ctx, id, o.optString("label"), o.optString("png", null), list.size()));
            }
            sm.setDynamicShortcuts(list);
        } catch (Exception ignored) {}
    }

    static boolean canPin(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return false;
        ShortcutManager sm = ctx.getSystemService(ShortcutManager.class);
        return sm != null && sm.isRequestPinShortcutSupported();
    }

    /** Ask the launcher to put a shortcut for one game on the home screen. */
    static boolean pin(Context ctx, String id, String label, String png) {
        if (!validId(id) || !canPin(ctx)) return false;
        try {
            ShortcutManager sm = ctx.getSystemService(ShortcutManager.class);
            return sm.requestPinShortcut(info(ctx, id, label, png, 0), null);
        } catch (Exception e) {
            return false;
        }
    }

    static void used(Context ctx, String id) {
        if (Build.VERSION.SDK_INT < 25 || !validId(id)) return;
        try { ShortcutManager sm = ctx.getSystemService(ShortcutManager.class); if (sm != null) sm.reportShortcutUsed("game-" + id); } catch (Exception ignored) {}
    }
}
