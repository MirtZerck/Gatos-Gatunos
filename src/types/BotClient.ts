import { Client, Collection } from "discord.js";
import { Command } from "./Command.js";

export class BotClient extends Client {
    public commands: Collection<string, Command>;

    constructor(options: any) {
        super(options);
        this.commands = new Collection();
    }
}