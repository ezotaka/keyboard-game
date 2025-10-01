export class SeededRandom {
    private seed: number;

    constructor(seed: number = Date.now()) {
        this.seed = seed;
    }

    next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    nextInRange(min: number, max: number): number {
        return min + this.next() * (max - min);
    }
}

/**
 * シード値に基づいて配列をシャッフル
 */
export function seededShuffle<T>(array: T[], seed?: string): T[] {
    if (array.length <= 1) return [...array];

    const seedValue = seed ? stringToSeed(seed) : Date.now();
    const rng = new SeededRandom(seedValue);
    const result = [...array];

    // Fisher-Yates shuffle algorithm with seeded random
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

/**
 * ユニークなIDを生成
 */
export function generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 文字列をシード値に変換
 */
function stringToSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}