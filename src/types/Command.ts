import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
    Message,
    InteractionContextType,
    ApplicationIntegrationType
} from "discord.js";
import { CommandCategory } from "../utils/constants.js";

/**
 * Propiedades base compartidas por todos los tipos de comando.
 *
 * @interface BaseCommand
 */
interface BaseCommand {
    /** Nombre único del comando */
    name: string;
    /** Descripción breve del comando */
    description: string;
    /** Categoría para organización y ayuda */
    category: CommandCategory;
}

/**
 * Comando que solo funciona como slash command (/).
 * No soporta ejecución mediante prefijo.
 *
 * @interface SlashOnlyCommand
 * @extends {BaseCommand}
 *
 * @example
 * ```typescript
 * const command: SlashOnlyCommand = {
 *     type: 'slash-only',
 *     name: 'ping',
 *     description: 'Responde con pong',
 *     category: CATEGORIES.UTILITY,
 *     data: new SlashCommandBuilder().setName('ping').setDescription('Pong!'),
 *     execute: async (interaction) => { await interaction.reply('Pong!'); }
 * };
 * ```
 */
export interface SlashOnlyCommand extends BaseCommand {
    /** Discriminador de tipo */
    type: 'slash-only';
    /** Builder de datos del slash command */
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder;
    /** Contextos donde el comando está disponible */
    contexts?: InteractionContextType[];
    /** Tipos de integración soportados */
    integrationTypes?: ApplicationIntegrationType[];
    /** Función de ejecución del comando */
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/**
 * Comando que solo funciona con prefijo (*comando).
 * No se registra como slash command.
 *
 * @interface PrefixOnlyCommand
 * @extends {BaseCommand}
 *
 * @example
 * ```typescript
 * const command: PrefixOnlyCommand = {
 *     type: 'prefix-only',
 *     name: 'test',
 *     description: 'Comando de prueba',
 *     category: CATEGORIES.UTILITY,
 *     aliases: ['t'],
 *     execute: async (message, args) => { await message.reply('Test!'); }
 * };
 * ```
 */
export interface PrefixOnlyCommand extends BaseCommand {
    /** Discriminador de tipo */
    type: 'prefix-only';
    /** Aliases alternativos para el comando */
    aliases?: string[];
    /** Función de ejecución del comando */
    execute: (message: Message, args: string[]) => Promise<void>;
}

/**
 * Información de un subcomando para comandos híbridos.
 *
 * @interface SubcommandInfo
 */
export interface SubcommandInfo {
    /** Nombre del subcomando */
    name: string;
    /** Aliases del subcomando (solo para prefijo) */
    aliases?: string[];
    /** Descripción del subcomando */
    description: string;
}

/**
 * Comando que funciona tanto como slash (/) como con prefijo (*).
 * Tiene handlers separados para cada tipo de ejecución.
 *
 * @interface HybridCommand
 * @extends {BaseCommand}
 *
 * @example
 * ```typescript
 * const command: HybridCommand = {
 *     type: 'hybrid',
 *     name: 'avatar',
 *     description: 'Muestra el avatar de un usuario',
 *     category: CATEGORIES.UTILITY,
 *     aliases: ['av'],
 *     data: new SlashCommandBuilder()...
 *     executeSlash: async (interaction) => { ... },
 *     executePrefix: async (message, args) => { ... }
 * };
 * ```
 */
export interface HybridCommand extends BaseCommand {
    /** Discriminador de tipo */
    type: 'hybrid';
    /** Aliases alternativos (solo para prefijo) */
    aliases?: string[];
    /** Definición de subcomandos disponibles */
    subcommands?: SubcommandInfo[];
    /** Builder de datos del slash command */
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder;
    /** Contextos donde el comando está disponible */
    contexts?: InteractionContextType[];
    /** Tipos de integración soportados */
    integrationTypes?: ApplicationIntegrationType[];
    /** Handler para ejecución como slash command */
    executeSlash: (interaction: ChatInputCommandInteraction) => Promise<void>;
    /** Handler para ejecución con prefijo */
    executePrefix: (message: Message, args: string[]) => Promise<void>;
}

/**
 * Comando unificado que maneja ambos tipos con un solo handler.
 * El handler recibe el contexto y determina el tipo internamente.
 *
 * @interface UnifiedCommand
 * @extends {BaseCommand}
 *
 * @example
 * ```typescript
 * const command: UnifiedCommand = {
 *     type: 'unified',
 *     name: 'info',
 *     description: 'Información del bot',
 *     category: CATEGORIES.UTILITY,
 *     data: new SlashCommandBuilder()...
 *     execute: async (context, args) => {
 *         const isSlash = context instanceof ChatInputCommandInteraction;
 *         // Lógica unificada
 *     }
 * };
 * ```
 */
export interface UnifiedCommand extends BaseCommand {
    /** Discriminador de tipo */
    type: 'unified';
    /** Aliases alternativos (solo para prefijo) */
    aliases?: string[];
    /** Builder de datos del slash command */
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder;
    /** Contextos donde el comando está disponible */
    contexts?: InteractionContextType[];
    /** Tipos de integración soportados */
    integrationTypes?: ApplicationIntegrationType[];
    /** Handler unificado para ambos tipos de ejecución */
    execute: (context: ChatInputCommandInteraction | Message, args?: string[]) => Promise<void>;
}

/**
 * Unión discriminada de todos los tipos de comando soportados.
 * Usa la propiedad `type` para discriminar entre tipos.
 *
 * @type Command
 */
export type Command = SlashOnlyCommand | PrefixOnlyCommand | HybridCommand | UnifiedCommand;
