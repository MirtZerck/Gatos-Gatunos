import {
    User,
    GuildMember,
    PermissionsBitField,
    Guild,
    ChatInputCommandInteraction,
    Message
} from 'discord.js';
import { CommandError, ErrorType } from './errorHandler.js';

export class Validators {
    static validateNotSelf(author: User, target: User): void {
        if (target.id === author.id) {
            throw new CommandError(
                ErrorType.VALIDATION_ERROR,
                'El usuario intenta interactuar consigo mismo',
                '❌ No puedes interactuar contigo mismo.'
            );
        }
    }
    static validateNotBot(target: User): void {
        if (target.bot) {
            throw new CommandError(
                ErrorType.VALIDATION_ERROR,
                'El usuario intenta interactuar con un bot',
                '❌ No puedes interactuar con un bot.'
            );
        }
    }

    static validateUserProvided(user: User | null | undefined): asserts user is User {
        if (!user) {
            throw new CommandError(
                ErrorType.VALIDATION_ERROR,
                'No se ha proporcionado un usuario',
                '❌ Debes mencionar o seleccionar un usuario.'
            );
        }
    }

    static validateMemberProvided(member: GuildMember | null | undefined): asserts member is GuildMember {
        if (!member) {
            throw new CommandError(
                ErrorType.VALIDATION_ERROR,
                'No se ha proporcionado un miembro',
                '❌ Debes mencionar o seleccionar un miembro del servidor.'
            );
        }
    }

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


