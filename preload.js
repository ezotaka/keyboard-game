const { contextBridge, ipcRenderer } = require('electron');

// セキュアなAPIをレンダラープロセスに公開
contextBridge.exposeInMainWorld('electronAPI', {
    // キーボード関連API
    getKeyboards: () => ipcRenderer.invoke('get-keyboards'),
    rescanKeyboards: () => ipcRenderer.invoke('rescan-keyboards'),

    // 入力履歴API
    getInputHistory: () => ipcRenderer.invoke('get-input-history'),
    clearHistory: () => ipcRenderer.invoke('clear-history'),

    // イベントリスナー
    onKeyboardsDetected: (callback) => {
        ipcRenderer.on('keyboards-detected', (event, keyboards) => callback(keyboards));
    },

    onKeyboardsUpdated: (callback) => {
        ipcRenderer.on('keyboards-updated', (event, keyboards) => callback(keyboards));
    },

    onRealKeyInput: (callback) => {
        ipcRenderer.on('real-key-input', (event, keyEvent) => callback(keyEvent));
    },

    onKeyInput: (callback) => {
        ipcRenderer.on('key-input', (event, keyEvent) => callback(keyEvent));
    },

    // クリーンアップ
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});