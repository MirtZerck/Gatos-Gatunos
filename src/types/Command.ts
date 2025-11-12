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

export interface CommandOption {
    name: string;
    description: string;
    type: 'string' | 'user' | 'integer' | 'number' | 'boolean' | 'channel' | 'role';
    require: boolean;
}

export interface Command {
    name: string;
    description: string;
    aliases?: string[];
    category: CommandCategory;

    context?: InteractionContextType[];
    integrationTypes?: ApplicationIntegrationType[];

    data?: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
    options?: CommandOption[]

    executeSlash?: (interaction: ChatInputCommandInteraction) => Promise<void>
    executePrefix?: (message: Message, args: string[]) => Promise<void>;
    execute?: (context: ChatInputCommandInteraction | Message, args?: string[]) => Promise<void>;
}