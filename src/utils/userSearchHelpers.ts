import { Guild, GuildMember, User } from 'discord.js';
import { logger } from './logger.js';

/**
 * Helper optimizado para búsqueda de usuarios en un servidor.
 * Prioriza búsquedas rápidas (ID, menciones) antes de búsquedas lentas (nombres).
 * 
 * @class UserSearchHelper
 * 
 * @example
 * ```typescript
 * const member = await UserSearchHelper.findMember(guild, '@User#1234');
 * if (member) {
 *   console.log(`Encontrado: ${member.displayName}`);
 * }
 * ```
 */
export class UserSearchHelper {
    /**
     * 🔍 Encuentra un miembro desde menciones de Discord o query manual.
     * Útil para comandos que aceptan tanto menciones como búsqueda manual.
     * 
     * @param {Guild} guild - Servidor donde buscar
     * @param {GuildMember | null | undefined} mentionedMember - Miembro mencionado (opcional)
     * @param {string} [query] - Query de búsqueda manual (opcional)
     * @returns {Promise<GuildMember | null>} Miembro encontrado o null
     */
    static async findMemberFromMentionOrQuery(
        guild: Guild,
        mentionedMember: GuildMember | null | undefined,
        query?: string
    ): Promise<GuildMember | null> {
        // Prioridad 1: Miembro mencionado
        if (mentionedMember) {
            return mentionedMember;
        }

        // Prioridad 2: Query manual
        if (query) {
            return await this.findMember(guild, query);
        }

        return null;
    }
    /**
     * 🚀 Busca un miembro en el servidor de forma optimizada.
     * 
     * **Orden de búsqueda (del más rápido al más lento):**
     * 1. ID directo (O(1) - instant)
     * 2. Mención <@123> (O(1) - instant)
     * 3. Username#discriminator (O(n) - rápido si hay pocos)
     * 4. Búsqueda parcial por nombre (O(n) - más lento)
     * 
     * @param {Guild} guild - Servidor donde buscar
     * @param {string} query - Query de búsqueda
     * @returns {Promise<GuildMember | null>} Miembro encontrado o null
     */
    static async findMember(guild: Guild, query: string): Promise<GuildMember | null> {
        if (!query || query.trim().length === 0) {
            return null;
        }

        const cleanQuery = query.trim();

        try {
            // ✅ PASO 1: Extraer ID de mención (<@123> o <@!123>)
            const mentionMatch = cleanQuery.match(/^<@!?(\d+)>$/);
            if (mentionMatch) {
                const memberId = mentionMatch[1];
                const member = guild.members.cache.get(memberId);
                if (member) {
                    logger.debug('UserSearchHelper', `✅ Encontrado por mención: ${member.user.tag}`);
                    return member;
                }

                // Intentar fetch si no está en caché
                try {
                    const fetchedMember = await guild.members.fetch(memberId);
                    logger.debug('UserSearchHelper', `✅ Encontrado por fetch: ${fetchedMember.user.tag}`);
                    return fetchedMember;
                } catch {
                    return null;
                }
            }

            // ✅ PASO 2: ID directo (solo números, 17-20 dígitos)
            if (/^\d{17,20}$/.test(cleanQuery)) {
                const member = guild.members.cache.get(cleanQuery);
                if (member) {
                    logger.debug('UserSearchHelper', `✅ Encontrado por ID: ${member.user.tag}`);
                    return member;
                }

                // Intentar fetch si no está en caché
                try {
                    const fetchedMember = await guild.members.fetch(cleanQuery);
                    logger.debug('UserSearchHelper', `✅ Encontrado por fetch ID: ${fetchedMember.user.tag}`);
                    return fetchedMember;
                } catch {
                    return null;
                }
            }

            // ✅ PASO 3: Username#discriminator exacto (User#1234)
            if (cleanQuery.includes('#')) {
                const exactMatch = guild.members.cache.find(
                    m => m.user.tag.toLowerCase() === cleanQuery.toLowerCase()
                );
                if (exactMatch) {
                    logger.debug('UserSearchHelper', `✅ Encontrado por tag exacto: ${exactMatch.user.tag}`);
                    return exactMatch;
                }
            }

            // ✅ PASO 4: Búsqueda parcial (más lenta, última opción)
            const lowerQuery = cleanQuery.toLowerCase();

            // 4a. Coincidencia exacta de username
            const exactUsername = guild.members.cache.find(
                m => m.user.username.toLowerCase() === lowerQuery
            );
            if (exactUsername) {
                logger.debug('UserSearchHelper', `✅ Encontrado por username exacto: ${exactUsername.user.tag}`);
                return exactUsername;
            }

            // 4b. Coincidencia exacta de displayName
            const exactDisplayName = guild.members.cache.find(
                m => m.displayName.toLowerCase() === lowerQuery
            );
            if (exactDisplayName) {
                logger.debug('UserSearchHelper', `✅ Encontrado por displayName exacto: ${exactDisplayName.user.tag}`);
                return exactDisplayName;
            }

            // 4c. Coincidencia parcial (starts with) - más rápido que includes
            const startsWithUsername = guild.members.cache.find(
                m => m.user.username.toLowerCase().startsWith(lowerQuery)
            );
            if (startsWithUsername) {
                logger.debug('UserSearchHelper', `✅ Encontrado por username (starts): ${startsWithUsername.user.tag}`);
                return startsWithUsername;
            }

            const startsWithDisplayName = guild.members.cache.find(
                m => m.displayName.toLowerCase().startsWith(lowerQuery)
            );
            if (startsWithDisplayName) {
                logger.debug('UserSearchHelper', `✅ Encontrado por displayName (starts): ${startsWithDisplayName.user.tag}`);
                return startsWithDisplayName;
            }

            // 4d. Última opción: Coincidencia parcial (includes) - MÁS LENTO
            if (lowerQuery.length >= 3) { // Solo si la query tiene 3+ caracteres
                const partialMatch = guild.members.cache.find(
                    m => m.user.username.toLowerCase().includes(lowerQuery) ||
                        m.displayName.toLowerCase().includes(lowerQuery)
                );
                if (partialMatch) {
                    logger.debug('UserSearchHelper', `✅ Encontrado por coincidencia parcial: ${partialMatch.user.tag}`);
                    return partialMatch;
                }
            }

            // ❌ No encontrado
            logger.debug('UserSearchHelper', `❌ No se encontró: "${cleanQuery}"`);
            return null;

        } catch (error) {
            logger.error('UserSearchHelper', `Error buscando miembro: "${cleanQuery}"`, error);
            return null;
        }
    }

    /**
     * 🚀 Busca múltiples miembros de forma optimizada.
     * Útil para comandos que aceptan múltiples usuarios.
     * 
     * @param {Guild} guild - Servidor donde buscar
     * @param {string[]} queries - Array de queries
     * @returns {Promise<GuildMember[]>} Array de miembros encontrados (sin duplicados)
     */
    static async findMembers(guild: Guild, queries: string[]): Promise<GuildMember[]> {
        const foundMembers = new Map<string, GuildMember>();

        for (const query of queries) {
            const member = await this.findMember(guild, query);
            if (member && !foundMembers.has(member.id)) {
                foundMembers.set(member.id, member);
            }
        }

        return Array.from(foundMembers.values());
    }

    /**
     * 🔍 Busca un usuario (no necesariamente miembro del servidor).
     * Útil para comandos que permiten IDs de usuarios externos.
     * 
     * @param {Guild} guild - Servidor de contexto
     * @param {string} query - Query de búsqueda
     * @returns {Promise<User | null>} Usuario encontrado o null
     */
    static async findUser(guild: Guild, query: string): Promise<User | null> {
        // Primero intentar encontrar como miembro
        const member = await this.findMember(guild, query);
        if (member) {
            return member.user;
        }

        // Si no es miembro pero es un ID válido, intentar fetch
        const cleanQuery = query.trim();
        const mentionMatch = cleanQuery.match(/^<@!?(\d+)>$/);
        const userId = mentionMatch ? mentionMatch[1] : cleanQuery;

        if (/^\d{17,20}$/.test(userId)) {
            try {
                const user = await guild.client.users.fetch(userId);
                logger.debug('UserSearchHelper', `✅ Usuario externo encontrado: ${user.tag}`);
                return user;
            } catch {
                return null;
            }
        }

        return null;
    }

    /**
     * 🎯 Extrae el ID de usuario de una query (útil para validaciones).
     * 
     * @param {string} query - Query a procesar
     * @returns {string | null} ID del usuario o null
     */
    static extractUserId(query: string): string | null {
        const cleanQuery = query.trim();

        // Mención
        const mentionMatch = cleanQuery.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
            return mentionMatch[1];
        }

        // ID directo
        if (/^\d{17,20}$/.test(cleanQuery)) {
            return cleanQuery;
        }

        return null;
    }

    /**
     * 📊 Estadísticas de rendimiento (útil para debugging).
     * 
     * @param {Guild} guild - Servidor
     * @returns {object} Información de caché
     */
    static getCacheInfo(guild: Guild): {
        cachedMembers: number;
        totalMembers: number;
        cachePercentage: string;
    } {
        const cachedMembers = guild.members.cache.size;
        const totalMembers = guild.memberCount;
        const percentage = ((cachedMembers / totalMembers) * 100).toFixed(2);

        return {
            cachedMembers,
            totalMembers,
            cachePercentage: `${percentage}%`
        };
    }
}