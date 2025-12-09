# 🤖 Guía de Usuario - Hikari Koizumi

Bienvenido a Hikari Koizumi, tu asistente virtual con inteligencia artificial en Discord.

## 📋 Tabla de Contenidos

1. [¿Qué puede hacer Hikari?](#qué-puede-hacer-hikari)
2. [Cómo usar la IA](#cómo-usar-la-ia)
3. [Comandos Disponibles](#comandos-disponibles)
4. [Sistema Premium](#sistema-premium)
5. [Sistema de Memoria](#sistema-de-memoria)
6. [Limitaciones y Cooldowns](#limitaciones-y-cooldowns)
7. [Preguntas Frecuentes](#preguntas-frecuentes)

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

### Comandos de Música 🎵

| Comando | Descripción |
|---------|-------------|
| `/music play [canción]` | Reproduce música (YouTube, Spotify, SoundCloud, etc.) |
| `/music pause` | Pausa la reproducción |
| `/music resume` | Reanuda la reproducción |
| `/music skip` | Salta a la siguiente canción |
| `/music stop` | Detiene la música y limpia la cola |
| `/music queue [página]` | Muestra la cola de reproducción |
| `/music nowplaying` | Muestra la canción actual |
| `/music volume <0-100>` | Ajusta el volumen |
| `/music shuffle` | Mezcla la cola aleatoriamente |
| `/music loop` | Cambia modo de repetición (Off → Canción → Cola) |
| `/music join` | Conecta el bot a tu canal de voz |
| `/music leave` | Desconecta el bot del canal de voz |

**Aliases de prefijo:** `*p`, `*play`, `*pause`, `*s`, `*skip`, `*q`, `*queue`, `*np`, `*vol`, etc.

**💡 Consejo:** El comando `/music play` tiene autocompletado. Escribe lo que quieras buscar y el bot te mostrará opciones para elegir.

### Comandos de Interacción 💝

#### Reacciones (`/react`)
| Comando | Aliases | Descripción |
|---------|---------|-------------|
| `smile` | `sonreir` | Sonríe 😊 |
| `laugh` | `reir` | Ríe 😂 |
| `cry` | `llorar` | Llora 😢 |
| `blush` | `sonrojar` | Sonrójate 😳 |
| `pout` | `puchero` | Haz pucheros 🥺 |
| `angry` | `enojado` | Enójate 😠 |

#### Acciones (`/act`)
| Comando | Aliases | Descripción | Requiere Aceptación |
|---------|---------|-------------|---------------------|
| `dance` | `bailar` | Baila 💃 | Sí (si hay @usuario) |
| `sing` | `cantar` | Canta 🎤 | Sí (si hay @usuario) |
| `highfive` | `chocalos` | Choca los cinco ✋ | Sí (si hay @usuario) |
| `wave` | `saludar` | Saluda 👋 | No |
| `bow` | `reverencia` | Reverencia 🙇 | No |
| `clap` | `aplaudir` | Aplaude 👏 | No |

#### Interacciones Directas (`/interact`)
| Comando | Aliases | Descripción | Requiere Aceptación |
|---------|---------|-------------|---------------------|
| `hug` | `abrazo` | Abraza a alguien 🤗 | Sí |
| `kiss` | `beso` | Besa a alguien 😘 | Sí |
| `pat` | `acariciar` | Acaricia 😊 | Sí |
| `cuddle` | `acurrucar` | Acurrúcate 🥰 | Sí |
| `slap` | `cachetada` | Abofetea 🖐️ | No |
| `poke` | `molestar` | Molesta 👉 | No |

### Comandos de Usuario 👤

| Comando | Aliases | Descripción |
|---------|---------|-------------|
| `/user info [@usuario]` | `ui`, `userinfo` | Información detallada de un usuario |
| `/user avatar [@usuario]` | `av`, `pfp` | Avatar y perfil de un usuario |

### Comandos de Utilidad 🔧

| Comando | Aliases | Descripción |
|---------|---------|-------------|
| `/help [comando]` | `ayuda`, `comandos` | Muestra ayuda interactiva con categorías |
| `/utility ping` | `pong` | Verifica la latencia del bot |
| `/utility stats [@usuario]` | `estadisticas`, `interacciones` | Ver estadísticas de interacciones |
| `/utility hora` | `time`, `tiempo` | Muestra la hora actual |
| `/utility horaserver` | `hs`, `hour` | Muestra la hora del servidor |
| `/utility sethour <timezone>` | `sh`, `sethora` | Establece zona horaria (Admin) |

### Comandos Personalizados 🎨

| Comando | Descripción |
|---------|-------------|
| `/custom proponer <comando> <imagen>` | Propone un nuevo comando personalizado |
| `/custom lista` | Muestra todos los comandos personalizados |
| `/custom gestionar` | Gestiona propuestas (Moderadores) |
| `*<comando>` | Usa un comando personalizado |

### Comandos de Diversión 🎮

| Comando | Descripción | Requisitos |
|---------|-------------|------------|
| `/danbooru` | Imagen aleatoria de Danbooru | Canal NSFW o DM |

### Comandos de Moderación ⚖️

| Comando | Aliases | Descripción | Permisos |
|---------|---------|-------------|----------|
| `/moderation kick @usuario [razón]` | `expulsar` | Expulsa a un usuario | Expulsar Miembros |
| `/moderation ban @usuario [días] [razón]` | `banear` | Banea a un usuario | Banear Miembros |
| `/moderation timeout @usuario <minutos> [razón]` | `silenciar`, `mute` | Silencia temporalmente | Aislar Miembros |

---

## 👑 Sistema Premium

Hikari ofrece un sistema premium con beneficios exclusivos para apoyar el desarrollo del bot.

### ¿Qué es Premium?

El sistema premium tiene **3 tiers** (niveles) que te otorgan diferentes beneficios:

#### 🥉 Premium Básico
- **-25% de cooldown** en todos los comandos
- Acceso a comandos premium básicos
- Insignia de premium en perfil
- Prioridad en cola de música

#### 🥈 Premium Pro
- **-50% de cooldown** en todos los comandos
- Acceso a comandos premium pro
- Funciones exclusivas de IA
- Filtros avanzados de música
- Insignia premium pro

#### 🥇 Premium Ultra
- **-75% de cooldown** en todos los comandos
- Acceso a TODOS los comandos premium
- Sin límites en comandos personalizados
- Prioridad máxima en soporte
- Insignia premium ultra

### Cómo Obtener Premium

#### 🎫 Opción 1: Códigos de Canje
```
/premium redeem CODIGO-XXX-XXX
```
Los códigos pueden ser:
- Regalos de los desarrolladores
- Premios de eventos y sorteos
- Recompensas por contribuciones

#### ⭐ Opción 2: Votar en Listas de Bots
Vota por Hikari en:
- **Top.gg**: 12 horas de Premium Básico (24h fin de semana)
- **Discord Bot List**: 12 horas de Premium Básico

¡Puedes votar cada 12 horas!

#### 💝 Opción 3: Donar en Ko-fi
Apoya el desarrollo del bot:
- **$3-4.99**: Premium Básico por 30 días
- **$5-9.99**: Premium Pro por 30 días
- **$10-24.99**: Premium Ultra por 30 días
- **$25+**: Premium Ultra permanente

### Comandos Premium

```
/premium status        # Ver tu estado premium actual
/premium info         # Información detallada sobre tiers
/premium redeem       # Canjear un código premium
```

**También funciona con prefix:**
```
*premium status
*premium info
*premium redeem CODIGO-XXX-XXX
```

### Preguntas Frecuentes sobre Premium

**¿El premium expira?**
- Los códigos y donaciones pueden ser temporales o permanentes
- Los votos otorgan 12-24 horas
- Recibirás notificaciones antes de que expire

**¿Se acumula el tiempo de premium?**
- Sí, si ya tienes premium y votas, se extiende la duración
- Si canjeas un código mejor, se actualiza tu tier

**¿Puedo transferir mi premium?**
- No, el premium está ligado a tu cuenta de Discord

**¿Qué pasa si mi premium expira?**
- Recibirás un DM 3 días antes, 1 día antes, y cuando expire
- Puedes renovar votando, donando o con un código nuevo
- No pierdes ningún dato o progreso

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
¡Sí! Cualquier usuario puede proponer comandos con `/custom proponer` y los moderadores los revisan.

### ¿Hikari tiene límite de tiempo de música?
No hay límite de tiempo, pero solo puede estar en una sala de voz a la vez por servidor.

### ¿Cómo funciona el sistema de ayuda?
Usa `/help` para ver un menú interactivo con todas las categorías de comandos. Puedes navegar con botones y ver detalles de comandos específicos con `/help comando:<nombre>`.

### ¿Qué son las estadísticas de interacciones?
Hikari registra las interacciones positivas entre usuarios (abrazos, besos, etc.) y puedes verlas con `/utility stats @usuario`.

### ¿Puedo cambiar la zona horaria del servidor?
Sí, los moderadores pueden usar `/utility sethour <timezone>` para configurar la zona horaria del servidor.

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
