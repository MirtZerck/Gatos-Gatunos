# Configuración de Documentos Legales para Verificación de Discord

Esta guía te ayudará a publicar los documentos legales (Términos de Servicio y Política de Privacidad) necesarios para verificar tu bot en Discord.

## 📋 Requisitos de Discord

Discord requiere que proporciones:

1. **URL de Términos de Servicio** - Un enlace público a tus Términos de Servicio
2. **URL de Política de Privacidad** - Un enlace público a tu Política de Privacidad

Estos enlaces deben ser:
- ✅ Accesibles públicamente (sin autenticación)
- ✅ Permanentes (no cambiar la URL)
- ✅ Legibles por humanos (no solo para bots)

## 🚀 Opciones para Publicar tus Documentos

### Opción 1: GitHub (Recomendado - Gratis)

Si tu repositorio es **público**:

1. Asegúrate de que `TERMS_OF_SERVICE.md` y `PRIVACY_POLICY.md` están en la raíz del repositorio
2. Sube los cambios a GitHub:
   ```bash
   git add TERMS_OF_SERVICE.md PRIVACY_POLICY.md
   git commit -m "Añadidos documentos legales para verificación de Discord"
   git push origin main
   ```

3. Usa estas URLs en Discord:
   - **Términos de Servicio:** `https://github.com/TU-USUARIO/TU-REPO/blob/main/TERMS_OF_SERVICE.md`
   - **Política de Privacidad:** `https://github.com/TU-USUARIO/TU-REPO/blob/main/PRIVACY_POLICY.md`

**Ventajas:**
- ✅ Gratis
- ✅ Fácil de actualizar (solo haz un commit)
- ✅ Versionado automático
- ✅ GitHub renderiza el Markdown de forma legible

### Opción 2: GitHub Pages (Recomendado - Gratis)

Para una presentación más profesional:

1. Activa GitHub Pages en tu repositorio:
   - Ve a Settings → Pages
   - En "Source", selecciona la rama `main` y carpeta `/ (root)`
   - Guarda

2. Espera unos minutos para que se publique

3. Usa estas URLs:
   - **Términos de Servicio:** `https://TU-USUARIO.github.io/TU-REPO/TERMS_OF_SERVICE`
   - **Política de Privacidad:** `https://TU-USUARIO.github.io/TU-REPO/PRIVACY_POLICY`

**Ventajas:**
- ✅ Gratis
- ✅ Más profesional que enlaces directos de GitHub
- ✅ GitHub convierte automáticamente Markdown a HTML

### Opción 3: GitHub Gist (Alternativa Rápida - Gratis)

Si no tienes un repositorio público:

1. Ve a [gist.github.com](https://gist.github.com/)
2. Crea dos gists públicos:
   - Uno para `TERMS_OF_SERVICE.md`
   - Otro para `PRIVACY_POLICY.md`
3. Copia las URLs de los gists

**Ventajas:**
- ✅ Gratis
- ✅ No requiere repositorio público
- ✅ Rápido de configurar

**Desventajas:**
- ❌ Menos profesional
- ❌ URLs más largas y genéricas

### Opción 4: Tu Propio Sitio Web

Si tienes un sitio web o dominio:

1. Convierte los archivos Markdown a HTML:
   ```bash
   # Usando pandoc (instálalo si no lo tienes)
   pandoc TERMS_OF_SERVICE.md -o terms.html
   pandoc PRIVACY_POLICY.md -o privacy.html
   ```

2. Sube los archivos HTML a tu servidor:
   - `https://tudominio.com/terms`
   - `https://tudominio.com/privacy`

**Ventajas:**
- ✅ Completamente personalizado
- ✅ Puedes usar tu dominio propio
- ✅ Control total sobre el diseño

**Desventajas:**
- ❌ Requiere hosting y dominio
- ❌ Más complejo de mantener

### Opción 5: Servicios de Hosting de Documentos

Otras opciones gratuitas:

- **GitBook:** [gitbook.com](https://www.gitbook.com/) - Gratis para documentos públicos
- **ReadTheDocs:** [readthedocs.org](https://readthedocs.org/) - Gratis para proyectos open source
- **Notion:** [notion.so](https://www.notion.so/) - Puedes hacer páginas públicas

## 📝 Cómo Proporcionar las URLs a Discord

1. Ve al [Discord Developer Portal](https://discord.com/developers/applications)
2. Selecciona tu aplicación (bot)
3. Ve a la sección **Bot** o **General Information**
4. Busca los campos:
   - **Terms of Service URL**
   - **Privacy Policy URL**
5. Pega las URLs de tus documentos publicados
6. Guarda los cambios

## ⚠️ Consideraciones Importantes

### Personalización Requerida

Antes de publicar, **DEBES** personalizar estos documentos:

1. **Información de Contacto:**
   - Actualiza "MirtZerck" con tu nombre/username
   - Añade enlaces a tu servidor de Discord de soporte
   - Añade tu información de contacto real

2. **Funcionalidades:**
   - Los documentos cubren funcionalidades actuales y futuras
   - Revisa que todas las secciones apliquen a tu bot
   - Elimina secciones que no uses (ej: si no usas Firebase)

3. **Jurisdicción Legal:**
   - Considera consultar con un abogado si tienes muchos usuarios
   - Las leyes varían según tu ubicación
   - GDPR aplica si tienes usuarios en la UE
   - CCPA aplica si tienes usuarios en California

### Actualización de Documentos

- ✅ Actualiza la fecha "Última actualización" cuando hagas cambios
- ✅ Incrementa el número de versión
- ✅ Notifica a los usuarios sobre cambios importantes
- ✅ Mantén las URLs estables (no cambies los enlaces)

### URLs Permanentes

Una vez que proporciones las URLs a Discord:

- ❌ NO cambies las URLs
- ❌ NO borres los archivos
- ✅ Mantén los documentos accesibles siempre
- ✅ Si necesitas cambiar la URL, actualízala en Discord primero

## 🔍 Verificación

Después de configurar las URLs:

1. **Prueba los enlaces** en un navegador de incógnito
2. **Verifica que sean accesibles** sin autenticación
3. **Comprueba que el contenido sea legible**
4. **Asegúrate de que no haya errores 404**

## 📞 Soporte

Si tienes problemas configurando los documentos legales:

1. Revisa esta guía completa
2. Verifica que las URLs sean públicas
3. Consulta la [documentación de Discord](https://support.discord.com/hc/en-us/articles/360040720412)
4. Pregunta en el servidor de Discord Developers

## 🎯 Checklist Final

Antes de enviar tu solicitud de verificación:

- [ ] Documentos legales creados y personalizados
- [ ] URLs públicas configuradas y probadas
- [ ] Enlaces accesibles sin autenticación
- [ ] Contenido legible y formateado correctamente
- [ ] Información de contacto actualizada
- [ ] URLs proporcionadas en el Discord Developer Portal
- [ ] Documentos revisados por ortografía y coherencia
- [ ] Fecha de "Última actualización" es correcta
- [ ] Has leído y entendido tus propios términos

---

**Nota:** Estos documentos son plantillas legales generales. Para un uso comercial o bots con muchos usuarios, considera consultar con un abogado especializado en tecnología y privacidad de datos.
