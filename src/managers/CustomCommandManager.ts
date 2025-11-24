import { FirebaseAdminManager } from './FirebaseAdminManager.js';
import { CommandManager } from './CommandManager.js';
import { logger } from '../utils/logger.js';
import {
    CommandProposal,
    ProposalStatus,
    CustomCommand,
    CustomCommandInfo,
    NotificationData
} from '../types/CustomCommand.js';
import { User, Guild, TextChannel } from 'discord.js';
import { randomUUID } from 'crypto';

/**
 * Gestor de comandos personalizados por servidor.
 * Maneja propuestas, almacenamiento y recuperación de comandos.
 *
 * @class CustomCommandManager
 *
 * @example
 * ```typescript
 * const manager = new CustomCommandManager(firebaseManager, commandManager);
 * await manager.createProposal('guild123', 'gatito', 'https://...', user);
 * ```
 */
export class CustomCommandManager {
    private firebaseManager: FirebaseAdminManager;
    private commandManager?: CommandManager;

    constructor(firebaseManager: FirebaseAdminManager, commandManager?: CommandManager) {
        this.firebaseManager = firebaseManager;
        this.commandManager = commandManager;
    }

    /**
     * Establece el CommandManager para validación de nombres reservados
     */
    setCommandManager(commandManager: CommandManager): void {
        this.commandManager = commandManager;
    }

    /**
     * Verifica que Firebase esté inicializado
     */
    private ensureInitialized(): void {
        if (!this.firebaseManager) {
            throw new Error('CustomCommandManager requiere FirebaseAdminManager inicializado');
        }
    }

    /**
     * Genera un ID único para una propuesta
     */
    private generateProposalId(): string {
        return randomUUID();
    }

    /**
     * Verifica si un nombre está reservado por comandos del sistema
     */
    isReservedName(name: string): boolean {
        if (!this.commandManager) {
            logger.warn('CustomCommandManager', 'CommandManager no configurado, no se puede validar nombres reservados');
            return false;
        }
        return this.commandManager.isReservedName(name);
    }

    /**
     * Valida que un nombre de comando sea válido
     */
    private validateCommandName(name: string): { valid: boolean; reason?: string } {
        const regex = /^[a-z0-9_-]+$/i;

        if (!regex.test(name)) {
            return { valid: false, reason: 'Solo se permiten letras, números, guiones (-) y guiones bajos (_)' };
        }

        if (name.length < 2 || name.length > 32) {
            return { valid: false, reason: 'El nombre debe tener entre 2 y 32 caracteres' };
        }

        if (this.isReservedName(name)) {
            return { valid: false, reason: `"${name}" es un nombre reservado del sistema` };
        }

        return { valid: true };
    }

    /**
     * Crea una nueva propuesta de comando personalizado
     */
    async createProposal(
        guildId: string,
        commandName: string,
        imageUrl: string,
        author: User
    ): Promise<CommandProposal> {
        this.ensureInitialized();

        const validation = this.validateCommandName(commandName);
        if (!validation.valid) {
            throw new Error(validation.reason);
        }

        const proposalId = this.generateProposalId();

        const proposal: CommandProposal = {
            id: proposalId,
            commandName: commandName.toLowerCase(),
            imageUrl,
            authorId: author.id,
            authorTag: author.tag,
            status: ProposalStatus.PENDING,
            timestamp: Date.now(),
            processedBy: null,
            processedByTag: null,
            processedAt: null,
            guildId
        };

        try {
            const proposalRef = this.firebaseManager.getRef(`servers/${guildId}/proposals/${proposalId}`);
            await proposalRef.set(proposal);

            logger.info(
                'CustomCommandManager',
                `Propuesta creada: ${commandName} por ${author.tag} en ${guildId}`
            );

            return proposal;
        } catch (error) {
            logger.error('CustomCommandManager', 'Error creando propuesta', error);
            throw new Error('No se pudo crear la propuesta');
        }
    }

    /**
     * Obtiene todas las propuestas de un servidor
     */
    async getProposals(
        guildId: string,
        status?: ProposalStatus
    ): Promise<CommandProposal[]> {
        this.ensureInitialized();

        try {
            const proposalsRef = this.firebaseManager.getRef(`servers/${guildId}/proposals`);
            const snapshot = await proposalsRef.get();

            if (!snapshot.exists()) {
                return [];
            }

            const proposals: CommandProposal[] = [];
            const data = snapshot.val();

            for (const proposalId in data) {
                const proposal = data[proposalId] as CommandProposal;
                if (!status || proposal.status === status) {
                    proposals.push(proposal);
                }
            }

            // Ordenar por timestamp (más recientes primero)
            proposals.sort((a, b) => b.timestamp - a.timestamp);

            return proposals;
        } catch (error) {
            logger.error('CustomCommandManager', 'Error obteniendo propuestas', error);
            return [];
        }
    }

    /**
     * Obtiene una propuesta específica
     */
    async getProposal(guildId: string, proposalId: string): Promise<CommandProposal | null> {
        this.ensureInitialized();

        try {
            const proposalRef = this.firebaseManager.getRef(`servers/${guildId}/proposals/${proposalId}`);
            const snapshot = await proposalRef.get();

            if (snapshot.exists()) {
                return snapshot.val() as CommandProposal;
            }

            return null;
        } catch (error) {
            logger.error('CustomCommandManager', 'Error obteniendo propuesta', error);
            return null;
        }
    }

    /**
     * Verifica si un comando existe
     */
    async commandExists(guildId: string, commandName: string): Promise<boolean> {
        this.ensureInitialized();

        try {
            const commandRef = this.firebaseManager.getRef(`servers/${guildId}/commands/personalizados/${commandName}`);
            const snapshot = await commandRef.get();

            return snapshot.exists();
        } catch (error) {
            logger.error('CustomCommandManager', 'Error verificando comando', error);
            return false;
        }
    }

    /**
      * Procesa una propuesta (acepta o rechaza) y ELIMINA la propuesta de Firebase.
      * 
      * @async
      * @param {string} guildId - ID del servidor
      * @param {string} proposalId - ID de la propuesta
      * @param {boolean} accept - true para aceptar, false para rechazar
      * @param {User} moderator - Usuario moderador que procesa
      * @returns {Promise<boolean>} true si se procesó correctamente
      * 
      * @example
      * ```typescript
      * await manager.processProposal(guildId, proposalId, true, moderator);
      * // La propuesta se acepta y se ELIMINA de Firebase
      * ```
      */
    async processProposal(
        guildId: string,
        proposalId: string,
        accept: boolean,
        moderator: User
    ): Promise<boolean> {
        this.ensureInitialized();

        try {
            const proposal = await this.getProposal(guildId, proposalId);

            if (!proposal) {
                throw new Error('Propuesta no encontrada');
            }

            if (proposal.status !== ProposalStatus.PENDING) {
                throw new Error('Esta propuesta ya fue procesada');
            }

            if (accept) {
                const commandRef = this.firebaseManager.getRef(`servers/${guildId}/commands/personalizados/${proposal.commandName}`);
                const snapshot = await commandRef.get();

                let nextIndex = 0;
                if (snapshot.exists()) {
                    const existingValues = snapshot.val();
                    const indices = Object.keys(existingValues).map(k => parseInt(k));
                    nextIndex = Math.max(...indices, -1) + 1;
                }

                await commandRef.child(nextIndex.toString()).set(proposal.imageUrl);

                logger.info(
                    'CustomCommandManager',
                    `Valor añadido al comando ${proposal.commandName} (índice ${nextIndex})`
                );
            }

            const proposalRef = this.firebaseManager.getRef(`servers/${guildId}/proposals/${proposalId}`);
            await proposalRef.remove();

            logger.info(
                'CustomCommandManager',
                `Propuesta ${accept ? 'aceptada' : 'rechazada'} y ELIMINADA por ${moderator.tag}`
            );

            return true;
        } catch (error) {
            logger.error('CustomCommandManager', 'Error procesando propuesta', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los comandos personalizados de un servidor
     */
    async getCommands(guildId: string): Promise<CustomCommandInfo[]> {
        this.ensureInitialized();

        try {
            const commandsRef = this.firebaseManager.getRef(`servers/${guildId}/commands/personalizados`);
            const snapshot = await commandsRef.get();

            if (!snapshot.exists()) {
                return [];
            }

            const commands: CustomCommandInfo[] = [];
            const data = snapshot.val();

            for (const commandName in data) {
                const values = data[commandName];
                const count = Object.keys(values).length;

                commands.push({
                    name: commandName,
                    count
                });
            }

            commands.sort((a, b) => a.name.localeCompare(b.name));

            return commands;
        } catch (error) {
            logger.error('CustomCommandManager', 'Error obteniendo comandos', error);
            return [];
        }
    }

    /**
     * Obtiene un valor aleatorio de un comando.
     */
    async getRandomValue(guildId: string, commandName: string): Promise<string | null> {
        this.ensureInitialized();

        try {
            const commandRef = this.firebaseManager.getRef(`servers/${guildId}/commands/personalizados/${commandName}`);
            const snapshot = await commandRef.get();

            if (!snapshot.exists()) {
                return null;
            }

            const values = snapshot.val();
            const urls = Object.values(values) as string[];

            if (urls.length === 0) {
                return null;
            }

            const randomIndex = Math.floor(Math.random() * urls.length);
            return urls[randomIndex];
        } catch (error) {
            logger.error('CustomCommandManager', 'Error obteniendo valor aleatorio', error);
            return null;
        }
    }

    /**
     * Obtiene todos los valores de un comando.
     */
    async getCommandValues(guildId: string, commandName: string): Promise<Record<string, string> | null> {
        this.ensureInitialized();

        try {
            const commandRef = this.firebaseManager.getRef(`servers/${guildId}/commands/personalizados/${commandName}`);
            const snapshot = await commandRef.get();

            if (snapshot.exists()) {
                return snapshot.val();
            }

            return null;
        } catch (error) {
            logger.error('CustomCommandManager', 'Error obteniendo valores', error);
            return null;
        }
    }

    /**
     * Elimina un valor específico de un comando.
     */
    async deleteCommandValue(
        guildId: string,
        commandName: string,
        index: string
    ): Promise<boolean> {
        this.ensureInitialized();

        try {
            const valueRef = this.firebaseManager.getRef(`servers/${guildId}/commands/personalizados/${commandName}/${index}`);
            await valueRef.remove();

            const commandRef = this.firebaseManager.getRef(`servers/${guildId}/commands/personalizados/${commandName}`);
            const snapshot = await commandRef.get();

            if (!snapshot.exists() || Object.keys(snapshot.val()).length === 0) {
                // Si no quedan valores, eliminar el comando completo
                await commandRef.remove();
                logger.info('CustomCommandManager', `Comando ${commandName} eliminado (sin valores)`);
            }

            logger.info('CustomCommandManager', `Valor ${index} eliminado de ${commandName}`);
            return true;
        } catch (error) {
            logger.error('CustomCommandManager', 'Error eliminando valor', error);
            return false;
        }
    }

    /**
     * Elimina un comando completo.
     */
    async deleteCommand(guildId: string, commandName: string): Promise<boolean> {
        this.ensureInitialized();

        try {
            const commandRef = this.firebaseManager.getRef(`servers/${guildId}/commands/personalizados/${commandName}`);
            await commandRef.remove();

            logger.info('CustomCommandManager', `Comando ${commandName} eliminado completamente`);
            return true;
        } catch (error) {
            logger.error('CustomCommandManager', 'Error eliminando comando', error);
            return false;
        }
    }

    /**
     * Notifica al usuario sobre el resultado de su propuesta
     */
    async notifyUser(
        userId: string,
        guild: Guild,
        proposal: CommandProposal,
        accepted: boolean,
        fallbackChannel?: TextChannel
    ): Promise<boolean> {
        try {
            const user = await guild.client.users.fetch(userId);
            const isNewCommand = !(await this.commandExists(guild.id, proposal.commandName));

            const notificationData: NotificationData = {
                commandName: proposal.commandName,
                imageUrl: proposal.imageUrl,
                userTag: user.tag,
                guildName: guild.name,
                accepted,
                isNewCommand
            };

            // Intentar enviar DM
            try {
                const { createNotificationEmbed } = await import('../utils/customCommandHelpers.js');
                const embed = createNotificationEmbed(notificationData);
                await user.send({ embeds: [embed] });

                logger.info('CustomCommandManager', `Notificación DM enviada a ${user.tag}`);
                return true;
            } catch (dmError) {
                // DM falló, intentar en canal
                if (fallbackChannel) {
                    const { createNotificationEmbed } = await import('../utils/customCommandHelpers.js');
                    const embed = createNotificationEmbed(notificationData);
                    await fallbackChannel.send({
                        content: `<@${userId}>`,
                        embeds: [embed]
                    });

                    logger.info(
                        'CustomCommandManager',
                        `Notificación enviada en canal (DM falló) para ${user.tag}`
                    );
                    return true;
                }

                logger.warn(
                    'CustomCommandManager',
                    `No se pudo notificar a ${user.tag} (DM cerrados y sin canal fallback)`
                );
                return false;
            }
        } catch (error) {
            logger.error('CustomCommandManager', 'Error enviando notificación', error);
            return false;
        }
    }

    /**
     * Obtiene información sobre un comando (para editar/gestionar)
     */
    async getCommandInfo(guildId: string, commandName: string): Promise<{
        exists: boolean;
        count: number;
        values: Record<string, string> | null;
    }> {
        const values = await this.getCommandValues(guildId, commandName);

        if (!values) {
            return { exists: false, count: 0, values: null };
        }

        return {
            exists: true,
            count: Object.keys(values).length,
            values
        };
    }
}