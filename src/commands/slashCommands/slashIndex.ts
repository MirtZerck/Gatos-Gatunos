import { slashInteractCommand } from "./social/slashInteractionCommands.js";
import { slashMusicCommand } from "./voice/slashPlayMusic.js";
import { musicCommand } from "./voice/slashMusicControls.js";
import { arraySlashMusicListControls } from "./voice/slashMusicList.js";
import { slashActionCommand } from "./social/slashActionCommands.js";
import { slashReactCommand } from "./social/slashReactionCommands.js";
/*import { helpSlashCommands } from "./slashHelp";*/

export const arraySlashCommands = [
  slashInteractCommand,
  slashMusicCommand,
  musicCommand,
  ...arraySlashMusicListControls,
  slashActionCommand,
  slashReactCommand
  /* helpSlashCommands, */
];
