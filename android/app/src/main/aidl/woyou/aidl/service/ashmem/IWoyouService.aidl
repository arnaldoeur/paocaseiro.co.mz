package woyou.aidl.service.ashmem;

import woyou.aidl.service.ashmem.ICallback;

interface IWoyouService {
    void updatePrinterState(int state);
    void printText(String text, ICallback callback);
    void printTextWithFont(String text, String typeface, float fontSize, ICallback callback);
    void printOriginalText(String text, ICallback callback);
    void printBarCode(String data, int symbology, int height, int width, int textposition, ICallback callback);
    void printQRCode(String data, int modulesize, int errorlevel, ICallback callback);
    void printBitmap(in android.graphics.Bitmap bitmap, ICallback callback);
    void printBitmapCustom(in android.graphics.Bitmap bitmap, int type, ICallback callback);
    void printDoubleBitmap(in android.graphics.Bitmap bitmap1, in android.graphics.Bitmap bitmap2, ICallback callback);
    void sendRAWData(in byte[] data, ICallback callback);
    void printerSelfChecking(ICallback callback);
    String getPrinterSerialNo();
    String getPrinterVersion();
    String getPrinterModal();
    void lineWrap(int lines, ICallback callback);
    void cutPaper(ICallback callback);
    int getPrinterState();
}
