import { CommandManager } from "../../events/commandHandler.js";
import { PrefixCommand } from "../../types/command.js";

// Importar comandos por prefijo
import { userInfoCommand } from "./userInfo.js";
import { userAvatarCommand } from "./avatar.js";
import { datoCuriosoCommand } from "./datoCurioso.js";
import { sendMichiTextCommand } from "./michiSay.js";
import { arrayCommandsHour } from "./hora.js";
import { pingCommand } from "./ping.js";
import { proposalCommand } from "./proposals.js";
import { acceptProposalCommand } from "./acceptProposals.js";
import { customCommandsList } from "./showCommands.js";

// Importar comandos de moderación
import { timeoutUser, removeTimeoutUser } from "./moderation/timeoutFunction.js";
import { kickUser } from "./moderation/kickUserFunction.js";
import { arrayBanCommands } from "./moderation/banUserFunction.js";
import { arrayWarnCommands } from "./moderation/warnUserFunction.js";

// Importar comandos de música
import { playMusicCommand } from "./voice/playMusic.js";
import { arrayMusicControls } from "./voice/musicControls.js";
import { arrayMusicListControls } from "./voice/musicList.js";

// Importar comandos sociales
import { arrayInteractions } from "./social/interactionCommands.js";
import { arrayActions } from "./social/actionsCommands.js";
import { arrayReactions } from "./social/reactionCommands.js";

export async function registerCommands(commandManager: CommandManager): Promise<void> {
    // Registrar comandos por prefijo
    const prefixCommands: PrefixCommand[] = [
        userInfoCommand,
        userAvatarCommand,
        datoCuriosoCommand,
        sendMichiTextCommand,
        ...arrayCommandsHour,
        pingCommand,
        proposalCommand,
        timeoutUser,
        removeTimeoutUser,
        kickUser,
        ...arrayBanCommands,
        ...arrayWarnCommands,
        acceptProposalCommand,
        customCommandsList,
        playMusicCommand,
        ...arrayMusicControls,
        ...arrayMusicListControls,
        ...arrayInteractions,
        ...arrayActions,
        ...arrayReactions
    ];

    prefixCommands.forEach(cmd => commandManager.registerPrefixCommand(cmd));

} 