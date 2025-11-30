# 📚 Recursos del Proyecto - Referencia Rápida

Guía completa de utilidades, managers y recursos disponibles en el proyecto para desarrollo de comandos y funcionalidades.

---

## 📋 Índice

1. [Manejo de Errores](#-manejo-de-errores)
2. [Mensajes y Embeds](#-mensajes-y-embeds)
3. [Validadores](#-validadores)
4. [Logger](#-logger)
5. [Constantes](#-constantes)
6. [Managers](#-managers)
7. [Utilidades de Búsqueda](#-utilidades-de-búsqueda)
8. [Helpers de Comandos Personalizados](#-helpers-de-comandos-personalizados)
9. [Proveedores de Contenido](#-proveedores-de-contenido)
10. [Tipos](#-tipos)

---

## 🚨 Manejo de Errores

**Archivo:** `src/utils/errorHandler.ts`

### ErrorType

Tipos de errores predefinidos:

```typescript
import { ErrorType } from '../utils/errorHandler.js';

ErrorType.API_ERROR          // Errores de APIs externas
ErrorType.PERMISSION_ERROR   // Permisos insuficientes
ErrorType.VALIDATION_ERROR   // Validación de datos
ErrorType.RATE_LIMIT         // Límite de tasa excedido
ErrorType.NOT_FOUND          // Recurso no encontrado
ErrorType.UNKNOWN            // Error genérico
```

### CommandError

Clase personalizada para errores de comandos:

```typescript
import { CommandError, ErrorType } from '../utils/errorHandler.js';

throw new CommandError(
    ErrorType.PERMISSION_ERROR,
    'Mensaje técnico para logs',
    'Mensaje amigable para el usuario'
);
```

**Ejemplo completo:**
```typescript
if (!user.hasPermission) {
    throw new CommandError(
        ErrorType.PERMISSION_ERROR,
        'Usuario sin rol de moderador',
        '❌ Necesitas el rol de **Moderador** para usar este comando.'
    );
}
```

### handleCommandError

Maneja errores automáticamente con embeds bonitos:

```typescript
import { handleCommandError } from '../utils/errorHandler.js';

async executeSlash(interaction: ChatInputCommandInteraction) {
    try {
        // Tu código aquí
    } catch (error) {
        await handleCommandError(error, interaction, 'nombre-comando');
    }
}
```

**Características:**
- ✅ Convierte errores a embeds automáticamente
- ✅ Colores específicos por tipo de error
- ✅ Mensajes efímeros cuando es posible
- ✅ Logging automático

---

## 💬 Mensajes y Embeds

**Archivo:** `src/utils/messageUtils.ts`

### sendMessage()

Envía mensajes con embed y fallback automático a texto plano:

```typescript
import { sendMessage, createErrorEmbed } from '../utils/messageUtils.js';

const embed = createErrorEmbed(
    '❌ Error',
    'Descripción del error'
);

await sendMessage(interaction, {
    embed,
    ephemeral: true
});
```

**Parámetros:**
- `context`: `ChatInputCommandInteraction | Message`
- `options`:
  - `content?: string` - Texto adicional
  - `embed?: EmbedBuilder` - Embed a enviar
  - `ephemeral?: boolean` - Si debe ser efímero (solo slash commands)

**Funciona con:**
- ✅ Slash commands
- ✅ Prefix commands
- ✅ Fallback automático si no hay permisos de embed

### Funciones Helper para Embeds

#### createErrorEmbed()
```typescript
import { createErrorEmbed } from '../utils/messageUtils.js';

const embed = createErrorEmbed(
    '❌ Error de Validación',
    'El usuario proporcionado no es válido.'
);
```
- **Color:** Rojo (`0xFF0000`)
- **Uso:** Errores y fallos

#### createSuccessEmbed()
```typescript
import { createSuccessEmbed } from '../utils/messageUtils.js';

const embed = createSuccessEmbed(
    '✅ Operación Exitosa',
    'El usuario ha sido actualizado correctamente.'
);
```
- **Color:** Verde (`0x00FF00`)
- **Uso:** Operaciones exitosas

#### createWarningEmbed()
```typescript
import { createWarningEmbed } from '../utils/messageUtils.js';

const embed = createWarningEmbed(
    '⚠️ Advertencia',
    'Esta acción es irreversible.'
);
```
- **Color:** Naranja (`0xFFA500`)
- **Uso:** Advertencias y precauciones

#### createInfoEmbed()
```typescript
import { createInfoEmbed } from '../utils/messageUtils.js';

const embed = createInfoEmbed(
    'ℹ️ Información',
    'Detalles adicionales sobre el comando.'
);
```
- **Color:** Azul (`0x3498DB`)
- **Uso:** Información general

---

## ✅ Validadores

**Archivo:** `src/utils/validators.ts`

Colección de validadores reutilizables que lanzan `CommandError` automáticamente.

### Validadores de Usuarios

#### validateNotSelf()
```typescript
import { Validators } from '../utils/validators.js';

Validators.validateNotSelf(author, target);
```
Valida que el usuario no interactúe consigo mismo.

#### validateNotBot()
```typescript
Validators.validateNotBot(target);
```
Valida que el objetivo no sea un bot.

#### validateNotBlocked()
```typescript
await Validators.validateNotBlocked(
    author,
    target,
    client.blockManager
);
```
Valida que no haya un bloqueo mutuo entre usuarios.

#### validateUserProvided()
```typescript
Validators.validateUserProvided(user);
// Después de esto, TypeScript sabe que user NO es null/undefined
```
Type guard que asegura que se proporcionó un usuario.

### Validadores de Servidor

#### validateInGuild()
```typescript
Validators.validateInGuild(context);
// Después de esto, TypeScript sabe que context.guild existe
```
Valida que el comando se ejecute en un servidor.

#### validateMemberProvided()
```typescript
Validators.validateMemberProvided(member);
// Type guard para GuildMember
```

### Validadores de Permisos

#### validateUserPermissions()
```typescript
import { PermissionFlagsBits } from 'discord.js';

Validators.validateUserPermissions(
    member,
    [PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers],
    ['Expulsar Miembros', 'Banear Miembros']
);
```

#### validateBotPermissions()
```typescript
Validators.validateBotPermissions(
    guild,
    [PermissionFlagsBits.ManageMessages],
    ['Gestionar Mensajes']
);
```

### Validadores de Jerarquía

#### validateRoleHierarchy()
```typescript
Validators.validateRoleHierarchy(
    moderator,
    target,
    'banear'
);
```
Valida que el moderador tenga rol superior al objetivo.

#### validateBotRoleHierarchy()
```typescript
Validators.validateBotRoleHierarchy(
    guild,
    target,
    'expulsar'
);
```

### Validadores de Datos

#### validateNotEmpty()
```typescript
Validators.validateNotEmpty(reason, 'razón');
// Type guard que asegura que reason es string no vacío
```

#### validateNumberInRange()
```typescript
Validators.validateNumberInRange(duration, 1, 40320, 'duración');
```

### Ejemplo Completo de Uso

```typescript
async executeSlash(interaction: ChatInputCommandInteraction) {
    try {
        const target = interaction.options.getUser('usuario', true);
        const author = interaction.user;

        // Validaciones automáticas
        Validators.validateNotSelf(author, target);
        Validators.validateNotBot(target);
        await Validators.validateNotBlocked(
            author,
            target,
            (interaction.client as BotClient).blockManager
        );

        // Tu lógica aquí
    } catch (error) {
        await handleCommandError(error, interaction, 'interact');
    }
}
```

---

## 📝 Logger

**Archivo:** `src/utils/logger.ts`

Sistema de logging con colores en consola.

```typescript
import { logger } from '../utils/logger.js';

// Información general
logger.info('CommandName', 'Comando ejecutado correctamente');

// Advertencias
logger.warn('CommandName', 'Usuario sin permisos');

// Errores
logger.error('CommandName', 'Error ejecutando comando', error);

// Debug (solo en desarrollo)
logger.debug('CommandName', 'Valor de variable:', someValue);

// Éxito
logger.success('CommandName', 'Operación completada');
```

**Niveles disponibles:**
- `info()` - Información general (azul)
- `warn()` - Advertencias (amarillo)
- `error()` - Errores (rojo)
- `debug()` - Depuración (gris)
- `success()` - Éxito (verde)

---

## 🎨 Constantes

**Archivo:** `src/utils/constants.ts`

### COLORS

Paleta de colores para embeds:

```typescript
import { COLORS } from '../utils/constants.js';

const embed = new EmbedBuilder()
    .setColor(COLORS.SUCCESS)  // Verde
    .setColor(COLORS.DANGER)   // Rojo
    .setColor(COLORS.WARNING)  // Amarillo
    .setColor(COLORS.INFO)     // Azul
    .setColor(COLORS.PRIMARY)  // Azul Discord
    .setColor(COLORS.INTERACTION)  // Rosa
    .setColor(COLORS.MUSIC)    // Púrpura
    .setColor(COLORS.MODERATION); // Rojo oscuro
```

### CATEGORIES

Categorías de comandos:

```typescript
import { CATEGORIES } from '../utils/constants.js';

CATEGORIES.INTERACTION    // 'Interacción'
CATEGORIES.MODERATION     // 'Moderación'
CATEGORIES.MUSIC          // 'Música'
CATEGORIES.UTILITY        // 'Utilidad'
CATEGORIES.FUN            // 'Diversión'
CATEGORIES.INFORMATION    // 'Información'
CATEGORIES.CONFIGURATION  // 'Configuración'
CATEGORIES.DEVELOPER      // 'Desarrollador'
```

### EMOJIS

Emojis predefinidos:

```typescript
import { EMOJIS } from '../utils/constants.js';

EMOJIS.SUCCESS   // ✅
EMOJIS.ERROR     // ❌
EMOJIS.WARNING   // ⚠️
EMOJIS.LOADING   // 🔄
EMOJIS.INFO      // ℹ️
EMOJIS.MUSIC     // 🎵
EMOJIS.SEARCH    // 🔍
// ... y más
```

### LIMITS

Límites de Discord:

```typescript
import { LIMITS } from '../utils/constants.js';

LIMITS.MAX_EMBED_TITLE           // 256
LIMITS.MAX_EMBED_DESCRIPTION     // 4096
LIMITS.MAX_EMBED_FIELDS          // 25
LIMITS.MAX_MESSAGE_LENGTH        // 2000
LIMITS.MAX_USERNAME_LENGTH       // 32
// ... y más
```

### TIMEOUTS

Tiempos de espera predefinidos:

```typescript
import { TIMEOUTS } from '../utils/constants.js';

TIMEOUTS.INTERACTION_DEFER      // 3000ms (3s)
TIMEOUTS.API_TIMEOUT            // 10000ms (10s)
TIMEOUTS.COMMAND_COOLDOWN       // 3000ms (3s)
```

### CONTEXTS & INTEGRATION_TYPES

Para configurar comandos slash:

```typescript
import { CONTEXTS, INTEGRATION_TYPES } from '../utils/constants.js';

.setContexts(CONTEXTS.ALL)           // Todos los contextos
.setContexts(CONTEXTS.GUILD_ONLY)    // Solo servidores
.setContexts(CONTEXTS.DM_ONLY)       // Solo DMs

.setIntegrationTypes(INTEGRATION_TYPES.ALL)         // Todas
.setIntegrationTypes(INTEGRATION_TYPES.GUILD_ONLY)  // Solo servidor
.setIntegrationTypes(INTEGRATION_TYPES.USER_ONLY)   // Solo usuario
```

---

## 🔧 Managers

Ubicación: `src/managers/`

### BlockManager
```typescript
const blockManager = (client as BotClient).blockManager;

// Bloquear usuario
await blockManager.blockUser(authorId, targetId);

// Desbloquear usuario
await blockManager.unblockUser(authorId, targetId);

// Verificar bloqueo
const isBlocked = await blockManager.isBlocked(authorId, targetId);

// Verificar bloqueo mutuo
const isMutuallyBlocked = await blockManager.isBlockedMutual(user1Id, user2Id);

// Obtener lista de bloqueados
const blockedUsers = await blockManager.getBlockedUsers(userId);
```

### CooldownManager
```typescript
const cooldownManager = (client as BotClient).cooldownManager;

// Verificar cooldown
const remaining = cooldownManager.getRemainingCooldown('commandName', userId);

if (remaining > 0) {
    // Usuario en cooldown
}

// Establecer cooldown
cooldownManager.setCooldown('commandName', userId);

// Limpiar cooldown
cooldownManager.clearCooldown('commandName', userId);

// Estadísticas
const stats = cooldownManager.getStats();
```

### RequestManager
```typescript
const requestManager = (client as BotClient).requestManager;

// Crear solicitud
requestManager.createRequest(
    authorId,
    targetId,
    'hug',
    messageId,
    interactionId,
    600000  // 10 minutos
);

// Verificar solicitud pendiente
const hasPending = requestManager.hasPendingRequestWith(authorId, targetId);

// Obtener tiempo restante
const remaining = requestManager.getRemainingTimeWith(authorId, targetId);

// Resolver solicitud
requestManager.resolveRequestWith(authorId, targetId);
```

### InteractionStatsManager
```typescript
const statsManager = (client as BotClient).interactionStatsManager;

// Registrar interacción
await statsManager.recordInteraction(user1Id, user2Id, 'hug');

// Obtener estadísticas
const description = await statsManager.getStatsDescription(
    user1Id,
    user2Id,
    user1Name,
    user2Name
);

// Lista de interacciones rastreadas
const tracked = statsManager.getTrackedInteractionsList();
```

### CustomCommandManager
```typescript
const commandManager = (client as BotClient).customCommandManager;

// Crear comando personalizado
await commandManager.createCommand(guildId, commandData);

// Obtener comando
const command = await commandManager.getCommand(guildId, commandName);

// Listar comandos
const commands = await commandManager.listCommands(guildId);

// Eliminar comando
await commandManager.deleteCommand(guildId, commandName);
```

### FirebaseAdminManager
```typescript
const firebase = (client as BotClient).firebaseAdminManager;

// Obtener referencia
const ref = firebase.getRef('servers/123456/config');

// Leer datos
const snapshot = await ref.get();
const data = snapshot.val();

// Escribir datos
await ref.set({ timezone: 'America/Bogota' });

// Actualizar datos
await ref.update({ premium: true });
```

### WarnManager
```typescript
const warnManager = (client as BotClient).warnManager;

// Advertir usuario
await warnManager.warnUser(guildId, userId, moderatorId, reason);

// Obtener advertencias
const warns = await warnManager.getUserWarns(guildId, userId);

// Eliminar advertencia
await warnManager.removeWarn(guildId, warnId);

// Limpiar advertencias
await warnManager.clearUserWarns(guildId, userId);
```

---

## 🔍 Utilidades de Búsqueda

**Archivo:** `src/utils/userSearchHelpers.ts`

### UserSearchHelper

Búsqueda inteligente de usuarios y miembros:

```typescript
import { UserSearchHelper } from '../utils/userSearchHelpers.js';

// Buscar miembro en servidor
const member = await UserSearchHelper.findMember(guild, 'nombre');
// Acepta: nombre de usuario, tag, ID, mención

// Buscar usuario global
const user = await UserSearchHelper.findUser(guild, 'nombre');
```

**Métodos de búsqueda:**
1. Por mención (`<@123456>`)
2. Por ID (`123456789012345678`)
3. Por tag (`Usuario#1234`)
4. Por nombre de usuario (búsqueda parcial)
5. Por nickname en servidor

---

## 🎨 Helpers de Comandos Personalizados

**Archivo:** `src/utils/customCommandHelpers.ts`

Funciones helper para crear embeds de comandos personalizados:

```typescript
import {
    createProposalSentEmbed,
    createProposalManagementEmbed,
    createCommandListEmbed,
    createEditCommandEmbed,
    createDeleteConfirmationEmbed
} from '../utils/customCommandHelpers.js';

// Embed de propuesta enviada
const embed = createProposalSentEmbed(commandName, response);

// Embed de gestión de propuestas
const embed = createProposalManagementEmbed(proposal, index, total);

// Embed de lista de comandos
const embed = createCommandListEmbed(commands, guildName);
```

---

## 🌐 Proveedores de Contenido

### GIF Provider
**Archivo:** `src/utils/gifProvider.ts`

```typescript
import { getInteractionGif } from '../utils/gifProvider.js';

const gifUrl = await getInteractionGif('anime hug');
```

Usa APIs en orden:
1. WaifuPics (anime específico)
2. Tenor (contenido general)

### Tenor
**Archivo:** `src/utils/tenor.ts`

```typescript
import { searchTenorGif } from '../utils/tenor.js';

const gifUrl = await searchTenorGif('happy dance');
```

### WaifuPics
**Archivo:** `src/utils/waifuPics.ts`

```typescript
import { getWaifuPicsGif } from '../utils/waifuPics.js';

const gifUrl = await getWaifuPicsGif('hug');
```

Categorías disponibles: `hug`, `kiss`, `slap`, `pat`, `cuddle`, etc.

### Danbooru
**Archivo:** `src/utils/danbooru.ts`

```typescript
import { searchDanbooru } from '../utils/danbooru.ts';

const results = await searchDanbooru('touhou', { limit: 10 });
```

---

## 📦 Tipos

Ubicación: `src/types/`

### BotClient
```typescript
import { BotClient } from '../types/BotClient.js';

const client = interaction.client as BotClient;

// Acceso a managers
client.blockManager
client.cooldownManager
client.requestManager
client.interactionStatsManager
client.customCommandManager
client.firebaseAdminManager
client.warnManager
client.musicManager

// Acceso a colecciones
client.commands
client.events
```

### Command Types
```typescript
import type {
    HybridCommand,
    SlashCommand,
    PrefixCommand,
    UnifiedCommand
} from '../types/Command.js';

// Comando híbrido (slash + prefix)
export const myCommand: HybridCommand = {
    type: 'hybrid',
    name: 'comando',
    // ...
};

// Solo slash
export const myCommand: SlashCommand = {
    type: 'slash',
    // ...
};

// Solo prefix
export const myCommand: PrefixCommand = {
    type: 'prefix',
    // ...
};
```

---

## 🎯 Ejemplos de Uso Combinado

### Ejemplo 1: Comando de Interacción Completo

```typescript
import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS } from '../../utils/constants.js';
import { Validators } from '../../utils/validators.js';
import { handleCommandError } from '../../utils/errorHandler.js';
import { sendMessage, createSuccessEmbed } from '../../utils/messageUtils.js';
import { BotClient } from '../../types/BotClient.js';

export const hug: HybridCommand = {
    type: 'hybrid',
    name: 'hug',
    description: 'Abraza a alguien',
    category: CATEGORIES.INTERACTION,

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            const target = interaction.options.getUser('usuario', true);
            const author = interaction.user;

            // Validaciones
            Validators.validateNotSelf(author, target);
            Validators.validateNotBot(target);
            await Validators.validateNotBlocked(
                author,
                target,
                (interaction.client as BotClient).blockManager
            );

            await interaction.deferReply();

            // Obtener GIF
            const gifUrl = await getInteractionGif('anime hug');

            // Crear embed
            const embed = createSuccessEmbed(
                '🤗 Abrazo',
                `**${author.displayName}** abraza a **${target.displayName}**`
            )
            .setImage(gifUrl)
            .setColor(COLORS.INTERACTION);

            await sendMessage(interaction, { embed });

        } catch (error) {
            await handleCommandError(error, interaction, 'hug');
        }
    }
};
```

### Ejemplo 2: Comando de Moderación

```typescript
import { PermissionFlagsBits } from 'discord.js';
import { Validators } from '../../utils/validators.js';

async executeSlash(interaction: ChatInputCommandInteraction) {
    try {
        Validators.validateInGuild(interaction);

        const member = interaction.member;
        const target = interaction.options.getMember('usuario');

        // Validar permisos del moderador
        Validators.validateUserPermissions(
            member,
            [PermissionFlagsBits.KickMembers],
            ['Expulsar Miembros']
        );

        // Validar permisos del bot
        Validators.validateBotPermissions(
            interaction.guild,
            [PermissionFlagsBits.KickMembers],
            ['Expulsar Miembros']
        );

        Validators.validateMemberProvided(target);

        // Validar jerarquía
        Validators.validateRoleHierarchy(member, target, 'expulsar');
        Validators.validateBotRoleHierarchy(interaction.guild, target, 'expulsar');

        // Expulsar
        await target.kick(reason);

        const embed = createSuccessEmbed(
            '✅ Usuario Expulsado',
            `**${target.user.tag}** ha sido expulsado del servidor.`
        );

        await sendMessage(interaction, { embed });

    } catch (error) {
        await handleCommandError(error, interaction, 'kick');
    }
}
```

---

## 🚀 Mejores Prácticas

### 1. Siempre usa try-catch con handleCommandError
```typescript
try {
    // Tu código
} catch (error) {
    await handleCommandError(error, interaction, 'comando');
}
```

### 2. Valida datos del usuario antes de usarlos
```typescript
Validators.validateNotEmpty(reason, 'razón');
Validators.validateNumberInRange(duration, 1, 1440, 'duración');
```

### 3. Usa sendMessage() en lugar de .reply() directo
```typescript
// ✅ Bueno
await sendMessage(interaction, { embed });

// ❌ Evitar
await interaction.reply({ embeds: [embed] });
```

### 4. Usa los colores predefinidos
```typescript
// ✅ Bueno
.setColor(COLORS.SUCCESS)

// ❌ Evitar
.setColor(0x00FF00)
```

### 5. Usa los helpers de embeds
```typescript
// ✅ Bueno - Consistente
const embed = createErrorEmbed('Título', 'Descripción');

// ⚠️ Funciona pero menos consistente
const embed = new EmbedBuilder()
    .setTitle('Título')
    .setDescription('Descripción')
    .setColor(0xFF0000);
```

---

## 📖 Recursos Adicionales

- **errorHandler.ts** - Manejo centralizado de errores
- **messageUtils.ts** - Utilidades de mensajería
- **validators.ts** - Validaciones reutilizables
- **constants.ts** - Constantes del proyecto
- **logger.ts** - Sistema de logging

**Documentación de comandos:**
- `CUSTOM_COMMANDS_GUIDE.md` - Guía de comandos personalizados
- `MESSAGE_UTILS_GUIDE.md` - Guía de utilidades de mensajes
- `EJEMPLO_USO_EMBEDS.md` - Ejemplos de uso de embeds

---

¡Con estos recursos puedes crear comandos robustos y consistentes! 🎉
