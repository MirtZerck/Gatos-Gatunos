import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/generative-ai';
import { Client, EmbedBuilder, Message, TextChannel } from 'discord.js';
import { GeminiChat } from '../../db_service/gemini_service.js';
import { CustomImageURLOptions } from '../../types/embeds.js';
import { prefijo } from '../../constants/prefix.js';
import { geminiAiKey } from '../../constants/config.js';

export const openAiChat = async (client: Client) => {
  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot || !message.mentions.members?.size) return;
    const mention = message.mentions.members.first();

    if (mention && mention.user.id === client.user?.id) {
      if (message.content.trim() === `<@${client.user.id}>`) {
        const embedPrefix = new EmbedBuilder()
          .setAuthor({
            name: "Hikari Koizumi",
            iconURL:
              "https://fotografias.lasexta.com/clipping/cmsimages02/2019/01/25/DB41B993-B4C4-4E95-8B01-C445B8544E8E/98.jpg?crop=4156,2338,x0,y219&width=1900&height=1069&optimize=high&format=webply",
          })
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions))
          .setTitle(`Información del Bot`)
          .addFields(
            {
              name: "Prefijo",
              value: `El prefijo es ${prefijo}`,
              inline: true,
            },
            {
              name: "Información",
              value: `Escribe ${prefijo}help`,
              inline: true,
            }
          )
          .setColor(0x81d4fa)
          .setTimestamp();

        return message.reply({ embeds: [embedPrefix] });
      } else {
        try {
          const genAI = new GoogleGenerativeAI(geminiAiKey);
          const GeminiChatService = new GeminiChat();
          const [history, lastIndex] = await GeminiChatService.getConversationGemini();

          const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.0-flash',
            generationConfig: {
              maxOutputTokens: 30,
              temperature: 0.7,
              topP: 0.8,
              topK: 40,
            },
            safetySettings: [
              {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
              },
              {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
              },
              {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
              },
              {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE,
              },
            ],
          });

          const chat = model.startChat({
            history: history.map(msg => ({
              role: msg.role,
              parts: msg.parts
            })),
          });

          const user = message.author.username;
          const mentionBotString = `<@${client.user.id}>`;
          const prompt = `${user}: ${message.content.replace(mentionBotString, '')}`;
          
          if (message.channel instanceof TextChannel) {
            await message.channel.sendTyping();
          }
          
          const result = await chat.sendMessage(prompt);
          const response = result.response;
          const text = response.text();

          await message.reply({ content: text });
          await GeminiChatService.setConversationGemini(
            prompt,
            text,
            parseInt(lastIndex) + 1
          );
        } catch (error) {
          console.error('Error in Gemini chat:', error);
          await message.reply('Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.');
        }
      }
    }
  });
};
