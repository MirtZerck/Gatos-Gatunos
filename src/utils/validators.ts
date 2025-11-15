import {
    User,
    GuildMember,
    PermissionsBitField,
    Guild,
    ChatInputCommandInteraction,
    Message
} from 'discord.js';
import { CommandError, ErrorType } from './errorHandler.js';

/**
 * *Colección de validadores reutilizables para comandos de Discord.
 * Todos los métodos lanzan CommandError si la validación falla.
 * 
 * @class Validators
 * 
 * @example
 * ```typescript
 * /// Validar que no sea el mismo usuario
 * Validators.validateNotSelf(author, target);
 * 
 * /// Validar permisos
 * Validators.validateUserPermissions(
 *   member,
 *   [PermissionFlagsBits.KickMembers],
 *   ['Expulsar Miembros']
 * );
 * ```
 */
export class Validators {
    /**
     * *Valida que el usuario objetivo no sea el mismo que el autor.
     * 
     * @static
     * @param {User} author - Usuario que ejecuta la acción
     * @param {User} target - Usuario objetivo
     * @throws {CommandError} Si el autor y el objetivo son el mismo usuario
     */

    static validateNotSelf(author: User, target: User): void {
        if (target.id === author.id) {
            throw new CommandError(
                ErrorType.VALIDATION_ERROR,
                'El usuario intenta interactuar consigo mismo',
                '❌ No puedes interactuar contigo mismo.'
            );
        }
    }

    /**
     * *Valida que el usuario objetivo no sea un bot.
     * 
     * @static
     * @param {User} target - Usuario a validar
     * @throws {CommandError} Si el usuario es un bot
     */

    static validateNotBot(target: User): void {
        if (target.bot) {
            throw new CommandError(
                ErrorType.VALIDATION_ERROR,
                'El usuario intenta interactuar con un bot',
                '❌ No puedes interactuar con un bot.'
            );
        }
    }

    /**
     * *Valida que se haya proporcionado un usuario.
     * *Type guard que asegura que user no es null/undefined.
     * 
     * @static
     * @param {User | null | undefined} user - Usuario a validar
     * @throws {CommandError} Si no se proporcionó un usuario
     * @asserts user is User
     */

    static validateUserProvided(user: User | null | undefined): asserts user is User {
        if (!user) {
            throw new CommandError(
                ErrorType.VALIDATION_ERROR,
                'No se ha proporcionado un usuario',
                '❌ Debes mencionar o seleccionar un usuario.'
            );
        }
    }

    /**
     * *Valida que se haya proporcionado un miembro del servidor.
     * *Type guard que asegura que member no es null/undefined.
     * 
     * @static
     * @param {GuildMember | null | undefined} member - Miembro a validar
     * @throws {CommandError} Si no se proporcionó un miembro
     * @asserts member is GuildMember
     */

    static validateMemberProvided(member: GuildMember | null | undefined): asserts member is GuildMember {
        if (!member) {
            throw new CommandError(
                ErrorType.VALIDATION_ERROR,
                'No se ha proporcionado un miembro',
                '❌ Debes mencionar o seleccionar un miembro del servidor.'
            );
        }
    }

    /**
     * *Valida que el comando se esté ejecutando dentro de un servidor.
     * *Type guard que asegura que context.guild existe.
     * 
     * @static
     * @param {ChatInputCommandInteraction | Message} context - Contexto de ejecución
     * @throws {CommandError} Si el comando no se ejecuta en un servidor
     * @asserts context is (ChatInputCommandInteraction | Message) & { guild: Guild }
     */

    static validateInGuild(
        context: ChatInputCommandInteraction | Message
    ): asserts context is (ChatInputCommandInteraction | Message) & { guild: Guild } {
        if (!context.guild) {
            throw new CommandError(
                ErrorType.VALIDATION_ERROR,
                'Comando usado fuera de un servidor',
                '❌ Este comando solo funciona en servidores.'
            );
        }
    }

    /**
     * *Valida que el usuario tenga los permisos necesarios.
     * 
     * @static
     * @param {GuildMember | null | undefined} member - Miembro a validar
     * @param {bigint[]} permissions - Array de permisos requeridos
     * @param {string[]} permissionNames - Nombres legibles de los permisos
     * @throws {CommandError} Si el miembro no tiene alguno de los permisos
     * @asserts member is GuildMember
     */

    static validateUserPermissions(
        member: GuildMember | null | undefined,
        permissions: bigint[],
        permissionNames: string[]
    ): asserts member is GuildMember {
        if (!member) {
            throw new CommandError(
                ErrorType.PERMISSION_ERROR,
                'Miembro no encontrado',
                '❌ No se pudo verificar tus permisos.'
            );
        }

        const missingPermissions: string[] = [];

        for (let i = 0; i < permissions.length; i++) {
            if (!member.permissions.has(permissions[i])) {
                missingPermissions.push(permissionNames[i]);
            }
        }

        if (missingPermissions.length > 0) {
            throw new CommandError(
                ErrorType.PERMISSION_ERROR,
                `Permisos faltantes: ${missingPermissions.join(', ')}`,
                `❌ No tienes los permisos necesarios: **${missingPermissions.join(', ')}**`
            );
        }
    }

    /**
     * *Valida que el bot tenga los permisos necesarios en el servidor.
     * 
     * @static
     * @param {Guild | null | undefined} guild - Servidor donde validar permisos
     * @param {bigint[]} permissions - Array de permisos requeridos
     * @param {string[]} permissionNames - Nombres legibles de los permisos
     * @throws {CommandError} Si el bot no tiene alguno de los permisos
     */

    static validateBotPermissions(
        guild: Guild | null | undefined,
        permissions: bigint[],
        permissionNames: string[]
    ): void {
        if (!guild) {
            throw new CommandError(
                ErrorType.PERMISSION_ERROR,
                'Servidor no encontrado',
                '❌ No pude verificar los permisos del servidor.'
            );
        }

        const botMember = guild.members.me;

        if (!botMember) {
            throw new CommandError(
                ErrorType.PERMISSION_ERROR,
                'Bot member no encontrado',
                '❌ No pude verificar mis permisos.'
            );
        }

        const missingPermissions: string[] = [];

        for (let i = 0; i < permissions.length; i++) {
            if (!botMember.permissions.has(permissions[i])) {
                missingPermissions.push(permissionNames[i]);
            }
        }

        if (missingPermissions.length > 0) {
            throw new CommandError(
                ErrorType.PERMISSION_ERROR,
                `El bot no tiene estos permisos: ${missingPermissions.join(', ')}`,
                `❌ Necesito los siguientes permisos: **${missingPermissions.join(', ')}`
            );
        }
    }

    /**
     * *Valida que un string no esté vacío.
     * *Type guard que asegura que value es string no vacío.
     * 
     * @static
     * @param {string | null | undefined} value - Valor a validar
     * @param {string} fieldName - Nombre del campo para el mensaje de error
     * @throws {CommandError} Si el valor está vacío o es null/undefined
     * @asserts value is string
     */

    static validateNotEmpty(value: string | null | undefined, fieldName: string): asserts value is string {
        if (!value || value.trim().length === 0) {
            throw new CommandError(
                ErrorType.VALIDATION_ERROR,
                `${fieldName} está vacío`,
                `❌ El campo ${fieldName} no puede estar vacío.`
            );
        }
    }

    static validateNumberInRange(
        value: number,
        min: number,
        max: number,
        fieldName: string
    ): void {
        if (value < min || value > max) {
            throw new CommandError(
                ErrorType.VALIDATION_ERROR,
                `${fieldName} fuera de rango: ${value} (expected ${min}-${max})`,
                `❌ **${fieldName} debe estar entre ${min}-${max}`
            );
        }
    }

    /**
     * *Valida la jerarquía de roles entre moderador y objetivo.
     * *Asegura que el moderador tenga un rol superior al objetivo.
     * 
     * @static
     * @param {GuildMember} author - Miembro que ejecuta la acción
     * @param {GuildMember} target - Miembro objetivo
     * @param {string} action - Nombre de la acción (para el mensaje de error)
     * @throws {CommandError} Si el objetivo tiene rol igual o superior
     */

    static validateRoleHierarchy(
        author: GuildMember,
        target: GuildMember,
        action: string
    ): void {
        if (target.roles.highest.position >= author.roles.highest.position) {
            throw new CommandError(
                ErrorType.VALIDATION_ERROR,
                `No se puede ${action} a un usuario con igual o mayor rango`,
                `❌ No puedes ${action} a alguien con un rol igual o mayor al tuyo.`
            );
        }
    }


    /**
     * *Valida la jerarquía de roles entre el bot y el objetivo.
     * *Asegura que el bot tenga un rol superior al objetivo.
     * 
     * @static
     * @param {Guild} guild - Servidor donde validar
     * @param {GuildMember} target - Miembro objetivo
     * @param {string} action - Nombre de la acción (para el mensaje de error)
     * @throws {CommandError} Si el objetivo tiene rol igual o superior al bot
     */

    static validateBotRoleHierarchy(
        guild: Guild,
        target: GuildMember,
        action: string
    ): void {
        const botMember = guild.members.me;

        if (!botMember) {
            throw new CommandError(
                ErrorType.VALIDATION_ERROR,
                `Bot member no encontrado`,
                `❌ No pude verificar la jerarquía de roles.`
            );
        }

        if (target.roles.highest.position >= botMember.roles.highest.position) {
            throw new CommandError(
                ErrorType.VALIDATION_ERROR,
                `No puedo ${action} a usuarios de igual o mayor rango que el mío`,
                `❌ No puedo ${action} a alguien con un rol igual o superior al mío.`
            );
        }
    }
}


