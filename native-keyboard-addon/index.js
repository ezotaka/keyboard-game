const path = require('path');
const os = require('os');

let nativeAddon;

try {
    // プラットフォーム別のネイティブアドオンをロード
    const platform = os.platform();
    const addonPath = path.join(__dirname, 'build', 'Release', 'keyboard_detector.node');

    console.log(`Loading native addon for platform: ${platform}`);
    console.log(`Addon path: ${addonPath}`);

    nativeAddon = require(addonPath);
    console.log('Native addon loaded successfully');

} catch (error) {
    console.error('Failed to load native addon:', error.message);
    console.error('Build the addon with: npm run build');

    // フォールバック: ダミー実装
    nativeAddon = {
        initialize: () => {
            console.log('Using fallback implementation - native addon not available');
            return false;
        },
        scanKeyboards: () => {
            console.log('Fallback: No keyboards detected');
            return [];
        },
        getKeyboardCount: () => {
            console.log('Fallback: 0 keyboards');
            return 0;
        }
    };
}

class KeyboardDetector {
    constructor() {
        this.initialized = false;
        this.keyEventCallback = null;
    }

    /**
     * IOHIDManagerを初期化
     * @returns {boolean} 初期化成功
     */
    initialize() {
        try {
            console.log('Initializing keyboard detector...');
            this.initialized = nativeAddon.initialize();
            console.log(`Initialization ${this.initialized ? 'successful' : 'failed'}`);
            return this.initialized;
        } catch (error) {
            console.error('Error during initialization:', error);
            return false;
        }
    }

    /**
     * 接続されているキーボードをスキャン
     * @returns {Array} キーボード情報の配列
     */
    scanKeyboards() {
        if (!this.initialized) {
            console.warn('Detector not initialized. Call initialize() first.');
            return [];
        }

        try {
            console.log('Scanning for keyboards...');
            const keyboards = nativeAddon.scanKeyboards();
            console.log(`Found ${keyboards.length} keyboard(s)`);

            keyboards.forEach((kbd, index) => {
                console.log(`Keyboard ${index + 1}:`);
                console.log(`  Name: ${kbd.name}`);
                console.log(`  Manufacturer: ${kbd.manufacturer}`);
                console.log(`  Vendor ID: 0x${kbd.vendorId.toString(16)}`);
                console.log(`  Product ID: 0x${kbd.productId.toString(16)}`);
                console.log(`  Location ID: 0x${kbd.locationId.toString(16)}`);
            });

            return keyboards;
        } catch (error) {
            console.error('Error during keyboard scan:', error);
            return [];
        }
    }

    /**
     * 検知されたキーボード数を取得
     * @returns {number} キーボード数
     */
    getKeyboardCount() {
        if (!this.initialized) {
            console.warn('Detector not initialized. Call initialize() first.');
            return 0;
        }

        try {
            const count = nativeAddon.getKeyboardCount();
            console.log(`Total keyboards: ${count}`);
            return count;
        } catch (error) {
            console.error('Error getting keyboard count:', error);
            return 0;
        }
    }

    /**
     * キーイベントのコールバック関数を設定
     * @param {function} callback キーイベントを受け取るコールバック関数
     */
    setKeyEventCallback(callback) {
        if (!this.initialized) {
            console.warn('Detector not initialized. Call initialize() first.');
            return false;
        }

        try {
            this.keyEventCallback = callback;
            const success = nativeAddon.setKeyEventCallback(callback);
            console.log(`Key event callback ${success ? 'registered' : 'failed to register'}`);
            return success;
        } catch (error) {
            console.error('Error setting key event callback:', error);
            return false;
        }
    }

    /**
     * キューから次のキーイベントを取得（ポーリング用）
     * @returns {Object|null} キーイベントオブジェクト、またはnull
     */
    getNextKeyEvent() {
        if (!this.initialized) {
            console.warn('Detector not initialized. Call initialize() first.');
            return null;
        }

        try {
            return nativeAddon.getNextKeyEvent();
        } catch (error) {
            console.error('Error getting next key event:', error);
            return null;
        }
    }

    /**
     * キーイベントのポーリングを開始
     * @param {function} callback キーイベントを受け取るコールバック関数
     * @param {number} intervalMs ポーリング間隔（ミリ秒）
     */
    startKeyEventPolling(callback, intervalMs = 10) {
        if (!this.initialized) {
            console.warn('Detector not initialized. Call initialize() first.');
            return null;
        }

        const pollInterval = setInterval(() => {
            const keyEvent = this.getNextKeyEvent();
            if (keyEvent) {
                callback(keyEvent);
            }
        }, intervalMs);

        console.log(`Key event polling started (interval: ${intervalMs}ms)`);
        return pollInterval;
    }

    /**
     * キーイベントのポーリングを停止
     * @param {number} pollInterval startKeyEventPollingから返されたinterval ID
     */
    stopKeyEventPolling(pollInterval) {
        if (pollInterval) {
            clearInterval(pollInterval);
            console.log('Key event polling stopped');
        }
    }
}

module.exports = {
    KeyboardDetector,
    // 直接関数のエクスポートも提供
    initialize: () => nativeAddon.initialize(),
    scanKeyboards: () => nativeAddon.scanKeyboards(),
    getKeyboardCount: () => nativeAddon.getKeyboardCount(),
    setKeyEventCallback: (callback) => nativeAddon.setKeyEventCallback(callback),
    getNextKeyEvent: () => nativeAddon.getNextKeyEvent()
};