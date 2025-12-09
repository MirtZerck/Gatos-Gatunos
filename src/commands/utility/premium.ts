import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CATEGORIES, CONTEXTS, INTEGRATION_TYPES, EMOJIS } from '../../utils/constants.js';
import { handleCommandError, CommandError, ErrorType } from '../../utils/errorHandler.js';
import { sendMessage, createErrorEmbed } from '../../utils/messageUtils.js';
import { BotClient } from '../../types/BotClient.js';
import {
    createPremiumStatusEmbed,
    createPremiumInfoEmbed,
    createCodeRedeemedEmbed
} from '../../utils/premiumEmbeds.js';
import { PremiumSource, PremiumType } from '../../types/Premium.js';

const data = new SlashCommandBuilder()
    .setName('premium')
    .setDescription('Sistema premium del bot')
    .setContexts(CONTEXTS.ALL)
    .setIntegrationTypes(INTEGRATION_TYPES.ALL)
    .addSubcommand(subcommand =>
        subcommand
            .setName('status')
            .setDescription('Ver tu estado premium actual')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('info')
            .setDescription('Información sobre el sistema premium')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('redeem')
            .setDescription('Canjear un código premium')
            .addStringOption(option =>
                option
                    .setName('codigo')
                    .setDescription('Código premium a canjear')
                    .setRequired(true)
            )
    );

export const premium: HybridCommand = {
    type: 'hybrid',
    name: 'premium',
    description: 'Sistema premium del bot',
    category: CATEGORIES.UTILITY,
    data,

    subcommands: [
        {
            name: 'status',
            description: 'Ver tu estado premium actual',
            aliases: ['estado']
        },
        {
            name: 'info',
            description: 'Información sobre el sistema premium',
            aliases: ['información', 'informacion']
        },
        {
            name: 'redeem',
            description: 'Canjear un código premium',
            aliases: ['canjear', 'code']
        }
    ],

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            const client = interaction.client as BotClient;
            const subcommand = interaction.options.getSubcommand();

            if (!client.premiumManager) {
                throw new CommandError(
                    ErrorType.UNKNOWN,
                    'PremiumManager no disponible',
                    `${EMOJIS.ERROR} Sistema premium no disponible temporalmente`
                );
            }

            switch (subcommand) {
                case 'status':
                    await handleStatusSubcommand(interaction, client);
                    break;
                case 'info':
                    await handleInfoSubcommand(interaction);
                    break;
                case 'redeem':
                    await handleRedeemSubcommand(interaction, client);
                    break;
                default:
                    throw new CommandError(
                        ErrorType.VALIDATION_ERROR,
                        `Subcomando desconocido: ${subcommand}`,
                        `${EMOJIS.ERROR} Subcomando no reconocido`
                    );
            }
        } catch (error) {
            await handleCommandError(error, interaction, 'premium');
        }
    },

    async executePrefix(message: Message, args: string[]) {
        try {
            const client = message.client as BotClient;
            const subcommand = args[0]?.toLowerCase();

            if (!client.premiumManager) {
                throw new CommandError(
                    ErrorType.UNKNOWN,
                    'PremiumManager no disponible',
                    `${EMOJIS.ERROR} Sistema premium no disponible temporalmente`
                );
            }

            if (!subcommand) {
                await handleInfoSubcommand(message);
                return;
            }

            switch (subcommand) {
                case 'status':
                case 'estado':
                    await handleStatusSubcommand(message, client);
                    break;
                case 'info':
                case 'información':
                case 'informacion':
                    await handleInfoSubcommand(message);
                    break;
                case 'redeem':
                case 'canjear':
                case 'code':
                    await handleRedeemPrefixSubcommand(message, args, client);
                    break;
                default:
                    await handleInfoSubcommand(message);
            }
        } catch (error) {
            await handleCommandError(error, message, 'premium');
        }
    }
};

async function handleStatusSubcommand(
    context: ChatInputCommandInteraction | Message,
    client: BotClient
): Promise<void> {
    if (!client.premiumManager) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'PremiumManager no disponible',
            `${EMOJIS.ERROR} Sistema premium no disponible temporalmente`
        );
    }

    const userId = context instanceof Message ? context.author.id : context.user.id;

    const status = await client.premiumManager.getPremiumStatus(userId);
    const embed = createPremiumStatusEmbed(status);

    await sendMessage(context, { embed });
}

async function handleInfoSubcommand(
    context: ChatInputCommandInteraction | Message
): Promise<void> {
    const embed = createPremiumInfoEmbed();

    await sendMessage(context, { embed });
}

async function handleRedeemSubcommand(
    interaction: ChatInputCommandInteraction,
    client: BotClient
): Promise<void> {
    const code = interaction.options.getString('codigo', true);

    if (!client.redeemCodeManager) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'RedeemCodeManager no disponible',
            `${EMOJIS.ERROR} Sistema de códigos no disponible temporalmente`
        );
    }

    await interaction.deferReply({ ephemeral: true });

    const remaining = client.redeemCodeManager.getRemainingAttempts(interaction.user.id);

    if (remaining === 0) {
        const embed = createErrorEmbed(
            `${EMOJIS.ERROR} Límite de Intentos`,
            'Has alcanzado el límite de intentos de canje\n\n' +
            'Podrás intentar de nuevo en 1 hora'
        );

        await sendMessage(interaction, { embed });
        return;
    }

    const result = await client.redeemCodeManager.redeemCode(code, interaction.user.id);

    if (!result.success) {
        const embed = createErrorEmbed(
            `${EMOJIS.ERROR} Error al Canjear`,
            result.reason || 'Código inválido'
        );

        embed.setFooter({
            text: `Intentos restantes: ${client.redeemCodeManager.getRemainingAttempts(interaction.user.id)}/5`
        });

        await sendMessage(interaction, { embed });
        return;
    }

    if (!result.tier) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'Tier no devuelto en resultado',
            `${EMOJIS.ERROR} Error al procesar el código`
        );
    }

    if (!client.premiumManager) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'PremiumManager no disponible',
            `${EMOJIS.ERROR} Sistema premium no disponible temporalmente`
        );
    }

    await client.premiumManager.grantPremium({
        userId: interaction.user.id,
        tier: result.tier,
        type: result.duration === null || result.duration === undefined ? PremiumType.PERMANENT : PremiumType.TEMPORARY,
        duration: result.duration === null ? undefined : result.duration,
        source: PremiumSource.CODE,
        sourceId: code
    });

    const embed = createCodeRedeemedEmbed(result.tier, result.duration || null);

    await sendMessage(interaction, { embed });
}

async function handleRedeemPrefixSubcommand(
    message: Message,
    args: string[],
    client: BotClient
): Promise<void> {
    const code = args[1];

    if (!code) {
        const embed = createErrorEmbed(
            `${EMOJIS.ERROR} Código Faltante`,
            'Debes proporcionar un código para canjear\n\n' +
            `**Uso:** \`*premium redeem CODIGO\``
        );

        await sendMessage(message, { embed });
        return;
    }

    if (!client.redeemCodeManager) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'RedeemCodeManager no disponible',
            `${EMOJIS.ERROR} Sistema de códigos no disponible temporalmente`
        );
    }

    const remaining = client.redeemCodeManager.getRemainingAttempts(message.author.id);

    if (remaining === 0) {
        const embed = createErrorEmbed(
            `${EMOJIS.ERROR} Límite de Intentos`,
            'Has alcanzado el límite de intentos de canje\n\n' +
            'Podrás intentar de nuevo en 1 hora'
        );

        await sendMessage(message, { embed });
        return;
    }

    const result = await client.redeemCodeManager.redeemCode(code, message.author.id);

    if (!result.success) {
        const embed = createErrorEmbed(
            `${EMOJIS.ERROR} Error al Canjear`,
            result.reason || 'Código inválido'
        );

        embed.setFooter({
            text: `Intentos restantes: ${client.redeemCodeManager.getRemainingAttempts(message.author.id)}/5`
        });

        await sendMessage(message, { embed });
        return;
    }

    if (!result.tier) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'Tier no devuelto en resultado',
            `${EMOJIS.ERROR} Error al procesar el código`
        );
    }

    if (!client.premiumManager) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'PremiumManager no disponible',
            `${EMOJIS.ERROR} Sistema premium no disponible temporalmente`
        );
    }

    await client.premiumManager.grantPremium({
        userId: message.author.id,
        tier: result.tier,
        type: result.duration === null || result.duration === undefined ? PremiumType.PERMANENT : PremiumType.TEMPORARY,
        duration: result.duration === null ? undefined : result.duration,
        source: PremiumSource.CODE,
        sourceId: code
    });

    const embed = createCodeRedeemedEmbed(result.tier, result.duration || null);

    await sendMessage(message, { embed });
}
