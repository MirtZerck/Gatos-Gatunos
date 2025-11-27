# 🔥 Guía de Configuración de Firebase Admin SDK

Esta guía te ayudará a configurar Firebase Realtime Database usando Firebase Admin SDK para el sistema de comandos personalizados y estadísticas de interacciones.

## 📋 Requisitos Previos

- Una cuenta de Google
- Node.js instalado
- Proyecto del bot ya funcionando

## 🚀 Paso 1: Crear Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Click en **"Agregar proyecto"** (Add project)
3. Ingresa un nombre para tu proyecto (ej: `hikari-bot`)
4. Deshabilita Google Analytics si no lo necesitas (opcional)
5. Click en **"Crear proyecto"**

## 🗄️ Paso 2: Habilitar Realtime Database

1. En el menú lateral, ve a **"Build"** → **"Realtime Database"**
2. Click en **"Crear base de datos"** (Create Database)
3. Selecciona una ubicación cercana (ej: `us-central1`)
4. **Modo de seguridad:** Selecciona **"Comenzar en modo bloqueado"** (Start in locked mode)
5. Click en **"Habilitar"**

## 🔐 Paso 3: Configurar Reglas de Seguridad

Por defecto, Firebase bloquea todo acceso. Necesitas configurar reglas para que tu bot pueda leer/escribir.

1. En la pestaña **"Reglas"** de Realtime Database, reemplaza el contenido con:

```json
{
  "rules": {
    "servers": {
      ".read": true,
      ".write": true
    },
    "interactions": {
      ".read": true,
      ".write": true,
      "$pairKey": {
        ".validate": "newData.hasChildren(['total', 'byType', 'lastInteraction'])"
      }
    },
    "ai": {
      ".read": true,
      ".write": true,
      "users": {
        "$userId": {
          ".validate": "newData.hasChildren(['stats'])"
        }
      }
    }
  }
}
```

⚠️ **Nota de Seguridad:** Estas reglas permiten lectura/escritura pública. Para producción, considera usar Firebase Authentication y restringir acceso solo a usuarios autenticados.

2. Click en **"Publicar"** (Publish)

## 🔑 Paso 4: Obtener Credenciales de Service Account

Para usar Firebase Admin SDK, necesitas crear una Service Account:

1. En el menú lateral, click en el ⚙️ **"Configuración del proyecto"**
2. Ve a la pestaña **"Cuentas de servicio"** (Service accounts)
3. Click en **"Generar nueva clave privada"** (Generate new private key)
4. Se descargará un archivo JSON con las credenciales
5. **IMPORTANTE:** Guarda este archivo de forma segura, contiene credenciales sensibles

El archivo JSON tiene esta estructura:

```json
{
  "type": "service_account",
  "project_id": "tu-proyecto",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

## 📝 Paso 5: Configurar Variables de Entorno

Copia el contenido completo del archivo JSON a tu archivo `.env` como una cadena JSON:

```env
# Firebase Admin SDK (debe ser un JSON válido en una sola línea o con \n)
FIREBASE_ADMIN_SDK={"type":"service_account","project_id":"tu-proyecto","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

**Alternativa (más legible):** Si prefieres mantener el JSON formateado, puedes usar un archivo separado y cargarlo en el código, pero el método actual usa una variable de entorno.

⚠️ **IMPORTANTE:** 
- El JSON debe estar en una sola línea o usar `\n` para saltos de línea
- No incluyas espacios extra o comillas adicionales
- Asegúrate de escapar correctamente las comillas dentro del JSON

## 📦 Paso 6: Verificar Dependencias

El proyecto ya incluye `firebase-admin` como dependencia. Verifica que esté instalado:

```bash
npm install
```

## ✅ Paso 7: Probar Conexión

1. Inicia tu bot:
```bash
npm run dev
```

2. Busca en los logs:
```
[INFO] [Bot] Conectando con Firebase Admin SDK...
[INFO] [FirebaseAdminManager] Firebase Admin SDK inicializado
[INFO] [FirebaseAdminManager] ✅ Conexión con Firebase Admin establecida
[INFO] [Bot] Sistema de estadísticas listo
[INFO] [Bot] Sistema de comandos personalizados listo
```

3. Prueba una interacción:
```
/interact hug @usuario
```

4. Prueba un comando personalizado:
```
*proponer gatito https://i.imgur.com/example.png
```

5. Prueba el sistema de IA:
```
@Hikari hola, me gusta programar
```

6. Verifica en Firebase Console que se crearon los registros:
   - `interactions/` para estadísticas de interacciones
   - `servers/{guildId}/commands/personalizados/` para comandos personalizados
   - `servers/{guildId}/proposals/` para propuestas
   - `ai/users/{userId}/` para memoria de IA

## 📊 Estructura de Datos

### Estadísticas de Interacciones

```
interactions/
  ├── userId1_userId2/
  │   ├── total: 25
  │   ├── byType/
  │   │   ├── hug: 10
  │   │   ├── kiss: 8
  │   │   └── pat: 7
  │   ├── lastInteraction: 1699999999999
  │   └── firstInteraction: 1699000000000
```

**Características:**
- Las claves de usuario siempre están ordenadas alfabéticamente
- `userId1_userId2` es la misma que `userId2_userId1`
- Timestamps en milisegundos

### Memoria de IA

```
ai/
  └── users/
      └── {userId}/
          ├── facts/
          │   └── {factId}/
          │       ├── fact: "Le gusta programar"
          │       ├── relevance: 90
          │       ├── timestamp: 1699999999999
          │       └── lastAccessed: 1699999999999
          ├── preferences/
          │   └── {preferenceId}/
          │       ├── type: "like"
          │       ├── item: "café"
          │       ├── relevance: 85
          │       ├── timestamp: 1699999999999
          │       └── lastAccessed: 1699999999999
          ├── relationships/
          │   └── {userId2}/
          │       ├── relationship: "amigo"
          │       ├── notes: "Le conoció en la universidad"
          │       ├── relevance: 70
          │       └── timestamp: 1699999999999
          └── stats/
              ├── totalMessages: 150
              ├── firstInteraction: 1699000000000
              └── lastInteraction: 1699999999999
```

**Características:**
- Memoria persistente a largo plazo
- Se limpia automáticamente si no se accede en 30 días
- Relevancia se actualiza dinámicamente

### Comandos Personalizados

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

## 🔍 Ver Estadísticas

```bash
# Ver estadísticas de interacciones con un usuario
/utility stats @usuario

# Ver información general del sistema
/utility stats

# Ver memoria de IA (solo desarrolladores)
*dev memory @usuario

# Ver estadísticas del sistema de IA (solo desarrolladores)
*dev memory
```

## 🛡️ Recomendaciones de Seguridad

### Para Producción:

1. **Restringir acceso por IP (si es posible):**
   - Configura reglas de firewall en Firebase
   - Limita acceso solo desde tu servidor

2. **Usar variables de entorno seguras:**
   - Nunca commits el archivo JSON de Service Account
   - Usa un gestor de secretos (AWS Secrets Manager, Google Secret Manager, etc.)

3. **Validar estructura de datos:**
   - Las reglas de Firebase ya validan la estructura básica
   - El código también valida antes de escribir

4. **Monitorear uso:**
   - Revisa los logs de Firebase regularmente
   - Configura alertas para uso inusual

## 💰 Costos

Firebase Realtime Database tiene un plan gratuito generoso:

**Spark Plan (Gratis):**
- 1 GB de almacenamiento
- 10 GB/mes de transferencia
- 100 conexiones simultáneas

Para un bot de Discord, esto es **más que suficiente** para miles de usuarios.

**Blaze Plan (Pay as you go):**
- Mismo límite de almacenamiento
- $5 por GB adicional de transferencia
- Sin límite de conexiones

## 🔧 Troubleshooting

### Error: "FIREBASE_ADMIN_SDK es requerido"

**Causa:** Variable de entorno no configurada o JSON inválido

**Solución:**
```bash
# Verificar que existe en .env
cat .env | grep FIREBASE_ADMIN_SDK

# Verificar que el JSON es válido
node -e "console.log(JSON.parse(process.env.FIREBASE_ADMIN_SDK))"
```

### Error: "PERMISSION_DENIED"

**Causa:** Reglas de Firebase bloquean el acceso

**Solución:**
- Verifica que las reglas permitan lectura/escritura
- Asegúrate de que la Service Account tenga permisos correctos
- Revisa que el `project_id` en el JSON coincida con tu proyecto

### Error: "Failed to get document" o "Database not found"

**Causa:** URL de base de datos incorrecta o base de datos no habilitada

**Solución:**
- Verifica que Realtime Database esté habilitada
- El código usa automáticamente: `https://{project_id}-default-rtdb.firebaseio.com`
- Si usas una base de datos con nombre personalizado, modifica `FirebaseAdminManager.ts`

### Bot funciona sin Firebase

**Causa:** El bot continúa funcionando sin estadísticas si Firebase falla

**Solución:**
- Revisa los logs para ver el error específico
- Verifica la conexión a internet
- Asegúrate de que las credenciales sean correctas

### Error: "Invalid private key"

**Causa:** La clave privada en el JSON está mal formateada

**Solución:**
- Asegúrate de que los `\n` en `private_key` estén correctamente escapados
- El formato debe ser: `"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"`
- O usa el JSON tal como se descargó sin modificar

## 📚 Recursos Adicionales

- [Documentación oficial de Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Documentación de Realtime Database](https://firebase.google.com/docs/database)
- [Reglas de Seguridad](https://firebase.google.com/docs/database/security)
- [Límites y Cuotas](https://firebase.google.com/docs/database/usage/limits)

## ❓ Preguntas Frecuentes

**P: ¿Puedo usar otra base de datos?**
R: Sí, puedes modificar `FirebaseAdminManager.ts` y `CustomCommandManager.ts` para usar MongoDB, PostgreSQL, etc.

**P: ¿Los datos se pierden al reiniciar el bot?**
R: No, Firebase almacena todo permanentemente en la nube.

**P: ¿Puedo borrar estadísticas o comandos?**
R: Sí, puedes hacerlo manualmente en Firebase Console o implementar comandos de administración.

**P: ¿Es seguro para producción?**
R: Con las reglas adecuadas y credenciales seguras sí. Considera usar Google Secret Manager para las credenciales.

**P: ¿Por qué usar Admin SDK en lugar del cliente web?**
R: Admin SDK proporciona acceso completo sin restricciones de seguridad, perfecto para bots que necesitan control total sobre los datos.

**P: ¿Necesito configurar autenticación?**
R: No para el bot, pero si quieres que usuarios externos accedan a Firebase, necesitarías configurar Firebase Authentication.

---

**Sistema desarrollado por MirtZerck para Hikari Koizumi 2.0** 🌸
