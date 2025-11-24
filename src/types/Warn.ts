export interface UserWarning {
    id: string;
    moderatorId: string;
    moderatorTag: string;
    reason: string;
    timestamp: number;
}

export interface WarnActionResult {
    warning: UserWarning;
    totalWarnings: number;
    actionTaken: WarnAction | null;
}

export enum WarnAction {
    NONE = 'none',
    TIMEOUT = 'timeout',
    KICK = 'kick',
    BAN = 'ban'
}

export interface WarnConfig {
    timeoutThreshold: number;
    kickThreshold: number;
    banThreshold: number;
    timeoutDuration: number;
}
