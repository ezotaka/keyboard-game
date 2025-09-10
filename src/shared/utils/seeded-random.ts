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