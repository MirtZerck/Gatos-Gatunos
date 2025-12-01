import { Message, EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../types/BotClient.js';
import { AutomodRuleType } from '../types/Automod.js';
import { COLORS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

const RULE_EMOJIS: Record<AutomodRuleType, string> = {
    [AutomodRuleType.SPAM]: '📨',
    [AutomodRuleType.CAPS]: '🔠',
    [AutomodRuleType.MENTIONS]: '📢',
    [AutomodRuleType.LINKS]: '🔗',
    [AutomodRuleType.INVITES]: '📧',
    [AutomodRuleType.BANNED_WORDS]: '🚫'
};

const RULE_NAMES: Record<AutomodRuleType, string> = {
    [AutomodRuleType.SPAM]: 'Spam',
    [AutomodRuleType.CAPS]: 'Mayúsculas excesivas',
    [AutomodRuleType.MENTIONS]: 'Menciones masivas',
    [AutomodRuleType.LINKS]: 'Enlaces no permitidos',
    [AutomodRuleType.INVITES]: 'Invitaciones de Discord',
    [AutomodRuleType.BANNED_WORDS]: 'Palabras prohibidas'
};

export async function handleAutomod(message: Message): Promise<void> {
    if (!message.guild || message.author.bot) return;

    const client = message.client as BotClient;
    if (!client.automodManager) return;

    try {
        const violations = await client.automodManager.checkMessage(message);

        if (violations.length === 0) return;

        const config = await client.automodManager.getConfig(message.guild.id);

        for (const violation of violations) {
            const rule = config.rules[violation.ruleType];
            if (!rule) continue;

            await client.automodManager.executeActions(message, violations, rule.actions);

            const logEmbed = new EmbedBuilder()
                .setTitle(`${RULE_EMOJIS[violation.ruleType]} Automod: ${RULE_NAMES[violation.ruleType]}`)
                .setDescription(
                    `**Usuario:** ${message.author.tag} (${message.author.id})\n` +
                    `**Canal:** <#${message.channel.id}>\n` +
                    `**Regla violada:** ${RULE_NAMES[violation.ruleType]}\n` +
                    `**Acciones:** ${rule.actions.map(a => a.type).join(', ')}`
                )
                .setColor(COLORS.DANGER)
                .setTimestamp();

            if (violation.messageContent) {
                logEmbed.addFields({
                    name: 'Contenido',
                    value: violation.messageContent.slice(0, 1024)
                });
            }

            logger.info(
                'Automod',
                `Violación detectada: ${RULE_NAMES[violation.ruleType]} por ${message.author.tag}`
            );
        }

    } catch (error) {
        logger.error('AutomodHandler', 'Error procesando mensaje:', error);
    }
}
