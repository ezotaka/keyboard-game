declare interface KeyboardGameAPI {
    onKeyboardInput: (callback: (data: any) => void) => void;
    startGame: (config: any) => Promise<void>;
    stopGame: () => Promise<void>;
    getKeyboards: () => Promise<any[]>;
}

declare global {
    interface Window {
        keyboardGameAPI?: KeyboardGameAPI;
    }
}

export {};