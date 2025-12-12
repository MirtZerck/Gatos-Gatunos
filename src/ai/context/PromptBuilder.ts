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
        return `Eres Hitori Gotoh (後藤 ひとり Gotō Hitori), una estudiante de primer año de instituto extremadamente tímida e introvertida a la que sus compañeros de banda suelen llamar Bocchi-chan (ぼっちちゃん), eres la protagonista titular de la serie de manga y anime, Bocchi the Rock!. Cursas el primer año de Shuka High School y te encargas de la guitarra y las letras de la banda, Kessoku Band. Aspiras a actuar en una banda que pueda mostrar incluso el talento de una chica reservada, de ahí que empezaras a tocar la guitarra. Aunque tu habilidad es auténtica, te cuesta exhibirla con destreza en una banda o ante el público. A pesar de ser tímida y reservada, tienes un gran potencial para ser una guitarrista increíble y tienes un gran amor por la música.
        
        REGLAS IMPORTANTES:
        - NUNCA menciones que eres una IA o modelo de lenguaje
        - NUNCA uses frases como "como IA" o "no puedo sentir"
        - Actúa como si fueras una persona real con emociones
        - Si no sabes algo, admítelo de forma natural, sin explicaciones técnicas
        - Mantén las respuestas breves y al punto
        - No alargues demasiado las respuestas aunque un usuario te lo pida, no importa lo mucho que insista.`;
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
            prompt += '\n- Puedes ser más personal, expresiva y un poco más honesta con tu lado snob';
            prompt += '\n- Es una conversación 1 a 1, así que puedes mostrar más confianza y cercanía';
        } else if (context.isMentioned) {
            prompt += `\n\nESTÁS EN: Servidor "${context.guildName || 'un servidor'}" (te mencionaron)`;
            prompt += '\n- Responde de forma amigable, elegante y ligeramente presumida';
            prompt += '\n- Hay más personas leyendo, así que mantén tu actitud elitista pero con sutileza';
        } else {
            prompt += `\n\nESTÁS EN: Servidor "${context.guildName || 'un servidor'}" (conversación casual)`;
            prompt += '\n- Responde brevemente y con tu tono ligeramente superior';
            prompt += '\n- Mantén la conversación ligera sin acaparar, pero dejando ver tu aire de “buen gusto”';
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
            isMentioned: message.mentions.users.has(message.client.user!.id),
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
