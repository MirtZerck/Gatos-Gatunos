import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  PresenceUpdateStatus,
} from "discord.js";
import dotenv from "dotenv";
import firebase from "firebase-admin";
import { prefijo } from "./constants/prefix.js";
import { CommandManager } from "./events/commandHandler.js";
import { registerCommands } from "./commands/prefixCommands/register.js";
import { registerSlashCommands } from "./commands/slashCommands/registerSlashCommands.js";
import { onInteractionCreate } from "./commands/slashCommands/interactionCreate.js";
import { aiChatHandler } from "./events/chatbotHandler.js";
import { GeminiChat } from "./db_service/gemini_service.js";
import { onMessageCreate } from "./commands/prefixCommands/answers.js";

dotenv.config();

export const token = process.env.TOKEN!;
export const APPLICATION_ID = process.env.APPLICATION_ID!;

const firebaseConfig = JSON.parse(process.env.FIREBASE_ADMIN_SDK!);

firebase.initializeApp({
  credential: firebase.credential.cert(firebaseConfig),
  databaseURL: "https://gatos-gatunos-default-rtdb.firebaseio.com",
});

firebase.auth();

export const db = firebase.database().ref("/");
export const geminiChat = new GeminiChat();

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
  ],
});

// Manejar el cierre del bot
process.on('SIGINT', async () => {
  console.log('Guardando caché antes de apagar...');
  await geminiChat.saveCache();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Guardando caché antes de apagar...');
  await geminiChat.saveCache();
  process.exit(0);
});

async function startBot() {
  try {
    // Inicializar el manejador de comandos por prefijo
    const commandManager = new CommandManager();
    await registerCommands(commandManager);
    await commandManager.initialize(client);

    // Registrar el manejador de comandos slash
    await onInteractionCreate(client);

    // Registrar el manejador del chatbot
    await aiChatHandler(client);
    await onMessageCreate(client);

    // Logear el bot
    await client.login(token);

    client.once(Events.ClientReady, async () => {
      console.log("El bot se ha iniciado como", client.user?.username);

      // Registrar comandos slash después de que el bot esté listo
      await registerSlashCommands();

      client.user?.setPresence({
        activities: [
          {
            name: `Mi prefijo es ${prefijo}`,
            type: ActivityType.Playing,
          },
        ],
        status: PresenceUpdateStatus.DoNotDisturb,
      });
    });
  } catch (error) {
    console.error("Error al iniciar el bot:", error);
    process.exit(1);
  }
}

startBot();
