---
title: 学习通 Android 梆梆加固动态脱壳分析
date: 2026-09-18 23:50:00
categories: reverse
tags:
  - Reverse
  - Android
  - Frida
  - 梆梆
  - 脱壳
description: 一次针对学习通 Android APK 的梆梆加固动态分析，从 AppComponentFactory、libDexHelper.so 到 JNI_OnLoad，最终通过扫描匿名内存成功 Dump 出真实 Dex。
---

### attachBaseContext
```java
public static String APPNAME = "com.chaoxing.mobile.AppApplication";

protected void attachBaseContext(Context context) throws Exception {
        try {
            int[] iArr = new int[0];
            H.sApp = this;  
            H.sAppInfo = context.getApplicationInfo(); 
            H.load(H.sAppInfo); 
            mBootStrapApplication = this;  
            super.attachBaseContext(context); 
            doAttach(this, H.APPNAME); 
        } catch (Exception ex1) { 
            throw ex1; 
        }  
    }
```
### H.load
```java
public static String X86_LIBRARY = "DexHelper-x86";
public static String ARM_LIBRARY = "DexHelper";

public static void load(ApplicationInfo applicationInfo) throws Exception {  
        try {  
            int[] iArr = new int[0]; 
            synchronized (isLoaded) {  
                if (!isLoaded.booleanValue()) {  
                    try {  
                        System.loadLibrary(isNeedLoadX86() ? X86_LIBRARY : ARM_LIBRARY);  
                    } catch (Throwable unused) {  
                        loadLib(applicationInfo);  
                    }  
                    isLoaded = Boolean.TRUE;  
                }  
            } 
        } catch (Exception ex1) {  
            throw ex1;  
        }  
    }
```
### AW.doAttach
```java
public static void doAttach(Application application, String str) throws Exception { 
        try {
            int[] iArr = new int[0];
            if (TextUtils.isEmpty(str) || H.ORI_AW_NAME.equals(str)) {  
                return;  
            }
            try {
                Context baseContext = application.getBaseContext();
                Class<?> clsLoadClass = application.getClassLoader().loadClass(str);
                if (realApplication == null) {
                    realApplication = (Application) clsLoadClass.newInstance();
                }
                H.invokeMethod(Application.class, realApplication, new Object[]{baseContext}, "attach", Context.class);
                H.invokeMethod(baseContext.getClass(), baseContext, new Object[]{realApplication}, "setOuterContext", Context.class);
            } catch (Exception e) {
                e.printStackTrace();
            }
        } catch (Exception ex1) {
            throw ex1;
        }
    }
```
### Oncreate
```java
    public void onCreate() throws Exception {
        try {
            int[] iArr = new int[0];
            super.onCreate();
            hook(this, H.APPNAME);
            replaceApplicationContext(this);
        } catch (Exception ex1) {
            throw ex1;
        }
    }
```
### hook
```groovy
public static void hook(Application application, String str) throws Exception {
        try {
            int[] iArr = new int[0];
            if (TextUtils.isEmpty(str) || H.ORI_AW_NAME.equals(str)) {
                return;
            }
            try {
                Context baseContext = application.getBaseContext();
                Class<?> clsLoadClass = application.getClassLoader().loadClass(str);
                if (realApplication == null) {
                    realApplication = (Application) clsLoadClass.newInstance();
                }  
                hn(baseContext, application);  
            } catch (Exception e) { 
                e.printStackTrace();  
            }  
        } catch (Exception ex1) {  
            throw ex1;  
        }  
    }
```
### DexHelper
静态Dex里没有`AppApplication`，结合壳代码最终需要通过`H.APPNAME`加载真实 Application，因此推测该类不在当前可见的静态Dex中，而是在`H.load`触发的`libDexHelper.so`相关流程中被解密并加载。
```js
var H = Java.use("com.secneo.apkwrapper.H");
	H["load"].implementation = function (applicationInfo) {
    console.log(`H.load is called: applicationInfo=${applicationInfo}`);
    this["load"](applicationInfo);
};
```
尝试hook`load`来dump解密后的so,但是都崩溃了应该是被检测了
发现:
```xml
<application android:name="com.secneo.apkwrapper.AW"
 android:appComponentFactory="com.secneo.apkwrapper.AP"
```

`appComponentFactory`会参与 Application 创建前的 ClassLoader 初始化，因此这里的`H.load()`比常规的 Application 生命周期更早执行。这也是前面直接 Hook `Application` 相关代码容易错过关键初始化的原因。

```java
public ClassLoader instantiateClassLoader(ClassLoader classLoader, ApplicationInfo applicationInfo) throws Exception {  
        try {  
            int[] iArr = new int[0];  
            H.sAppInfo = applicationInfo;  
            H.load(applicationInfo);  
            if (a()) {  
                AppComponentFactory appComponentFactoryA = a(classLoader);  
                a(appComponentFactoryA);  
                if (appComponentFactoryA != null) { 
                    return appComponentFactoryA.instantiateClassLoader(classLoader, applicationInfo);  
                } 
            }  
            return super.instantiateClassLoader(classLoader, applicationInfo);  
        } catch (Exception ex1) {  
            throw ex1;  
        }  
    }
```
在这里同样有`H.load(applicationInfo)`，所以在进入真正的`application`之前就已经加载了`libDexHelper.so`。从启动顺序来看，梆梆把关键初始化前置到了`AppComponentFactory`这一层。
```js
const libdl = Process.getModuleByName("libdl.so");
const android_dlopen_ext =
    libdl.getExportByName("android_dlopen_ext");

console.log("[+] android_dlopen_ext = " + android_dlopen_ext);

Interceptor.attach(android_dlopen_ext, {
    onEnter(args) {
        this.path = null;
  
        try {
            this.path = args[0].isNull()
                ? "<null>"
                : args[0].readUtf8String();
        } catch (e) {
            this.path = "<read error>";
        }
        console.log("[+] android_dlopen_ext: " + this.path);
    },
    onLeave(retval) {
        console.log(
            "[+] return = " + retval +
            " path = " + this.path
        );
    }
});
```
hook android_dlopen_ext:
```text
[+] android_dlopen_ext = 0x7429683100
Spawned `com.chaoxing.mobile`. Resuming main thread!                    
[+] android_dlopen_ext: libframework-connectivity-tiramisu-jni.so
[+] return = 0x7849f7fa10aed27d path = libframework-connectivity-tiramisu-jni.so
[Pixel 6 Pro::com.chaoxing.mobile ]-> [+] android_dlopen_ext: /data/app/~~y--ERQseOoZ4gT7zjIRrkQ==/com.chaoxing.mobile-Pyz5Pps6RKL4jofLPOptlQ==/oat/arm64/base.odex
[+] return = 0x35d016cb395d5237 path = /data/app/~~y--ERQseOoZ4gT7zjIRrkQ==/com.chaoxing.mobile-Pyz5Pps6RKL4jofLPOptlQ==/oat/arm64/base.odex
[+] android_dlopen_ext: /data/app/~~y--ERQseOoZ4gT7zjIRrkQ==/com.chaoxing.mobile-Pyz5Pps6RKL4jofLPOptlQ==/lib/arm64/libDexHelper.so
[Pixel 6 Pro::com.chaoxing.mobile ]->
[+] return = 0x3cacae38c9b7db03 path = /data/app/~~y--ERQseOoZ4gT7zjIRrkQ==/com.chaoxing.mobile-Pyz5Pps6RKL4jofLPOptlQ==/lib/arm64/libDexHelper.so
[Pixel 6 Pro::com.chaoxing.mobile ]-> [+] android_dlopen_ext: /data/app/~~y--ERQseOoZ4gT7zjIRrkQ==/com.chaoxing.mobile-Pyz5Pps6RKL4jofLPOptlQ==/lib/arm64/libsecuritylib.so
[+] return = 0x7b3292d2786f6929 path = /data/app/~~y--ERQseOoZ4gT7zjIRrkQ==/com.chaoxing.mobile-Pyz5Pps6RKL4jofLPOptlQ==/lib/arm64/libsecuritylib.so
[+] android_dlopen_ext: /data/app/~~y--ERQseOoZ4gT7zjIRrkQ==/com.chaoxing.mobile-Pyz5Pps6RKL4jofLPOptlQ==/lib/arm64/libfntvcrash.so
[+] return = 0xc4781e5ea3314127 path = /data/app/~~y--ERQseOoZ4gT7zjIRrkQ==/com.chaoxing.mobile-Pyz5Pps6RKL4jofLPOptlQ==/lib/arm64/libfntvcrash.so
[+] android_dlopen_ext: /data/app/~~y--ERQseOoZ4gT7zjIRrkQ==/com.chaoxing.mobile-Pyz5Pps6RKL4jofLPOptlQ==/lib/arm64/libencrypt.so
[+] return = 0xda48029a6d4882bf path = /data/app/~~y--ERQseOoZ4gT7zjIRrkQ==/com.chaoxing.mobile-Pyz5Pps6RKL4jofLPOptlQ==/lib/arm64/libencrypt.so
[+] android_dlopen_ext: /data/app/~~gW7tl_GztTveQyL6ONBIcg==/com.google.android.webview-tOjsU4DoT8xkEh6_kthI_w==/oat/arm64/WebViewGoogle.odex
[+] return = 0xb957d79e56fe7c0f path = /data/app/~~gW7tl_GztTveQyL6ONBIcg==/com.google.android.webview-tOjsU4DoT8xkEh6_kthI_w==/oat/arm64/WebViewGoogle.odex
[+] android_dlopen_ext: libmonochrome.so
[+] return = 0x96230e168d80941f path = libmonochrome.so
[+] android_dlopen_ext: /data/app/~~gW7tl_GztTveQyL6ONBIcg==/com.google.android.webview-tOjsU4DoT8xkEh6_kthI_w==/WebViewGoogle.apk!/lib/arm64-v8a/libmonochrome.so
[+] return = 0x96230e168d80941f path = /data/app/~~gW7tl_GztTveQyL6ONBIcg==/com.google.android.webview-tOjsU4DoT8xkEh6_kthI_w==/WebViewGoogle.apk!/lib/arm64-v8a/libmonochrome.so
[+] android_dlopen_ext: /system/lib64/libwebviewchromium_plat_support.so
[+] return = 0xca8b58656cf49151 path = /system/lib64/libwebviewchromium_plat_support.so
[+] android_dlopen_ext: /data/app/~~y--ERQseOoZ4gT7zjIRrkQ==/com.chaoxing.mobile-Pyz5Pps6RKL4jofLPOptlQ==/lib/arm64/libmsaoaidsec.so
```
实际退出位置在`libmsaoaidsec.so` OAID 安全库在 dlopen 的构造函数里自杀式 SIGSEGV
```c
void *android_dlopen_ext(
    const char *filename,
    int flags,
    const android_dlextinfo *extinfo
);
```
通过`frida`attach hook`android_dlopen_ext`并在 onEnter中将`filename`指针指向改为一个已加载的官方库路径,就可以实现使`android_dlopen_ext`不崩溃正常返回handle的同时绕过`libmsaoaidsec.so`的加载
```js
const cheatPath = Memory.allocUtf8String(
    "/system/lib64/libc.so"
);

const libdl = Process.getModuleByName("libdl.so");

const android_dlopen_ext =
    libdl.getExportByName("android_dlopen_ext");

Interceptor.attach(android_dlopen_ext, {
	onEnter(args) {
		try {
            this.path = args[0].isNull()
                ? "<null>"
                : args[0].readUtf8String();
        } catch (e) {
            this.path = "<read error>";
        }
        if(this.path&&this.path.indexOf("libmsaoaidsec.so")!==-1){
            console.log("Block:"+this.path);
            args[0]=cheatPath;
            this.blocked = true;
        }
......}
})
```
dump 内存中的`libDexHelper.so`并修复后继续分析。最终将重点定位到`JNI_OnLoad`，随后通过运行时验证确认 Dex 会出现在匿名内存中，因此没有继续硬跟混淆严重的具体解密函数，而是直接在`JNI_OnLoad`返回后扫描内存中的 Dex Magic 并 Dump。
![Dump result](Pasted%20image%2020260919001349.png)
成功拿到真实application:`com.chaoxing.mobile.AppApplication`
