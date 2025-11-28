# Hikari Koizumi 2.0

Un bot de Discord moderno y versátil construido con TypeScript y Discord.js v14.

## 🚀 Características

- **Sistema de IA Avanzado**: Conversaciones naturales con Gemini 2.0 Flash, memoria a corto/mediano/largo plazo
- **Sistema de Música Completo**: Reproducción con Lavalink (YouTube, Spotify, SoundCloud), control de volumen, cola, repetición
- **Comandos Slash y Prefijo**: Soporte para ambos tipos de comandos con conversión automática
- **Sistema de Ayuda Interactivo**: Menú con categorías, botones de navegación y paginación
- **Sistema de Comandos Modular**: Arquitectura escalable y fácil de extender
- **Subcomandos con Aliases**: Sistema avanzado de subcomandos con soporte para múltiples aliases
- **Comandos Personalizados por Servidor**: Sistema completo de comandos personalizados con propuestas y gestión de moderadores
- **Interacciones con GIFs**: Más de 30 comandos de interacción con usuarios usando Tenor API
- **Sistema de Solicitudes**: Gestión de solicitudes de interacción con botones de aceptar/rechazar
- **Sistema de Cooldowns**: Prevención de spam con cooldowns configurables por comando
- **Estadísticas de Interacciones**: Registro y seguimiento de interacciones entre usuarios usando Firebase
- **Gestión de Eventos**: Sistema de eventos completamente modular
- **Sistema de Logging**: Logger configurable con niveles (debug, info, warn, error)
- **Manejo de Errores Robusto**: Sistema de manejo de errores con mensajes personalizados y logging
- **TypeScript**: Código type-safe y mantenible con tipado completo
- **Optimización de Interacciones**: Manejo inteligente de deferReply para evitar timeouts
- **Firebase Integration**: Integración con Firebase Realtime Database para almacenamiento persistente
- **Comandos de Desarrollador**: Herramientas para gestionar memoria de IA y estadísticas del sistema

## 📋 Requisitos

- Node.js 18.0.0 o superior
- npm o yarn
- Un bot de Discord (creado en [Discord Developer Portal](https://discord.com/developers/applications))
- Una API Key de Tenor (para comandos de interacción)
- Una cuenta de Firebase con Realtime Database habilitada (para comandos personalizados y estadísticas)
- Credenciales de Firebase Admin SDK (Service Account)

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/MirtZerck/Hikari-Koizumi-2.0.git
cd Hikari-Koizumi-2.0
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` en la raíz del proyecto:
```env
TOKEN=tu_token_del_bot
APPLICATION_ID=tu_application_id
PREFIX=*
TENOR_API_KEY=tu_tenor_api_key
DANBOORU_API_KEY=tu_danbooru_api_key
FIREBASE_ADMIN_SDK={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

⚠️ **Importante:** 
- `FIREBASE_ADMIN_SDK` debe ser un JSON válido en una sola línea
- Consulta `FIREBASE_SETUP.md` para obtener las credenciales de Firebase

4. Compila el proyecto:
```bash
npm run build
```

5. Despliega los comandos slash (opcional):
```bash
npm run deploy
```

6. Inicia el bot:
```bash
npm start
```

Para desarrollo con auto-reload:
```bash
npm run dev
```

## 📁 Estructura del Proyecto

```
Hikari-Koizumi-2.0/
├── src/
│   ├── commands/           # Comandos del bot
│   │   ├── custom/         # Comandos personalizados
│   │   │   └── custom.ts   # Sistema de comandos personalizados
│   │   ├── interaction/    # Comandos de interacción
│   │   │   ├── react.ts    # Reacciones emocionales
│   │   │   ├── act.ts      # Acciones expresivas
│   │   │   └── interact.ts # Interacciones directas
│   │   ├── moderation/     # Comandos de moderación
│   │   │   └── moderation.ts
│   │   └── utility/        # Comandos de utilidad
│   │       └── utility.ts
│   ├── events/             # Eventos de Discord
│   │   ├── buttonInteraction.ts  # Manejo de botones
│   │   ├── interactionCreate.ts  # Creación de interacciones
│   │   ├── messageCreate.ts      # Mensajes
│   │   └── ready.ts              # Bot listo
│   ├── managers/           # Gestores del sistema
│   │   ├── CommandManager.ts          # Gestor de comandos
│   │   ├── EventManager.ts            # Gestor de eventos
│   │   ├── CooldownManager.ts         # Sistema de cooldowns
│   │   ├── RequestManager.ts          # Sistema de solicitudes
│   │   ├── FirebaseAdminManager.ts    # Gestor de Firebase
│   │   ├── CustomCommandManager.ts    # Gestor de comandos personalizados
│   │   └── InteractionStatsManager.ts # Gestor de estadísticas
│   ├── types/              # Tipos TypeScript
│   │   ├── BotClient.ts
│   │   ├── Command.ts
│   │   └── Events.ts
│   ├── utils/              # Utilidades
│   │   ├── constants.ts    # Constantes
│   │   ├── errorHandler.ts # Manejo de errores
│   │   ├── logger.ts       # Sistema de logging
│   │   ├── tenor.ts        # API de Tenor
│   │   └── validators.ts   # Validadores
│   ├── config.ts           # Configuración
│   ├── index.ts            # Punto de entrada
│   └── deploy-slash-commands.ts
├── dist/                   # Código compilado (generado)
├── .env                    # Variables de entorno (no incluido en git)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 🎮 Comandos Disponibles

### 🎵 Música

Sistema completo de reproducción musical con Lavalink:

- **`/music play <canción>`** - Reproduce música (YouTube, Spotify, SoundCloud, etc.) con autocompletado
- **`/music pause/resume`** - Pausa o reanuda la reproducción
- **`/music skip`** - Salta a la siguiente canción
- **`/music stop`** - Detiene y limpia la cola
- **`/music queue [página]`** - Muestra la cola de reproducción
- **`/music nowplaying`** - Muestra la canción actual
- **`/music volume <0-100>`** - Ajusta el volumen
- **`/music shuffle`** - Mezcla la cola aleatoriamente
- **`/music loop`** - Cambia modo de repetición (Off → Canción → Cola)
- **`/music join/leave`** - Conecta o desconecta el bot

**Uso:** `/music play never gonna give you up` o `*p never gonna give you up`

### 🎭 Interacción

#### `/react` - Reacciones y Expresiones Emocionales
Comandos de reacción que puedes usar solo o dirigidos a alguien:

- **`smile`** (`sonreir`) - Sonríe 😊
- **`laugh`** (`reir`) - Ríe 😂
- **`cry`** (`llorar`) - Llora 😢
- **`blush`** (`sonrojar`) - Sonrójate 😳
- **`pout`** (`puchero`) - Haz pucheros 🥺
- **`angry`** (`enojado`) - Enójate 😠

**Uso:** `/react smile [@usuario]` o `*react smile [@usuario]`

#### `/act` - Acciones y Actuaciones Expresivas
Acciones que puedes realizar solo o con alguien. Algunas requieren solicitud cuando hay objetivo:

**Con solicitud (si hay @usuario):**
- **`dance`** (`bailar`) - Baila 💃
- **`sing`** (`cantar`) - Canta 🎤
- **`highfive`** (`chocalos`) - Choca los cinco ✋

**Sin solicitud:**
- **`wave`** (`saludar`, `saludo`) - Saluda 👋
- **`bow`** (`reverencia`) - Haz una reverencia 🙇
- **`clap`** (`aplaudir`) - Aplaude 👏

**Uso:** `/act dance [@usuario]` o `*act dance [@usuario]`

> **Nota:** Las acciones `dance`, `sing` y `highfive` requieren aceptación del usuario objetivo cuando se usan con `@usuario`.

#### `/interact` - Interacciones Directas con Usuarios
Interacciones íntimas/románticas o juguetonas/agresivas:

**Con solicitud (requiere @usuario):**
- **`hug`** (`abrazo`, `abrazar`) - Abraza a alguien 🤗
- **`kiss`** (`beso`, `besar`) - Besa a alguien 😘
- **`pat`** (`acariciar`) - Acaricia la cabeza 😊
- **`cuddle`** (`acurrucar`) - Acurrúcate 🥰

**Directas (requiere @usuario):**
- **`slap`** (`cachetada`, `bofetada`) - Abofetea 🖐️
- **`poke`** (`molestar`) - Molesta 👉

**Uso:** `/interact hug @usuario` o `*hug @usuario`

> **Nota:** Las interacciones íntimas (`hug`, `kiss`, `pat`, `cuddle`) requieren que el usuario objetivo acepte la solicitud usando los botones.

### 🤖 IA (Inteligencia Artificial)

Sistema de IA conversacional con memoria persistente:

- **Menciona a Hikari** en servidores o **envía DM** para conversar
- **Memoria a corto plazo**: Últimos 5 mensajes (15 minutos)
- **Memoria de sesión**: Resumen del día (24 horas)
- **Memoria a largo plazo**: Facts, preferencias y relaciones (permanente)

**Uso:** `@Hikari hola, ¿cómo estás?` en servidor o `Hola Hikari` en DM

### 👤 Usuario

- **`/user info [@usuario]`** (`ui`, `userinfo`) - Información detallada de un usuario
- **`/user avatar [@usuario]`** (`av`, `pfp`) - Avatar y perfil de un usuario

**Uso:** `/user info @usuario` o `*userinfo @usuario`

### 🛠️ Utilidad

- **`/help [comando]`** (`ayuda`, `comandos`) - Sistema de ayuda interactivo con categorías y navegación
- **`/utility ping`** (`pong`) - Responde con Pong! - Verifica la latencia del bot
- **`/utility stats [@usuario]`** (`estadisticas`, `interacciones`) - Muestra estadísticas de interacciones
- **`/utility hora`** (`time`, `tiempo`) - Muestra la hora actual
- **`/utility horaserver`** (`hs`, `hour`) - Muestra la hora del servidor
- **`/utility sethour <timezone>`** (`sh`, `sethora`) - Establece zona horaria (Admin)
- **`/utility cooldown-stats`** - Muestra estadísticas del sistema de cooldowns (Solo Admin)
- **`/utility cooldown-clear`** `[comando]` `[@usuario]` - Limpia cooldowns (Solo Admin)

**Uso:** `/utility ping` o `*ping`

### 🎨 Comandos Personalizados

Sistema completo de comandos personalizados por servidor. Los usuarios pueden proponer comandos con imágenes que los moderadores revisan y aprueban.

- **`/custom proponer <comando> <imagen>`** (`propose`, `prop`, `sugerir`) - Propone un nuevo comando o añade imagen a uno existente
- **`/custom lista`** (`list`, `comandos`, `ver`) - Muestra todos los comandos personalizados disponibles
- **`/custom gestionar`** (`manage`, `revisar`, `propuestas`) - Gestiona propuestas pendientes (Moderadores)
- **`/custom editar <comando>`** (`edit`, `modificar`) - Edita un comando existente (Moderadores)
- **`/custom eliminar <comando>`** (`delete`, `borrar`, `remove`) - Elimina un comando completo (Moderadores)
- **`*<comando>`** - Usa un comando personalizado (muestra imagen aleatoria)

**Uso:** `/custom proponer gatito https://i.imgur.com/example.png` o `*proponer gatito https://...`

> **Nota:** Los comandos personalizados solo funcionan con prefijo (`*comando`), no con slash commands. Ver `CUSTOM_COMMANDS_LIMITATIONS.md` para más detalles.

Para más información, consulta `CUSTOM_COMMANDS_GUIDE.md`.

### 🎮 Diversión

- **`/danbooru`** - Envía una imagen aleatoria de Danbooru (requiere canal NSFW o DM)

**Uso:** `/danbooru` en canal NSFW

### ⚖️ Moderación

- **`/moderation kick`** (`expulsar`) `@usuario` `[razón]` - Expulsa a un usuario del servidor
- **`/moderation ban`** (`banear`) `@usuario` `[días]` `[razón]` - Banea a un usuario (puede borrar mensajes de los últimos 0-7 días)
- **`/moderation timeout`** (`silenciar`, `mute`) `@usuario` `<minutos>` `[razón]` - Silencia temporalmente a un usuario

**Uso:** `/moderation kick @usuario razón` o `*kick @usuario razón`

> **Requisitos:** Todos los comandos de moderación requieren permisos adecuados y no funcionan en DMs.

### 🔧 Desarrollador

Comandos exclusivos para desarrolladores autorizados:

- **`*dev memory [@usuario]`** (`mem`) - Ver estadísticas del sistema de IA o memoria de un usuario específico
- **`*dev clear [opciones]`** (`clearmem`) - Limpiar memoria de IA
  - `--all`: Limpiar toda la memoria
  - `@usuario`: Limpiar memoria de usuario específico
  - `--long-term`: Incluir memoria a largo plazo

**Uso:** `*dev memory @usuario` o `*dev clear @usuario --long-term`

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción | Requerido | Default |
|----------|-------------|-----------|---------|
| `TOKEN` | Token del bot de Discord | ✅ | - |
| `APPLICATION_ID` | ID de la aplicación del bot | ✅ | - |
| `PREFIX` | Prefijo para comandos de prefijo | ❌ | `*` |
| `TENOR_API_KEY` | API Key de Tenor para GIFs | ✅ | - |
| `DANBOORU_API_KEY` | API Key de Danbooru | ✅ | - |
| `FIREBASE_ADMIN_SDK` | Credenciales de Firebase Admin SDK (JSON) | ✅ | - |
| `GEMINI_API_KEY` | API Key de Google Gemini para IA | ✅ | - |
| `LAVALINK_HOST` | Host del servidor Lavalink | ✅ | `localhost` |
| `LAVALINK_PORT` | Puerto del servidor Lavalink | ✅ | `2333` |
| `LAVALINK_PASSWORD` | Contraseña del servidor Lavalink | ✅ | `youshallnotpass` |
| `LAVALINK_SECURE` | Usar SSL para Lavalink | ❌ | `false` |
| `NODE_ENV` | Entorno de ejecución (`development` o `production`) | ❌ | `development` |
| `LOG_LEVEL` | Nivel de logging (`debug`, `info`, `warn`, `error`) | ❌ | `info` |

### Ejemplo de archivo `.env`:

```env
TOKEN=tu_token_del_bot_aqui
APPLICATION_ID=tu_application_id_aqui
PREFIX=*
TENOR_API_KEY=tu_tenor_api_key_aqui
DANBOORU_API_KEY=tu_danbooru_api_key_aqui
FIREBASE_ADMIN_SDK={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
GEMINI_API_KEY=tu_gemini_api_key_aqui
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
NODE_ENV=development
LOG_LEVEL=info
```

### Obtener una API Key de Tenor

1. Ve a [Tenor API - Key Registration](https://tenor.com/developer/keyregistration)
2. Crea una cuenta o inicia sesión con tu cuenta de Google
3. Crea una nueva aplicación (o usa una existente)
4. Copia tu API Key y añádela al archivo `.env` como `TENOR_API_KEY`
5. La API Key es gratuita con límites generosos para uso personal

### Configurar Firebase

Para usar comandos personalizados, estadísticas de interacciones y memoria de IA, necesitas configurar Firebase:

1. Consulta la guía completa en `FIREBASE_SETUP.md`
2. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
3. Habilita Realtime Database
4. Crea una Service Account y descarga las credenciales JSON
5. Añade el JSON completo a `.env` como `FIREBASE_ADMIN_SDK`

⚠️ **Importante:** El JSON debe estar en una sola línea o con `\n` correctamente escapados.

### Configurar Lavalink (Música)

Para usar el sistema de música, necesitas un servidor Lavalink:

1. Descarga Lavalink desde [GitHub](https://github.com/lavalink-devs/Lavalink/releases)
2. Crea un archivo `application.yml` con tu configuración
3. Inicia el servidor: `java -jar Lavalink.jar`
4. Configura las credenciales en `.env`

Ver documentación completa: [Lavalink Documentation](https://lavalink.dev/)

### Obtener API Key de Gemini

Para usar el sistema de IA:

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crea una API Key
3. Añádela a `.env` como `GEMINI_API_KEY`

## 📝 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia el bot en modo desarrollo con auto-reload usando nodemon |
| `npm run build` | Compila TypeScript a JavaScript en la carpeta `dist/` |
| `npm start` | Inicia el bot en modo producción (requiere compilación previa con `npm run build`) |
| `npm run deploy:prod` | Despliega los comandos slash a Discord (registra comandos globalmente) |

## 🎯 Características Avanzadas

### Sistema de Comandos Personalizados

Sistema completo de comandos personalizados por servidor con:

- ✅ Propuestas de usuarios con imágenes
- ✅ Sistema de revisión y aprobación por moderadores
- ✅ Almacenamiento persistente en Firebase
- ✅ Selección aleatoria de imágenes al usar comandos
- ✅ Gestión completa (editar, eliminar valores, eliminar comandos)
- ✅ Notificaciones automáticas a usuarios sobre sus propuestas

Para más información, consulta `CUSTOM_COMMANDS_GUIDE.md` y `CUSTOM_COMMANDS_LIMITATIONS.md`.

### Sistema de Solicitudes de Interacción

Algunas interacciones (como `hug`, `kiss`, `pat`, `cuddle`, `dance`, `sing`, `highfive`) requieren que el usuario objetivo acepte la solicitud. El sistema:

- ✅ Envía una solicitud con botones de Aceptar/Rechazar
- ✅ Expira automáticamente después de 10 minutos
- ✅ Previene spam limitando una solicitud pendiente por usuario
- ✅ Muestra GIFs animados al aceptar la interacción

### Sistema de Estadísticas de Interacciones

El bot registra y almacena estadísticas de interacciones entre usuarios:

- 📊 Contador total de interacciones entre dos usuarios
- 📈 Estadísticas por tipo de interacción
- 🕐 Timestamp de primera y última interacción
- 💾 Almacenamiento persistente en Firebase
- 📋 Comando `/stats` para ver estadísticas

### Sistema de Cooldowns

El bot incluye un sistema de cooldowns para prevenir spam:

- ⏱️ Cooldowns configurables por comando
- 🧹 Limpieza automática de cooldowns expirados
- 📊 Estadísticas disponibles para administradores
- 🛠️ Herramientas de administración para limpiar cooldowns

### Optimización de Interacciones

El bot utiliza técnicas avanzadas para evitar errores de timeout:

- ⚡ `deferReply()` inmediato para todas las interacciones
- 🔄 Manejo inteligente de respuestas diferidas
- 🛡️ Protección contra errores "Unknown interaction"
- ✅ Validación temprana con retroalimentación inmediata

## 🔍 Notas Importantes

- **Aliases:** Todos los subcomandos tienen aliases. Puedes usar tanto el nombre en inglés como los aliases en español (ej: `*abrazo`, `*hug`, `*abrazar` funcionan igual)
- **Permisos:** Los comandos de moderación requieren permisos apropiados del servidor
- **Solicitudes:** Las interacciones íntimas requieren que el objetivo acepte antes de ejecutarse
- **Cooldowns:** Algunos comandos tienen cooldowns para prevenir spam (configurable)

## 🤝 Contribuir

Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📜 Documentos Legales

Este bot incluye documentos legales completos para cumplir con los requisitos de verificación de Discord:

- **[Términos de Servicio](TERMS_OF_SERVICE.md)** - Reglas y condiciones de uso del bot
- **[Política de Privacidad](PRIVACY_POLICY.md)** - Cómo se recopilan, usan y protegen los datos

Estos documentos son **requeridos** para la verificación del bot como aplicación en Discord. Si hosteas tu propia instancia del bot, asegúrate de:

1. Revisar y personalizar estos documentos según tus necesidades
2. Actualizar la información de contacto con tus datos
3. Publicar estos documentos en un lugar accesible públicamente
4. Proporcionar los enlaces a Discord durante el proceso de verificación

### Hosting de Documentos Legales

Puedes publicar estos documentos de varias formas:

- **GitHub Pages:** Publica los archivos .md en tu repositorio
- **Sitio web propio:** Convierte a HTML y sube a tu hosting
- **Gist de GitHub:** Crea gists públicos con el contenido
- **Servicios de hosting de documentos:** Usa plataformas como ReadTheDocs

Ejemplo de URLs para Discord:
- Términos de Servicio: `https://github.com/tu-usuario/tu-repo/blob/main/TERMS_OF_SERVICE.md`
- Política de Privacidad: `https://github.com/tu-usuario/tu-repo/blob/main/PRIVACY_POLICY.md`

## 📄 Licencia

Este proyecto está bajo la Licencia ISC.

## 👤 Autor

MirtZerck

## 🙏 Agradecimientos

- [Discord.js](https://discord.js.org/) - Librería de Discord API
- [Tenor](https://tenor.com/) - API de GIFs
- Comunidad de Discord.js por el soporte

