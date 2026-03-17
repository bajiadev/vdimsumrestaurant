package com.yourapp.printer;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod; 
import com.facebook.react.bridge.Callback;

public class PrinterModule extends ReactContextBaseJavaModule {
    private Printer mPrinter;

    public PrinterModule(ReactApplicationContext reactContext) {
        super(reactContext);
        mPrinter = new Printer(reactContext); // Initialize with context
    }

    @Override
    public String getName() {
        return "PrinterModule";
    }

    @ReactMethod
    public void printText(String text, Callback callback) {
        int status = mPrinter.getPrinterStatus();
        if (status == SdkResult.SDK_PRN_STATUS_PAPEROUT) {
            callback.invoke("Out of paper");
            return;
        }
        PrnStrFormat format = new PrnStrFormat();
        format.setTextSize(30);
        format.setAli(Layout.Alignment.ALIGN_CENTER);
        format.setStyle(PrnTextStyle.BOLD);
        format.setFont(PrnTextFont.SANS_SERIF);

        mPrinter.setPrintAppendString(text, format);
        mPrinter.setPrintStart();
        callback.invoke("Printed");
    }
}

// ...existing code...
@Override
public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new PrinterModule(reactContext));
    return modules;
}
// ...existing code...


import { NativeModules } from 'react-native';
const { PrinterModule } = NativeModules;

PrinterModule.printText('Hello from React Native!', (result) => {
  console.log(result); // "Printed" or "Out of paper"
});