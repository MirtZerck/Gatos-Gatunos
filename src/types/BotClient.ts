import { Client, Collection } from "discord.js";
import { Command } from "./Command.js";
import { CommandManager } from "../managers/CommandManager.js";

export class BotClient extends Client {
    public commands: Collection<string, Command>;
    public commandManager?: CommandManager;

    constructor(options: any) {
        super(options);
        this.commands = new Collection();
    }
}