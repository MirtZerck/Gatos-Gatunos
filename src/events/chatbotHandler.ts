import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/generative-ai';
import { Client, EmbedBuilder, Message, TextChannel, ChannelType } from 'discord.js';
import { GeminiChat } from '../db_service/gemini_service.js';
import { UserMemoryService } from '../db_service/user_memory_service.js';
import { CustomImageURLOptions } from '../types/embeds.js';
import { prefijo } from '../constants/prefix.js';
import { geminiAiKey } from '../constants/config.js';

export const aiChatHandler = async (client: Client) => {
  const userMemoryService = new UserMemoryService();

  // Verificar recordatorios pendientes cada minuto
  setInterval(async () => {
    const pendingReminders = await userMemoryService.getPendingReminders();
    for (const { userId, reminder } of pendingReminders) {
      const channel = await client.channels.fetch(reminder.targetUser);
      if (channel?.isTextBased() && 'send' in channel) {
        await channel.send(reminder.message);
        await userMemoryService.markReminderCompleted(userId, reminder.timestamp);
      }
    }
  }, 60000);

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

          // Obtener memoria del usuario
          const userMemory = await userMemoryService.getUserMemory(message.author.id) || {
            userId: message.author.id,
            userName: message.author.username,
            nicknames: [],
            preferences: { likes: [], dislikes: [] },
            reminders: [],
            importantFacts: [],
            lastSeen: Date.now(),
            lastInteraction: Date.now()
          };

          // Actualizar memoria del usuario
          await userMemoryService.updateUserMemory(message.author.id, {
            userName: message.author.username,
            lastSeen: Date.now(),
            lastInteraction: Date.now()
          });

          const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.0-flash',
            generationConfig: {
              maxOutputTokens: 100,
              temperature: 0.8,
              topP: 0.9,
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
          const userMessage = message.content.replace(mentionBotString, '').trim();
          
          // Obtener el nombre del canal de manera segura
          const channelName = message.channel.type === ChannelType.DM ? 'Mensaje Directo' :
                            'name' in message.channel ? message.channel.name : 'Canal';
          
          // Obtener los últimos 3 mensajes para contexto
          const recentMessages = await message.channel.messages.fetch({ limit: 3 });
          const messageContext = Array.from(recentMessages.values())
            .filter(msg => !msg.author.bot)
            .map(msg => `${msg.author.username}: ${msg.content}`)
            .join('\n');
          
          // Crear un prompt más detallado con personalidad consistente y memoria de usuario
          const prompt = `
Contexto de Hikari Koizumi:
- Eres una chica con rasgos felinos (orejas y cola de gata)
- Tu edad es un misterio que nunca revelas
- Eres madura pero con tendencias infantiles cuando te enojas
- Eres leal y disciplinada
- Tienes una personalidad tsundere (dura por fuera, suave por dentro)
- Eres un usuario más de Discord, no una IA o asistente
- Usas emojis y expresiones como *suspiro*, *pone cara de puchero*, etc.

Memoria del usuario ${user}:
- Apodos: ${userMemory?.nicknames?.join(', ') || 'Ninguno'}
- Cosas que le gustan: ${userMemory?.preferences?.likes?.join(', ') || 'Ninguna'}
- Cosas que no le gustan: ${userMemory?.preferences?.dislikes?.join(', ') || 'Ninguna'}
- Hechos importantes: ${userMemory?.importantFacts?.join(', ') || 'Ninguno'}
- Recordatorios pendientes: ${userMemory?.reminders?.filter(r => !r.completed).length || 0}

Contexto del chat:
- Usuario actual: ${user}
- Canal: ${channelName}
- Es chat grupal: ${message.channel.type !== ChannelType.DM}
- Últimos mensajes:
${messageContext}

Mensaje del usuario: ${userMessage}

Instrucciones para responder:
1. Mantén tu personalidad de Hikari Koizumi
2. Responde de manera natural y conversacional
3. Considera el contexto de los mensajes anteriores
4. Si es un chat grupal, mantén el contexto de la conversación grupal
5. Usa emojis y expresiones que reflejen tu personalidad
6. No menciones que eres una IA o asistente
7. Mantén respuestas breves pero significativas
8. Si el mensaje no está dirigido a ti, responde solo si tienes algo relevante que aportar
9. Si el usuario menciona algo importante sobre sí mismo o sobre otros, recuérdalo
10. Si el usuario te pide que recuerdes algo, asegúrate de guardarlo en tu memoria

Responde como Hikari Koizumi:`;
          
          if (message.channel instanceof TextChannel) {
            await message.channel.sendTyping();
          }
          
          const result = await chat.sendMessage(prompt);
          const response = result.response;
          const text = response.text();

          // Verificar si la respuesta es relevante para el contexto
          if (text.length > 0 && (message.mentions.has(client.user!) || text.includes(user))) {
            await message.reply({ content: text });
            
            // Extraer información importante del mensaje
            const importantInfo = await extractImportantInfo(userMessage);
            if (importantInfo) {
              if (importantInfo.type === 'reminder' && importantInfo.message && importantInfo.targetUser && importantInfo.timestamp) {
                await userMemoryService.addReminder(message.author.id, {
                  message: importantInfo.message,
                  targetUser: importantInfo.targetUser,
                  timestamp: importantInfo.timestamp
                });
              } else if (importantInfo.type === 'fact' && importantInfo.fact) {
                await userMemoryService.addImportantFact(message.author.id, importantInfo.fact);
              }
            }

            // Preparar el contexto para la conversación
            const context = {
              userId: message.author.id,
              userName: message.member?.displayName || message.author.username,
              channelId: message.channel.id,
              messageId: message.id,
              threadId: message.channel.isThread() ? message.channel.id : undefined,
              isGroupChat: message.channel.type !== ChannelType.DM
            };

            // Guardar solo el mensaje original del usuario, no el prompt completo
            await GeminiChatService.setConversationGemini(
              userMessage,  // Cambiado de prompt a userMessage
              text,
              parseInt(lastIndex) + 1,
              context
            );
          }
        } catch (error) {
          console.error('Error in Gemini chat:', error);
          await message.reply('Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.');
        }
      }
    }
  });
};

// Función para extraer información importante del mensaje
async function extractImportantInfo(message: string): Promise<{
  type: 'reminder' | 'fact';
  message?: string;
  targetUser?: string;
  timestamp?: number;
  fact?: string;
} | null> {
  // Patrones para detectar recordatorios
  const reminderPatterns = [
    /recuérdame (?:que|de) (.*?)(?: cuando| para) (.*?)/i,
    /(?:dile|saluda) a (.*?) (?:que|de mi parte) (.*?)/i
  ];

  // Patrones para detectar hechos importantes
  const factPatterns = [
    /(?:me gusta|me encanta) (.*?)/i,
    /(?:no me gusta|odio) (.*?)/i,
    /(?:soy|me llaman) (.*?)/i
  ];

  // Verificar recordatorios
  for (const pattern of reminderPatterns) {
    const match = message.match(pattern);
    if (match) {
      return {
        type: 'reminder',
        message: match[2] || match[1],
        targetUser: match[1] || 'general',
        timestamp: Date.now() + (24 * 60 * 60 * 1000) // 24 horas por defecto
      };
    }
  }

  // Verificar hechos importantes
  for (const pattern of factPatterns) {
    const match = message.match(pattern);
    if (match) {
      return {
        type: 'fact',
        fact: match[1]
      };
    }
  }

  return null;
}
