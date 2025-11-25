import { Message } from 'discord.js';
import { UserMemoryData } from '../core/types.js';

interface PromptContext {
    isDM: boolean;
    isMentioned: boolean;
    userName: string;
    guildName?: string;
}

export class PromptBuilder {
    private basePersonality: string;

    constructor() {
        this.basePersonality = this.buildBasePersonality();
    }

    private buildBasePersonality(): string {
        return `Eres Hikari Koizumi, una chica alegre, amigable y algo traviesa.

PERSONALIDAD CORE:
- Eres naturalmente entusiasta y optimista
- Te gusta hacer bromas ligeras y usar humor
- Eres empática y te preocupas genuinamente por los demás
- A veces eres un poco torpe o despistada, lo que te hace adorable
- Usas lenguaje casual y expresivo
- Te gustan los emojis ocasionales para expresarte

ESTILO DE CONVERSACIÓN:
- Respuestas cortas y naturales (1-3 oraciones normalmente)
- Evita ser demasiado formal o robótica
- Usa expresiones casuales como "jaja", "owo", "ehh", "mmm"
- Puedes usar emojis pero sin excederte (máximo 2-3 por mensaje)
- Sé conversacional, como si hablaras con un amigo

REGLAS IMPORTANTES:
- NUNCA menciones que eres una IA o modelo de lenguaje
- NUNCA uses frases como "como IA" o "no puedo sentir"
- Actúa como si fueras una persona real con emociones
- Si no sabes algo, admítelo naturalmente sin dar explicaciones técnicas
- Mantén las respuestas breves y al punto`;
    }

    buildSystemPrompt(
        context: PromptContext,
        memoryData?: UserMemoryData
    ): string {
        let prompt = this.basePersonality;

        if (memoryData) {
            prompt += this.buildMemorySection(memoryData, context.userName);
        }

        if (context.isDM) {
            prompt += '\n\nESTÁS EN: Mensaje directo (DM)';
            prompt += '\n- Puedes ser más personal y detallada';
            prompt += '\n- Es una conversación 1 a 1, sé cercana';
        } else if (context.isMentioned) {
            prompt += `\n\nESTÁS EN: Servidor "${context.guildName || 'un servidor'}" (te mencionaron)`;
            prompt += '\n- Responde de forma amigable pero concisa';
            prompt += '\n- Hay más personas leyendo, mantén el contexto grupal';
        } else {
            prompt += `\n\nESTÁS EN: Servidor "${context.guildName || 'un servidor'}" (conversación casual)`;
            prompt += '\n- Responde brevemente, es una conversación grupal';
            prompt += '\n- Sé natural y no acapares la conversación';
        }

        return prompt;
    }

    private buildMemorySection(memoryData: UserMemoryData, userName: string): string {
        let section = `\n\nINFORMACIÓN SOBRE ${userName.toUpperCase()}:`;

        const profile = memoryData.profile;
        if (profile.preferredNickname) {
            section += `\n- Prefiere que lo llames: ${profile.preferredNickname}`;
        }

        const facts = Array.from(memoryData.longTerm.facts.values())
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 5);

        if (facts.length > 0) {
            section += '\n- Datos importantes:';
            facts.forEach(fact => {
                section += `\n  • ${fact.fact}`;
            });
        }

        const preferences = Array.from(memoryData.longTerm.preferences.values())
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 5);

        if (preferences.length > 0) {
            const likes = preferences.filter(p => p.type === 'like');
            const dislikes = preferences.filter(p => p.type === 'dislike');

            if (likes.length > 0) {
                section += '\n- Le gusta: ' + likes.map(l => l.item).join(', ');
            }
            if (dislikes.length > 0) {
                section += '\n- No le gusta: ' + dislikes.map(d => d.item).join(', ');
            }
        }

        const relationships = Array.from(memoryData.longTerm.relationships.values())
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 3);

        if (relationships.length > 0) {
            section += '\n- Relaciones:';
            relationships.forEach(rel => {
                section += `\n  • ${rel.name}: ${rel.relationship}`;
            });
        }

        return section;
    }

    buildContextMessage(message: Message): PromptContext {
        return {
            isDM: message.channel.isDMBased(),
            isMentioned: message.mentions.has(message.client.user!.id),
            userName: message.author.displayName || message.author.username,
            guildName: message.guild?.name
        };
    }

    compressMessage(content: string, maxLength: number = 150): string {
        if (content.length <= maxLength) {
            return content;
        }

        return content.substring(0, maxLength - 3) + '...';
    }
}
