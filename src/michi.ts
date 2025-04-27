import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  PresenceUpdateStatus,
  EmbedBuilder,
} from "discord.js";
import dotenv from "dotenv";
import firebase from "firebase-admin";
import { prefijo } from "./constants/prefix.js";
import { onMessageCreate } from "./commands/answers.js";
import { onInteractionCreate } from "./slashCommands/interactionCreate.js";
import { openAiChat } from "./commands/on-chatbot.js";

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

async function startBot() {
  // Logear el bot
  await client.login(token);

  client.once(Events.ClientReady, async () => {
    console.log("El bot se ha iniciado como", client.user?.username);

    client.user?.setPresence({
      activities: [
        {
          name: `Mi prefijo es ${prefijo} `,
          type: ActivityType.Playing,
        },
      ],
      status: PresenceUpdateStatus.DoNotDisturb,
    });

  });

  await openAiChat(client);
  await onInteractionCreate(client);
  /*await rankXpellitControl(client);
  await handleSpecialCommands(client, mirtZerckID); */
  await onMessageCreate(client);
}

startBot();
