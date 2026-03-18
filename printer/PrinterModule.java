package com.bajiadev.vdimsumrestaurant.printer;

import android.text.Layout;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.zcs.sdk.DriverManager;
import com.zcs.sdk.Printer;
import com.zcs.sdk.SdkResult;
import com.zcs.sdk.Sys;
import com.zcs.sdk.print.PrnStrFormat;
import com.zcs.sdk.print.PrnTextFont;
import com.zcs.sdk.print.PrnTextStyle;

public class PrinterModule extends ReactContextBaseJavaModule {
    private static final String TAG = "PrinterModule";
    private Printer mPrinter;
    private DriverManager mDriverManager;

    public PrinterModule(ReactApplicationContext reactContext) {
        super(reactContext);
        mDriverManager = DriverManager.getInstance();
        mPrinter = mDriverManager.getPrinter();
        initSdk();
    }

    private void initSdk() {
        try {
            Sys sys = mDriverManager.getBaseSysDevice();
            int status = sys.sdkInit();
            if (status != SdkResult.SDK_OK) {
                sys.sysPowerOn();
                Thread.sleep(1000);
                status = sys.sdkInit();
            }
            Log.d(TAG, "SDK Init status: " + status);
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize SDK", e);
        }
    }

    @Override
    public String getName() {
        return "PrinterModule";
    }

    @ReactMethod
    public void printText(String text, Promise promise) {
        if (mPrinter == null) {
            promise.reject("PRINTER_ERROR", "Printer hardware not found");
            return;
        }

        int printStatus = mPrinter.getPrinterStatus();
        if (printStatus == SdkResult.SDK_PRN_STATUS_PAPEROUT) {
            promise.reject("PRINTER_ERROR", "Out of paper");
            return;
        }

        try {
            // Setup Format for standard receipt printing
            PrnStrFormat format = new PrnStrFormat();
            format.setTextSize(24); // Standard size for 58mm/80mm receipts
            format.setAli(Layout.Alignment.ALIGN_NORMAL); // Respect TypeScript padding
            format.setStyle(PrnTextStyle.NORMAL);
            format.setFont(PrnTextFont.MONOSPACE); // Essential for column alignment

            // Split into lines and append
            String[] lines = text.split("\n");
            for (String line : lines) {
                mPrinter.setPrintAppendString(line, format);
            }

            // Feed extra lines at the end for easy tearing
            mPrinter.setPrintAppendString("\n\n\n\n", format);

            int result = mPrinter.setPrintStart();
            if (result == SdkResult.SDK_OK) {
                promise.resolve("Printed successfully");
            } else {
                promise.reject("PRINTER_ERROR", "Print failed with code: " + result);
            }
        } catch (Exception e) {
            promise.reject("PRINTER_ERROR", "Exception during print: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getPrinterStatus(Promise promise) {
        if (mPrinter == null) {
            promise.reject("PRINTER_ERROR", "Printer hardware not found");
            return;
        }
        int status = mPrinter.getPrinterStatus();
        promise.resolve(status);
    }
}
