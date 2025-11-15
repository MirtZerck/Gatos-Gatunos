# 🔥 Guía de Configuración de Firebase

Esta guía te ayudará a configurar Firebase Realtime Database para el sistema de estadísticas de interacciones.

## 📋 Requisitos Previos

- Una cuenta de Google
- Node.js instalado
- Proyecto del bot ya funcionando

## 🚀 Paso 1: Crear Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Click en **"Agregar proyecto"** (Add project)
3. Ingresa un nombre para tu proyecto (ej: `hikari-bot-stats`)
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
    "interactions": {
      ".read": true,
      ".write": true,
      "$pairKey": {
        ".validate": "newData.hasChildren(['total', 'byType', 'lastInteraction'])"
      }
    }
  }
}
```

⚠️ **Nota de Seguridad:** Estas reglas permiten lectura/escritura pública. Para producción, considera usar Firebase Authentication y restringir acceso solo a usuarios autenticados.

2. Click en **"Publicar"** (Publish)

## 🔑 Paso 4: Obtener Credenciales

1. En el menú lateral, click en el ⚙️ **"Configuración del proyecto"**
2. Baja hasta la sección **"Tus apps"**
3. Si no tienes una app web, click en el ícono **`</>`** (Web)
4. Dale un nombre (ej: `Hikari Bot`) y click **"Registrar app"**
5. Copia las credenciales que se muestran:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "tu-proyecto.firebaseapp.com",
  databaseURL: "https://tu-proyecto.firebaseio.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## 📝 Paso 5: Configurar Variables de Entorno

Copia las credenciales a tu archivo `.env`:

```env
# Firebase Realtime Database
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_DATABASE_URL=https://tu-proyecto.firebaseio.com
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef
```

## 📦 Paso 6: Instalar Dependencias

```bash
npm install firebase
```

## ✅ Paso 7: Probar Conexión

1. Inicia tu bot:
```bash
npm run dev
```

2. Busca en los logs:
```
[INFO] [Bot] 🔥 Conectando con Firebase...
[INFO] [FirebaseManager] ✅ Conexión con Firebase establecida
[INFO] [Bot] ✅ Sistema de estadísticas de interacciones listo
```

3. Prueba una interacción:
```
/interact hug @usuario
```

4. Verifica en Firebase Console que se creó el registro en `interactions/`

## 📊 Estructura de Datos

Los datos se almacenan así:

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

## 🔍 Ver Estadísticas

```bash
# Ver estadísticas con un usuario
/stats @usuario

# Ver información general del sistema
/stats
```

## 🛡️ Recomendaciones de Seguridad

### Para Producción:

1. **Habilitar Firebase Authentication:**
```json
{
  "rules": {
    "interactions": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

2. **Limitar por usuario:**
```json
{
  "rules": {
    "interactions": {
      "$pairKey": {
        ".read": "auth != null",
        ".write": "auth != null && $pairKey.contains(auth.uid)"
      }
    }
  }
}
```

3. **Validar estructura de datos:**
```json
{
  "rules": {
    "interactions": {
      "$pairKey": {
        ".validate": "newData.hasChildren(['total', 'byType', 'lastInteraction', 'firstInteraction'])",
        "total": {
          ".validate": "newData.isNumber() && newData.val() >= 0"
        },
        "byType": {
          ".validate": "newData.hasChildren()"
        }
      }
    }
  }
}
```

## 💰 Costos

Firebase Realtime Database tiene un plan gratuito generoso:

**Spark Plan (Gratis):**
- 1 GB de almacenamiento
- 10 GB/mes de transferencia
- 100 conexiones simultáneas

Para un bot de Discord, esto es **más que suficiente** para miles de usuarios.

## 🔧 Troubleshooting

### Error: "PERMISSION_DENIED"
- Verifica que las reglas de Firebase permitan lectura/escritura
- Revisa que `databaseURL` sea correcta

### Error: "Failed to get document"
- Verifica que `FIREBASE_DATABASE_URL` termine en `.firebaseio.com`
- Asegúrate de que la base de datos esté habilitada

### Bot funciona sin Firebase
- El bot continuará funcionando sin estadísticas
- Verifica logs para ver el error específico

## 📚 Recursos Adicionales

- [Documentación oficial de Firebase](https://firebase.google.com/docs/database)
- [Reglas de Seguridad](https://firebase.google.com/docs/database/security)
- [Límites y Cuotas](https://firebase.google.com/docs/database/usage/limits)

## ❓ Preguntas Frecuentes

**P: ¿Puedo usar otra base de datos?**
R: Sí, puedes modificar `FirebaseManager.ts` para usar MongoDB, PostgreSQL, etc.

**P: ¿Los datos se pierden al reiniciar el bot?**
R: No, Firebase almacena todo permanentemente en la nube.

**P: ¿Puedo borrar estadísticas?**
R: Sí, el bot no tiene comando implementado, pero puedes hacerlo manualmente en Firebase Console.

**P: ¿Es seguro para producción?**
R: Con las reglas adecuadas sí, pero considera usar Firebase Authentication para mayor seguridad.