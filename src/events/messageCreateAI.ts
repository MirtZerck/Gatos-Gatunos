import { Events, Message, EmbedBuilder } from 'discord.js';
import type { BotClient } from '../types/BotClient.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import { COLORS } from '../utils/constants.js';

logger.info('AI-Event', '📦 Módulo messageCreateAI.ts cargado');

export default {
    name: Events.MessageCreate,
    once: false,

    async execute(client: BotClient, message: Message) {
        try {
            if (!client.user) return;

            const isPotentiallyRelevant = !message.author.bot &&
                (message.mentions.has(client.user.id) ||
                    message.channel.isDMBased() ||
                    message.reference);

            if (!isPotentiallyRelevant) {
                return;
            }

            logger.debug('AI-Event', `🔔 Evento recibido de ${message.author.tag}: "${message.content.substring(0, 50)}"`);

            const botMention = `<@${client.user.id}>`;
            const botMentionNick = `<@!${client.user.id}>`;
            const content = message.content.trim();

            if ((content === botMention || content === botMentionNick) && !message.author.bot) {
                const embed = new EmbedBuilder()
                    .setTitle('👋 ¡Hola! Soy Hikari Koizumi')
                    .setDescription(`Mi prefijo es \`${config.prefix}\`\n\nPuedes usar comandos con prefijo o slash commands.`)
                    .addFields(
                        {
                            name: '📚 Ver todos los comandos',
                            value: `\`${config.prefix}help\` o \`/help\``,
                            inline: false
                        },
                        {
                            name: '💬 Hablar conmigo',
                            value: 'Simplemente menciόname con tu mensaje:\n`@Yo hola, ¿cómo estás?`',
                            inline: false
                        }
                    )
                    .setColor(COLORS.INFO)
                    .setFooter({ text: 'Sistema de IA activo' })
                    .setTimestamp();

                await message.reply({ embeds: [embed] });
                logger.info('AI-Event', '📨 Enviado embed de ayuda por mención vacía');
                return;
            }

            if (!client.aiManager) {
                logger.warn('AI-Event', '⚠️ AIManager no está disponible');
                return;
            }

            logger.debug('AI-Event', '✅ AIManager disponible, procesando mensaje');
            await client.aiManager.processMessage(message);
            logger.debug('AI-Event', '✅ Mensaje procesado completamente');
        } catch (error) {
            logger.error('AI-Event', '❌ Error en messageCreateAI', error);
        }
    }
};
