package mz.co.paocaseiro;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.os.Build;
import android.os.IBinder;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashMap;

import woyou.aidl.service.ashmem.ICallback;
import woyou.aidl.service.ashmem.IWoyouService;

@CapacitorPlugin(name = "MZPrinterPlugin")
public class MZPrinterPlugin extends Plugin {
    private static final String TAG = "MZPrinterPlugin";
    private static final String ACTION_USB_PERMISSION = "mz.co.paocaseiro.USB_PERMISSION";
    
    // Sunmi Service Connection
    private IWoyouService woyouService = null;
    private ServiceConnection sunmiConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            woyouService = IWoyouService.Stub.asInterface(service);
            Log.d(TAG, "Sunmi Printer Service connected");
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            woyouService = null;
            Log.d(TAG, "Sunmi Printer Service disconnected");
        }
    };

    @Override
    public void load() {
        super.load();
        bindSunmiService();
    }

    private void bindSunmiService() {
        try {
            Intent intent = new Intent();
            intent.setPackage("woyou.aidl.service.ashmem");
            intent.setAction("woyou.aidl.service.ashmem.PrinterService");
            getContext().bindService(intent, sunmiConnection, Context.BIND_AUTO_CREATE);
        } catch (Exception e) {
            Log.w(TAG, "Failed to bind Sunmi service", e);
        }
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (woyouService != null) {
            try {
                getContext().unbindService(sunmiConnection);
            } catch (Exception e) {
                Log.w(TAG, "Failed to unbind Sunmi service", e);
            }
        }
    }

    @PluginMethod
    public void isBuiltInPrinterAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        
        // Check Sunmi first
        if (woyouService != null) {
            ret.put("available", true);
            ret.put("type", "sunmi");
            call.resolve(ret);
            return;
        }

        // Check if there is an internal USB printer
        UsbDevice usbPrinter = findInternalUsbPrinter();
        if (usbPrinter != null) {
            ret.put("available", true);
            ret.put("type", "usb");
            ret.put("deviceName", usbPrinter.getDeviceName());
            call.resolve(ret);
            return;
        }

        ret.put("available", false);
        ret.put("type", "none");
        call.resolve(ret);
    }

    @PluginMethod
    public void printRaw(PluginCall call) {
        String base64Data = call.getString("base64Data");
        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("base64Data is required");
            return;
        }

        byte[] rawBytes = Base64.decode(base64Data, Base64.DEFAULT);

        // 1. Try Sunmi AIDL first if available
        if (woyouService != null) {
            try {
                woyouService.sendRAWData(rawBytes, new ICallback.Stub() {
                    @Override
                    public void onRunResult(boolean isSuccess) {
                        Log.d(TAG, "Sunmi print result: " + isSuccess);
                    }
                    @Override
                    public void onReturnString(String result) {}
                    @Override
                    public void onRaiseException(int code, String msg) {
                        Log.e(TAG, "Sunmi print exception: " + msg);
                    }
                });
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
                return;
            } catch (Exception e) {
                Log.e(TAG, "Sunmi printRaw failed, trying USB fallback", e);
                // Fallthrough to USB printer check
            }
        }

        // 2. Try built-in USB Printer
        UsbDevice usbPrinter = findInternalUsbPrinter();
        if (usbPrinter != null) {
            UsbManager manager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
            if (manager != null) {
                if (!manager.hasPermission(usbPrinter)) {
                    // Request permission asynchronously
                    PendingIntent permissionIntent;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        permissionIntent = PendingIntent.getBroadcast(getContext(), 0, new Intent(ACTION_USB_PERMISSION), PendingIntent.FLAG_MUTABLE);
                    } else {
                        permissionIntent = PendingIntent.getBroadcast(getContext(), 0, new Intent(ACTION_USB_PERMISSION), 0);
                    }
                    
                    BroadcastReceiver usbReceiver = new BroadcastReceiver() {
                        @Override
                        public void onReceive(Context context, Intent intent) {
                            String action = intent.getAction();
                            if (ACTION_USB_PERMISSION.equals(action)) {
                                synchronized (this) {
                                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                                        if (device != null) {
                                            boolean success = printToUsbDevice(device, rawBytes);
                                            if (success) {
                                                JSObject ret = new JSObject();
                                                ret.put("success", true);
                                                call.resolve(ret);
                                            } else {
                                                call.reject("Failed to print to USB printer after permission granted");
                                            }
                                        }
                                    } else {
                                        call.reject("USB print permission denied");
                                    }
                                }
                            }
                            getContext().unregisterReceiver(this);
                        }
                    };
                    
                    getContext().registerReceiver(usbReceiver, new IntentFilter(ACTION_USB_PERMISSION));
                    manager.requestPermission(usbPrinter, permissionIntent);
                    return;
                } else {
                    boolean success = printToUsbDevice(usbPrinter, rawBytes);
                    if (success) {
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        call.resolve(ret);
                        return;
                    } else {
                        call.reject("Failed to print to internal USB printer");
                        return;
                    }
                }
            }
        }

        call.reject("No built-in printer found or connected");
    }

    private UsbDevice findInternalUsbPrinter() {
        UsbManager manager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        if (manager == null) return null;
        HashMap<String, UsbDevice> deviceList = manager.getDeviceList();
        for (UsbDevice device : deviceList.values()) {
            // Check interfaces for Printer Class (7)
            for (int i = 0; i < device.getInterfaceCount(); i++) {
                UsbInterface intf = device.getInterface(i);
                if (intf.getInterfaceClass() == UsbConstants.USB_CLASS_PRINTER) {
                    return device;
                }
            }
        }
        return null;
    }

    private boolean printToUsbDevice(UsbDevice device, byte[] data) {
        UsbManager manager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        if (manager == null) return false;

        UsbDeviceConnection connection = manager.openDevice(device);
        if (connection == null) {
            Log.e(TAG, "Failed to open USB device connection");
            return false;
        }

        UsbInterface usbInterface = null;
        UsbEndpoint outEndpoint = null;

        for (int i = 0; i < device.getInterfaceCount(); i++) {
            UsbInterface intf = device.getInterface(i);
            // Look for interface class printer (7) or any write-capable endpoint
            for (int j = 0; j < intf.getEndpointCount(); j++) {
                UsbEndpoint ep = intf.getEndpoint(j);
                if (ep.getDirection() == UsbConstants.USB_DIR_OUT) {
                    usbInterface = intf;
                    outEndpoint = ep;
                    break;
                }
            }
            if (outEndpoint != null) break;
        }

        if (usbInterface == null || outEndpoint == null) {
            Log.e(TAG, "No OUT endpoint found on USB device");
            connection.close();
            return false;
        }

        boolean claimed = connection.claimInterface(usbInterface, true);
        if (!claimed) {
            Log.e(TAG, "Failed to claim USB interface");
            connection.close();
            return false;
        }

        int written = connection.bulkTransfer(outEndpoint, data, data.length, 5000);
        Log.d(TAG, "Bulk transfer wrote " + written + " bytes out of " + data.length);

        connection.releaseInterface(usbInterface);
        connection.close();

        return written >= 0;
    }
}
