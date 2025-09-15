const { contextBridge, ipcRenderer } = require('electron');

// セキュアなAPIをレンダラープロセスに公開
contextBridge.exposeInMainWorld('electronAPI', {
    // キーボード情報の取得
    getKeyboards: () => ipcRenderer.invoke('get-keyboards'),
    
    // 入力履歴の取得
    getInputHistory: () => ipcRenderer.invoke('get-input-history'),
    
    // 履歴のクリア
    clearHistory: () => ipcRenderer.invoke('clear-history'),
    
    // イベントリスナー
    onKeyboardsDetected: (callback) => {
        ipcRenderer.on('keyboards-detected', (event, keyboards) => {
            callback(keyboards);
        });
    },
    
    onKeyInput: (callback) => {
        ipcRenderer.on('key-input', (event, keyEvent) => {
            callback(keyEvent);
        });
    },
    
    // イベントリスナーの削除
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});