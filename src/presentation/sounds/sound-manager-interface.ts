import { SoundType } from './sound-manager';

export interface ISoundManager {
    playSound(soundType: SoundType, volume?: number): void;
    setEnabled(enabled: boolean): void;
    isEnabled(): boolean;
}