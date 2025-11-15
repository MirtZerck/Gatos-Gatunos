import { Client, Collection } from "discord.js";
import { Command } from "./Command.js";
import { CommandManager } from "../managers/CommandManager.js";
import { CooldownManager } from "../managers/CooldownManager.js";
import { RequestManager } from "../managers/RequestManager.js";

export class BotClient extends Client {
    public commands: Collection<string, Command>;
    public commandManager?: CommandManager;
    public cooldownManager?: CooldownManager;
    public requestManager?: RequestManager;

    constructor(options: any) {
        super(options);
        this.commands = new Collection();
    }
}