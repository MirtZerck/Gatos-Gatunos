import { AutoModerationRuleTriggerType, AutoModerationActionType, AutoModerationRuleKeywordPresetType } from 'discord.js';

export interface DiscordAutomodRuleConfig {
    name: string;
    eventType: 1;
    triggerType: AutoModerationRuleTriggerType;
    triggerMetadata?: {
        keywordFilter?: string[];
        regexPatterns?: string[];
        presets?: AutoModerationRuleKeywordPresetType[];
        allowList?: string[];
        mentionTotalLimit?: number;
        mentionRaidProtectionEnabled?: boolean;
    };
    actions: Array<{
        type: AutoModerationActionType;
        metadata?: {
            channelId?: string;
            durationSeconds?: number;
            customMessage?: string;
        };
    }>;
    enabled?: boolean;
    exemptRoles?: string[];
    exemptChannels?: string[];
}

export enum DiscordAutomodPreset {
    PROFANITY = 'profanity',
    SEXUAL_CONTENT = 'sexual_content',
    SLURS = 'slurs'
}

export const PRESET_NAMES: Record<DiscordAutomodPreset, string> = {
    [DiscordAutomodPreset.PROFANITY]: 'Lenguaje ofensivo',
    [DiscordAutomodPreset.SEXUAL_CONTENT]: 'Contenido sexual',
    [DiscordAutomodPreset.SLURS]: 'Insultos y slurs'
};

export const PRESET_VALUES: Record<DiscordAutomodPreset, AutoModerationRuleKeywordPresetType> = {
    [DiscordAutomodPreset.PROFANITY]: AutoModerationRuleKeywordPresetType.Profanity,
    [DiscordAutomodPreset.SEXUAL_CONTENT]: AutoModerationRuleKeywordPresetType.SexualContent,
    [DiscordAutomodPreset.SLURS]: AutoModerationRuleKeywordPresetType.Slurs
};
