# Hikari Koizumi 2.0

Un bot de Discord moderno y versátil construido con TypeScript y Discord.js v14.

## 🚀 Características

- **Comandos Slash y Prefijo**: Soporte para ambos tipos de comandos
- **Sistema de Comandos Modular**: Fácil de extender y mantener
- **Interacciones con GIFs**: Comandos de interacción con usuarios usando Tenor API
- **Gestión de Eventos**: Sistema de eventos completamente modular
- **TypeScript**: Código type-safe y mantenible

## 📋 Requisitos

- Node.js 18.0.0 o superior
- npm o yarn
- Un bot de Discord (creado en [Discord Developer Portal](https://discord.com/developers/applications))
- Una API Key de Tenor (opcional, para comandos de interacción)

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/Hikari-Koizumi-2.0.git
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
│   ├── commands/          # Comandos del bot
│   │   ├── interaction/   # Comandos de interacción
│   │   ├── moderation/     # Comandos de moderación
│   │   └── utility/        # Comandos de utilidad
│   ├── events/             # Eventos de Discord
│   ├── managers/           # Gestores (comandos, eventos, etc.)
│   ├── types/              # Tipos TypeScript
│   ├── utils/              # Utilidades
│   ├── config.ts           # Configuración
│   ├── index.ts            # Punto de entrada
│   └── deploy-slash-commands.ts
├── dist/                   # Código compilado (generado)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 🎮 Comandos Disponibles

### Interacción
- `/interact hug @usuario` - Abraza a un usuario
- `/interact kiss @usuario` - Besa a un usuario
- `/interact pat @usuario` - Acaricia la cabeza de un usuario
- `/interact slap @usuario` - Abofetea a un usuario
- `/interact poke @usuario` - Molesta a un usuario
- `/interact cuddle @usuario` - Se acurruca con un usuario
- `/interact bite @usuario` - Muerde a un usuario
- `/interact tickle @usuario` - Hace cosquillas a un usuario

### Utilidad
- `/ping` - Responde con Pong!
- `/saludar` - El bot te saluda
- `/avatar [@usuario]` - Muestra el avatar de un usuario

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `TOKEN` | Token del bot de Discord | ✅ |
| `APPLICATION_ID` | ID de la aplicación del bot | ✅ |
| `PREFIX` | Prefijo para comandos (default: `*`) | ❌ |
| `TENOR_API_KEY` | API Key de Tenor para GIFs | ✅ (para interacciones) |

### Obtener una API Key de Tenor

1. Ve a [Tenor API](https://tenor.com/developer/keyregistration)
2. Crea una cuenta o inicia sesión
3. Crea una nueva aplicación
4. Copia tu API Key y añádela al archivo `.env`

## 📝 Scripts Disponibles

- `npm run dev` - Inicia el bot en modo desarrollo con auto-reload
- `npm run build` - Compila TypeScript a JavaScript
- `npm start` - Inicia el bot (requiere compilación previa)
- `npm run deploy` - Despliega los comandos slash a Discord

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

