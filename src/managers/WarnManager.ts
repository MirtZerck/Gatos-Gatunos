import { FirebaseAdminManager } from './FirebaseAdminManager.js';
import { UserWarning, WarnAction, WarnActionResult, WarnConfig } from '../types/Warn.js';
import { randomUUID } from 'crypto';

const DEFAULT_CONFIG: WarnConfig = {
    timeoutThreshold: 3,
    kickThreshold: 5,
    banThreshold: 7,
    timeoutDuration: 60
};

export class WarnManager {
    private firebaseManager: FirebaseAdminManager;
    private config: WarnConfig;

    constructor(firebaseManager: FirebaseAdminManager, config?: Partial<WarnConfig>) {
        this.firebaseManager = firebaseManager;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    private getWarningsRef(guildId: string, userId: string) {
        return this.firebaseManager.getRef(`servers/${guildId}/warnings/${userId}`);
    }

    async addWarning(
        guildId: string,
        userId: string,
        moderatorId: string,
        moderatorTag: string,
        reason: string
    ): Promise<WarnActionResult> {
        const warning: UserWarning = {
            id: randomUUID(),
            moderatorId,
            moderatorTag,
            reason,
            timestamp: Date.now()
        };

        const warningsRef = this.getWarningsRef(guildId, userId);
        const snapshot = await warningsRef.get();
        const currentWarnings: UserWarning[] = snapshot.exists() ? snapshot.val() || [] : [];

        currentWarnings.push(warning);
        await warningsRef.set(currentWarnings);

        const totalWarnings = currentWarnings.length;
        let actionTaken: WarnAction | null = null;

        if (totalWarnings >= this.config.banThreshold) {
            actionTaken = WarnAction.BAN;
        } else if (totalWarnings >= this.config.kickThreshold) {
            actionTaken = WarnAction.KICK;
        } else if (totalWarnings >= this.config.timeoutThreshold) {
            actionTaken = WarnAction.TIMEOUT;
        }

        return { warning, totalWarnings, actionTaken };
    }

    async getWarnings(guildId: string, userId: string): Promise<UserWarning[]> {
        const warningsRef = this.getWarningsRef(guildId, userId);
        const snapshot = await warningsRef.get();
        return snapshot.exists() ? snapshot.val() || [] : [];
    }

    async getWarningCount(guildId: string, userId: string): Promise<number> {
        const warnings = await this.getWarnings(guildId, userId);
        return warnings.length;
    }

    async removeWarning(guildId: string, userId: string, warningId: string): Promise<boolean> {
        const warningsRef = this.getWarningsRef(guildId, userId);
        const snapshot = await warningsRef.get();

        if (!snapshot.exists()) return false;

        const warnings: UserWarning[] = snapshot.val() || [];
        const index = warnings.findIndex(w => w.id === warningId);

        if (index === -1) return false;

        warnings.splice(index, 1);

        if (warnings.length === 0) {
            await warningsRef.remove();
        } else {
            await warningsRef.set(warnings);
        }

        return true;
    }

    async clearWarnings(guildId: string, userId: string): Promise<number> {
        const warningsRef = this.getWarningsRef(guildId, userId);
        const snapshot = await warningsRef.get();

        if (!snapshot.exists()) return 0;

        const count = (snapshot.val() || []).length;
        await warningsRef.remove();
        return count;
    }

    async editWarning(
        guildId: string,
        userId: string,
        warningId: string,
        newReason: string
    ): Promise<boolean> {
        const warningsRef = this.getWarningsRef(guildId, userId);
        const snapshot = await warningsRef.get();

        if (!snapshot.exists()) return false;

        const warnings: UserWarning[] = snapshot.val() || [];
        const warning = warnings.find(w => w.id === warningId);

        if (!warning) return false;

        warning.reason = newReason;
        await warningsRef.set(warnings);
        return true;
    }

    getConfig(): WarnConfig {
        return { ...this.config };
    }

    getTimeoutDuration(): number {
        return this.config.timeoutDuration;
    }
}
