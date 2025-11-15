# Hikari Koizumi 2.0

Un bot de Discord moderno y versátil construido con TypeScript y Discord.js v14.

## 🚀 Características

- **Comandos Slash y Prefijo**: Soporte para ambos tipos de comandos con conversión automática
- **Sistema de Comandos Modular**: Arquitectura escalable y fácil de extender
- **Subcomandos con Aliases**: Sistema avanzado de subcomandos con soporte para múltiples aliases
- **Interacciones con GIFs**: Más de 30 comandos de interacción con usuarios usando Tenor API
- **Sistema de Solicitudes**: Gestión de solicitudes de interacción con botones de aceptar/rechazar
- **Sistema de Cooldowns**: Prevención de spam con cooldowns configurables por comando
- **Gestión de Eventos**: Sistema de eventos completamente modular
- **Sistema de Logging**: Logger configurable con niveles (debug, info, warn, error)
- **Manejo de Errores Robusto**: Sistema de manejo de errores con mensajes personalizados y logging
- **TypeScript**: Código type-safe y mantenible con tipado completo
- **Optimización de Interacciones**: Manejo inteligente de deferReply para evitar timeouts

## 📋 Requisitos

- Node.js 18.0.0 o superior
- npm o yarn
- Un bot de Discord (creado en [Discord Developer Portal](https://discord.com/developers/applications))
- Una API Key de Tenor (opcional, para comandos de interacción)

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
```

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
│   │   ├── CommandManager.ts     # Gestor de comandos
│   │   ├── EventManager.ts       # Gestor de eventos
│   │   ├── CooldownManager.ts    # Sistema de cooldowns
│   │   └── RequestManager.ts     # Sistema de solicitudes
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

### 🎭 Interacción

#### `/react` - Reacciones y Expresiones Emocionales
Comandos de reacción que puedes usar solo o dirigidos a alguien:

- **`smile`** (`sonreir`) - Sonríe 😊
- **`laugh`** (`reir`) - Ríe 😂
- **`cry`** (`llorar`) - Llora 😢
- **`blush`** (`sonrojar`) - Sonrójate 😳
- **`pout`** (`puchero`) - Haz pucheros 🥺
- **`angry`** (`enojado`) - Enójate 😠
- **`confused`** (`confundido`) - Confúndete 😕
- **`shocked`** (`sorprendido`) - Sorpréndete 😱
- **`happy`** (`feliz`) - Sé feliz 😄
- **`sad`** (`triste`) - Entristécete 😔
- **`sleep`** (`dormir`) - Duerme 😴
- **`yawn`** (`bostezar`) - Bosteza 🥱
- **`shrug`** - Encógete de hombros 🤷
- **`think`** (`pensar`) - Piensa 🤔
- **`stare`** (`mirar`) - Mira fijamente 👀

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
- **`cheer`** (`animar`) - Anima 🎉
- **`salute`** - Saludo militar 🫡
- **`nod`** (`asentir`) - Asiente 👍

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
- **`bite`** (`morder`) - Muerde 😬
- **`tickle`** (`cosquillas`) - Cosquillas 🤭
- **`bonk`** (`golpear`) - Golpe juguetón 🔨
- **`boop`** - Toca la nariz 👆

**Uso:** `/interact hug @usuario` o `*hug @usuario`

> **Nota:** Las interacciones íntimas (`hug`, `kiss`, `pat`, `cuddle`) requieren que el usuario objetivo acepte la solicitud usando los botones.

### 🛠️ Utilidad

- **`ping`** (`p`, `pong`) - Responde con Pong! - Verifica la latencia del bot
- **`avatar`** (`av`, `pfp`) `[@usuario]` - Muestra el avatar de un usuario
- **`cooldown-stats`** - Muestra estadísticas del sistema de cooldowns (Solo Admin)
- **`cooldown-clear`** `[comando]` `[@usuario]` - Limpia cooldowns (Solo Admin)

**Uso:** `/utility ping` o `*ping`

### ⚖️ Moderación

- **`kick`** (`expulsar`) `@usuario` `[razón]` - Expulsa a un usuario del servidor
- **`ban`** (`banear`) `@usuario` `[días]` `[razón]` - Banea a un usuario (puede borrar mensajes de los últimos 0-7 días)
- **`timeout`** (`silenciar`, `mute`) `@usuario` `<minutos>` `[razón]` - Silencia temporalmente a un usuario

**Uso:** `/moderation kick @usuario razón` o `*kick @usuario razón`

> **Requisitos:** Todos los comandos de moderación requieren permisos adecuados y no funcionan en DMs.

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción | Requerido | Default |
|----------|-------------|-----------|---------|
| `TOKEN` | Token del bot de Discord | ✅ | - |
| `APPLICATION_ID` | ID de la aplicación del bot | ✅ | - |
| `PREFIX` | Prefijo para comandos de prefijo | ❌ | `*` |
| `TENOR_API_KEY` | API Key de Tenor para GIFs | ✅ | - |
| `NODE_ENV` | Entorno de ejecución (`development` o `production`) | ❌ | `development` |
| `LOG_LEVEL` | Nivel de logging (`debug`, `info`, `warn`, `error`) | ❌ | `info` |

### Ejemplo de archivo `.env`:

```env
TOKEN=tu_token_del_bot_aqui
APPLICATION_ID=tu_application_id_aqui
PREFIX=*
TENOR_API_KEY=tu_tenor_api_key_aqui
NODE_ENV=development
LOG_LEVEL=info
```

### Obtener una API Key de Tenor

1. Ve a [Tenor API - Key Registration](https://tenor.com/developer/keyregistration)
2. Crea una cuenta o inicia sesión con tu cuenta de Google
3. Crea una nueva aplicación (o usa una existente)
4. Copia tu API Key y añádela al archivo `.env` como `TENOR_API_KEY`
5. La API Key es gratuita con límites generosos para uso personal

## 📝 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia el bot en modo desarrollo con auto-reload usando nodemon |
| `npm run build` | Compila TypeScript a JavaScript en la carpeta `dist/` |
| `npm start` | Inicia el bot en modo producción (requiere compilación previa con `npm run build`) |
| `npm run deploy` | Despliega los comandos slash a Discord (registra comandos globalmente) |

## 🎯 Características Avanzadas

### Sistema de Solicitudes de Interacción

Algunas interacciones (como `hug`, `kiss`, `pat`, `cuddle`, `dance`, `sing`, `highfive`) requieren que el usuario objetivo acepte la solicitud. El sistema:

- ✅ Envía una solicitud con botones de Aceptar/Rechazar
- ✅ Expira automáticamente después de 10 minutos
- ✅ Previene spam limitando una solicitud pendiente por usuario
- ✅ Muestra GIFs animados al aceptar la interacción

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

## 📄 Licencia

Este proyecto está bajo la Licencia ISC.

## 👤 Autor

MirtZerck

## 🙏 Agradecimientos

- [Discord.js](https://discord.js.org/) - Librería de Discord API
- [Tenor](https://tenor.com/) - API de GIFs
- Comunidad de Discord.js por el soporte

