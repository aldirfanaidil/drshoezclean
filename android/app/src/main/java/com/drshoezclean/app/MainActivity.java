package com.drshoezclean.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(SmartPrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
