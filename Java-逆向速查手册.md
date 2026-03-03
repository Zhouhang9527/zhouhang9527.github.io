# ☕ Java 逆向速查手册

> 面向有 C/C++ 基础的逆向工程师，精简到能看懂 jadx 反编译代码。

---

## 一、基础语法

### 类 & 方法

```java
public class Crypto {            // 所有代码必须在 class 里
    String key;                  // 成员变量（属于对象）
    static int count = 0;        // 静态变量（属于类，全局共享）

    // 构造方法（new 时自动调用）
    public Crypto(String key) {
        this.key = key;          // this = 当前对象指针
    }

    // 普通方法：必须 new 出对象才能调用，有隐含 this
    // C 类比：void encrypt(Crypto *this, String data)
    public String encrypt(String data) {
        return data + this.key;
    }

    // 静态方法：不需要对象，直接 类名.方法() 调用，没有 this
    // C 类比：普通全局函数
    public static int getCount() {
        return count;
    }
}
```

**普通方法 vs 静态方法：**

| | 普通方法 | 静态方法 |
|--|---------|---------|
| 调用 | `obj.方法()` | `类名.方法()` |
| 有 this | ✅ | ❌ |
| 能访问成员变量 | ✅ | ❌ |
| C 类比 | `func(struct *this)` | 全局函数 |

### new

```java
Crypto c = new Crypto("key123");
// = C++ 的 new（堆分配 + 调构造），但不用 delete，Java 自动回收
```

### 变量类型

```
byte=1B  short=2B  int=4B  long=8B  float=4B  double=8B
boolean=true/false  char=2B(不是C的1B)  String=字符串对象

smali 缩写：I=int J=long Z=boolean B=byte Ljava/lang/String;=String
```

### 控制流

```java
if / else if / else      // 和 C 一样
for (int i=0; i<n; i++)  // 和 C 一样
for (int x : arr)        // 增强 for，遍历数组/集合
while / do-while         // 和 C 一样
switch / case / break    // 和 C 一样
```

### 异常

```java
try {
    risky();
} catch (Exception e) {    // 捕获异常，程序不崩
    e.getMessage();
} finally {                 // 不管有没有异常都执行
    cleanup();
}
throw new Exception("msg"); // 抛出异常
```

### static

```java
static int x = 0;              // 静态变量：全局一份
static void func() {}          // 静态方法：类名直接调
static { /* 代码 */ }           // 静态代码块：类加载时执行一次
// smali 中 static{} 对应 <clinit>
// 常见：System.loadLibrary("native-lib"); 加载so
```

### final

```java
final int X = 100;                     // 常量，不可改 ≈ C 的 const
static final String KEY = "secret";    // 逆向重点！硬编码密钥/URL
final class X {}                       // 不可被继承
final void func() {}                   // 不可被重写
```

---

## 二、面向对象

### 继承

```java
class Dog extends Animal {     // 单继承（不像C++可多继承）
    @Override                  // 安全标签，告诉编译器我在重写，删了也能跑
    public void eat() { }     // 重写父类方法
}
```

### 接口 = 定规矩 ≈ C 的函数指针 typedef

```java
interface Scanner {
    void scan(String file);    // 只定义签名，不实现
}

class AiScanner implements Scanner {  // 遵守规矩
    @Override
    public void scan(String file) { /* 具体实现 */ }
}

// 好处：统一调用方式，不用关心具体是哪个类
void run(Scanner s) { s.scan("file"); }  // 传什么 Scanner 都行
```

### 多态

```java
Shape s = new Circle();  // 父类引用指向子类对象
s.draw();                // 调用的是 Circle 的 draw()
s instanceof Circle      // 判断实际类型 → true
(Circle) s               // 强转
```

### 内部类 & 匿名类

```java
class Outer {
    class Inner { }                // 内部类，可访问 Outer 的 private
    static class StaticInner { }   // 静态内部类
}

// 匿名类 = 直接 new 接口/类 + {} 里写实现（不用单独定义类）
Runnable r = new Runnable() {      // 看起来像 new 接口
    @Override
    public void run() {            // 大括号里直接写逻辑
        System.out.println("go");
    }
};
// jadx 反编译后显示为 MainActivity$1, $2... （$数字 = 匿名类）
```

---

## 三、集合

### List（动态数组 ≈ Python list）

```java
List<String> list = new ArrayList<>();
list.add("a");           // 添加
list.get(0);             // 按下标取
list.size();             // 长度
list.remove(0);          // 删除
list.contains("a");      // 是否包含
for (String s : list) {} // 遍历
```

### Map / HashMap（键值对 ≈ Python dict）

```java
Map<String, String> map = new HashMap<>();
map.put("key", "val");          // 写入
map.get("key");                 // 读取（不存在返回 null）
map.containsKey("key");         // 是否有这个 key
for (Map.Entry<String,String> e : map.entrySet()) {
    e.getKey();  e.getValue();  // 遍历
}
```

---

## 四、反射 ≈ C 的 dlopen + dlsym

> 用字符串在运行时动态加载类、调用方法。恶意APK用来对抗静态分析。

```java
// 1. 获取类（类名是字符串，可以加密/拼接/从网上下载）
Class<?> clazz = Class.forName("com.example.Crypto");
// <?> = 泛型通配符，表示"不知道什么类型"，逆向时忽略

// 2. 获取方法
Method m = clazz.getDeclaredMethod("encrypt", String.class);

// 3. 绕过 private 权限
m.setAccessible(true);
// 为什么不用指定类？因为 m 是从 clazz 取出来的，已经绑定了类

// 4. 调用方法
Object result = m.invoke(obj, "hello");
// invoke(对象, 参数...)
// 第1个参数 = this 指针（静态方法传 null）
// obj 必须是对应类的实例

// 获取/修改私有字段
Field f = clazz.getDeclaredField("key");
f.setAccessible(true);
f.get(obj);              // 读值
f.set(obj, "newVal");    // 改值

// 创建对象
Constructor<?> c = clazz.getDeclaredConstructor(String.class);
c.setAccessible(true);
Object obj = c.newInstance("arg");
```

**API 速查：**

| 操作 | 方法 | C 类比 |
|------|------|--------|
| 获取类 | `Class.forName("类名")` | `dlopen("lib.so")` |
| 获取方法 | `getDeclaredMethod("名", 参数类型)` | `dlsym(lib, "func")` |
| 调用方法 | `method.invoke(obj, args)` | `func_ptr(args)` |
| 绕过权限 | `setAccessible(true)` | C 没权限控制 |
| `getDeclaredXxx` | 获取所有（含 private） | |
| `getXxx` | 仅获取 public | |

---

## 五、多线程

### Thread & Runnable

```java
// 方式1：继承 Thread
class MyThread extends Thread {
    public void run() { /* 子线程代码 */ }
}
new MyThread().start();  // start() 创建线程，不是 run()

// 方式2：Runnable 接口（推荐）
new Thread(new Runnable() {
    public void run() { /* 子线程代码 */ }
}).start();

// Lambda 写法
new Thread(() -> { /* 子线程代码 */ }).start();
```

### Handler + Looper（Android 特有）

```
问题：子线程不能更新 UI，怎么通知主线程？
答案：Handler！

Looper  = 消息循环（while 死循环不停取消息）
Handler = 发送 / 处理消息
Message = 消息数据

子线程                           主线程
  |  handler.sendMessage(msg) →  |  Looper 取出 → handleMessage() 处理
  |  handler.post(runnable)  →   |  Looper 取出 → runnable.run() 执行
```

```java
// 主线程创建 Handler
Handler handler = new Handler(Looper.getMainLooper()) {
    @Override
    public void handleMessage(Message msg) {
        // 在主线程执行，msg.what 区分消息类型
        switch (msg.what) {
            case 1: /* 处理类型1 */ break;
            case 2: /* 处理类型2 */ break;
        }
    }
};

// 子线程发消息
new Thread(() -> {
    Message msg = Message.obtain();
    msg.what = 1;
    msg.obj = "数据";
    handler.sendMessage(msg);           // 发送消息
    handler.post(() -> { /* UI操作 */ }); // 切到主线程执行
    handler.postDelayed(() -> {}, 3000);  // 延迟3秒执行
}).start();
```

---

## 六、jadx 速查

```
你在 jadx 里看到...              含义
──────────────────────────────────────────
public class Xxx                 一个类
extends Yyy                      继承 Yyy
implements Zzz                   实现接口 Zzz
@Override                        重写方法（可忽略）
MainActivity$1                   匿名内部类（第1个）
<clinit>                         static {} 代码块
<init>                           构造方法
static final String KEY = "..."  硬编码常量 ⚠️ 逆向重点
Class.forName(...)               反射加载类 ⚠️
method.invoke(...)               反射调用 ⚠️
setAccessible(true)              绕过 private ⚠️
System.loadLibrary("xxx")        加载 native so ⚠️
new HashMap<>() + put/get        键值对操作
new Thread().start()             启动线程
handler.sendMessage()            线程间通信
handler.post()                   切线程执行
```
