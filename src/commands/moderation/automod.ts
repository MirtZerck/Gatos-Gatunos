import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    EmbedBuilder,
    Message,
    AutoModerationRuleKeywordPresetType,
    Role,
    TextChannel,
    MessageFlags,
    AutocompleteInteraction
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CONTEXTS, INTEGRATION_TYPES, CATEGORIES, COLORS } from '../../utils/constants.js';
import { Validators } from '../../utils/validators.js';
import { handleCommandError, CommandError, ErrorType } from '../../utils/errorHandler.js';
import { BotClient } from '../../types/BotClient.js';
import { PRESET_NAMES, PRESET_VALUES, DiscordAutomodPreset } from '../../types/DiscordAutomod.js';

export const automod: HybridCommand = {
    type: 'hybrid',
    name: 'automod',
    description: 'Sistema de auto-moderación del servidor',
    category: CATEGORIES.MODERATION,

    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Sistema de auto-moderación del servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub
                .setName('list')
                .setDescription('Listar todas las reglas de AutoMod activas')
        )
        .addSubcommandGroup(group =>
            group
                .setName('create')
                .setDescription('Crear reglas de AutoMod')
                .addSubcommand(sub =>
                    sub
                        .setName('keywords')
                        .setDescription('Crear regla de palabras clave personalizadas')
                        .addStringOption(opt =>
                            opt
                                .setName('nombre')
                                .setDescription('Nombre de la regla')
                                .setRequired(true)
                                .setMaxLength(100)
                        )
                        .addStringOption(opt =>
                            opt
                                .setName('palabras')
                                .setDescription('Palabras separadas por comas')
                                .setRequired(true)
                        )
                        .addStringOption(opt =>
                            opt
                                .setName('accion')
                                .setDescription('Acción a tomar')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Bloquear mensaje', value: 'block' },
                                    { name: 'Enviar alerta', value: 'alert' },
                                    { name: 'Timeout', value: 'timeout' }
                                )
                        )
                        .addChannelOption(opt =>
                            opt
                                .setName('canal_alertas')
                                .setDescription('Canal para enviar alertas')
                        )
                        .addIntegerOption(opt =>
                            opt
                                .setName('duracion_timeout')
                                .setDescription('Duración del timeout en segundos')
                                .setMinValue(60)
                                .setMaxValue(2419200)
                        )
                )
                .addSubcommand(sub =>
                    sub
                        .setName('preset')
                        .setDescription('Crear regla con filtros predefinidos de Discord')
                        .addStringOption(opt =>
                            opt
                                .setName('nombre')
                                .setDescription('Nombre de la regla')
                                .setRequired(true)
                                .setMaxLength(100)
                        )
                        .addStringOption(opt =>
                            opt
                                .setName('tipo')
                                .setDescription('Tipo de filtro predefinido')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Lenguaje ofensivo', value: 'profanity' },
                                    { name: 'Contenido sexual', value: 'sexual_content' },
                                    { name: 'Insultos y slurs', value: 'slurs' }
                                )
                        )
                        .addStringOption(opt =>
                            opt
                                .setName('accion')
                                .setDescription('Acción a tomar')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Bloquear mensaje', value: 'block' },
                                    { name: 'Enviar alerta', value: 'alert' },
                                    { name: 'Timeout', value: 'timeout' }
                                )
                        )
                        .addChannelOption(opt =>
                            opt
                                .setName('canal_alertas')
                                .setDescription('Canal para enviar alertas')
                        )
                        .addIntegerOption(opt =>
                            opt
                                .setName('duracion_timeout')
                                .setDescription('Duración del timeout en segundos')
                                .setMinValue(60)
                                .setMaxValue(2419200)
                        )
                )
                .addSubcommand(sub =>
                    sub
                        .setName('spam')
                        .setDescription('Crear regla anti-spam de Discord')
                        .addStringOption(opt =>
                            opt
                                .setName('nombre')
                                .setDescription('Nombre de la regla')
                                .setRequired(true)
                                .setMaxLength(100)
                        )
                        .addStringOption(opt =>
                            opt
                                .setName('accion')
                                .setDescription('Acción a tomar')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Bloquear mensaje', value: 'block' },
                                    { name: 'Enviar alerta', value: 'alert' },
                                    { name: 'Timeout', value: 'timeout' }
                                )
                        )
                        .addChannelOption(opt =>
                            opt
                                .setName('canal_alertas')
                                .setDescription('Canal para enviar alertas')
                        )
                        .addIntegerOption(opt =>
                            opt
                                .setName('duracion_timeout')
                                .setDescription('Duración del timeout en segundos')
                                .setMinValue(60)
                                .setMaxValue(2419200)
                        )
                )
                .addSubcommand(sub =>
                    sub
                        .setName('mentions')
                        .setDescription('Crear regla de menciones excesivas')
                        .addStringOption(opt =>
                            opt
                                .setName('nombre')
                                .setDescription('Nombre de la regla')
                                .setRequired(true)
                                .setMaxLength(100)
                        )
                        .addIntegerOption(opt =>
                            opt
                                .setName('limite')
                                .setDescription('Número máximo de menciones permitidas')
                                .setRequired(true)
                                .setMinValue(1)
                                .setMaxValue(50)
                        )
                        .addStringOption(opt =>
                            opt
                                .setName('accion')
                                .setDescription('Acción a tomar')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Bloquear mensaje', value: 'block' },
                                    { name: 'Enviar alerta', value: 'alert' },
                                    { name: 'Timeout', value: 'timeout' }
                                )
                        )
                        .addBooleanOption(opt =>
                            opt
                                .setName('proteccion_raids')
                                .setDescription('Activar protección contra raids')
                        )
                        .addChannelOption(opt =>
                            opt
                                .setName('canal_alertas')
                                .setDescription('Canal para enviar alertas')
                        )
                        .addIntegerOption(opt =>
                            opt
                                .setName('duracion_timeout')
                                .setDescription('Duración del timeout en segundos')
                                .setMinValue(60)
                                .setMaxValue(2419200)
                        )
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('delete')
                .setDescription('Eliminar una regla de AutoMod')
                .addStringOption(opt =>
                    opt
                        .setName('regla')
                        .setDescription('Selecciona la regla a eliminar')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('toggle')
                .setDescription('Activar/Desactivar una regla')
                .addStringOption(opt =>
                    opt
                        .setName('regla')
                        .setDescription('Selecciona la regla')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addBooleanOption(opt =>
                    opt
                        .setName('activar')
                        .setDescription('Activar o desactivar')
                        .setRequired(true)
                )
        )
        .setContexts(CONTEXTS.GUILD_ONLY)
        .setIntegrationTypes(INTEGRATION_TYPES.GUILD_ONLY),

    async autocomplete(interaction: AutocompleteInteraction) {
        try {
            if (!interaction.guild) {
                await interaction.respond([]);
                return;
            }

            const client = interaction.client as BotClient;
            if (!client.discordAutomodManager) {
                await interaction.respond([]);
                return;
            }

            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name === 'regla') {
                const rules = await client.discordAutomodManager.listRules(interaction.guild);

                const choices = rules.map(rule => {
                    const status = rule.enabled ? '✅' : '❌';
                    const type = getTriggerTypeName(rule.triggerType);
                    const isProtected = rule.triggerType === 5 && rule.creatorId === client.user?.id;
                    const protectedBadge = isProtected ? ' 🔒' : '';

                    return {
                        name: `${status} ${rule.name} (${type})${protectedBadge}`,
                        value: rule.id
                    };
                }).slice(0, 25);

                await interaction.respond(choices);
            }
        } catch (error) {
            await interaction.respond([]);
        }
    },

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            Validators.validateInGuild(interaction);
            const client = interaction.client as BotClient;

            if (!client.discordAutomodManager) {
                throw new CommandError(
                    ErrorType.UNKNOWN,
                    'DiscordAutomodManager no disponible',
                    '❌ El sistema de AutoMod nativo no está disponible.'
                );
            }

            const subcommandGroup = interaction.options.getSubcommandGroup();
            const subcommand = interaction.options.getSubcommand();

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            if (subcommandGroup === 'create') {
                switch (subcommand) {
                    case 'keywords':
                        await handleCreateKeywords(interaction, client);
                        break;
                    case 'preset':
                        await handleCreatePreset(interaction, client);
                        break;
                    case 'spam':
                        await handleCreateSpam(interaction, client);
                        break;
                    case 'mentions':
                        await handleCreateMentions(interaction, client);
                        break;
                }
            } else {
                switch (subcommand) {
                    case 'list':
                        await handleList(interaction, client);
                        break;
                    case 'delete':
                        await handleDelete(interaction, client);
                        break;
                    case 'toggle':
                        await handleToggle(interaction, client);
                        break;
                }
            }
        } catch (error) {
            await handleCommandError(error, interaction, 'automod');
        }
    },

    async executePrefix(message: Message) {
        await message.reply('❌ Este comando solo está disponible como slash command. Usa `/automod`');
    }
};

async function handleCreateKeywords(
    interaction: ChatInputCommandInteraction,
    client: BotClient
): Promise<void> {
    const name = interaction.options.getString('nombre', true);
    const palabrasString = interaction.options.getString('palabras', true);
    const accion = interaction.options.getString('accion', true) as 'block' | 'alert' | 'timeout';
    const canalAlertas = interaction.options.getChannel('canal_alertas') as TextChannel | null;
    const duracionTimeout = interaction.options.getInteger('duracion_timeout') ?? undefined;

    const palabras = palabrasString.split(',').map(p => p.trim()).filter(p => p.length > 0);

    if (palabras.length === 0) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'No se proporcionaron palabras válidas',
            '❌ Debes proporcionar al menos una palabra.'
        );
    }

    const rule = await client.discordAutomodManager!.createKeywordRule(
        interaction.guild!,
        name,
        palabras,
        accion,
        {
            alertChannelId: canalAlertas?.id,
            timeoutDuration: duracionTimeout
        }
    );

    const embed = new EmbedBuilder()
        .setTitle('✅ Regla de AutoMod creada')
        .setDescription(
            `**Nombre:** ${name}\n` +
            `**Tipo:** Palabras clave personalizadas\n` +
            `**Palabras:** ${palabras.length} palabras\n` +
            `**Acción:** ${getActionName(accion)}\n` +
            `**ID:** \`${rule.id}\``
        )
        .setColor(COLORS.SUCCESS)
        .setFooter({ text: '🎖️ Regla nativa de Discord' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleCreatePreset(
    interaction: ChatInputCommandInteraction,
    client: BotClient
): Promise<void> {
    const name = interaction.options.getString('nombre', true);
    const tipo = interaction.options.getString('tipo', true) as DiscordAutomodPreset;
    const accion = interaction.options.getString('accion', true) as 'block' | 'alert' | 'timeout';
    const canalAlertas = interaction.options.getChannel('canal_alertas') as TextChannel | null;
    const duracionTimeout = interaction.options.getInteger('duracion_timeout') ?? undefined;

    const presets = [PRESET_VALUES[tipo]];

    const rule = await client.discordAutomodManager!.createPresetRule(
        interaction.guild!,
        name,
        presets,
        accion,
        {
            alertChannelId: canalAlertas?.id,
            timeoutDuration: duracionTimeout
        }
    );

    const embed = new EmbedBuilder()
        .setTitle('✅ Regla de AutoMod creada')
        .setDescription(
            `**Nombre:** ${name}\n` +
            `**Tipo:** ${PRESET_NAMES[tipo]}\n` +
            `**Acción:** ${getActionName(accion)}\n` +
            `**ID:** \`${rule.id}\``
        )
        .setColor(COLORS.SUCCESS)
        .setFooter({ text: '🎖️ Regla nativa de Discord' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleCreateSpam(
    interaction: ChatInputCommandInteraction,
    client: BotClient
): Promise<void> {
    const name = interaction.options.getString('nombre', true);
    const accion = interaction.options.getString('accion', true) as 'block' | 'alert' | 'timeout';
    const canalAlertas = interaction.options.getChannel('canal_alertas') as TextChannel | null;
    const duracionTimeout = interaction.options.getInteger('duracion_timeout') ?? undefined;

    const rule = await client.discordAutomodManager!.createSpamRule(
        interaction.guild!,
        name,
        accion,
        {
            alertChannelId: canalAlertas?.id,
            timeoutDuration: duracionTimeout
        }
    );

    const embed = new EmbedBuilder()
        .setTitle('✅ Regla de AutoMod creada')
        .setDescription(
            `**Nombre:** ${name}\n` +
            `**Tipo:** Anti-spam de Discord\n` +
            `**Acción:** ${getActionName(accion)}\n` +
            `**ID:** \`${rule.id}\``
        )
        .setColor(COLORS.SUCCESS)
        .setFooter({ text: '🎖️ Regla nativa de Discord' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleCreateMentions(
    interaction: ChatInputCommandInteraction,
    client: BotClient
): Promise<void> {
    const name = interaction.options.getString('nombre', true);
    const limite = interaction.options.getInteger('limite', true);
    const accion = interaction.options.getString('accion', true) as 'block' | 'alert' | 'timeout';
    const proteccionRaids = interaction.options.getBoolean('proteccion_raids') ?? false;
    const canalAlertas = interaction.options.getChannel('canal_alertas') as TextChannel | null;
    const duracionTimeout = interaction.options.getInteger('duracion_timeout') ?? undefined;

    const rule = await client.discordAutomodManager!.createMentionSpamRule(
        interaction.guild!,
        name,
        limite,
        accion,
        {
            raidProtection: proteccionRaids,
            alertChannelId: canalAlertas?.id,
            timeoutDuration: duracionTimeout
        }
    );

    const embed = new EmbedBuilder()
        .setTitle('✅ Regla de AutoMod creada')
        .setDescription(
            `**Nombre:** ${name}\n` +
            `**Tipo:** Menciones excesivas\n` +
            `**Límite:** ${limite} menciones\n` +
            `**Protección raids:** ${proteccionRaids ? 'Sí' : 'No'}\n` +
            `**Acción:** ${getActionName(accion)}\n` +
            `**ID:** \`${rule.id}\``
        )
        .setColor(COLORS.SUCCESS)
        .setFooter({ text: '🎖️ Regla nativa de Discord' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleList(
    interaction: ChatInputCommandInteraction,
    client: BotClient
): Promise<void> {
    const rules = await client.discordAutomodManager!.listRules(interaction.guild!);

    if (rules.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('📋 Reglas de AutoMod nativo')
            .setDescription('No hay reglas configuradas.')
            .setColor(COLORS.INFO)
            .setFooter({ text: 'Usa /automod create para crear reglas' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const rulesList = rules.map(rule => {
        const status = rule.enabled ? '✅' : '❌';
        const triggerType = getTriggerTypeName(rule.triggerType);
        const isProtected = rule.triggerType === 5 && rule.creatorId === interaction.client.user?.id;
        const protectedBadge = isProtected ? ' 🔒' : '';

        return `${status} **${rule.name}**${protectedBadge}\n` +
               `   └ Tipo: ${triggerType}\n` +
               `   └ ID: \`${rule.id}\`` +
               (isProtected ? '\n   └ ⚠️ Regla protegida de Discord (no eliminable)' : '');
    }).join('\n\n');

    const embed = new EmbedBuilder()
        .setTitle('📋 Reglas de AutoMod nativo')
        .setDescription(rulesList)
        .setColor(COLORS.INFO)
        .setFooter({ text: `Total: ${rules.length} reglas | 🎖️ Badge activo` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleDelete(
    interaction: ChatInputCommandInteraction,
    client: BotClient
): Promise<void> {
    const ruleId = interaction.options.getString('regla', true);

    await client.discordAutomodManager!.deleteRule(interaction.guild!, ruleId);

    const embed = new EmbedBuilder()
        .setTitle('🗑️ Regla eliminada')
        .setDescription('La regla ha sido eliminada correctamente.')
        .setColor(COLORS.SUCCESS)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleToggle(
    interaction: ChatInputCommandInteraction,
    client: BotClient
): Promise<void> {
    const ruleId = interaction.options.getString('regla', true);
    const activar = interaction.options.getBoolean('activar', true);

    await client.discordAutomodManager!.toggleRule(interaction.guild!, ruleId, activar);

    const embed = new EmbedBuilder()
        .setTitle(`${activar ? '✅' : '❌'} Regla ${activar ? 'activada' : 'desactivada'}`)
        .setDescription(`La regla ha sido ${activar ? 'activada' : 'desactivada'}.`)
        .setColor(activar ? COLORS.SUCCESS : COLORS.WARNING)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

function getActionName(action: string): string {
    switch (action) {
        case 'block': return 'Bloquear mensaje';
        case 'alert': return 'Enviar alerta';
        case 'timeout': return 'Timeout';
        default: return action;
    }
}

function getTriggerTypeName(type: number): string {
    switch (type) {
        case 1: return 'Palabras clave';
        case 3: return 'Spam';
        case 4: return 'Filtro predefinido';
        case 5: return 'Menciones excesivas';
        default: return 'Desconocido';
    }
}
