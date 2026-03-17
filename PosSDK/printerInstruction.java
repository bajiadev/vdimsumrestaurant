private void initSdk() {
int status = mSys.sdkInit();
if(status != SdkResult.SDK_OK) {
mSys.sysPowerOn();
try {
Thread.sleep(1000);
} catch (InterruptedException e) {
e.printStackTrace();
}
}
status = mSys.sdkInit();
if(status != SdkResult.SDK_OK) {
//init failed.
}
}


private void printText() {
int printStatus = mPrinter.getPrinterStatus();
if (printStatus == SdkResult.SDK_PRN_STATUS_PAPEROUT) {
//out of paper
} else {
PrnStrFormat format = new PrnStrFormat();
format.setTextSize(30);
format.setAli(Layout.Alignment.ALIGN_CENTER);
format.setStyle(PrnTextStyle.BOLD);
format.setFont(PrnTextFont.CUSTOM);
format.setPath(Environment.getExternalStorageDirectory() + "/fonts/simsun.ttf");
mPrinter.setPrintAppendString("POS SALES SLIP", format);
format.setTextSize(25);
format.setStyle(PrnTextStyle.NORMAL);
format.setAli(Layout.Alignment.ALIGN_NORMAL);
mPrinter.setPrintAppendString(" ", format);
mPrinter.setPrintAppendString("MERCHANGT NAME:" + " Test ", format);
mPrinter.setPrintAppendString("MERCHANT NO:" + " 123456789012345 ", format);
mPrinter.setPrintAppendString("TERMINAL NAME:" + " 12345678 ", format);
mPrinter.setPrintAppendString("OPERATOR NO:" + " 01 ", format);
mPrinter.setPrintAppendString("CARD NO: ", format);
format.setAli(Layout.Alignment.ALIGN_CENTER);
format.setTextSize(30);
format.setStyle(PrnTextStyle.BOLD);
mPrinter.setPrintAppendString("6214 44** **** **** 7816", format);
format.setAli(Layout.Alignment.ALIGN_NORMAL);
format.setStyle(PrnTextStyle.NORMAL);
format.setTextSize(25);mPrinter.setPrintAppendString(" -----------------------------
", format);
mPrinter.setPrintAppendString(" ", format);
mPrinter.setPrintAppendString(" ", format);
mPrinter.setPrintAppendString(" ", format);
mPrinter.setPrintAppendString(" ", format);
printStatus = mPrinter.setPrintStart();
}
}
