# 🤖 Guía de Usuario - Hikari Koizumi

Bienvenido a Hikari Koizumi, tu asistente virtual con inteligencia artificial en Discord.

## 📋 Tabla de Contenidos

1. [¿Qué puede hacer Hikari?](#qué-puede-hacer-hikari)
2. [Cómo usar la IA](#cómo-usar-la-ia)
3. [Comandos Disponibles](#comandos-disponibles)
4. [Sistema de Memoria](#sistema-de-memoria)
5. [Limitaciones y Cooldowns](#limitaciones-y-cooldowns)
6. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 🎯 ¿Qué puede hacer Hikari?

Hikari es un bot multifuncional con las siguientes capacidades:

### Inteligencia Artificial
- Conversaciones naturales en español
- Recuerda información sobre ti
- Mantiene contexto de conversaciones
- Responde de forma personalizada
- Funciona en servidores y mensajes directos

### Funciones Principales
- Sistema de música con YouTube
- Comandos de diversión e interacción
- Sistema de advertencias (moderación)
- Comandos personalizados por servidor
- Estadísticas de uso

---

## 💬 Cómo usar la IA

### En Servidores

**Opción 1: Mencionar a Hikari**
```
@Hikari hola, ¿cómo estás?
@Hikari cuéntame un chiste
@Hikari ¿qué opinas sobre TypeScript?
```

**Opción 2: Responder a un mensaje de Hikari**
```
Hikari: ¡Hola! ¿Cómo estás?
Tú: Muy bien, gracias     ← Hikari responderá automáticamente
```

### En Mensajes Directos (DM)

Simplemente escribe sin necesidad de mencionar:
```
Hola Hikari
¿Puedes ayudarme con algo?
Cuéntame sobre ti
```

### Consejos para mejores respuestas

✅ **SÍ hacer:**
- Hacer preguntas claras y específicas
- Dar contexto si es necesario
- Mantener conversaciones naturales
- Ser paciente (responde en 1-3 segundos)

❌ **NO hacer:**
- Enviar spam de mensajes (hay cooldown)
- Usar comandos con prefix cuando quieres IA (*help NO activa IA)
- Esperar que responda a comandos de interacción (*hug, *kiss, etc.)

---

## 📚 Comandos Disponibles

### Comandos de Música

| Comando | Descripción |
|---------|-------------|
| `/play [canción]` | Reproduce música de YouTube |
| `/pause` | Pausa la reproducción |
| `/resume` | Reanuda la reproducción |
| `/skip` | Salta a la siguiente canción |
| `/stop` | Detiene la música y limpia la cola |
| `/queue` | Muestra la cola de reproducción |
| `/nowplaying` | Muestra la canción actual |

### Comandos de Diversión

| Comando | Descripción |
|---------|-------------|
| `/8ball [pregunta]` | Consulta la bola 8 mágica |
| `/coinflip` | Lanza una moneda |
| `/roll [dados]` | Lanza dados (ej: 2d6) |
| `/meme` | Muestra un meme aleatorio |

### Comandos de Interacción

| Comando | Descripción |
|---------|-------------|
| `*hug @usuario` | Abraza a alguien |
| `*kiss @usuario` | Besa a alguien |
| `*pat @usuario` | Acaricia a alguien |
| `*slap @usuario` | Abofetea a alguien |

### Comandos de Utilidad

| Comando | Descripción |
|---------|-------------|
| `/help` | Muestra todos los comandos |
| `/userinfo [@usuario]` | Información de un usuario |
| `/serverinfo` | Información del servidor |
| `/avatar [@usuario]` | Muestra el avatar de un usuario |

### Comandos de Moderación

| Comando | Descripción | Permisos |
|---------|-------------|----------|
| `/warn @usuario [razón]` | Advierte a un usuario | Moderador |
| `/warnings [@usuario]` | Ver advertencias | Moderador |
| `/clearwarns @usuario` | Limpia advertencias | Administrador |

---

## 🧠 Sistema de Memoria

Hikari tiene un sistema de memoria inteligente de 3 capas:

### Memoria a Corto Plazo (15 minutos)
- Recuerda los últimos 5 mensajes de la conversación
- Se borra automáticamente después de 15 minutos de inactividad
- Útil para mantener contexto inmediato

### Memoria de Sesión (24 horas)
- Guarda el resumen de tu sesión del día
- Se archiva automáticamente al día siguiente
- Mantiene continuidad durante el día

### Memoria a Largo Plazo (Permanente)
- Recuerda información importante sobre ti:
  - **Facts**: Datos que mencionas ("Me gusta programar")
  - **Preferencias**: Cosas que te gustan o disgustan
  - **Relaciones**: Amigos o personas importantes
- Se limpia automáticamente si no se usa en 30 días

### Cómo funciona

```
Usuario: Me encanta el café
Hikari: ¡Genial! A mí también me gusta el café ☕
         [Guarda: Preferencia "like: café"]

--- 2 días después ---

Usuario: ¿Recuerdas qué me gusta?
Hikari: Claro, recuerdo que te encanta el café ☕
```

### Privacidad

- La memoria es **individual** por usuario
- Solo Hikari puede acceder a tu información
- Puedes pedirle que olvide cosas específicas
- La información no se comparte entre usuarios

---

## ⏱️ Limitaciones y Cooldowns

Para evitar spam y mantener el servicio estable, Hikari tiene límites:

### Cooldowns

| Tipo | Tiempo | Descripción |
|------|--------|-------------|
| **Usuario** | 4 segundos | Entre tus mensajes a Hikari |
| **Canal** | 2 segundos | Entre mensajes en el mismo canal |

**Ejemplo:**
```
Tú: Hola Hikari
Hikari: ¡Hola!
Tú: ¿Cómo estás? ← Debes esperar 4 segundos
```

### Límites de Uso

| Límite | Valor | Descripción |
|--------|-------|-------------|
| **Mensajes por minuto** | 10 | Máximo 10 mensajes por minuto |
| **Tokens por día** | 28,000 | Presupuesto diario de procesamiento |
| **Tokens por mensaje** | 2,000 | Límite por respuesta |

### Mensajes Filtrados

Hikari **NO responderá** a:
- Mensajes de otros bots
- Comandos con prefix (`*help`, `/play`, etc.)
- Comandos de interacción (`*hug @bot`)
- Respuestas a embeds de comandos
- Mensajes muy largos (>2000 caracteres)

---

## ❓ Preguntas Frecuentes

### ¿Hikari habla otros idiomas?
Sí, pero está optimizada para **español**. Puede entender y responder en inglés u otros idiomas, pero las respuestas serán mejores en español.

### ¿Puedo usar Hikari en mi servidor?
Sí, si Hikari está en tu servidor, todos los usuarios pueden usar los comandos y la IA.

### ¿Hikari guarda mis conversaciones privadas?
Hikari guarda información relevante (facts, preferencias) pero **no almacena conversaciones completas**. Solo mantiene un resumen temporal para contexto.

### ¿Cómo borro mi información?
Puedes pedirle directamente:
```
"Hikari, olvida lo que sabes sobre mí"
"Borra mi información"
```

### ¿Por qué Hikari no responde?
Verifica que:
- No estés en cooldown (espera 4 segundos)
- Hayas mencionado a Hikari (en servidores)
- No sea un comando con prefix
- El mensaje no sea muy largo

### ¿Hikari puede hacer búsquedas en internet?
No, Hikari solo puede conversar basándose en su entrenamiento y la memoria de conversaciones contigo.

### ¿Puedo crear comandos personalizados?
¡Sí! Los administradores del servidor pueden crear comandos personalizados con `/customcommand create`.

### ¿Hikari tiene límite de tiempo de música?
No hay límite de tiempo, pero solo puede estar en una sala de voz a la vez por servidor.

---

## 🎨 Personalidad de Hikari

Hikari tiene una personalidad única:

- **Amigable y alegre**: Siempre positiva y servicial
- **Casual**: Usa lenguaje natural, no formal
- **Expresiva**: Usa emojis cuando es apropiado
- **Breve**: Responde de forma concisa (1-3 oraciones)
- **Traviesa**: A veces hace bromas o comentarios juguetones

### Ejemplo de conversación:

```
Usuario: ¿Qué opinas del TypeScript?
Hikari: ¡TypeScript es genial! Me encanta que ayude
        a evitar errores tontos. ¿También programas?

Usuario: Sí, hago bots de Discord
Hikari: ¡Qué cool! Los bots son súper divertidos de
        hacer. ¿En qué estás trabajando ahora? 😊
```

---

## 🆘 Soporte

Si tienes problemas o preguntas:

1. **Usa el comando `/help`** para ver todos los comandos
2. **Pregúntale a Hikari directamente** sobre cómo funciona algo
3. **Contacta a los administradores** del servidor

---

## 📝 Notas Importantes

- Hikari está en constante mejora
- Las respuestas se generan con IA (Gemini 2.0 Flash)
- El bot puede estar fuera de línea por mantenimiento ocasional
- Respeta los cooldowns para que todos puedan usar el bot

---

**¡Disfruta conversando con Hikari!** 🎉
