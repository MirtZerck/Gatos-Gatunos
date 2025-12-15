import { randomBytes } from 'crypto';
import type { FirebaseAdminManager } from './FirebaseAdminManager.js';
import type {
    PremiumCode,
    CreateCodeOptions,
    PremiumTier
} from '../types/Premium.js';
import { logger } from '../utils/logger.js';

export class RedeemCodeManager {
    private firebaseAdminManager: FirebaseAdminManager;
    private redemptionAttempts: Map<string, { count: number; resetAt: number }>;

    constructor(firebaseAdminManager: FirebaseAdminManager) {
        this.firebaseAdminManager = firebaseAdminManager;
        this.redemptionAttempts = new Map();
        this.startAttemptsCleanup();
    }

    private startAttemptsCleanup(): void {
        setInterval(() => {
            const now = Date.now();
            for (const [userId, data] of this.redemptionAttempts.entries()) {
                if (now >= data.resetAt) {
                    this.redemptionAttempts.delete(userId);
                }
            }
        }, 60000);
    }

    async generateCode(options: CreateCodeOptions): Promise<PremiumCode> {
        const codeString = options.customCode || await this.generateRandomCode();
        const codeId = this.generateCodeId();

        const codeData: PremiumCode = {
            code: codeString,
            tier: options.tier,
            type: options.type,
            duration: options.duration || null,
            createdAt: Date.now(),
            createdBy: options.createdBy,
            used: false,
            usedBy: null,
            usedAt: null,
            expiresAt: options.expiresAt || null
        };

        const codesRef = this.firebaseAdminManager.getRef('premium/codes');
        await codesRef.child(codeId).set(codeData);

        logger.info('RedeemCodeManager', `Código ${codeString} generado por ${options.createdBy}`);

        return codeData;
    }

    async generateRandomCode(length: number = 9): Promise<string> {
        const bytes = randomBytes(Math.ceil(length / 2));
        const randomPart = bytes.toString('hex').slice(0, length).toUpperCase();

        const part1 = randomPart.slice(0, 3);
        const part2 = randomPart.slice(3, 6);
        const part3 = randomPart.slice(6, 9);

        return `${part1}-${part2}-${part3}`;
    }

    async validateCode(code: string): Promise<{ valid: boolean; reason?: string; codeData?: PremiumCode }> {
        const normalizedCode = code.toUpperCase().trim();

        const codesRef = this.firebaseAdminManager.getRef('premium/codes');
        const snapshot = await codesRef.orderByChild('code').equalTo(normalizedCode).once('value');

        if (!snapshot.exists()) {
            return { valid: false, reason: 'Código no encontrado' };
        }

        const codeId = Object.keys(snapshot.val())[0];
        const codeData = snapshot.val()[codeId] as PremiumCode;

        if (codeData.used) {
            return { valid: false, reason: 'Código ya utilizado' };
        }

        if (codeData.expiresAt && Date.now() > codeData.expiresAt) {
            return { valid: false, reason: 'Código expirado' };
        }

        return { valid: true, codeData };
    }

    async redeemCode(code: string, userId: string): Promise<{ success: boolean; tier?: PremiumTier; duration?: number | null; reason?: string }> {
        if (!this.checkRateLimit(userId)) {
            const resetTime = this.getResetTime(userId);
            return {
                success: false,
                reason: `Demasiados intentos. Inténtalo de nuevo <t:${Math.floor(resetTime / 1000)}:R>`
            };
        }

        const validation = await this.validateCode(code);

        if (!validation.valid || !validation.codeData) {
            this.incrementAttempts(userId);
            return { success: false, reason: validation.reason };
        }

        const codeData = validation.codeData;

        this.redemptionAttempts.delete(userId);

        return {
            success: true,
            tier: codeData.tier,
            duration: codeData.duration
        };
    }

    async markCodeAsUsed(code: string, userId: string): Promise<boolean> {
        try {
            const normalizedCode = code.toUpperCase().trim();
            const codesRef = this.firebaseAdminManager.getRef('premium/codes');
            const snapshot = await codesRef.orderByChild('code').equalTo(normalizedCode).once('value');

            if (!snapshot.exists()) {
                return false;
            }

            const codeId = Object.keys(snapshot.val())[0];

            await codesRef.child(codeId).update({
                used: true,
                usedBy: userId,
                usedAt: Date.now()
            });

            logger.info('RedeemCodeManager', `Usuario ${userId} canjeó código ${normalizedCode}`);
            return true;
        } catch (error) {
            logger.error('RedeemCodeManager', 'Error marcando código como usado', error);
            return false;
        }
    }

    async getActiveCodes(): Promise<PremiumCode[]> {
        const codesRef = this.firebaseAdminManager.getRef('premium/codes');
        const snapshot = await codesRef.orderByChild('used').equalTo(false).once('value');

        if (!snapshot.exists()) {
            return [];
        }

        const codes: PremiumCode[] = [];
        const now = Date.now();

        snapshot.forEach((child) => {
            const code = child.val() as PremiumCode;
            if (!code.expiresAt || code.expiresAt > now) {
                codes.push(code);
            }
        });

        return codes;
    }

    async getUsedCodes(): Promise<PremiumCode[]> {
        const codesRef = this.firebaseAdminManager.getRef('premium/codes');
        const snapshot = await codesRef.orderByChild('used').equalTo(true).once('value');

        if (!snapshot.exists()) {
            return [];
        }

        const codes: PremiumCode[] = [];

        snapshot.forEach((child) => {
            codes.push(child.val() as PremiumCode);
        });

        return codes;
    }

    async getAllCodes(): Promise<PremiumCode[]> {
        const codesRef = this.firebaseAdminManager.getRef('premium/codes');
        const snapshot = await codesRef.once('value');

        if (!snapshot.exists()) {
            return [];
        }

        const codes: PremiumCode[] = [];

        snapshot.forEach((child) => {
            codes.push(child.val() as PremiumCode);
        });

        return codes;
    }

    async deleteCode(code: string): Promise<boolean> {
        const normalizedCode = code.toUpperCase().trim();

        const codesRef = this.firebaseAdminManager.getRef('premium/codes');
        const snapshot = await codesRef.orderByChild('code').equalTo(normalizedCode).once('value');

        if (!snapshot.exists()) {
            return false;
        }

        const codeId = Object.keys(snapshot.val())[0];
        const codeData = snapshot.val()[codeId] as PremiumCode;

        if (codeData.used) {
            return false;
        }

        await codesRef.child(codeId).remove();

        logger.info('RedeemCodeManager', `Código ${normalizedCode} eliminado`);

        return true;
    }

    private checkRateLimit(userId: string): boolean {
        const now = Date.now();
        const attempts = this.redemptionAttempts.get(userId);

        if (!attempts || now >= attempts.resetAt) {
            return true;
        }

        return attempts.count < 5;
    }

    private incrementAttempts(userId: string): void {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        const attempts = this.redemptionAttempts.get(userId);

        if (!attempts || now >= attempts.resetAt) {
            this.redemptionAttempts.set(userId, {
                count: 1,
                resetAt: now + oneHour
            });
        } else {
            attempts.count++;
        }
    }

    private getResetTime(userId: string): number {
        const attempts = this.redemptionAttempts.get(userId);
        return attempts?.resetAt || Date.now();
    }

    private generateCodeId(): string {
        return `code_${Date.now()}_${randomBytes(4).toString('hex')}`;
    }

    getRemainingAttempts(userId: string): number {
        const attempts = this.redemptionAttempts.get(userId);

        if (!attempts || Date.now() >= attempts.resetAt) {
            return 5;
        }

        return Math.max(0, 5 - attempts.count);
    }
}
