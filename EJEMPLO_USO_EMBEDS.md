# Ejemplo de Uso: Mejorando Mensajes con Embeds

## Comparación Antes vs Después

### Ejemplo 1: Mensaje de Error Simple

**ANTES (solo texto):**
```typescript
async executeSlash(interaction: ChatInputCommandInteraction) {
    try {
        // ... lógica del comando
        if (!usuario) {
            await interaction.reply({
                content: '❌ Usuario no encontrado',
                flags: MessageFlags.Ephemeral
            });
            return;
        }
    } catch (error) {
        await handleCommandError(error, interaction, 'micomando');
    }
}
```

**DESPUÉS (con embed bonito):**
```typescript
import { sendMessage, createErrorEmbed } from '../utils/messageUtils.js';

async executeSlash(interaction: ChatInputCommandInteraction) {
    try {
        // ... lógica del comando
        if (!usuario) {
            const embed = createErrorEmbed(
                '🔍 Usuario No Encontrado',
                'No se pudo encontrar al usuario especificado. Verifica el nombre o ID.'
            );

            await sendMessage(interaction, {
                embed,
                ephemeral: true
            });
            return;
        }
    } catch (error) {
        await handleCommandError(error, interaction, 'micomando');
    }
}
```

**Resultado visual:**
El usuario ahora ve un embed bonito con colores en lugar de texto plano.

---

### Ejemplo 2: Mensaje de Éxito

**ANTES:**
```typescript
await message.reply(`✅ Se ha actualizado el perfil de ${usuario.username}`);
```

**DESPUÉS:**
```typescript
import { sendMessage, createSuccessEmbed } from '../utils/messageUtils.js';

const embed = createSuccessEmbed(
    '✅ Perfil Actualizado',
    `El perfil de **${usuario.username}** ha sido actualizado exitosamente.`
);

await sendMessage(message, { embed });
// Si el bot no tiene permisos, automáticamente enviará:
// "**✅ Perfil Actualizado**
//
// El perfil de **Username** ha sido actualizado exitosamente."
```

---

### Ejemplo 3: Información con Campos

**ANTES:**
```typescript
await interaction.reply(
    `📊 Stats de ${user.username}\n` +
    `Nivel: 42\n` +
    `XP: 15,420\n` +
    `Rango: Elite`
);
```

**DESPUÉS:**
```typescript
import { sendMessage } from '../utils/messageUtils.js';
import { EmbedBuilder } from 'discord.js';

const embed = new EmbedBuilder()
    .setTitle(`📊 Estadísticas de ${user.username}`)
    .setColor(0x3498DB)
    .addFields(
        { name: 'Nivel', value: '42', inline: true },
        { name: 'Experiencia', value: '15,420 XP', inline: true },
        { name: 'Rango', value: 'Elite', inline: true }
    )
    .setThumbnail(user.displayAvatarURL())
    .setTimestamp();

await sendMessage(interaction, { embed });
```

---

### Ejemplo 4: Advertencia con Contexto

**ANTES:**
```typescript
await interaction.reply({
    content: '⚠️ Esto eliminará todos tus datos. ¿Estás seguro?',
    flags: MessageFlags.Ephemeral
});
```

**DESPUÉS:**
```typescript
import { sendMessage, createWarningEmbed } from '../utils/messageUtils.js';

const embed = createWarningEmbed(
    '⚠️ Acción Peligrosa',
    'Esta acción **eliminará permanentemente** todos tus datos.\n\n' +
    '⚡ Esta operación **no se puede deshacer**.\n\n' +
    '¿Estás completamente seguro de continuar?'
);

await sendMessage(interaction, {
    embed,
    ephemeral: true
});
```

---

## Errores Automáticos con Embeds

Los errores ahora **automáticamente** se mostrarán como embeds bonitos gracias a las mejoras en `errorHandler.ts`:

**Cuando lanzas un error:**
```typescript
throw new CommandError(
    ErrorType.PERMISSION_ERROR,
    'Usuario sin permisos necesarios',
    'No tienes permiso para usar este comando. Requieres el rol de Moderador.'
);
```

**El usuario verá:**
Un embed con:
- 🔒 Título: "Permiso Denegado"
- Descripción: "No tienes permiso para usar este comando..."
- Color rojo/naranja
- Footer con el nombre del comando
- **Efímero** (solo el usuario lo ve)

---

## Casos Especiales

### Slash Command vs Prefix Command

**El mismo código funciona para ambos:**

```typescript
// Esta función funciona igual para slash y prefix
async mostrarInfo(context: ChatInputCommandInteraction | Message) {
    const embed = createInfoEmbed(
        'ℹ️ Información',
        'Este es un mensaje informativo'
    );

    await sendMessage(context, { embed });
}

// En slash command
async executeSlash(interaction: ChatInputCommandInteraction) {
    await this.mostrarInfo(interaction);
}

// En prefix command
async executePrefix(message: Message, args: string[]) {
    await this.mostrarInfo(message);
}
```

---

## Ventajas del Sistema

✅ **Automático**: No te preocupes por permisos, el sistema lo maneja
✅ **Consistente**: Todos los mensajes tienen el mismo estilo
✅ **Bonito**: Los embeds se ven profesionales
✅ **Fallback**: Si no hay permisos, envía texto plano
✅ **Efímeros**: Los errores solo los ve quien ejecutó el comando
✅ **Compatible**: Funciona con slash y prefix commands

---

## Tips Rápidos

1. **Usa `ephemeral: true` para errores y advertencias privadas**
   ```typescript
   await sendMessage(interaction, { embed: errorEmbed, ephemeral: true });
   ```

2. **Los embeds funcionan mejor que texto para información compleja**
   ```typescript
   // ❌ Difícil de leer
   await message.reply('Nombre: Juan\nEdad: 25\nPaís: México');

   // ✅ Mucho mejor
   const embed = createInfoEmbed('Perfil', '...')
       .addFields(
           { name: 'Nombre', value: 'Juan' },
           { name: 'Edad', value: '25' },
           { name: 'País', value: 'México' }
       );
   await sendMessage(message, { embed });
   ```

3. **No necesitas verificar permisos manualmente**
   ```typescript
   // ❌ No hagas esto
   if (hasEmbedPermission) {
       await message.reply({ embeds: [embed] });
   } else {
       await message.reply('texto plano...');
   }

   // ✅ Haz esto (el sistema lo maneja)
   await sendMessage(message, { embed });
   ```

4. **Los errores ya están mejorados automáticamente**
   ```typescript
   // Solo lanza el error, el sistema lo mostrará bonito
   throw new CommandError(
       ErrorType.VALIDATION_ERROR,
       'Error técnico',
       'Mensaje amigable para el usuario'
   );
   ```
