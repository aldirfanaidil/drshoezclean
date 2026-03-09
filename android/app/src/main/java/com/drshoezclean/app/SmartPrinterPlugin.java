package com.drshoezclean.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.io.OutputStream;
import java.util.UUID;

@CapacitorPlugin(name = "SmartPrinter")
public class SmartPrinterPlugin extends Plugin {

    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    @PluginMethod
    public void print(PluginCall call) {
        String address = call.getString("address");
        String content = call.getString("content");

        if (address == null || content == null) {
            call.reject("Address and content are required");
            return;
        }

        // Run on background thread to prevent UI blocking
        new Thread(() -> {
            BluetoothSocket socket = null;
            try {
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter == null) {
                    call.reject("Bluetooth not supported");
                    return;
                }

                // Check Print Permissions
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                     if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                         // Note: In a real app we should request permission, but here we assume the UI flow handled it
                         // or we can just fail.
                         call.reject("Bluetooth permission missing");
                         return;
                     }
                }

                // Connect
                BluetoothDevice device = adapter.getRemoteDevice(address);
                socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                adapter.cancelDiscovery(); // Always cancel discovery before connecting
                socket.connect();

                // Send Data with Chunking (Anti-Buffer Overflow)
                OutputStream os = socket.getOutputStream();
                byte[] data = Base64.decode(content, Base64.DEFAULT);
                
                int chunkSize = 400; // 400 bytes per chunk (Safe for MP-58C)
                int delay = 50;      // 50ms delay between chunks
                
                for (int i = 0; i < data.length; i += chunkSize) {
                    int length = Math.min(chunkSize, data.length - i);
                    os.write(data, i, length);
                    os.flush(); // Force send
                    
                    try {
                        Thread.sleep(delay); // Give printer time to process
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }

                // Success
                call.resolve();

            } catch (Exception e) {
                Log.e("SmartPrinter", "Print failed", e);
                call.reject("Print failed: " + e.getMessage());
            } finally {
                if (socket != null) {
                    try {
                        socket.close();
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                }
            }
        }).start();
    }
}
