import { PrizeLadder } from '../types/millionaire.js';

export const PRIZE_LADDER: PrizeLadder[] = [
    { level: 1, amount: 100, isSafeHaven: false, difficulty: 'easy' },
    { level: 2, amount: 200, isSafeHaven: false, difficulty: 'easy' },
    { level: 3, amount: 300, isSafeHaven: false, difficulty: 'easy' },
    { level: 4, amount: 500, isSafeHaven: false, difficulty: 'easy' },
    { level: 5, amount: 1000, isSafeHaven: true, difficulty: 'easy' },
    { level: 6, amount: 2000, isSafeHaven: false, difficulty: 'easy' },
    { level: 7, amount: 4000, isSafeHaven: false, difficulty: 'easy' },
    { level: 8, amount: 8000, isSafeHaven: false, difficulty: 'easy' },
    { level: 9, amount: 16000, isSafeHaven: false, difficulty: 'easy' },
    { level: 10, amount: 32000, isSafeHaven: true, difficulty: 'easy' },
    { level: 11, amount: 64000, isSafeHaven: false, difficulty: 'medium' },
    { level: 12, amount: 125000, isSafeHaven: false, difficulty: 'medium' },
    { level: 13, amount: 250000, isSafeHaven: false, difficulty: 'medium' },
    { level: 14, amount: 500000, isSafeHaven: false, difficulty: 'hard' },
    { level: 15, amount: 1000000, isSafeHaven: false, difficulty: 'hard' }
];

export function getPrizeForLevel(level: number): PrizeLadder | undefined {
    return PRIZE_LADDER.find(prize => prize.level === level);
}

export function getDifficultyForLevel(level: number): 'easy' | 'medium' | 'hard' {
    const prize = getPrizeForLevel(level);
    return prize ? prize.difficulty : 'easy';
}

export function getNextSafeHaven(currentLevel: number): number {
    const nextSafeHaven = PRIZE_LADDER.find(
        prize => prize.level > currentLevel && prize.isSafeHaven
    );
    return nextSafeHaven ? nextSafeHaven.level : 15;
}

export function getLastSafeHaven(currentLevel: number): number {
    const safeHavens = PRIZE_LADDER.filter(
        prize => prize.level <= currentLevel && prize.isSafeHaven
    );
    return safeHavens.length > 0 ? safeHavens[safeHavens.length - 1].amount : 0;
}

export function formatPrize(amount: number): string {
    return `$${amount.toLocaleString('en-US')}`;
}
