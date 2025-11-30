# Guía de Utilidades de Mensajes

## Descripción General

El sistema de utilidades de mensajes (`messageUtils.ts`) proporciona funciones para enviar embeds bonitos con **fallback automático** a texto plano cuando el bot no tiene permisos para enviar embeds.

## Características Principales

✅ **Manejo automático de permisos**: Detecta si el bot puede enviar embeds y hace fallback a texto plano si es necesario

✅ **Soporte para slash commands y prefix commands**: Funciona con ambos tipos de comandos

✅ **Mensajes efímeros automáticos**: Para slash commands, puedes enviar mensajes que solo el usuario puede ver

✅ **Embeds pre-configurados**: Funciones helper para crear embeds de error, éxito, advertencia e información

## Funciones Disponibles

### `sendMessage(context, options)`

Función principal para enviar mensajes con embeds y fallback automático.

**Parámetros:**
- `context`: `ChatInputCommandInteraction | Message` - El contexto del comando
- `options`: Objeto con las siguientes propiedades:
  - `content?: string` - Texto adicional (opcional)
  - `embed?: EmbedBuilder` - Embed a enviar (opcional)
  - `ephemeral?: boolean` - Si debe ser efímero (solo slash commands, por defecto `false`)

**Ejemplo básico:**
```typescript
import { sendMessage, createErrorEmbed } from '../utils/messageUtils.js';

// En un comando slash
async executeSlash(interaction: ChatInputCommandInteraction) {
    const errorEmbed = createErrorEmbed(
        'Error al procesar',
        'No se pudo completar la operación'
    );

    await sendMessage(interaction, {
        embed: errorEmbed,
        ephemeral: true
    });
}

// En un comando de prefijo
async executePrefix(message: Message, args: string[]) {
    const errorEmbed = createErrorEmbed(
        'Error al procesar',
        'No se pudo completar la operación'
    );

    // Si el bot no tiene permisos de embed, enviará texto plano automáticamente
    await sendMessage(message, {
        embed: errorEmbed
    });
}
```

### Funciones Helper para Embeds

#### `createErrorEmbed(title, description, color?)`

Crea un embed de error con estilo consistente.

```typescript
const embed = createErrorEmbed(
    '❌ Error de Validación',
    'El usuario proporcionado no es válido.'
);

await sendMessage(interaction, { embed, ephemeral: true });
```

**Color por defecto:** Rojo (`0xFF0000`)

---

#### `createSuccessEmbed(title, description, color?)`

Crea un embed de éxito con estilo consistente.

```typescript
const embed = createSuccessEmbed(
    '✅ Operación Exitosa',
    'El usuario ha sido actualizado correctamente.'
);

await sendMessage(interaction, { embed });
```

**Color por defecto:** Verde (`0x00FF00`)

---

#### `createWarningEmbed(title, description, color?)`

Crea un embed de advertencia con estilo consistente.

```typescript
const embed = createWarningEmbed(
    '⚠️ Advertencia',
    'Esta acción es irreversible. ¿Estás seguro?'
);

await sendMessage(interaction, { embed, ephemeral: true });
```

**Color por defecto:** Naranja (`0xFFA500`)

---

#### `createInfoEmbed(title, description, color?)`

Crea un embed de información con estilo consistente.

```typescript
const embed = createInfoEmbed(
    'ℹ️ Información',
    'Este comando permite gestionar usuarios.'
);

await sendMessage(interaction, { embed });
```

**Color por defecto:** Azul (`0x3498DB`)

## Ejemplos de Uso Completos

### Ejemplo 1: Mensaje de Error con Fallback Automático

```typescript
import { CommandError, ErrorType } from '../utils/errorHandler.js';
import { sendMessage, createErrorEmbed } from '../utils/messageUtils.js';

async executeSlash(interaction: ChatInputCommandInteraction) {
    try {
        // Lógica del comando...
        throw new Error('Algo salió mal');
    } catch (error) {
        const embed = createErrorEmbed(
            '❌ Error Inesperado',
            'No se pudo completar la operación. Intenta de nuevo más tarde.'
        );

        // Enviará embed efímero si es posible, texto plano si falla
        await sendMessage(interaction, {
            embed,
            ephemeral: true
        });
    }
}
```

### Ejemplo 2: Mensaje de Éxito en Prefix Command

```typescript
async executePrefix(message: Message, args: string[]) {
    // Lógica del comando...

    const embed = createSuccessEmbed(
        '✅ Perfil Actualizado',
        `El perfil de ${message.author.username} ha sido actualizado.`
    );

    // Si no hay permisos de embed, convertirá automáticamente a texto:
    // "**✅ Perfil Actualizado**
    //
    // El perfil de Username ha sido actualizado."
    await sendMessage(message, { embed });
}
```

### Ejemplo 3: Embed Personalizado con Campos

```typescript
import { EmbedBuilder } from 'discord.js';
import { sendMessage } from '../utils/messageUtils.js';

async executeSlash(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
        .setTitle('📊 Estadísticas del Usuario')
        .setDescription(`Información de ${interaction.user.username}`)
        .setColor(0x3498DB)
        .addFields(
            { name: 'Nivel', value: '42', inline: true },
            { name: 'Experiencia', value: '15,420 XP', inline: true },
            { name: 'Rango', value: 'Elite', inline: true }
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: 'Última actualización' })
        .setTimestamp();

    await sendMessage(interaction, { embed });
}
```

### Ejemplo 4: Mensaje con Contenido y Embed

```typescript
async executeSlash(interaction: ChatInputCommandInteraction) {
    const embed = createInfoEmbed(
        'ℹ️ Detalles Adicionales',
        'Aquí están los detalles que solicitaste.'
    );

    await sendMessage(interaction, {
        content: `Hola ${interaction.user}, aquí está tu información:`,
        embed
    });
}
```

## Cómo Funciona el Fallback

### Para Slash Commands:
1. **Intenta enviar el embed** (funciona siempre, incluso sin permisos)
2. Si falla, **convierte el embed a texto plano** y lo envía
3. Los mensajes efímeros funcionan **sin importar los permisos del canal**

### Para Prefix Commands:
1. **Verifica permisos** del bot en el canal
2. Si tiene `EmbedLinks`: envía el embed normalmente
3. Si NO tiene permisos: **convierte a texto plano automáticamente**
4. Si todo falla: intenta enviar solo texto como último recurso

## Conversión de Embed a Texto

Cuando el bot no puede enviar embeds, el sistema convierte automáticamente:

**Embed:**
```
Título: ❌ Error de Validación
Descripción: El usuario no existe
Campo 1: Usuario → @Juan
Campo 2: Razón → No encontrado
Footer: Comando: verificar
```

**Se convierte en:**
```
**❌ Error de Validación**

El usuario no existe

**Usuario**
@Juan

**Razón**
No encontrado

_Comando: verificar_
```

## Migración de Código Existente

### Antes (solo texto):
```typescript
await interaction.reply({
    content: '❌ Error: El usuario no existe',
    flags: MessageFlags.Ephemeral
});
```

### Después (con embed y fallback):
```typescript
const embed = createErrorEmbed(
    '❌ Error',
    'El usuario no existe'
);

await sendMessage(interaction, {
    embed,
    ephemeral: true
});
```

## Mejores Prácticas

1. **Usa `ephemeral: true` para errores**: Los mensajes de error no deberían ser visibles para todos
   ```typescript
   await sendMessage(interaction, { embed: errorEmbed, ephemeral: true });
   ```

2. **Usa las funciones helper cuando sea posible**: Mantienen consistencia visual
   ```typescript
   // ✅ Bueno
   const embed = createErrorEmbed('Error', 'Descripción');

   // ⚠️ Funciona pero menos consistente
   const embed = new EmbedBuilder().setTitle('Error')...
   ```

3. **No te preocupes por permisos**: El sistema maneja automáticamente el fallback
   ```typescript
   // Funcionará incluso sin permisos
   await sendMessage(message, { embed });
   ```

4. **Para mensajes críticos, incluye `content` además del embed**:
   ```typescript
   await sendMessage(interaction, {
       content: '⚠️ Acción importante',
       embed: warningEmbed
   });
   ```

## Solución de Problemas

### El embed no se envía
- ✅ El sistema automáticamente convertirá a texto plano
- ✅ Revisa los logs para ver si hay errores de permisos

### Los mensajes efímeros no funcionan
- Los mensajes efímeros **solo funcionan con slash commands**
- Para prefix commands, el parámetro `ephemeral` se ignora

### El fallback se ve mal formateado
- El sistema intenta preservar la estructura del embed
- Si necesitas un formato específico, puedes especificar `content` además del `embed`

## Preguntas Frecuentes

**¿Puedo usar embeds sin preocuparme por permisos?**
Sí, el sistema maneja automáticamente el fallback a texto plano.

**¿Los mensajes efímeros requieren permisos especiales?**
No, los mensajes efímeros en slash commands funcionan sin permisos especiales porque Discord los envía directamente al usuario.

**¿Puedo personalizar el formato del texto de fallback?**
Actualmente el formato es automático. Si necesitas un formato específico, puedes incluir el parámetro `content` además del `embed`.

**¿Funciona con botones y menús?**
Las funciones actuales son para mensajes simples. Para componentes interactivos (botones, selects), deberás manejarlos por separado.
