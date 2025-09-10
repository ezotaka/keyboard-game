import { ISoundManager } from './sound-manager-interface';
import { SoundType } from './sound-manager';

export class NullSoundManager implements ISoundManager {
    private enabled: boolean = false;

    playSound(soundType: SoundType, volume: number = 1.0): void {
        console.log('NullSoundManager: Playing sound', soundType, 'at volume', volume);
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    isEnabled(): boolean {
        return this.enabled;
    }
}