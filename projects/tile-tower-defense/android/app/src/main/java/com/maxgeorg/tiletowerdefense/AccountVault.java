package com.maxgeorg.tiletowerdefense;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** One encrypted account record. Keys never leave Android Keystore. */
final class AccountVault {
  private static final String ALIAS = "tile-td-account-v1";
  private final SharedPreferences preferences;

  AccountVault(Context context) {
    preferences = context.getSharedPreferences(ALIAS, Context.MODE_PRIVATE);
  }

  private SecretKey key() throws Exception {
    KeyStore store = KeyStore.getInstance("AndroidKeyStore");
    store.load(null);
    if (!store.containsAlias(ALIAS)) {
      KeyGenerator generator = KeyGenerator.getInstance("AES", "AndroidKeyStore");
      generator.init(
          new KeyGenParameterSpec.Builder(
                  ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
              .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
              .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
              .setKeySize(256)
              .build());
      generator.generateKey();
    }
    return (SecretKey) store.getKey(ALIAS, null);
  }

  synchronized String read() throws Exception {
    String record = preferences.getString("account", null);
    if (record == null) return null;
    String[] parts = record.split(":", 2);
    if (parts.length != 2) throw new IllegalStateException("Invalid account record");
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(
        Cipher.DECRYPT_MODE,
        key(),
        new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
    return new String(
        cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
  }

  synchronized void write(String value) throws Exception {
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.ENCRYPT_MODE, key());
    String record =
        Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)
            + ":"
            + Base64.encodeToString(
                cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
    if (!preferences.edit().putString("account", record).commit()) {
      throw new IllegalStateException("Account storage unavailable");
    }
  }

  synchronized void clear() throws Exception {
    if (!preferences.edit().remove("account").commit()) {
      throw new IllegalStateException("Account storage unavailable");
    }
  }
}
