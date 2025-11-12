# 📚 Guía para Subir tu Bot a GitHub

## Paso 1: Preparar el repositorio local

Ya tienes Git inicializado. Ahora vamos a asegurarnos de que solo se suban los archivos necesarios.

### 1.1 Verificar el estado actual
```bash
git status
```

### 1.2 Agregar solo los archivos del proyecto (sin node_modules, .cursor, etc.)
```bash
git add .gitignore
git add README.md
git add package.json
git add tsconfig.json
git add src/
```

### 1.3 Hacer el commit inicial
```bash
git commit -m "Initial commit: Hikari Koizumi 2.0 bot"
```

## Paso 2: Crear el repositorio en GitHub

### 2.1 Ve a GitHub
1. Abre tu navegador y ve a [github.com](https://github.com)
2. Inicia sesión en tu cuenta

### 2.2 Crear nuevo repositorio
1. Haz clic en el botón **"+"** en la esquina superior derecha
2. Selecciona **"New repository"**

### 2.3 Configurar el repositorio
- **Repository name**: `Hikari-Koizumi-2.0` (o el nombre que prefieras)
- **Description**: "Un bot de Discord moderno construido con TypeScript y Discord.js v14"
- **Visibilidad**: Elige **Public** o **Private** (recomiendo Private si contiene tokens)
- **NO marques** "Initialize this repository with a README" (ya tienes uno)
- **NO agregues** .gitignore ni licencia (ya los tienes)

### 2.4 Crear el repositorio
Haz clic en **"Create repository"**

## Paso 3: Conectar tu repositorio local con GitHub

GitHub te mostrará instrucciones. Usa estas:

### 3.1 Agregar el remote
```bash
git remote add origin https://github.com/TU-USUARIO/Hikari-Koizumi-2.0.git
```
**⚠️ IMPORTANTE**: Reemplaza `TU-USUARIO` con tu nombre de usuario de GitHub

### 3.2 Renombrar la rama principal (si es necesario)
```bash
git branch -M main
```

### 3.3 Subir el código
```bash
git push -u origin main
```

## Paso 4: Verificar

1. Ve a tu repositorio en GitHub
2. Deberías ver todos tus archivos subidos
3. El README.md debería mostrarse automáticamente

## 🔒 Seguridad: Proteger tus secretos

**IMPORTANTE**: Asegúrate de que tu archivo `.env` NO esté en el repositorio:

1. Verifica que `.env` esté en `.gitignore`
2. Si accidentalmente lo subiste, elimínalo:
   ```bash
   git rm --cached .env
   git commit -m "Remove .env from repository"
   git push
   ```
3. **CAMBIA TODOS TUS TOKENS** inmediatamente si los subiste por error

## 📝 Próximos pasos (opcional)

### Agregar un archivo .env.example
Crea un archivo `.env.example` con las variables sin valores:
```env
TOKEN=
APPLICATION_ID=
PREFIX=*
TENOR_API_KEY=
```

Luego agrégalo:
```bash
git add .env.example
git commit -m "Add .env.example template"
git push
```

## 🆘 Solución de problemas

### Si tienes errores de autenticación:
```bash
# Usar token personal en lugar de contraseña
git remote set-url origin https://TU-TOKEN@github.com/TU-USUARIO/Hikari-Koizumi-2.0.git
```

### Si quieres cambiar la URL del repositorio:
```bash
git remote set-url origin https://github.com/TU-USUARIO/NUEVO-NOMBRE.git
```

### Si necesitas actualizar el README con la URL correcta:
Edita el README.md y cambia `tu-usuario` por tu usuario real de GitHub.

