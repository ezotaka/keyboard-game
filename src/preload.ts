import { contextBridge, ipcRenderer } from 'electron';

export interface KeyboardGameAPI {
    onKeyboardInput: (callback: (data: any) => void) => void;
    startGame: (config: any) => Promise<void>;
    stopGame: () => Promise<void>;
    getKeyboards: () => Promise<any[]>;
}

const keyboardGameAPI: KeyboardGameAPI = {
    onKeyboardInput: (callback) => {
        ipcRenderer.on('keyboard-input', (_event, data) => callback(data));
    },
    
    startGame: async (config) => {
        return ipcRenderer.invoke('start-game', config);
    },
    
    stopGame: async () => {
        return ipcRenderer.invoke('stop-game');
    },
    
    getKeyboards: async () => {
        return ipcRenderer.invoke('get-keyboards');
    }
};

contextBridge.exposeInMainWorld('keyboardGameAPI', keyboardGameAPI);