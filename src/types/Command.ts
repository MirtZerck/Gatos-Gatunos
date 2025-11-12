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

interface BaseCommand {
    name: string;
    description: string;
    category: CommandCategory;
}

export interface SlashOnlyCommand extends BaseCommand {
    type: 'slash-only';
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder;
    contexts?: InteractionContextType[];
    integrationTypes?: ApplicationIntegrationType[];
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface PrefixOnlyCommand extends BaseCommand {
    type: 'prefix-only';
    aliases?: string[];
    execute: (message: Message, args: string[]) => Promise<void>
}
export interface HybridCommand extends BaseCommand {
    type: 'hybrid';
    aliases: string[];
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder;
    contexts?: InteractionContextType[];
    integrationTypes?: ApplicationIntegrationType[];
    executeSlash: (interaction: ChatInputCommandInteraction) => Promise<void>;
    executePrefix: (message: Message, args: string[]) => Promise<void>;
}

export interface UnifiedCommand extends BaseCommand {
    type: 'unified';
    aliases?: string[];
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder;
    contexts?: InteractionContextType[];
    integrationTypes?: ApplicationIntegrationType[];
    execute: (context: ChatInputCommandInteraction | Message, args?: string[]) => Promise<void>;
}

export type Command = SlashOnlyCommand | PrefixOnlyCommand | HybridCommand | UnifiedCommand;