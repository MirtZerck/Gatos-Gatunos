export enum AutomodRuleType {
    SPAM = 'spam',
    CAPS = 'caps',
    MENTIONS = 'mentions',
    LINKS = 'links',
    INVITES = 'invites',
    BANNED_WORDS = 'banned_words'
}

export enum AutomodActionType {
    DELETE = 'delete',
    WARN = 'warn',
    TIMEOUT = 'timeout',
    KICK = 'kick',
    BAN = 'ban'
}

export interface AutomodAction {
    type: AutomodActionType;
    duration?: number;
    reason?: string;
}

export interface AutomodRule {
    type: AutomodRuleType;
    enabled: boolean;
    threshold?: number;
    actions: AutomodAction[];
}

export interface SpamRule extends AutomodRule {
    type: AutomodRuleType.SPAM;
    messageLimit: number;
    timeWindow: number;
}

export interface CapsRule extends AutomodRule {
    type: AutomodRuleType.CAPS;
    percentage: number;
    minLength: number;
}

export interface MentionsRule extends AutomodRule {
    type: AutomodRuleType.MENTIONS;
    maxMentions: number;
}

export interface LinksRule extends AutomodRule {
    type: AutomodRuleType.LINKS;
    whitelist?: string[];
}

export interface InvitesRule extends AutomodRule {
    type: AutomodRuleType.INVITES;
    allowOwnServer: boolean;
}

export interface BannedWordsRule extends AutomodRule {
    type: AutomodRuleType.BANNED_WORDS;
    words: string[];
    useWildcard: boolean;
}

export type SpecificRule = SpamRule | CapsRule | MentionsRule | LinksRule | InvitesRule | BannedWordsRule;

export interface AutomodConfig {
    enabled: boolean;
    ignoredRoles: string[];
    ignoredChannels: string[];
    rules: {
        [AutomodRuleType.SPAM]?: SpamRule;
        [AutomodRuleType.CAPS]?: CapsRule;
        [AutomodRuleType.MENTIONS]?: MentionsRule;
        [AutomodRuleType.LINKS]?: LinksRule;
        [AutomodRuleType.INVITES]?: InvitesRule;
        [AutomodRuleType.BANNED_WORDS]?: BannedWordsRule;
    };
}

export interface AutomodViolation {
    userId: string;
    ruleType: AutomodRuleType;
    timestamp: number;
    messageContent?: string;
}

export const DEFAULT_AUTOMOD_CONFIG: AutomodConfig = {
    enabled: false,
    ignoredRoles: [],
    ignoredChannels: [],
    rules: {}
};
