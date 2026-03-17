
package com.bajiadev.vdimsumrestaurant;

import android.content.Context;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.zcs.sdk.DriverManager;
import com.zcs.sdk.Printer;
import com.zcs.sdk.SdkResult;
import com.zcs.sdk.print.PrnStrFormat;
import com.zcs.sdk.print.PrnTextFont;
import com.zcs.sdk.print.PrnTextStyle;
import android.text.Layout;

public class PrinterModule extends ReactContextBaseJavaModule {
    private Printer mPrinter;

    public PrinterModule(ReactApplicationContext reactContext) {
        super(reactContext);
        DriverManager mDriverManager = DriverManager.getInstance();
        mPrinter = mDriverManager.getPrinter();
    }

    @Override
    public String getName() {
        return "PrinterModule";
    }

    @ReactMethod
    public void printText(String text, Promise promise) {
        int printStatus = mPrinter.getPrinterStatus();
        if (printStatus == SdkResult.SDK_PRN_STATUS_PAPEROUT) {
            promise.reject("PRINTER_ERROR", "Out of paper");
            return;
        }
        PrnStrFormat format = new PrnStrFormat();
        format.setTextSize(30);
        format.setAli(Layout.Alignment.ALIGN_CENTER);
        format.setStyle(PrnTextStyle.BOLD);
        format.setFont(PrnTextFont.SANS_SERIF);

        for (String line : text.split("\\n")) {
            mPrinter.setPrintAppendString(line, format);
        }
        mPrinter.setPrintStart();
        promise.resolve("Printed");
    }
}