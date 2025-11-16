# 🎨 Sistema de Comandos Personalizados

Sistema completo de comandos personalizados por servidor con sistema de propuestas y gestión de moderadores.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Instalación](#instalación)
- [Estructura de Firebase](#estructura-de-firebase)
- [Comandos Disponibles](#comandos-disponibles)
- [Flujos de Uso](#flujos-de-uso)
- [Permisos](#permisos)
- [Ejemplos](#ejemplos)
- [Troubleshooting](#troubleshooting)

## ✨ Características

### Para Todos los Usuarios:
- ✅ Proponer comandos personalizados con imágenes
- ✅ Añadir imágenes a comandos existentes (transparente para el usuario)
- ✅ Ver lista de comandos disponibles
- ✅ Usar comandos personalizados con prefijo (`*gatito`)
- ✅ Recibir notificaciones cuando se procesen sus propuestas

**⚠️ IMPORTANTE:** Los comandos personalizados **solo funcionan con prefijo** (`*comando`), no con slash commands. Esto es una limitación de la API de Discord que no permite registrar comandos dinámicamente.

### Para Moderadores:
- ✅ Gestionar propuestas pendientes con preview
- ✅ Editar comandos existentes (eliminar valores)
- ✅ Eliminar comandos completos
- ✅ Confirmaciones antes de eliminar
- ✅ Navegación intuitiva con botones

### Características Técnicas:
- 🔥 Almacenamiento en Firebase Realtime Database
- 📊 Sin límite de comandos o valores por servidor
- 🔔 Notificaciones DM con fallback a canal
- 🎲 Selección aleatoria de imágenes al usar comando
- 🛡️ Validaciones completas y manejo de errores robusto
- ⚡ Optimizado contra timeouts de Discord

## 🚀 Instalación

### 1. Verificar Dependencias

El sistema ya está integrado con Firebase Admin SDK. Verifica que tengas configurado:

```env
FIREBASE_ADMIN_SDK={"type":"service_account","project_id":"..."}
```

### 2. Estructura de Archivos

Archivos creados:

```
src/
├── commands/
│   └── custom/
│       └── custom.ts                    ✅ Comando principal
├── events/
│   └── customCommandHandler.ts          ✅ Event handler
├── managers/
│   └── CustomCommandManager.ts          ✅ Gestor principal
├── types/
│   ├── CustomCommand.ts                 ✅ Tipos
│   └── BotClient.ts                     ✅ Actualizado
└── utils/
    └── customCommandHelpers.ts          ✅ Helpers

```

### 3. Inicialización

El sistema se inicializa automáticamente en `src/index.ts`:

```typescript
// Ya incluido en el index.ts actualizado
const customCommandManager = new CustomCommandManager(firebaseAdminManager);
client.customCommandManager = customCommandManager;
```

### 4. Compilar y Reiniciar

```bash
npm run build
npm start
```

O en desarrollo:

```bash
npm run dev
```

## 🗄️ Estructura de Firebase

```
servers/
  └── {guildId}/
      ├── commands/
      │   └── personalizados/
      │       └── {commandName}/           # Ej: "gatito"
      │           ├── 0: "https://..."     # Valores auto-indexados
      │           ├── 1: "https://..."
      │           └── 2: "https://..."
      │
      └── proposals/
          └── {proposalId}/                # UUID
              ├── commandName: "gatito"
              ├── imageUrl: "https://..."
              ├── authorId: "123..."
              ├── authorTag: "User#1234"
              ├── status: "pending"        # pending|accepted|rejected
              ├── timestamp: 1699999999
              ├── processedBy: null
              ├── processedByTag: null
              ├── processedAt: null
              └── guildId: "456..."
```

## 📝 Comandos Disponibles

### Para Todos los Usuarios

#### `/custom proponer <comando> <imagen>`
**Aliases:** `propose`, `prop`, `sugerir`

Propone un nuevo comando personalizado o añade una imagen a uno existente.

**Uso:**
```
/custom proponer gatito https://i.imgur.com/cat.png
*prop gatito https://i.imgur.com/cat.png
*proponer perrito https://cdn.discord.com/attachments/...
```

**Qué hace:**
- Si el comando NO existe → Crea propuesta para nuevo comando
- Si el comando SÍ existe → Crea propuesta para añadir imagen

**El usuario NO necesita saber si el comando existe o no.**

---

#### `/custom lista`
**Aliases:** `list`, `comandos`, `ver`

Muestra todos los comandos personalizados disponibles en el servidor.

**Uso:**
```
/custom lista
*lista
*comandos
```

**Muestra:**
```
📋 Comandos Personalizados

Comandos disponibles en Mi Servidor:

• gatito (5 imágenes)
• perrito (3 imágenes)
• meme (10 imágenes)

💡 Usa `*<comando>` o `/custom <comando>` para verlos
```

---

#### `*<comando>` o `/custom <comando>`

Usa un comando personalizado y muestra una imagen aleatoria.

**Uso:**
```
*gatito
*perrito
/custom gatito
```

**Resultado:**
```
🎨 gatito
[IMAGEN ALEATORIA]

Añadido por: User#1234 | Total de imágenes: 5
```

---

### Para Moderadores (Gestionar Mensajes)

#### `/custom gestionar`
**Aliases:** `manage`, `revisar`, `propuestas`

Abre menú interactivo para gestionar propuestas pendientes.

**Uso:**
```
/custom gestionar
*gestionar
*revisar
```

**Características:**
- 📋 Lista de propuestas pendientes
- 🖼️ Preview de cada imagen
- ◀️ ▶️ Navegación entre propuestas
- ✅ ❌ Aceptar o rechazar
- ℹ️ Indica si es comando nuevo o se añadirá a existente
- ⏰ Expira en 10 minutos

---

#### `/custom editar <comando>`
**Aliases:** `edit`, `modificar`

Edita un comando existente (elimina valores individuales).

**Uso:**
```
/custom editar gatito
*editar gatito
```

**Características:**
- ✏️ Navegación entre valores
- 🖼️ Preview de cada imagen
- 🗑️ Eliminar valor específico
- ⚠️ Confirmación antes de eliminar
- 🔄 Actualización automática si se elimina el último valor

---

#### `/custom eliminar <comando>`
**Aliases:** `delete`, `borrar`, `remove`

Elimina un comando completo con TODOS sus valores.

**Uso:**
```
/custom eliminar gatito
*eliminar gatito
```

**Características:**
- ⚠️ Confirmación requerida
- 📊 Muestra cuántas imágenes se eliminarán
- ❌ Cancelable
- 🔴 Acción irreversible

---

## 🔄 Flujos de Uso

### Flujo 1: Usuario Propone Comando Nuevo

```
Usuario: *prop gatito https://i.imgur.com/cat1.png

Bot: ✅ Propuesta Enviada
     Comando: gatito
     
     Tu propuesta ha sido enviada y está pendiente de revisión.
     Recibirás una notificación cuando sea procesada.

[Moderador abre gestionar]
Mod: *gestionar

Bot: 📋 Propuesta 1 de 1
     Comando: gatito
     Propuesto por: User#1234
     Hace: 2 minutos
     
     [IMAGEN PREVIEW]
     
     ⚠️ Nuevo comando
     [◀️] [✅ Aceptar] [❌ Rechazar] [▶️]

[Moderador acepta]
Mod: [Click ✅]

Bot DM → Usuario: ✅ Propuesta Aceptada
                  Tu propuesta para el comando "gatito" 
                  ha sido aceptada en Mi Servidor
                  
                  [IMAGEN]
                  
                  ¡Ya está disponible para todos!
                  Úsalo con: *gatito o /custom gatito
```

### Flujo 2: Usuario Añade a Comando Existente

```
Usuario: *prop gatito https://i.imgur.com/cat2.png

Bot: ✅ Propuesta Enviada
     [...]

[Moderador gestiona]
Mod: *gestionar

Bot: 📋 Propuesta 1 de 1
     [...]
     
     📝 Comando existente
     Se añadirá una nueva imagen al comando existente

[Acepta]

Bot DM → Usuario: ✅ Propuesta Aceptada
                  Tu imagen ha sido añadida al comando existente.
```

### Flujo 3: Usar Comando Personalizado

```
Usuario: *gatito

Bot: 🎨 gatito
     [IMAGEN ALEATORIA DE LAS 5 DISPONIBLES]
     
     Añadido por: User#1234 | Total de imágenes: 5
```

### Flujo 4: Editar Comando

```
Mod: *editar gatito

Bot: ✏️ Editando: gatito
     Valor 1 de 5
     Índice: 0
     
     [IMAGEN]
     
     [◀️] [🗑️ Eliminar Valor] [▶️] [🚪 Salir]

[Navega a valor 3]
Mod: [Click ▶️ ▶️]

Bot: ✏️ Editando: gatito
     Valor 3 de 5
     [...]

[Elimina]
Mod: [Click 🗑️]

Bot: ⚠️ Confirmar Eliminación de Valor
     ¿Eliminar el valor #3 del comando gatito?
     Quedarán 4 imágenes.
     
     [✅ Confirmar] [❌ Cancelar]

Mod: [Click ✅]

Bot: ✅ Valor eliminado del comando gatito.
```

### Flujo 5: Eliminar Comando Completo

```
Mod: *eliminar gatito

Bot: ⚠️ Confirmar Eliminación
     ¿Estás seguro de que quieres eliminar 
     el comando gatito?
     
     Se eliminarán 5 imágenes permanentemente.
     
     ⚠️ Esta acción no se puede deshacer.
     
     [✅ Confirmar Eliminación] [❌ Cancelar]

Mod: [Click ✅]

Bot: ✅ Comando gatito eliminado completamente.
```

## 🔐 Permisos

### Para Usar Comandos (`proponer`, `lista`, usar comandos):
- ✅ Ningún permiso especial requerido
- ✅ Cualquier usuario del servidor

### Para Gestionar (`gestionar`, `editar`, `eliminar`):
- 🔑 **Gestionar Mensajes** (`MANAGE_MESSAGES`)
- 🔑 Rol con ese permiso o Administrador

## 📋 Ejemplos Completos

### Ejemplo 1: Servidor de Anime

```bash
# Usuario 1 propone
*prop waifu https://i.imgur.com/anime1.png

# Usuario 2 propone más waifus
*prop waifu https://i.imgur.com/anime2.png
*prop waifu https://i.imgur.com/anime3.png

# Moderador revisa
*gestionar
# [Acepta las 3 propuestas]

# Usuarios 1 y 2 reciben notificación DM
# Ahora todos pueden usar:
*waifu  # Muestra una de las 3 aleatoriamente
```

### Ejemplo 2: Servidor de Memes

```bash
# Crear varios comandos
*prop stonks https://i.imgur.com/stonks.jpg
*prop doge https://i.imgur.com/doge.png
*prop pepe https://i.imgur.com/pepe.png

# Ver lista
*lista
# 📋 Comandos: stonks (1), doge (1), pepe (1)

# Añadir más pepes
*prop pepe https://i.imgur.com/pepe2.png
*prop pepe https://i.imgur.com/pepe3.png

# Usar
*pepe  # Muestra 1 de 3 random
```

### Ejemplo 3: Gestión Avanzada

```bash
# Editar comando con muchas imágenes
*editar gatito
# [Navega por las 20 imágenes]
# [Elimina las que no gustan]
# [Cierra con 🚪]

# Eliminar comando obsoleto
*eliminar comando_viejo
# [Confirma eliminación]
# ✅ Eliminado

# Revisar propuestas masivamente
*gestionar
# [Acepta/rechaza 15 propuestas]
# [Todos los usuarios reciben notificación]
```

## 🐛 Troubleshooting

### Error: "Sistema no disponible"

**Causa:** Firebase Admin SDK no inicializado

**Solución:**
```bash
# Verificar .env
cat .env | grep FIREBASE_ADMIN_SDK

# Reiniciar bot
npm run build && npm start
```

### Error: "Nombre de comando inválido"

**Causa:** Nombre con caracteres especiales

**Solución:**
- Solo usar: letras, números, `-`, `_`
- Longitud: 2-32 caracteres
- Ejemplo válido: `gatito`, `meme-2024`, `super_cool`
- Ejemplo inválido: `gatito!`, `meme 2024`, `a`

### Propuesta no aparece en gestionar

**Causa:** Ya fue procesada o el servidor es diferente

**Solución:**
- Verificar que estés en el mismo servidor
- Revisar que no esté en aceptadas/rechazadas
- Probar: `*gestionar` de nuevo

### Notificación no llega al usuario

**Causa:** Usuario tiene DMs cerrados

**Solución:**
- El bot automáticamente envía en el canal como fallback
- Notificación incluye mención: `@Usuario`

### Bot no responde al usar comando

**Causa:** Comando no existe o está escrito mal

**Solución:**
```bash
# Ver comandos disponibles
*lista

# Verificar ortografía
*gatito  ✅
*gatitp  ❌
```

### Imagen no se muestra

**Causa:** URL inválida o expirada

**Solución:**
```bash
# Editar el comando
*editar gatito

# Eliminar valor con imagen rota
# [Navegar hasta el valor]
# [Click 🗑️ Eliminar Valor]
```

## 📊 Mejores Prácticas

### Para Usuarios:
1. ✅ Usar URLs de imágenes confiables (Imgur, Discord CDN)
2. ✅ Verificar que la imagen se vea antes de proponer
3. ✅ Proponer imágenes apropiadas para el servidor
4. ✅ Revisar lista antes de proponer comando nuevo

### Para Moderadores:
1. ✅ Revisar propuestas regularmente
2. ✅ Preview SIEMPRE antes de aceptar
3. ✅ Comunicar razones de rechazo si es frecuente
4. ✅ Hacer backup de comandos importantes (screenshot)
5. ✅ Limpiar comandos obsoletos periódicamente

### Para Administradores:
1. ✅ Configurar reglas claras en el servidor
2. ✅ Dar permisos de gestión a moderadores confiables
3. ✅ Monitorear uso con los logs del bot
4. ✅ Considerar categorías de comandos

## 🎯 Casos de Uso Ideales

- 🎨 Servidores de arte (fanart, OCs)
- 😂 Servidores de memes
- 🐾 Comunidades de mascotas
- 🎮 Comunidades de gaming (clips, highlights)
- 🍔 Servidores de comida (recetas, fotos)
- 📸 Cualquier comunidad que comparta imágenes

## 💡 Ideas de Comandos

```
*fanart    # Fan art de la comunidad
*meme      # Memes del servidor
*mascota   # Fotos de mascotas
*clip      # Clips de juegos
*receta    # Recetas de comida
*mood      # Moods/vibes del día
*aesthetic # Imágenes aesthetic
*cursed    # Imágenes cursed/blessed
```

## 🔧 Mantenimiento

### Logs Importantes

```bash
# Propuesta creada
[INFO] [CustomCommandManager] Propuesta creada: gatito por User#1234 en 123456

# Propuesta procesada
[INFO] [CustomCommandManager] Propuesta aceptada por Mod#5678

# Comando usado
[INFO] [CustomCommand] User#1234 usó comando personalizado: gatito en Mi Servidor

# Notificación enviada
[INFO] [CustomCommandManager] Notificación DM enviada a User#1234
```

### Base de Datos

Firebase Console:
```
https://console.firebase.google.com/
→ Tu Proyecto
→ Realtime Database
→ servers/{guildId}/commands/personalizados
```

## 🚀 Próximas Mejoras (Opcionales)

- [ ] Categorías de comandos
- [ ] Cooldowns personalizables por comando
- [ ] Estadísticas de uso
- [ ] Comando para reportar imagen inapropiada
- [ ] Export/import de comandos entre servidores
- [ ] Soporte para GIFs animados
- [ ] Búsqueda de comandos con palabras clave

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo usar imágenes de Discord?**
R: Sí, usa el botón "Copy Link" en Discord.

**P: ¿Hay límite de comandos?**
R: No, ilimitados por servidor.

**P: ¿Puedo añadir videos?**
R: Solo imágenes por ahora.

**P: ¿Se pueden duplicar comandos?**
R: No, cada nombre es único por servidor.

**P: ¿Cómo sé si mi propuesta fue aceptada?**
R: Recibes notificación DM automática.

**P: ¿Puedo editar mis propuestas?**
R: No, pero puedes proponer otra versión.

**P: ¿Los comandos son privados por servidor?**
R: Sí, cada servidor tiene sus propios comandos.

---

**Sistema desarrollado por MirtZerck para Hikari Koizumi 2.0** 🌸