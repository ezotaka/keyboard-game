import { contextBridge, ipcRenderer } from 'electron';

const keyboardGameAPI = {
    onKeyboardInput: (callback: (data: any) => void) => {
        ipcRenderer.on('keyboard-input', (_event, data) => callback(data));
    },
    
    startGame: async (config: any) => {
        return ipcRenderer.invoke('start-game', config);
    },
    
    stopGame: async () => {
        return ipcRenderer.invoke('stop-game');
    },
    
    getKeyboards: async () => {
        return ipcRenderer.invoke('get-keyboards');
    }
};

// contextIsolation: false なので、直接windowに割り当て
(window as any).keyboardGameAPI = keyboardGameAPI;