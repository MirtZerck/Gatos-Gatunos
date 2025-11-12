import { ClientEvents } from "discord.js";
import { BotClient } from "./BotClient.js";

export interface Event {
    name: keyof ClientEvents;
    once?: boolean;
    execute: (client: BotClient, ...args: any[]) => Promise<void> | void;
}