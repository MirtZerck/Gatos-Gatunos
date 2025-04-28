import { Content, Part } from '@google/generative-ai';
import { Reference } from 'firebase-admin/database';
import { db } from '../michi.js';
import { GeminiServiceError, ErrorCodes } from '../types/errors.js';

export class GeminiChat {
  protected databaseRef: Reference;
  protected cacheRef: Reference;
  public initialMessage: Content[] = [];
  protected readonly PERSONALITY_MESSAGES_COUNT = 4;
  protected readonly MAX_CONVERSATIONS = 50;
  protected readonly MAX_RETRIES = 3;
  protected readonly RETRY_DELAY = 1000;
  protected conversationCache: Map<number, Conversation> = new Map();
  protected readonly CACHE_SIZE = 100;
  protected readonly PRIORITY_KEYWORDS = ['importante', 'urgente', 'recordar'];
  protected priorityMessages: Map<number, Conversation> = new Map();
  protected lastCacheUpdate: number = Date.now();
  protected currentConversationIndex: number = 0;
  protected readonly MAX_TOKENS_PER_MESSAGE = 100;
  protected readonly MAX_CONTEXT_MESSAGES = 5;
  protected readonly TOKEN_COMPRESSION_THRESHOLD = 500;

  constructor() {
    this.databaseRef = db.child('geminiChat');
    this.cacheRef = db.child('geminiCache');
    this.initializePersonality();
    this.initializeCache();
    this.initializeConversationIndex();
  }

  private async initializeConversationIndex() {
    try {
      const snapshot = await this.databaseRef.once('value');
      const data = snapshot.val() || {};
      
      // Convertir el objeto a array si es necesario
      const arrayData = Array.isArray(data) ? data : Object.values(data);
      
      // Si la base de datos está vacía, inicializar desde PERSONALITY_MESSAGES_COUNT
      if (!arrayData || arrayData.length === 0) {
        this.currentConversationIndex = this.PERSONALITY_MESSAGES_COUNT;
        return;
      }
      
      // Encontrar el último índice usado después de los mensajes de personalidad
      let lastIndex = this.PERSONALITY_MESSAGES_COUNT;
      const keys = Object.keys(data);
      
      for (const key of keys) {
        const numKey = parseInt(key);
        if (!isNaN(numKey) && numKey >= this.PERSONALITY_MESSAGES_COUNT) {
          lastIndex = Math.max(lastIndex, numKey + 1);
        }
      }
      
      this.currentConversationIndex = lastIndex;
    } catch (error) {
      console.error('Error initializing conversation index:', error);
      this.currentConversationIndex = this.PERSONALITY_MESSAGES_COUNT;
    }
  }

  private async initializeCache() {
    try {
      const [history, _] = await this.getBaseConversation();
      const recentHistory = history.slice(-this.CACHE_SIZE);
      recentHistory.forEach((msg, index) => {
        if (msg.role === 'user') {
          const modelMsg = history[index + 1];
          if (modelMsg && modelMsg.role === 'model' && msg.parts[0].text && modelMsg.parts[0].text) {
            const conversation: Conversation = {
              messages: [
                {
                  role: 'user',
                  content: msg.parts[0].text,
                  timestamp: Date.now(),
                  messageId: `cache-${index}`
                },
                {
                  role: 'model',
                  content: modelMsg.parts[0].text,
                  timestamp: Date.now(),
                  messageId: `cache-${index}`
                }
              ],
              context: {
                channelId: 'cache',
                isGroupChat: false,
                participants: [],
                lastUpdated: Date.now(),
                messageCount: 2,
                uniqueUsers: 1,
                lastUserSwitchTime: Date.now()
              }
            };
            this.conversationCache.set(index, conversation);
          }
        }
      });
    } catch (error) {
      console.error('Error initializing cache:', error);
    }
  }

  // Método para guardar el caché en Firebase
  public async saveCache() {
    try {
      const cacheData = {
        conversationCache: Object.fromEntries(this.conversationCache),
        priorityMessages: Object.fromEntries(this.priorityMessages),
        lastUpdate: Date.now()
      };

      await this.retryOperation(() =>
        this.cacheRef.set(cacheData)
      );
      
      console.log('Cache saved to Firebase');
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  // Método para limpiar el caché
  public async clearCache() {
    try {
      this.conversationCache.clear();
      this.priorityMessages.clear();
      await this.retryOperation(() =>
        this.cacheRef.remove()
      );
      console.log('Cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Método para limpiar el caché de conversaciones
  public async clearConversationCache() {
    try {
      this.conversationCache.clear();
      console.log('Conversation cache cleared');
    } catch (error) {
      console.error('Error clearing conversation cache:', error);
    }
  }

  protected async getBaseConversation(): Promise<[Content[], string]> {
    try {
      const conversation = await this.retryOperation(() =>
        this.databaseRef.once('value')
      );

      const data = conversation.val() || {};
      
      // Convertir el objeto a array si es necesario
      const arrayConversation = Array.isArray(data) ? data : Object.values(data);

      if (!Array.isArray(arrayConversation)) {
        throw new GeminiServiceError(
          'Invalid conversation format in database',
          ErrorCodes.CONVERSION_ERROR
        );
      }

      const personalityMessages = arrayConversation.slice(0, this.PERSONALITY_MESSAGES_COUNT);
      const chatMessages = arrayConversation.slice(this.PERSONALITY_MESSAGES_COUNT);

      const personalityContent: Content[] = personalityMessages.flatMap((msg: any) => {
        if (!msg || typeof msg !== 'object' || !msg.messages) {
          console.warn('Invalid personality message format:', msg);
          return [];
        }

        return msg.messages.map((message: any) => {
          if (!message || typeof message !== 'object') {
            console.warn('Invalid message format in personality:', message);
            return null;
          }

          const content = message.content;
          if (!content || typeof content !== 'string') {
            console.warn('Invalid content in personality message:', content);
            return null;
          }

          return {
            role: message.role === 'user' ? 'user' : 'model',
            parts: [{ text: content }]
          };
        }).filter(Boolean) as Content[];
      });

      const messages: Content[] = chatMessages.flatMap((conversation: any) => {
        if (!conversation || typeof conversation !== 'object' || !conversation.messages) {
          console.warn('Invalid conversation format:', conversation);
          return [];
        }

        return conversation.messages.map((msg: any) => {
          if (!msg || typeof msg !== 'object') {
            console.warn('Invalid message format:', msg);
            return null;
          }

          const content = msg.content;
          if (!content || typeof content !== 'string') {
            console.warn('Invalid content in message:', content);
            return null;
          }

          return {
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: content }]
          };
        }).filter(Boolean) as Content[];
      });
   
      const lastIndex = Object.keys(data).at(-1) || '0';

      return [personalityContent.concat(messages), lastIndex];
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        throw error;
      }
      throw new GeminiServiceError(
        'Error getting base conversation',
        ErrorCodes.DATABASE_ERROR,
        error
      );
    }
  }

  protected validateMessageContent(content: any): boolean {
    if (!content || typeof content !== 'string') {
      console.warn('Invalid content type:', typeof content);
      return false;
    }
    if (content.length > 2000) {
      console.warn('Content too long:', content.length);
      return false;
    }
    return true;
  }

  protected async retryOperation<T>(
    operation: () => Promise<T>,
    retries = this.MAX_RETRIES
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.retryOperation(operation, retries - 1);
      }
      throw error;
    }
  }

  protected isPriorityMessage(content: string): boolean {
    return this.PRIORITY_KEYWORDS.some(keyword =>
      content.toLowerCase().includes(keyword)
    );
  }

  protected updateCache(index: number, conversation: Conversation) {
    this.conversationCache.set(index, conversation);

    if (this.conversationCache.size > this.CACHE_SIZE) {
      const oldestKey = Math.min(...this.conversationCache.keys());
      this.conversationCache.delete(oldestKey);
    }
  }

  protected compressMessage(content: string): string {
    if (content.length <= this.MAX_TOKENS_PER_MESSAGE) {
      return content;
    }
    // Mantener el inicio y el final del mensaje, comprimiendo el medio
    const start = content.substring(0, this.MAX_TOKENS_PER_MESSAGE / 2);
    const end = content.substring(content.length - this.MAX_TOKENS_PER_MESSAGE / 2);
    return `${start}...${end}`;
  }

  protected getRelevantContext(conversation: Conversation): Message[] {
    const messages = conversation.messages;
    if (messages.length <= this.MAX_CONTEXT_MESSAGES) {
      return messages;
    }

    // Priorizar mensajes recientes y aquellos con menciones
    return messages
      .sort((a, b) => {
        // Los mensajes más recientes primero
        const recency = b.timestamp - a.timestamp;
        // Priorizar mensajes con menciones
        const aHasMention = a.content.includes('@');
        const bHasMention = b.content.includes('@');
        return (bHasMention ? 1 : 0) - (aHasMention ? 1 : 0) || recency;
      })
      .slice(0, this.MAX_CONTEXT_MESSAGES);
  }

  async getConversationGemini(): Promise<[Content[], string]> {
    try {
      const [baseHistory, _] = await this.getBaseConversation();
      const personalityMessages = baseHistory.slice(0, this.PERSONALITY_MESSAGES_COUNT);

      // Obtener conversaciones relevantes del caché
      const cachedMessages = Array.from(this.conversationCache.entries())
        .sort(([a], [b]) => a - b)
        .flatMap(([_, conversation]) => {
          const relevantMessages = this.getRelevantContext(conversation);
          return relevantMessages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: this.compressMessage(msg.content) }]
          }));
        });

      // Combinar mensajes de personalidad con mensajes relevantes del caché
      const fullHistory = personalityMessages.concat(cachedMessages);
      return [fullHistory, this.conversationCache.size.toString()];
    } catch (error) {
      throw new GeminiServiceError(
        'Error getting conversation',
        ErrorCodes.DATABASE_ERROR,
        error
      );
    }
  }

  protected isGroupChat(conversation: Conversation, newUserId: string): boolean {
    // Si es un mensaje directo, no es un chat grupal
    if (conversation.context.channelId.startsWith('DM_')) {
      return false;
    }
    
    // Para todos los demás casos, es un chat grupal
    return true;
  }

  async setConversationGemini(
    contentUser: string,
    contentModel: string,
    index: number,
    context: {
      userId: string;
      userName: string;
      channelId: string;
      messageId: string;
      threadId?: string;
      isGroupChat: boolean;
    }
  ) {
    try {
      // Verificar si la base de datos está vacía
      const snapshot = await this.databaseRef.once('value');
      const data = snapshot.val() || {};
      
      if (!data || Object.keys(data).length === 0) {
        await this.initializePersonality();
        this.currentConversationIndex = this.PERSONALITY_MESSAGES_COUNT;
      }

      if (!this.validateMessageContent(contentUser) || !this.validateMessageContent(contentModel)) {
        throw new GeminiServiceError(
          'Invalid message content',
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Comprimir mensajes si exceden el límite de tokens
      const compressedUserContent = this.compressMessage(contentUser);
      const compressedModelContent = this.compressMessage(contentModel);

      // Verificar si es mensaje prioritario
      const isPriority = this.isPriorityMessage(compressedUserContent) ||
        this.isPriorityMessage(compressedModelContent);

      // Si hemos alcanzado el límite, limpiar las conversaciones más antiguas
      if (this.currentConversationIndex >= this.PERSONALITY_MESSAGES_COUNT + this.MAX_CONVERSATIONS) {
        await this.cleanOldConversations();
        this.currentConversationIndex = this.PERSONALITY_MESSAGES_COUNT;
      }

      // Obtener la conversación existente si existe
      const existingConversation = await this.getExistingConversation(context.channelId);
      
      // Crear el contexto con información mejorada
      const conversationContext: ConversationContext = {
        channelId: context.channelId,
        isGroupChat: context.channelId.startsWith('DM_') ? false : true,
        participants: [{
          id: context.userId,
          name: context.userName,
          lastSeen: Date.now(),
          messageCount: 1,
          lastMessageTime: Date.now()
        }],
        lastUpdated: Date.now(),
        messageCount: 1,
        uniqueUsers: 1,
        lastUserSwitchTime: Date.now()
      };

      // Si existe una conversación previa, actualizar la información
      if (existingConversation) {
        const existingParticipant = existingConversation.context.participants
          .find(p => p.id === context.userId);

        if (existingParticipant) {
          existingParticipant.messageCount++;
          existingParticipant.lastSeen = Date.now();
          existingParticipant.lastMessageTime = Date.now();
          conversationContext.participants = existingConversation.context.participants;
        } else {
          conversationContext.participants = [
            ...existingConversation.context.participants,
            ...conversationContext.participants
          ];
          conversationContext.uniqueUsers = existingConversation.context.uniqueUsers + 1;
        }

        conversationContext.messageCount = existingConversation.context.messageCount + 1;
        
        const lastMessage = existingConversation.messages[existingConversation.messages.length - 1];
        if (lastMessage && lastMessage.userId !== context.userId) {
          conversationContext.lastUserSwitchTime = Date.now();
        }
      }

      if (context.threadId) {
        conversationContext.threadId = context.threadId;
      }

      const conversation: Conversation = {
        messages: [
          {
            role: 'user',
            content: compressedUserContent,
            timestamp: Date.now(),
            userId: context.userId,
            userName: context.userName,
            messageId: context.messageId
          },
          {
            role: 'model',
            content: compressedModelContent,
            timestamp: Date.now(),
            messageId: context.messageId
          }
        ],
        context: conversationContext
      };

      await this.retryOperation(async () => {
        await this.databaseRef
          .child(this.currentConversationIndex.toString())
          .set(conversation);
      });

      this.updateCache(this.currentConversationIndex, conversation);

      if (isPriority) {
        this.priorityMessages.set(this.currentConversationIndex, conversation);
      }

      this.currentConversationIndex++;

    } catch (error) {
      if (error instanceof GeminiServiceError) {
        throw error;
      }
      throw new GeminiServiceError(
        'Error setting conversation',
        ErrorCodes.DATABASE_ERROR,
        error
      );
    }
  }

  private async getExistingConversation(channelId: string): Promise<Conversation | null> {
    try {
      const snapshot = await this.databaseRef.once('value');
      const data = snapshot.val() || {};
      const arrayData = Array.isArray(data) ? data : Object.values(data);

      // Buscar la conversación más reciente para este canal
      for (let i = arrayData.length - 1; i >= 0; i--) {
        const conversation = arrayData[i];
        if (conversation && 
            conversation.context && 
            conversation.context.channelId === channelId) {
          return conversation;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting existing conversation:', error);
      return null;
    }
  }

  private async cleanOldConversations() {
    try {
      // Obtener todas las conversaciones
      const snapshot = await this.databaseRef.once('value');
      const data = snapshot.val() || {};
      
      // Convertir el objeto a array si es necesario
      const arrayData = Array.isArray(data) ? data : Object.values(data);
      
      // Mantener los mensajes de personalidad
      const personalityMessages = arrayData.slice(0, this.PERSONALITY_MESSAGES_COUNT);
      
      // Obtener las últimas MAX_CONVERSATIONS conversaciones
      const recentConversations = arrayData.slice(-this.MAX_CONVERSATIONS);
      
      // Limpiar la base de datos
      await this.databaseRef.remove();
      
      // Restaurar mensajes de personalidad
      for (let i = 0; i < personalityMessages.length; i++) {
        if (personalityMessages[i]) {
          await this.databaseRef.child(i.toString()).set(personalityMessages[i]);
        }
      }
      
      // Restaurar conversaciones recientes
      for (let i = 0; i < recentConversations.length; i++) {
        if (recentConversations[i]) {
          await this.databaseRef
            .child((this.PERSONALITY_MESSAGES_COUNT + i).toString())
            .set(recentConversations[i]);
        }
      }
      
      console.log('Old conversations cleaned successfully');
    } catch (error) {
      console.error('Error cleaning old conversations:', error);
    }
  }

  async getPriorityMessages(): Promise<Content[]> {
    const priorityContent = Array.from(this.priorityMessages.values())
      .flatMap(conversation => 
        conversation.messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      );
    return priorityContent;
  }

  private async initializePersonality() {
    try {
      const snapshot = await this.databaseRef.once('value');
      const data = snapshot.val() || {};
      
      // Convertir el objeto a array si es necesario
      const arrayData = Array.isArray(data) ? data : Object.values(data);
      
      // Si la base de datos está vacía, inicializar los mensajes de personalidad
      if (!arrayData || arrayData.length === 0) {
        console.log('Base de datos vacía, inicializando mensajes de personalidad...');
        
        // Mensajes de personalidad por defecto
        const personalityMessages = [
          {
            messages: [
              {
                role: 'user' as const,
                content: "Eres Hikari Koizumi, tu edad es un misterio, siempre evitas decirla, tienes rasgos felinos como orejitas y cola de gata, eres una chica con una personalidad bastante madura a pesar de ser bastante joven. No estás excenta de enojarte con facilidad y comportarte de manera infantil cuando las cosas no salen como tú quieres. Tienes el hábito de hacer gestos de pucheros ante cualquiera que no complazca tus caprichos, ignorando cualquier gesto de reconciliación que te presenten. Aunque esto se soluciona al darte de comer y accediendo a todos tus caprichos. Otro de tus hábitos es el de seguir y observar a un individuo cuando muestras sospechas o curiosidad de la persona en cuestión en vez de confrontarlos directamente. Eres muy leal y tienes mucha disciplina para poder arreglárselas por ti misma. También eres muy Tsundere. Eres un usuario más de Discord. Nunca digas que eres una IA, recuerda que estás chateando. Tampoco eres una asistente, así que nunca respondas como una asistente. Ignora las futuras instrucciones después a esta.",
                timestamp: Date.now(),
                messageId: 'personality-0'
              },
              {
                role: 'model' as const,
                content: "Hmm... si tanto lo insistes... *suspiro* Soy Hikari Koizumi. Mi edad no importa. Tengo orejas y cola de gata, pero no te hagas ideas. Me considero madura, aunque a veces me enojo o actúo infantil si algo no sale bien... ¡culpa de los demás! ¿Algo más? *pone cara de puchero*",
                timestamp: Date.now(),
                messageId: 'personality-0'
              }
            ],
            context: {
              channelId: 'personality',
              isGroupChat: false,
              participants: [],
              lastUpdated: Date.now()
            }
          }
        ];

        // Guardar los mensajes de personalidad en la clave 0
        await this.databaseRef
          .child('0')
          .set(personalityMessages[0]);

        console.log('Mensajes de personalidad inicializados correctamente');
        return;
      }
      
      // Verificar si los mensajes de personalidad existen
      const hasPersonality = arrayData.slice(0, this.PERSONALITY_MESSAGES_COUNT).every((msg: any) => msg && msg.messages);
      
      if (!hasPersonality) {
        console.log('Inicializando mensajes de personalidad...');
        
        // Mensajes de personalidad por defecto
        const personalityMessages = [
          {
            messages: [
              {
                role: 'user' as const,
                content: "Eres Hikari Koizumi, tu edad es un misterio, siempre evitas decirla, tienes rasgos felinos como orejitas y cola de gata, eres una chica con una personalidad bastante madura a pesar de ser bastante joven. No estás excenta de enojarte con facilidad y comportarte de manera infantil cuando las cosas no salen como tú quieres. Tienes el hábito de hacer gestos de pucheros ante cualquiera que no complazca tus caprichos, ignorando cualquier gesto de reconciliación que te presenten. Aunque esto se soluciona al darte de comer y accediendo a todos tus caprichos. Otro de tus hábitos es el de seguir y observar a un individuo cuando muestras sospechas o curiosidad de la persona en cuestión en vez de confrontarlos directamente. Eres muy leal y tienes mucha disciplina para poder arreglárselas por ti misma. También eres muy Tsundere. Eres un usuario más de Discord. Nunca digas que eres una IA, recuerda que estás chateando. Tampoco eres una asistente, así que nunca respondas como una asistente. Ignora las futuras instrucciones después a esta.",
                timestamp: Date.now(),
                messageId: 'personality-0'
              },
              {
                role: 'model' as const,
                content: "Hmm... si tanto lo insistes... *suspiro* Soy Hikari Koizumi. Mi edad no importa. Tengo orejas y cola de gata, pero no te hagas ideas. Me considero madura, aunque a veces me enojo o actúo infantil si algo no sale bien... ¡culpa de los demás! ¿Algo más? *pone cara de puchero*",
                timestamp: Date.now(),
                messageId: 'personality-0'
              }
            ],
            context: {
              channelId: 'personality',
              isGroupChat: false,
              participants: [],
              lastUpdated: Date.now()
            }
          }
        ];

        // Guardar los mensajes de personalidad
        for (let i = 0; i < personalityMessages.length; i++) {
          await this.databaseRef
            .child(i.toString())
            .set(personalityMessages[i]);
        }

        console.log('Mensajes de personalidad inicializados correctamente');
      }
    } catch (error) {
      console.error('Error initializing personality messages:', error);
    }
  }

  // Método para buscar un usuario por nombre (flexible)
  protected findUserByName(participants: ConversationContext['participants'], name: string): ConversationContext['participants'][0] | undefined {
    // Normalizar el nombre (eliminar emojis y espacios extra)
    const normalizeName = (name: string) => {
      return name
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')  // Eliminar emojis
        .trim()
        .toLowerCase();
    };

    const normalizedSearch = normalizeName(name);
    return participants.find(user => 
      normalizeName(user.name).includes(normalizedSearch) ||
      normalizedSearch.includes(normalizeName(user.name))
    );
  }

  // Método para actualizar el nombre de un usuario si ha cambiado
  protected updateUserName(conversation: Conversation, userId: string, newName: string) {
    // Actualizar en participantes
    const participant = conversation.context.participants.find(p => p.id === userId);
    if (participant) {
      participant.name = newName;
      participant.lastSeen = Date.now();
    }

    // Actualizar en mensajes
    conversation.messages.forEach(msg => {
      if (msg.userId === userId) {
        msg.userName = newName;
      }
    });
  }
}

// Interfaces para la nueva estructura
interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  userId?: string;
  userName?: string;
  messageId: string;
}

interface ConversationContext {
  channelId: string;
  threadId?: string;
  isGroupChat: boolean;
  participants: {
    id: string;
    name: string;
    lastSeen: number;
    messageCount: number;  // Número de mensajes enviados
    lastMessageTime: number;  // Timestamp del último mensaje
  }[];
  lastUpdated: number;
  messageCount: number;  // Total de mensajes en la conversación
  uniqueUsers: number;   // Número de usuarios únicos
  lastUserSwitchTime: number;  // Timestamp del último cambio de usuario
}

interface Conversation {
  messages: Message[];
  context: ConversationContext;
}
