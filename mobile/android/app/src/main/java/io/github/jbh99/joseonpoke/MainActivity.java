package io.github.jbh99.joseonpoke;

import android.media.AudioManager;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;

import org.json.JSONObject;

import java.util.Arrays;
import java.util.List;

// Full-screen landscape host for the web game in assets/public (served from https://localhost, so it
// plays offline). The back button is handed to the game as X / Esc; the title screen can close the app.
// The volume keys always set the media volume, which the game's sound plays at. Google refuses its sign-in pages inside
// a WebView, so the cloud save's Google token comes from Play services here (cloud.js).
public class MainActivity extends BridgeActivity {

    private static final List<Scope> CLOUD_SCOPES = Arrays.asList(
            new Scope("https://www.googleapis.com/auth/drive.appdata"),
            new Scope("https://www.googleapis.com/auth/userinfo.email"));
    private ActivityResultLauncher<IntentSenderRequest> consent;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        // without this the keys reach the media volume only while a sound is playing (ringtone volume otherwise)
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        hideSystemBars();
        consent = registerForActivityResult(new ActivityResultContracts.StartIntentSenderForResult(), r -> {
            try {
                sendAuth(Identity.getAuthorizationClient(this).getAuthorizationResultFromIntent(r.getData()).getAccessToken(), null);
            } catch (ApiException e) {
                sendAuth(null, "auth " + e.getStatusCode()); // 16 cancelled, 7 network (cloud.js explains them)
            } catch (Exception e) {
                sendAuth(null, "cancelled");
            }
        });
        WebView web = getBridge().getWebView();
        web.addJavascriptInterface(new Host(), "AndroidHost");
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                web.evaluateJavascript("window.onAndroidBack && window.onAndroidBack()", null);
            }
        });
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars(); // the bars come back after dialogs, the keyboard or app switching
    }

    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        bars.hide(WindowInsetsCompat.Type.systemBars());
    }

    // a Drive app-data token for the page: at once when the player already agreed, else through Google's account and
    // consent screens (only when the player asked, interactive); the answer goes to window.onGoogleAuth(token, error)
    private void authorize(boolean interactive) {
        AuthorizationRequest request = AuthorizationRequest.builder().setRequestedScopes(CLOUD_SCOPES).build();
        Identity.getAuthorizationClient(this).authorize(request)
                .addOnSuccessListener(result -> {
                    if (!result.hasResolution()) sendAuth(result.getAccessToken(), null);
                    else if (interactive) consent.launch(new IntentSenderRequest.Builder(result.getPendingIntent().getIntentSender()).build());
                    else sendAuth(null, "needs-click");
                })
                .addOnFailureListener(e -> sendAuth(null, e instanceof ApiException ? "auth " + ((ApiException) e).getStatusCode() : String.valueOf(e.getMessage())));
    }

    private void sendAuth(String token, String error) {
        WebView web = getBridge().getWebView();
        String js = "window.onGoogleAuth && window.onGoogleAuth(" + (token == null ? "null" : JSONObject.quote(token)) + ", "
                + (error == null ? "null" : JSONObject.quote(error)) + ")";
        web.post(() -> web.evaluateJavascript(js, null));
    }

    // called from the page as window.AndroidHost
    private class Host {
        @JavascriptInterface
        public void exit() {
            runOnUiThread(MainActivity.this::finish);
        }

        // the media volume the game's sound plays at, in percent (0 = silent), so the page can tell a player who hears nothing
        @JavascriptInterface
        public int mediaVolume() {
            AudioManager audio = (AudioManager) getSystemService(AUDIO_SERVICE);
            int max = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
            return max > 0 ? Math.round(100f * audio.getStreamVolume(AudioManager.STREAM_MUSIC) / max) : 0;
        }

        @JavascriptInterface
        public void googleAuthorize(boolean interactive) {
            runOnUiThread(() -> authorize(interactive));
        }
    }
}
