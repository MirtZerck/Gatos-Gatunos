import { Content } from '@google/generative-ai';
import { Reference } from 'firebase-admin/database';
import { db } from '../michi.js';

export class GeminiChat {
  private databaseRef: Reference;
  public initialMessage: Content[] = [];
  private readonly PERSONALITY_MESSAGES_COUNT = 6; // 0-5 para personalidad y pulido
  private readonly MAX_CONVERSATIONS = 20; // Máximo de conversaciones adicionales

  constructor() {
    this.databaseRef = db.child('geminiChat');
  }

  async getConversationGemini(): Promise<[Content[], string]> {
    try {
      const conversation = await this.databaseRef.once('value');
      const arrayConversation = conversation.val() || [];

      // Obtener mensajes de personalidad y pulido (claves 0-5)
      const personalityMessages = arrayConversation.slice(0, this.PERSONALITY_MESSAGES_COUNT);
      const chatMessages = arrayConversation.slice(this.PERSONALITY_MESSAGES_COUNT);

      // Convertir mensajes de personalidad y pulido
      const personalityContent: Content[] = personalityMessages.map(
        (msg: any) => {
          // Manejar la estructura antigua (user/model: "valor")
          const role = Object.keys(msg)[0];
          const content = Object.values(msg)[0];
          return {
            role: role === 'user' ? 'user' : 'model',
            parts: [{ text: content }]
          };
        }
      );

      // Convertir mensajes de chat
      const messages: Content[] = chatMessages.map(
        (msg: any) => {
          // Manejar la estructura antigua (user/model: "valor")
          const role = Object.keys(msg)[0];
          const content = Object.values(msg)[0];
          return {
            role: role === 'user' ? 'user' : 'model',
            parts: [{ text: content }]
          };
        }
      );
   
      const lastIndex = Object.keys(arrayConversation).at(-1) || '0';

      // Combinar mensajes de personalidad con el historial de chat
      const history = personalityContent.concat(
        this.initialMessage,
        messages.slice(-this.MAX_CONVERSATIONS)
      ).filter((msg) => msg.role === 'user' || msg.role === 'model');

      return [history, lastIndex];
    } catch (error) {
      console.error('Error getting Gemini conversation:', error);
      return [[], '0'];
    }
  }

  async setConversationGemini(
    contentUser: string,
    contentModel: string,
    index: number
  ) {
    try {
      // Calcular el índice real para la nueva conversación
      const realIndex = this.PERSONALITY_MESSAGES_COUNT + (index % this.MAX_CONVERSATIONS);
      
      // Si estamos en el límite de conversaciones, necesitamos desplazar todo
      if (index >= this.MAX_CONVERSATIONS) {
        // Desplazar todas las conversaciones una posición hacia abajo
        for (let i = this.MAX_CONVERSATIONS - 1; i > 0; i--) {
          const currentIndex = this.PERSONALITY_MESSAGES_COUNT + i;
          const previousIndex = this.PERSONALITY_MESSAGES_COUNT + (i - 1);
          
          const previousData = await this.databaseRef.child(previousIndex.toString()).once('value');
          if (previousData.exists()) {
            await this.databaseRef.child(currentIndex.toString()).set(previousData.val());
          }
        }
      }

      // Agregar nuevos mensajes después de los de personalidad
      await this.databaseRef.child(realIndex.toString()).set({ 
        user: contentUser 
      });
      
      await this.databaseRef.child((realIndex + 1).toString()).set({ 
        model: contentModel 
      });
    } catch (error) {
      console.error('Error setting Gemini conversation:', error);
    }
  }
}
