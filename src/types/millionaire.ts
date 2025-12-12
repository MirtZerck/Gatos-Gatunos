import { Message } from 'discord.js';

export interface MillionaireGameRoom {
    hostId: string;
    playerId: string;
    channelId: string;
    guildId: string;
    started: boolean;
    hasHost: boolean;
    currentQuestionIndex: number;
    currentPrize: number;
    safeHavenReached: number;
    currentQuestion?: TriviaQuestion;
    usedQuestionIds: Set<string>;
    lifelines: {
        fiftyFifty: boolean;
        askAudience: boolean;
        callFriend: boolean;
        changeQuestion: boolean;
    };
    lobbyMessage?: Message;
    gameMessage?: Message;
    timeoutId?: NodeJS.Timeout;
    eliminatedAnswers?: string[];
    sessionToken?: string;
}

export interface TriviaQuestion {
    id: string;
    question: string;
    correctAnswer: string;
    incorrectAnswers: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    imageUrl?: string;
    allAnswers?: string[];
}

export interface PrizeLadder {
    level: number;
    amount: number;
    isSafeHaven: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
}

export interface MillionaireStats {
    gamesPlayed: number;
    totalWinnings: number;
    highestLevel: number;
    highestWinning: number;
    lifelinesUsed: {
        fiftyFifty: number;
        askAudience: number;
        callFriend: number;
        changeQuestion: number;
    };
    questionsAnswered: number;
    correctAnswers: number;
    lastPlayed: number;
}

export interface GameEndData {
    userId: string;
    level: number;
    winnings: number;
    questionsAnswered: number;
    correctAnswers: number;
    lifelinesUsed: {
        fiftyFifty: boolean;
        askAudience: boolean;
        callFriend: boolean;
        changeQuestion: boolean;
    };
}

export interface LeaderboardEntry {
    userId: string;
    totalWinnings: number;
    highestLevel: number;
    highestWinning: number;
    gamesPlayed: number;
}

export interface OpenTDBResponse {
    response_code: number;
    results: OpenTDBQuestion[];
}

export interface OpenTDBQuestion {
    category: string;
    type: string;
    difficulty: string;
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
}

export interface OpenTDBTokenResponse {
    response_code: number;
    response_message: string;
    token: string;
}
