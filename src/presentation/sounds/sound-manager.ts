export enum SoundType {
    SUCCESS = 'success',
    ERROR = 'error',
    GAME_START = 'game_start',
    GAME_END = 'game_end',
    COUNTDOWN = 'countdown',
    TYPING = 'typing',
    WINNER = 'winner'
}

export class SoundManager {
    private audioContext: AudioContext | null = null;
    private sounds: Map<SoundType, AudioBuffer> = new Map();
    private enabled: boolean = true;

    constructor() {
        this.initAudioContext();
        this.generateSounds();
    }

    private initAudioContext(): void {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
            this.enabled = false;
        }
    }

    private async generateSounds(): Promise<void> {
        if (!this.audioContext || !this.enabled) return;

        try {
            // 成功音 - 明るいベル音
            this.sounds.set(SoundType.SUCCESS, await this.createSuccessSound());
            
            // エラー音 - 低い警告音
            this.sounds.set(SoundType.ERROR, await this.createErrorSound());
            
            // ゲーム開始音 - ファンファーレ
            this.sounds.set(SoundType.GAME_START, await this.createGameStartSound());
            
            // ゲーム終了音 - 完了チャイム
            this.sounds.set(SoundType.GAME_END, await this.createGameEndSound());
            
            // カウントダウン音 - ティック音
            this.sounds.set(SoundType.COUNTDOWN, await this.createCountdownSound());
            
            // タイピング音 - 軽いクリック音
            this.sounds.set(SoundType.TYPING, await this.createTypingSound());
            
            // 勝利音 - 勝利ファンファーレ
            this.sounds.set(SoundType.WINNER, await this.createWinnerSound());
            
        } catch (error) {
            console.warn('Sound generation failed:', error);
        }
    }

    private async createSuccessSound(): Promise<AudioBuffer> {
        const sampleRate = this.audioContext!.sampleRate;
        const duration = 0.3;
        const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // 和音でベル音を作成
            const freq1 = 523.25; // C5
            const freq2 = 659.25; // E5  
            const freq3 = 783.99; // G5
            const envelope = Math.exp(-t * 4); // 減衰エンベロープ
            
            data[i] = envelope * 0.3 * (
                Math.sin(2 * Math.PI * freq1 * t) +
                Math.sin(2 * Math.PI * freq2 * t) +
                Math.sin(2 * Math.PI * freq3 * t)
            );
        }

        return buffer;
    }

    private async createErrorSound(): Promise<AudioBuffer> {
        const sampleRate = this.audioContext!.sampleRate;
        const duration = 0.2;
        const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq = 220; // A3 - 低めの音
            const envelope = Math.exp(-t * 8);
            
            data[i] = envelope * 0.4 * Math.sin(2 * Math.PI * freq * t);
        }

        return buffer;
    }

    private async createGameStartSound(): Promise<AudioBuffer> {
        const sampleRate = this.audioContext!.sampleRate;
        const duration = 1.0;
        const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        // ファンファーレ風の音階
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4-E4-G4-C5
        const noteLength = duration / notes.length;

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const noteIndex = Math.floor(t / noteLength);
            const noteTime = (t % noteLength) / noteLength;
            
            if (noteIndex < notes.length) {
                const freq = notes[noteIndex];
                const envelope = Math.exp(-noteTime * 2);
                data[i] = envelope * 0.3 * Math.sin(2 * Math.PI * freq * t);
            }
        }

        return buffer;
    }

    private async createGameEndSound(): Promise<AudioBuffer> {
        const sampleRate = this.audioContext!.sampleRate;
        const duration = 0.8;
        const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq1 = 440; // A4
            const freq2 = 554.37; // C#5
            const freq3 = 659.25; // E5
            const envelope = Math.exp(-t * 1.5);
            
            data[i] = envelope * 0.25 * (
                Math.sin(2 * Math.PI * freq1 * t) +
                Math.sin(2 * Math.PI * freq2 * t) +
                Math.sin(2 * Math.PI * freq3 * t)
            );
        }

        return buffer;
    }

    private async createCountdownSound(): Promise<AudioBuffer> {
        const sampleRate = this.audioContext!.sampleRate;
        const duration = 0.1;
        const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq = 800; // 高めのクリック音
            const envelope = Math.exp(-t * 20);
            
            data[i] = envelope * 0.3 * Math.sin(2 * Math.PI * freq * t);
        }

        return buffer;
    }

    private async createTypingSound(): Promise<AudioBuffer> {
        const sampleRate = this.audioContext!.sampleRate;
        const duration = 0.05;
        const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq = 1000 + Math.random() * 200; // ランダムな高音
            const envelope = Math.exp(-t * 50);
            
            data[i] = envelope * 0.1 * Math.sin(2 * Math.PI * freq * t);
        }

        return buffer;
    }

    private async createWinnerSound(): Promise<AudioBuffer> {
        const sampleRate = this.audioContext!.sampleRate;
        const duration = 2.0;
        const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        // 勝利の音楽フレーズ
        const melody = [
            { freq: 523.25, start: 0.0, duration: 0.2 }, // C5
            { freq: 659.25, start: 0.2, duration: 0.2 }, // E5
            { freq: 783.99, start: 0.4, duration: 0.2 }, // G5
            { freq: 1046.5, start: 0.6, duration: 0.4 }, // C6
            { freq: 783.99, start: 1.0, duration: 0.2 }, // G5
            { freq: 1046.5, start: 1.2, duration: 0.8 }  // C6 (長め)
        ];

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            let amplitude = 0;

            for (const note of melody) {
                if (t >= note.start && t < note.start + note.duration) {
                    const noteTime = t - note.start;
                    const envelope = Math.exp(-noteTime * 2);
                    amplitude += envelope * Math.sin(2 * Math.PI * note.freq * t);
                }
            }

            data[i] = amplitude * 0.2;
        }

        return buffer;
    }

    public playSound(soundType: SoundType, volume: number = 1.0): void {
        if (!this.audioContext || !this.enabled || !this.sounds.has(soundType)) {
            return;
        }

        try {
            const buffer = this.sounds.get(soundType)!;
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = buffer;
            gainNode.gain.value = Math.max(0, Math.min(1, volume));

            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            source.start();
        } catch (error) {
            console.warn('Failed to play sound:', error);
        }
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }
}