import { Message, GuildMember, Collection } from 'discord.js';
import { FirebaseAdminManager } from './FirebaseAdminManager.js';
import {
    AutomodConfig,
    AutomodRuleType,
    AutomodActionType,
    AutomodAction,
    AutomodViolation,
    DEFAULT_AUTOMOD_CONFIG,
    SpamRule,
    CapsRule,
    MentionsRule,
    LinksRule,
    InvitesRule,
    BannedWordsRule,
    SpecificRule
} from '../types/Automod.js';
import { logger } from '../utils/logger.js';

interface SpamTracker {
    messages: number[];
    lastMessageContent: string;
    violations: number;
}

export class AutomodManager {
    private firebaseManager: FirebaseAdminManager;
    private spamCache: Collection<string, Collection<string, SpamTracker>>;
    private configCache: Collection<string, AutomodConfig>;

    constructor(firebaseManager: FirebaseAdminManager) {
        this.firebaseManager = firebaseManager;
        this.spamCache = new Collection();
        this.configCache = new Collection();
        this.startCleanupInterval();
    }

    private startCleanupInterval(): void {
        setInterval(() => {
            const now = Date.now();
            for (const [guildId, guildCache] of this.spamCache) {
                for (const [userId, tracker] of guildCache) {
                    tracker.messages = tracker.messages.filter(timestamp => now - timestamp < 60000);
                    if (tracker.messages.length === 0) {
                        guildCache.delete(userId);
                    }
                }
                if (guildCache.size === 0) {
                    this.spamCache.delete(guildId);
                }
            }
        }, 30000);
    }

    private getConfigRef(guildId: string) {
        return this.firebaseManager.getRef(`servers/${guildId}/automod`);
    }

    async getConfig(guildId: string): Promise<AutomodConfig> {
        if (this.configCache.has(guildId)) {
            return this.configCache.get(guildId)!;
        }

        const ref = this.getConfigRef(guildId);
        const snapshot = await ref.get();
        const config = snapshot.exists() ? snapshot.val() : DEFAULT_AUTOMOD_CONFIG;
        this.configCache.set(guildId, config);
        return config;
    }

    async updateConfig(guildId: string, config: Partial<AutomodConfig>): Promise<void> {
        const currentConfig = await this.getConfig(guildId);
        const newConfig = { ...currentConfig, ...config };
        await this.getConfigRef(guildId).set(newConfig);
        this.configCache.set(guildId, newConfig);
    }

    async toggleAutomod(guildId: string, enabled: boolean): Promise<void> {
        await this.updateConfig(guildId, { enabled });
    }

    async addIgnoredRole(guildId: string, roleId: string): Promise<void> {
        const config = await this.getConfig(guildId);
        if (!config.ignoredRoles.includes(roleId)) {
            config.ignoredRoles.push(roleId);
            await this.updateConfig(guildId, { ignoredRoles: config.ignoredRoles });
        }
    }

    async removeIgnoredRole(guildId: string, roleId: string): Promise<void> {
        const config = await this.getConfig(guildId);
        const filtered = config.ignoredRoles.filter(id => id !== roleId);
        await this.updateConfig(guildId, { ignoredRoles: filtered });
    }

    async addIgnoredChannel(guildId: string, channelId: string): Promise<void> {
        const config = await this.getConfig(guildId);
        if (!config.ignoredChannels.includes(channelId)) {
            config.ignoredChannels.push(channelId);
            await this.updateConfig(guildId, { ignoredChannels: config.ignoredChannels });
        }
    }

    async removeIgnoredChannel(guildId: string, channelId: string): Promise<void> {
        const config = await this.getConfig(guildId);
        const filtered = config.ignoredChannels.filter(id => id !== channelId);
        await this.updateConfig(guildId, { ignoredChannels: filtered });
    }

    async updateRule(guildId: string, ruleType: AutomodRuleType, rule: SpecificRule): Promise<void> {
        const config = await this.getConfig(guildId);
        config.rules[ruleType] = rule as any;
        await this.updateConfig(guildId, { rules: config.rules });
    }

    async removeRule(guildId: string, ruleType: AutomodRuleType): Promise<void> {
        const config = await this.getConfig(guildId);
        delete config.rules[ruleType];
        await this.updateConfig(guildId, { rules: config.rules });
    }

    private shouldIgnoreMember(member: GuildMember, config: AutomodConfig): boolean {
        if (member.permissions.has('Administrator')) return true;
        return member.roles.cache.some(role => config.ignoredRoles.includes(role.id));
    }

    async checkMessage(message: Message): Promise<AutomodViolation[]> {
        if (!message.guild || !message.member || message.author.bot) return [];

        const config = await this.getConfig(message.guild.id);
        if (!config.enabled) return [];
        if (config.ignoredChannels.includes(message.channel.id)) return [];
        if (this.shouldIgnoreMember(message.member, config)) return [];

        const violations: AutomodViolation[] = [];

        if (config.rules[AutomodRuleType.SPAM]?.enabled) {
            const spamViolation = this.checkSpam(message, config.rules[AutomodRuleType.SPAM]!);
            if (spamViolation) violations.push(spamViolation);
        }

        if (config.rules[AutomodRuleType.CAPS]?.enabled) {
            const capsViolation = this.checkCaps(message, config.rules[AutomodRuleType.CAPS]!);
            if (capsViolation) violations.push(capsViolation);
        }

        if (config.rules[AutomodRuleType.MENTIONS]?.enabled) {
            const mentionsViolation = this.checkMentions(message, config.rules[AutomodRuleType.MENTIONS]!);
            if (mentionsViolation) violations.push(mentionsViolation);
        }

        if (config.rules[AutomodRuleType.LINKS]?.enabled) {
            const linksViolation = this.checkLinks(message, config.rules[AutomodRuleType.LINKS]!);
            if (linksViolation) violations.push(linksViolation);
        }

        if (config.rules[AutomodRuleType.INVITES]?.enabled) {
            const invitesViolation = this.checkInvites(message, config.rules[AutomodRuleType.INVITES]!);
            if (invitesViolation) violations.push(invitesViolation);
        }

        if (config.rules[AutomodRuleType.BANNED_WORDS]?.enabled) {
            const bannedWordsViolation = this.checkBannedWords(message, config.rules[AutomodRuleType.BANNED_WORDS]!);
            if (bannedWordsViolation) violations.push(bannedWordsViolation);
        }

        return violations;
    }

    private checkSpam(message: Message, rule: SpamRule): AutomodViolation | null {
        const guildId = message.guild!.id;
        const userId = message.author.id;

        if (!this.spamCache.has(guildId)) {
            this.spamCache.set(guildId, new Collection());
        }

        const guildCache = this.spamCache.get(guildId)!;
        if (!guildCache.has(userId)) {
            guildCache.set(userId, {
                messages: [],
                lastMessageContent: '',
                violations: 0
            });
        }

        const tracker = guildCache.get(userId)!;
        const now = Date.now();

        tracker.messages = tracker.messages.filter(timestamp => now - timestamp < rule.timeWindow * 1000);
        tracker.messages.push(now);

        if (tracker.messages.length >= rule.messageLimit) {
            tracker.violations++;
            tracker.messages = [];
            return {
                userId,
                ruleType: AutomodRuleType.SPAM,
                timestamp: now,
                messageContent: message.content
            };
        }

        if (message.content === tracker.lastMessageContent && message.content.length > 5) {
            tracker.violations++;
            return {
                userId,
                ruleType: AutomodRuleType.SPAM,
                timestamp: now,
                messageContent: message.content
            };
        }

        tracker.lastMessageContent = message.content;
        return null;
    }

    private checkCaps(message: Message, rule: CapsRule): AutomodViolation | null {
        const content = message.content;
        if (content.length < rule.minLength) return null;

        const letters = content.replace(/[^a-zA-Z]/g, '');
        if (letters.length === 0) return null;

        const uppercase = content.replace(/[^A-Z]/g, '');
        const percentage = (uppercase.length / letters.length) * 100;

        if (percentage >= rule.percentage) {
            return {
                userId: message.author.id,
                ruleType: AutomodRuleType.CAPS,
                timestamp: Date.now(),
                messageContent: content
            };
        }

        return null;
    }

    private checkMentions(message: Message, rule: MentionsRule): AutomodViolation | null {
        const totalMentions = message.mentions.users.size + message.mentions.roles.size;

        if (totalMentions > rule.maxMentions) {
            return {
                userId: message.author.id,
                ruleType: AutomodRuleType.MENTIONS,
                timestamp: Date.now(),
                messageContent: message.content
            };
        }

        return null;
    }

    private checkLinks(message: Message, rule: LinksRule): AutomodViolation | null {
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        const matches = message.content.match(urlRegex);

        if (!matches) return null;

        if (rule.whitelist && rule.whitelist.length > 0) {
            const hasWhitelistedLink = matches.some(url =>
                rule.whitelist!.some(domain => url.includes(domain))
            );
            if (hasWhitelistedLink) return null;
        }

        return {
            userId: message.author.id,
            ruleType: AutomodRuleType.LINKS,
            timestamp: Date.now(),
            messageContent: message.content
        };
    }

    private checkInvites(message: Message, rule: InvitesRule): AutomodViolation | null {
        const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)[a-zA-Z0-9]+/gi;
        const matches = message.content.match(inviteRegex);

        if (!matches) return null;

        if (rule.allowOwnServer) {
            return null;
        }

        return {
            userId: message.author.id,
            ruleType: AutomodRuleType.INVITES,
            timestamp: Date.now(),
            messageContent: message.content
        };
    }

    private checkBannedWords(message: Message, rule: BannedWordsRule): AutomodViolation | null {
        const content = message.content.toLowerCase();

        for (const word of rule.words) {
            const searchWord = word.toLowerCase();

            if (rule.useWildcard) {
                if (content.includes(searchWord)) {
                    return {
                        userId: message.author.id,
                        ruleType: AutomodRuleType.BANNED_WORDS,
                        timestamp: Date.now(),
                        messageContent: message.content
                    };
                }
            } else {
                const wordRegex = new RegExp(`\\b${searchWord}\\b`, 'i');
                if (wordRegex.test(content)) {
                    return {
                        userId: message.author.id,
                        ruleType: AutomodRuleType.BANNED_WORDS,
                        timestamp: Date.now(),
                        messageContent: message.content
                    };
                }
            }
        }

        return null;
    }

    async executeActions(
        message: Message,
        violations: AutomodViolation[],
        actions: AutomodAction[]
    ): Promise<void> {
        for (const action of actions) {
            try {
                switch (action.type) {
                    case AutomodActionType.DELETE:
                        if (message.deletable) {
                            await message.delete();
                        }
                        break;

                    case AutomodActionType.WARN:
                        break;

                    case AutomodActionType.TIMEOUT:
                        if (message.member && message.member.moderatable) {
                            const duration = action.duration || 5;
                            await message.member.timeout(
                                duration * 60 * 1000,
                                action.reason || 'Violación de automod'
                            );
                        }
                        break;

                    case AutomodActionType.KICK:
                        if (message.member && message.member.kickable) {
                            await message.member.kick(action.reason || 'Violación de automod');
                        }
                        break;

                    case AutomodActionType.BAN:
                        if (message.member && message.member.bannable) {
                            await message.member.ban({
                                reason: action.reason || 'Violación de automod'
                            });
                        }
                        break;
                }
            } catch (error) {
                logger.error('AutomodManager', `Error ejecutando acción ${action.type}:`, error);
            }
        }
    }
}
