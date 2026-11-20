package com.maxgeorg.tiletowerdefense;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import net.openid.appauth.AuthState;
import net.openid.appauth.AuthorizationRequest;
import net.openid.appauth.AuthorizationResponse;
import net.openid.appauth.AuthorizationService;
import net.openid.appauth.AuthorizationServiceConfiguration;
import net.openid.appauth.ResponseTypeValues;
import org.json.JSONArray;
import org.json.JSONObject;

/** Native OAuth and encrypted persistence; refresh credentials never enter the WebView. */
@CapacitorPlugin(name = "CaptainAccount")
public class CaptainAccountPlugin extends Plugin {
  private AccountVault vault;
  private AuthorizationService service;
  private long revision;
  private long loginDeadline;
  private boolean refreshing;

  @Override
  public void load() {
    vault = new AccountVault(getContext());
    service = new AuthorizationService(getContext());
  }

  private boolean loginPending() {
    if (loginDeadline != 0 && System.currentTimeMillis() >= loginDeadline) {
      loginDeadline = 0;
      revision++;
    }
    return loginDeadline != 0;
  }

  private void validateOptions(PluginCall call) {
    // This plugin supports only this game's provider and app-owned callback.
    if (!"https://auth.spacetimedb.com/oidc".equals(call.getString("issuer"))
        || call.getString("clientId", "").isEmpty()
        || !"https://tiled-tower-defense.vercel.app/auth/android.html"
            .equals(call.getString("redirectUri"))) {
      throw new IllegalArgumentException("Invalid account configuration");
    }
  }

  private JSONObject claims(String token, PluginCall call) throws Exception {
    if (token == null || token.length() > 32768) throw new IllegalArgumentException();
    String[] parts = token.split("\\.");
    if (parts.length != 3) throw new IllegalArgumentException();
    JSONObject value =
        new JSONObject(
            new String(Base64.decode(parts[1], Base64.URL_SAFE), StandardCharsets.UTF_8));
    Object audience = value.get("aud");
    boolean accepted = call.getString("clientId").equals(audience);
    if (audience instanceof JSONArray) {
      JSONArray items = (JSONArray) audience;
      for (int i = 0; i < items.length(); i++) {
        accepted |= call.getString("clientId").equals(items.getString(i));
      }
    }
    if (!accepted
        || !call.getString("issuer").equals(value.getString("iss"))
        || value.getString("sub").isEmpty()
        || value.getLong("exp") <= 0) {
      throw new IllegalArgumentException();
    }
    return value;
  }

  private JSObject result(AuthState state, PluginCall call) throws Exception {
    String token = state.getIdToken();
    JSONObject claims = claims(token, call);
    JSObject session = new JSObject();
    session.put("token", token);
    session.put("expiresAt", claims.getLong("exp") * 1000);
    JSObject result = new JSObject();
    result.put("session", session);
    return result;
  }

  private JSONObject stored() throws Exception {
    String value = vault.read();
    return value == null ? null : new JSONObject(value);
  }

  private void save(AuthState state, boolean blocked) throws Exception {
    JSONObject record = new JSONObject();
    record.put("auth", state.jsonSerializeString());
    record.put("blocked", blocked);
    vault.write(record.toString());
  }

  @PluginMethod
  public synchronized void getSession(PluginCall call) {
    try {
      validateOptions(call);
      if (loginPending()) {
        JSObject waiting = new JSObject();
        waiting.put("pending", true);
        call.resolve(waiting);
        return;
      }
      JSONObject record = stored();
      call.resolve(
          record == null
              ? new JSObject()
              : result(AuthState.jsonDeserialize(record.getString("auth")), call));
    } catch (Exception error) {
      // Never silently replace an unreadable account with a guest identity.
      call.reject("Account storage could not be opened.", "STORAGE_FAILED");
    }
  }

  @PluginMethod
  public synchronized void signIn(PluginCall call) {
    try {
      validateOptions(call);
      if (loginPending() || refreshing) {
        call.reject("Account request already running.", "BUSY");
        return;
      }
      final long operation = ++revision;
      loginDeadline = System.currentTimeMillis() + 300_000;
      AuthorizationServiceConfiguration.fetchFromIssuer(
          Uri.parse(call.getString("issuer")),
          (configuration, error) -> {
            synchronized (this) {
              if (!loginPending() || operation != revision) {
                call.reject("Sign-in cancelled.", "CANCELLED");
                return;
              }
              if (error != null || configuration == null) {
                loginDeadline = 0;
                call.reject("Could not reach sign-in service.", "NETWORK");
                return;
              }
              try {
                AuthorizationRequest request =
                    new AuthorizationRequest.Builder(
                            configuration,
                            call.getString("clientId"),
                            ResponseTypeValues.CODE,
                            Uri.parse(call.getString("redirectUri")))
                        .setScope("openid profile offline_access")
                        .build();
                // AppAuth generates state, nonce and an S256 PKCE challenge.
                Intent intent = service.getAuthorizationRequestIntent(request);
                getActivity()
                    .runOnUiThread(() -> startActivityForResult(call, intent, "authorized"));
              } catch (Exception failure) {
                loginDeadline = 0;
                call.reject("No browser available for sign-in.", "BROWSER_UNAVAILABLE");
              }
            }
          });
    } catch (Exception error) {
      loginDeadline = 0;
      call.reject("Sign-in could not start.", "AUTH_FAILED");
    }
  }

  @ActivityCallback
  private synchronized void authorized(PluginCall call, ActivityResult activityResult) {
    if (call == null) return;
    final long operation = revision;
    try {
      validateOptions(call);
      Intent data = activityResult.getData();
      AuthorizationResponse response = data == null ? null : AuthorizationResponse.fromIntent(data);
      if (!loginPending() || response == null) {
        loginDeadline = 0;
        call.reject("Sign-in cancelled.", "CANCELLED");
        return;
      }
      if (!response.request.clientId.equals(call.getString("clientId"))
          || !response.request.redirectUri.toString().equals(call.getString("redirectUri"))) {
        throw new IllegalArgumentException();
      }
      AuthState state = new AuthState(response, null);
      service.performTokenRequest(
          response.createTokenExchangeRequest(),
          (tokens, error) -> {
            synchronized (this) {
              if (!loginPending() || operation != revision) {
                call.reject("Sign-in cancelled.", "CANCELLED");
                return;
              }
              loginDeadline = 0;
              if (error != null || tokens == null) {
                call.reject("Sign-in did not finish.", "AUTH_FAILED");
                return;
              }
              try {
                state.update(tokens, null);
                JSObject result = result(state, call);
                if (claims(tokens.idToken, call).getLong("exp") * 1000
                    <= System.currentTimeMillis() + 30_000) {
                  throw new IllegalArgumentException();
                }
                save(state, false);
                call.resolve(result);
              } catch (Exception failure) {
                call.reject("Account could not be saved.", "AUTH_FAILED");
              }
            }
          });
    } catch (Exception error) {
      loginDeadline = 0;
      call.reject("Sign-in did not finish.", "AUTH_FAILED");
    }
  }

  @PluginMethod
  public synchronized void refresh(PluginCall call) {
    try {
      validateOptions(call);
      if (refreshing || loginPending()) {
        call.reject("Account request already running.", "BUSY");
        return;
      }
      JSONObject record = stored();
      if (record == null || record.optBoolean("blocked")) {
        call.reject("Sign-in required.", "AUTH_REQUIRED");
        return;
      }
      AuthState state = AuthState.jsonDeserialize(record.getString("auth"));
      JSONObject previous = claims(state.getIdToken(), call);
      if (state.getRefreshToken() == null) {
        call.reject("Sign-in required.", "AUTH_REQUIRED");
        return;
      }
      refreshing = true;
      final long operation = revision;
      service.performTokenRequest(
          state.createTokenRefreshRequest(),
          (tokens, error) -> {
            synchronized (this) {
              refreshing = false;
              if (operation != revision) {
                call.reject("Account changed.", "CANCELLED");
                return;
              }
              try {
                if (error != null || tokens == null) {
                  boolean revoked =
                      error != null
                          && ("invalid_grant".equals(error.error)
                              || "invalid_client".equals(error.error)
                              || "unauthorized_client".equals(error.error)
                              || "invalid_scope".equals(error.error));
                  if (revoked) save(state, true);
                  call.reject("Account renewal failed.", revoked ? "AUTH_REQUIRED" : "NETWORK");
                  return;
                }
                JSONObject next = claims(tokens.idToken, call);
                if (!previous.getString("sub").equals(next.getString("sub"))
                    || next.getLong("exp") <= previous.getLong("exp")
                    || next.getLong("exp") * 1000 <= System.currentTimeMillis() + 30_000) {
                  save(state, true);
                  call.reject("Sign-in required.", "AUTH_REQUIRED");
                  return;
                }
                state.update(tokens, null);
                save(state, false);
                call.resolve(result(state, call));
              } catch (Exception failure) {
                call.reject("Account could not be renewed.", "AUTH_FAILED");
              }
            }
          });
    } catch (Exception error) {
      refreshing = false;
      call.reject("Account could not be renewed.", "AUTH_FAILED");
    }
  }

  @PluginMethod
  public synchronized void signOut(PluginCall call) {
    revision++;
    loginDeadline = 0;
    try {
      vault.clear();
      call.resolve();
    } catch (Exception error) {
      call.reject("Account could not be removed.", "STORAGE_FAILED");
    }
  }

  @Override
  protected synchronized Bundle saveInstanceState() {
    Bundle state = super.saveInstanceState();
    if (state == null) state = new Bundle();
    state.putLong("accountRevision", revision);
    state.putLong("loginDeadline", loginDeadline);
    return state;
  }

  @Override
  protected synchronized void restoreState(Bundle state) {
    revision = state.getLong("accountRevision");
    loginDeadline = state.getLong("loginDeadline");
  }

  @Override
  protected void handleOnDestroy() {
    revision++;
    if (service != null) service.dispose();
  }
}
