import { Client, Collection } from "discord.js";
import { Command } from "./Command.js";
import { CommandManager } from "../managers/CommandManager.js";
import { CooldownManager } from "../managers/CooldownManager.js";
import { RequestManager } from "../managers/RequestManager.js";
import { FirebaseAdminManager } from "../managers/FirebaseAdminManager.js";
import { InteractionStatsManager } from "../managers/InteractionStatsManager.js";
import { CustomCommandManager } from "../managers/CustomCommandManager.js";
import { MusicManager } from "../managers/MusicManager.js";

export class BotClient extends Client {
    public commands: Collection<string, Command>;
    public commandManager?: CommandManager;
    public cooldownManager?: CooldownManager;
    public requestManager?: RequestManager;
    public firebaseAdminManager?: FirebaseAdminManager;
    public interactionStatsManager?: InteractionStatsManager;
    public customCommandManager?: CustomCommandManager;
    public musicManager?: MusicManager;

    constructor(options: any) {
        super(options);
        this.commands = new Collection();
    }
}