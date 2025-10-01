#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>
#import <IOKit/hid/IOHIDManager.h>
#import <IOKit/hid/IOHIDKeys.h>
#import <IOKit/hid/IOHIDValue.h>
#import <IOKit/hid/IOHIDElement.h>
#include <node_api.h>
#include <uv.h>
#include <vector>
#include <map>
#include <string>
#include <iostream>
#include <queue>
#include <memory>
#include <thread>
#include <mutex>

struct KeyboardDevice {
    std::string name;
    std::string manufacturer;
    uint32_t vendorId;
    uint32_t productId;
    uint32_t locationId;
    IOHIDDeviceRef device;
    int keyboardId;  // 識別用ID
};

struct KeyEvent {
    int keyboardId;
    uint32_t usagePage;
    uint32_t usage;
    int32_t value;
    uint64_t timestamp;
    std::string keyName;
};

// AsyncDataは削除（使用しない）

class KeyboardDetector {
public:
    std::queue<KeyEvent> keyEventQueue;
    std::mutex queueMutex;
    napi_threadsafe_function keyEventCallback;

private:
    IOHIDManagerRef hidManager;
    std::vector<KeyboardDevice> keyboards;
    std::map<IOHIDDeviceRef, int> deviceToKeyboardMap;

public:
    KeyboardDetector() : keyEventCallback(nullptr), hidManager(nullptr) {}

    ~KeyboardDetector() {
        if (keyEventCallback) {
            napi_release_threadsafe_function(keyEventCallback, napi_tsfn_release);
        }
        if (hidManager) {
            IOHIDManagerClose(hidManager, kIOHIDOptionsTypeNone);
            CFRelease(hidManager);
        }
    }

    bool initialize() {
        hidManager = IOHIDManagerCreate(kCFAllocatorDefault, kIOHIDOptionsTypeNone);
        if (!hidManager) {
            std::cerr << "Failed to create IOHIDManager" << std::endl;
            return false;
        }

        // Set up matching dictionary for keyboards
        CFMutableDictionaryRef matchingDict = CFDictionaryCreateMutable(
            kCFAllocatorDefault, 0,
            &kCFTypeDictionaryKeyCallBacks,
            &kCFTypeDictionaryValueCallBacks);

        if (!matchingDict) {
            std::cerr << "Failed to create matching dictionary" << std::endl;
            return false;
        }

        // Match HID keyboards (usage page 1, usage 6)
        int usagePage = kHIDPage_GenericDesktop;
        int usage = kHIDUsage_GD_Keyboard;

        CFNumberRef usagePageRef = CFNumberCreate(kCFAllocatorDefault, kCFNumberIntType, &usagePage);
        CFNumberRef usageRef = CFNumberCreate(kCFAllocatorDefault, kCFNumberIntType, &usage);

        CFDictionarySetValue(matchingDict, CFSTR(kIOHIDDeviceUsagePageKey), usagePageRef);
        CFDictionarySetValue(matchingDict, CFSTR(kIOHIDDeviceUsageKey), usageRef);

        IOHIDManagerSetDeviceMatching(hidManager, matchingDict);

        // Register callbacks
        IOHIDManagerRegisterDeviceMatchingCallback(hidManager, deviceMatchingCallback, this);
        IOHIDManagerRegisterDeviceRemovalCallback(hidManager, deviceRemovalCallback, this);

        // Schedule with run loop
        IOHIDManagerScheduleWithRunLoop(hidManager, CFRunLoopGetCurrent(), kCFRunLoopDefaultMode);

        // Open the manager
        IOReturn result = IOHIDManagerOpen(hidManager, kIOHIDOptionsTypeNone);
        if (result != kIOReturnSuccess) {
            std::cerr << "Failed to open IOHIDManager: " << result << std::endl;
            CFRelease(matchingDict);
            CFRelease(usagePageRef);
            CFRelease(usageRef);
            return false;
        }

        std::cout << "IOHIDManager initialized successfully" << std::endl;

        // Clean up
        CFRelease(matchingDict);
        CFRelease(usagePageRef);
        CFRelease(usageRef);

        return true;
    }

    std::vector<KeyboardDevice> getDetectedKeyboards() {
        return keyboards;
    }

    void scanForKeyboards() {
        // 既存のキーボードはクリアしない（重複を防ぐため）
        std::cout << "Scanning for keyboards (current count: " << keyboards.size() << ")..." << std::endl;

        // Get current devices
        CFSetRef devices = IOHIDManagerCopyDevices(hidManager);
        if (!devices) {
            std::cout << "No HID devices found" << std::endl;
            return;
        }

        CFIndex deviceCount = CFSetGetCount(devices);
        std::cout << "Found " << deviceCount << " HID devices" << std::endl;

        if (deviceCount > 0) {
            IOHIDDeviceRef* deviceArray = (IOHIDDeviceRef*)malloc(sizeof(IOHIDDeviceRef) * deviceCount);
            CFSetGetValues(devices, (const void**)deviceArray);

            for (CFIndex i = 0; i < deviceCount; i++) {
                IOHIDDeviceRef device = deviceArray[i];

                // 既に追加済みかチェック
                auto it = deviceToKeyboardMap.find(device);
                if (it == deviceToKeyboardMap.end()) {
                    addKeyboard(device);
                } else {
                    std::cout << "Device already scanned, skipping..." << std::endl;
                }
            }

            free(deviceArray);
        }

        CFRelease(devices);

        std::cout << "Total keyboards detected: " << keyboards.size() << std::endl;
    }

    // キー入力イベントコールバック
    static void inputValueCallback(void* context, IOReturn result, void* sender, IOHIDValueRef value) {
        KeyboardDetector* detector = static_cast<KeyboardDetector*>(context);

        IOHIDElementRef element = IOHIDValueGetElement(value);
        IOHIDDeviceRef device = IOHIDElementGetDevice(element);

        auto it = detector->deviceToKeyboardMap.find(device);
        if (it == detector->deviceToKeyboardMap.end()) {
            return; // デバイスが見つからない
        }

        int keyboardIndex = it->second;
        if (keyboardIndex >= (int)detector->keyboards.size()) {
            return;
        }

        uint32_t usagePage = IOHIDElementGetUsagePage(element);
        uint32_t usage = IOHIDElementGetUsage(element);
        CFIndex integerValue = IOHIDValueGetIntegerValue(value);
        uint64_t timestamp = IOHIDValueGetTimeStamp(value);

        // 無効なusage値をフィルタリング
        if (usage == 0xFFFFFFFF || usage == 0) {
            return; // 無効なイベントをスキップ
        }

        // キーボードイベントのみ処理 (usage page 7 = キーボード/キーパッド)
        if (usagePage == kHIDPage_KeyboardOrKeypad && integerValue > 0) { // キー押下時のみ
            KeyEvent keyEvent;
            keyEvent.keyboardId = detector->keyboards[keyboardIndex].keyboardId;
            keyEvent.usagePage = usagePage;
            keyEvent.usage = usage;
            keyEvent.value = (int32_t)integerValue;
            keyEvent.timestamp = timestamp;
            keyEvent.keyName = detector->getKeyName(usage);

            // キューに追加
            {
                std::lock_guard<std::mutex> lock(detector->queueMutex);
                detector->keyEventQueue.push(keyEvent);
            }

            // JavaScriptコールバックがあれば呼び出し
            if (detector->keyEventCallback) {
                KeyEvent* eventCopy = new KeyEvent(keyEvent);
                napi_call_threadsafe_function(detector->keyEventCallback, eventCopy, napi_tsfn_blocking);
            }

            std::cout << "🎹 Key from KB-" << keyEvent.keyboardId << ": "
                      << keyEvent.keyName << " (usage: 0x" << std::hex << usage << std::dec << ")" << std::endl;
        }
    }

    // HID usage codeからキー名に変換
    std::string getKeyName(uint32_t usage) {
        // 基本的なキーのマッピング
        static const std::map<uint32_t, std::string> keyMap = {
            {0x04, "a"}, {0x05, "b"}, {0x06, "c"}, {0x07, "d"}, {0x08, "e"}, {0x09, "f"},
            {0x0A, "g"}, {0x0B, "h"}, {0x0C, "i"}, {0x0D, "j"}, {0x0E, "k"}, {0x0F, "l"},
            {0x10, "m"}, {0x11, "n"}, {0x12, "o"}, {0x13, "p"}, {0x14, "q"}, {0x15, "r"},
            {0x16, "s"}, {0x17, "t"}, {0x18, "u"}, {0x19, "v"}, {0x1A, "w"}, {0x1B, "x"},
            {0x1C, "y"}, {0x1D, "z"},
            {0x1E, "1"}, {0x1F, "2"}, {0x20, "3"}, {0x21, "4"}, {0x22, "5"},
            {0x23, "6"}, {0x24, "7"}, {0x25, "8"}, {0x26, "9"}, {0x27, "0"},
            {0x28, "Enter"}, {0x29, "Escape"}, {0x2A, "Backspace"}, {0x2B, "Tab"},
            {0x2C, "Space"}, {0x2D, "-"}, {0x2E, "="}, {0x2F, "["}, {0x30, "]"},
            {0x31, "\\"}, {0x33, ";"}, {0x34, "'"}, {0x35, "`"}, {0x36, ","},
            {0x37, "."}, {0x38, "/"}, {0x39, "CapsLock"},
            {0x3A, "F1"}, {0x3B, "F2"}, {0x3C, "F3"}, {0x3D, "F4"}, {0x3E, "F5"},
            {0x3F, "F6"}, {0x40, "F7"}, {0x41, "F8"}, {0x42, "F9"}, {0x43, "F10"},
            {0x44, "F11"}, {0x45, "F12"},
            {0xE0, "LeftCtrl"}, {0xE1, "LeftShift"}, {0xE2, "LeftAlt"}, {0xE3, "LeftCmd"},
            {0xE4, "RightCtrl"}, {0xE5, "RightShift"}, {0xE6, "RightAlt"}, {0xE7, "RightCmd"}
        };

        auto it = keyMap.find(usage);
        if (it != keyMap.end()) {
            return it->second;
        }
        char buffer[32];
        snprintf(buffer, sizeof(buffer), "Unknown(0x%X)", usage);
        return std::string(buffer);
    }

private:
    static void deviceMatchingCallback(void* context, IOReturn result, void* sender, IOHIDDeviceRef device) {
        KeyboardDetector* detector = static_cast<KeyboardDetector*>(context);
        std::cout << "Device connected" << std::endl;

        // 既に追加済みかチェック
        auto it = detector->deviceToKeyboardMap.find(device);
        if (it != detector->deviceToKeyboardMap.end()) {
            std::cout << "Device already exists, skipping..." << std::endl;
            return;
        }

        detector->addKeyboard(device);
    }

    static void deviceRemovalCallback(void* context, IOReturn result, void* sender, IOHIDDeviceRef device) {
        KeyboardDetector* detector = static_cast<KeyboardDetector*>(context);
        std::cout << "Device disconnected" << std::endl;
        detector->removeKeyboard(device);
    }

    void addKeyboard(IOHIDDeviceRef device) {
        if (!device) return;

        // Get device properties
        CFStringRef productNameRef = (CFStringRef)IOHIDDeviceGetProperty(device, CFSTR(kIOHIDProductKey));
        CFStringRef manufacturerRef = (CFStringRef)IOHIDDeviceGetProperty(device, CFSTR(kIOHIDManufacturerKey));
        CFNumberRef vendorIdRef = (CFNumberRef)IOHIDDeviceGetProperty(device, CFSTR(kIOHIDVendorIDKey));
        CFNumberRef productIdRef = (CFNumberRef)IOHIDDeviceGetProperty(device, CFSTR(kIOHIDProductIDKey));
        CFNumberRef locationIdRef = (CFNumberRef)IOHIDDeviceGetProperty(device, CFSTR(kIOHIDLocationIDKey));

        KeyboardDevice kbd;

        // Extract product name
        if (productNameRef) {
            const char* productName = CFStringGetCStringPtr(productNameRef, kCFStringEncodingUTF8);
            if (productName) {
                kbd.name = std::string(productName);
            } else {
                char buffer[256];
                if (CFStringGetCString(productNameRef, buffer, sizeof(buffer), kCFStringEncodingUTF8)) {
                    kbd.name = std::string(buffer);
                }
            }
        } else {
            kbd.name = "Unknown Keyboard";
        }

        // Extract manufacturer
        if (manufacturerRef) {
            const char* manufacturer = CFStringGetCStringPtr(manufacturerRef, kCFStringEncodingUTF8);
            if (manufacturer) {
                kbd.manufacturer = std::string(manufacturer);
            } else {
                char buffer[256];
                if (CFStringGetCString(manufacturerRef, buffer, sizeof(buffer), kCFStringEncodingUTF8)) {
                    kbd.manufacturer = std::string(buffer);
                }
            }
        } else {
            kbd.manufacturer = "Unknown";
        }

        // Extract vendor and product IDs
        if (vendorIdRef) {
            CFNumberGetValue(vendorIdRef, kCFNumberSInt32Type, &kbd.vendorId);
        }

        if (productIdRef) {
            CFNumberGetValue(productIdRef, kCFNumberSInt32Type, &kbd.productId);
        }

        if (locationIdRef) {
            CFNumberGetValue(locationIdRef, kCFNumberSInt32Type, &kbd.locationId);
        }

        kbd.device = device;

        // キーボードをリストに追加してからIDを設定
        keyboards.push_back(kbd);
        int keyboardIndex = keyboards.size() - 1;

        // キーボードIDは1ベースで設定（kb-1, kb-2, ...）
        keyboards[keyboardIndex].keyboardId = keyboardIndex + 1;

        // 入力値コールバックを登録
        IOHIDDeviceRegisterInputValueCallback(device, inputValueCallback, this);

        deviceToKeyboardMap[device] = keyboardIndex;

        std::cout << "Added keyboard: " << kbd.name << " (" << kbd.manufacturer << ")" << std::endl;
        std::cout << "  Vendor ID: 0x" << std::hex << kbd.vendorId << std::dec << std::endl;
        std::cout << "  Product ID: 0x" << std::hex << kbd.productId << std::dec << std::endl;
        std::cout << "  Location ID: 0x" << std::hex << kbd.locationId << std::dec << std::endl;
    }

    void removeKeyboard(IOHIDDeviceRef device) {
        auto it = deviceToKeyboardMap.find(device);
        if (it != deviceToKeyboardMap.end()) {
            int index = it->second;
            if (index >= 0 && index < (int)keyboards.size()) {
                std::cout << "Removed keyboard: " << keyboards[index].name << std::endl;
                keyboards.erase(keyboards.begin() + index);
                deviceToKeyboardMap.erase(it);

                // Update remaining indices
                for (auto& pair : deviceToKeyboardMap) {
                    if (pair.second > index) {
                        pair.second--;
                    }
                }
            }
        }
    }
};

static KeyboardDetector* detector = nullptr;

napi_value Initialize(napi_env env, napi_callback_info info) {
    if (!detector) {
        detector = new KeyboardDetector();
    }

    bool success = detector->initialize();

    napi_value result;
    napi_get_boolean(env, success, &result);
    return result;
}

napi_value ScanKeyboards(napi_env env, napi_callback_info info) {
    if (!detector) {
        napi_value result;
        napi_create_array_with_length(env, 0, &result);
        return result;
    }

    detector->scanForKeyboards();
    std::vector<KeyboardDevice> keyboards = detector->getDetectedKeyboards();

    napi_value result;
    napi_create_array_with_length(env, keyboards.size(), &result);

    for (size_t i = 0; i < keyboards.size(); i++) {
        napi_value keyboard;
        napi_create_object(env, &keyboard);

        napi_value name, manufacturer, vendorId, productId, locationId;
        napi_create_string_utf8(env, keyboards[i].name.c_str(), NAPI_AUTO_LENGTH, &name);
        napi_create_string_utf8(env, keyboards[i].manufacturer.c_str(), NAPI_AUTO_LENGTH, &manufacturer);
        napi_create_uint32(env, keyboards[i].vendorId, &vendorId);
        napi_create_uint32(env, keyboards[i].productId, &productId);
        napi_create_uint32(env, keyboards[i].locationId, &locationId);

        napi_set_named_property(env, keyboard, "name", name);
        napi_set_named_property(env, keyboard, "manufacturer", manufacturer);
        napi_set_named_property(env, keyboard, "vendorId", vendorId);
        napi_set_named_property(env, keyboard, "productId", productId);
        napi_set_named_property(env, keyboard, "locationId", locationId);

        napi_set_element(env, result, i, keyboard);
    }

    return result;
}

napi_value GetKeyboardCount(napi_env env, napi_callback_info info) {
    if (!detector) {
        napi_value result;
        napi_create_uint32(env, 0, &result);
        return result;
    }

    std::vector<KeyboardDevice> keyboards = detector->getDetectedKeyboards();

    napi_value result;
    napi_create_uint32(env, keyboards.size(), &result);
    return result;
}

// キーイベントコールバック用のスレッドセーフ関数コールバック
void keyEventCallbackJS(napi_env env, napi_value js_callback, void* context, void* data) {
    KeyEvent* keyEvent = static_cast<KeyEvent*>(data);

    if (env != nullptr) {
        napi_value undefined, keyEventObj;
        napi_get_undefined(env, &undefined);

        // KeyEventオブジェクトを作成
        napi_create_object(env, &keyEventObj);

        napi_value keyboardId, usagePage, usage, value, timestamp, keyName;
        napi_create_int32(env, keyEvent->keyboardId, &keyboardId);
        napi_create_uint32(env, keyEvent->usagePage, &usagePage);
        napi_create_uint32(env, keyEvent->usage, &usage);
        napi_create_int32(env, keyEvent->value, &value);
        napi_create_bigint_uint64(env, keyEvent->timestamp, &timestamp);
        napi_create_string_utf8(env, keyEvent->keyName.c_str(), NAPI_AUTO_LENGTH, &keyName);

        napi_set_named_property(env, keyEventObj, "keyboardId", keyboardId);
        napi_set_named_property(env, keyEventObj, "usagePage", usagePage);
        napi_set_named_property(env, keyEventObj, "usage", usage);
        napi_set_named_property(env, keyEventObj, "value", value);
        napi_set_named_property(env, keyEventObj, "timestamp", timestamp);
        napi_set_named_property(env, keyEventObj, "keyName", keyName);

        // コールバックを呼び出し
        if (js_callback != nullptr) {
            napi_value global, result;
            napi_get_global(env, &global);
            napi_call_function(env, global, js_callback, 1, &keyEventObj, &result);
        }
    }

    delete keyEvent;
}

napi_value SetKeyEventCallback(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc != 1) {
        napi_throw_error(env, nullptr, "Expected exactly one argument (callback function)");
        return nullptr;
    }

    napi_valuetype valuetype;
    napi_typeof(env, args[0], &valuetype);
    if (valuetype != napi_function) {
        napi_throw_error(env, nullptr, "Expected first argument to be a function");
        return nullptr;
    }

    if (!detector) {
        napi_throw_error(env, nullptr, "Detector not initialized");
        return nullptr;
    }

    // 既存のコールバックをクリーンアップ
    if (detector->keyEventCallback) {
        napi_release_threadsafe_function(detector->keyEventCallback, napi_tsfn_release);
    }

    // スレッドセーフ関数を作成
    napi_value resourceName;
    napi_create_string_utf8(env, "KeyEventCallback", NAPI_AUTO_LENGTH, &resourceName);

    napi_create_threadsafe_function(
        env,
        args[0],
        nullptr,
        resourceName,
        0,
        1,
        nullptr,
        nullptr,
        nullptr,
        keyEventCallbackJS,
        &detector->keyEventCallback
    );

    napi_value result;
    napi_get_boolean(env, true, &result);
    return result;
}

napi_value GetNextKeyEvent(napi_env env, napi_callback_info info) {
    if (!detector) {
        napi_value result;
        napi_get_null(env, &result);
        return result;
    }

    std::lock_guard<std::mutex> lock(detector->queueMutex);
    if (detector->keyEventQueue.empty()) {
        napi_value result;
        napi_get_null(env, &result);
        return result;
    }

    KeyEvent keyEvent = detector->keyEventQueue.front();
    detector->keyEventQueue.pop();

    // KeyEventオブジェクトを作成
    napi_value keyEventObj;
    napi_create_object(env, &keyEventObj);

    napi_value keyboardId, usagePage, usage, value, timestamp, keyName;
    napi_create_int32(env, keyEvent.keyboardId, &keyboardId);
    napi_create_uint32(env, keyEvent.usagePage, &usagePage);
    napi_create_uint32(env, keyEvent.usage, &usage);
    napi_create_int32(env, keyEvent.value, &value);
    napi_create_bigint_uint64(env, keyEvent.timestamp, &timestamp);
    napi_create_string_utf8(env, keyEvent.keyName.c_str(), NAPI_AUTO_LENGTH, &keyName);

    napi_set_named_property(env, keyEventObj, "keyboardId", keyboardId);
    napi_set_named_property(env, keyEventObj, "usagePage", usagePage);
    napi_set_named_property(env, keyEventObj, "usage", usage);
    napi_set_named_property(env, keyEventObj, "value", value);
    napi_set_named_property(env, keyEventObj, "timestamp", timestamp);
    napi_set_named_property(env, keyEventObj, "keyName", keyName);

    return keyEventObj;
}

napi_value Init(napi_env env, napi_value exports) {
    napi_value initializeFn, scanKeyboardsFn, getKeyboardCountFn, setKeyEventCallbackFn, getNextKeyEventFn;

    napi_create_function(env, nullptr, 0, Initialize, nullptr, &initializeFn);
    napi_create_function(env, nullptr, 0, ScanKeyboards, nullptr, &scanKeyboardsFn);
    napi_create_function(env, nullptr, 0, GetKeyboardCount, nullptr, &getKeyboardCountFn);
    napi_create_function(env, nullptr, 0, SetKeyEventCallback, nullptr, &setKeyEventCallbackFn);
    napi_create_function(env, nullptr, 0, GetNextKeyEvent, nullptr, &getNextKeyEventFn);

    napi_set_named_property(env, exports, "initialize", initializeFn);
    napi_set_named_property(env, exports, "scanKeyboards", scanKeyboardsFn);
    napi_set_named_property(env, exports, "getKeyboardCount", getKeyboardCountFn);
    napi_set_named_property(env, exports, "setKeyEventCallback", setKeyEventCallbackFn);
    napi_set_named_property(env, exports, "getNextKeyEvent", getNextKeyEventFn);

    return exports;
}

NAPI_MODULE(keyboard_detector, Init)