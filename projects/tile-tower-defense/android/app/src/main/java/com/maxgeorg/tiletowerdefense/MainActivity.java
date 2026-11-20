package com.maxgeorg.tiletowerdefense;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(CaptainAccountPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
