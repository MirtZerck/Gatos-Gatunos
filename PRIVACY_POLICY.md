# Política de Privacidad - Hikari Koizumi Bot

**Última actualización:** 28 de noviembre de 2025

## 1. Introducción

Esta Política de Privacidad describe cómo Hikari Koizumi (en adelante, "el Bot", "nosotros" o "nuestro") recopila, usa, almacena y protege la información de los usuarios que utilizan nuestro servicio en Discord.

Al usar el Bot, aceptas la recopilación y uso de información de acuerdo con esta política. Si no estás de acuerdo con esta Política de Privacidad, por favor no uses el Bot.

## 2. Información que Recopilamos

### 2.1 Información Automáticamente Recopilada

Cuando usas el Bot, recopilamos automáticamente:

- **IDs de Discord:** ID de usuario, ID de servidor (guild), ID de canal, ID de mensaje
- **Información de perfil público:** Nombre de usuario, apodo en servidor, avatar, roles
- **Metadatos de mensajes:** Marcas de tiempo, contexto de comandos (cuando interactúas con el Bot)
- **Información de voz:** Canal de voz actual (solo para funcionalidad de música, no grabamos audio)
- **Datos de uso:** Comandos utilizados, frecuencia de uso, interacciones con el Bot

### 2.2 Información Proporcionada por el Usuario

Recopilamos información que proporcionas voluntariamente:

- **Contenido de mensajes:** Cuando interactúas con la IA conversacional o usas comandos
- **Comandos personalizados:** Comandos creados por administradores de servidor
- **Configuraciones:** Preferencias de servidor, configuraciones de módulos
- **Búsquedas:** Términos de búsqueda para música, GIFs, imágenes
- **Datos de minijuegos:** Estadísticas, progreso, logros (cuando la funcionalidad esté disponible)
- **Datos de economía:** Monedas virtuales, inventario, transacciones (cuando la funcionalidad esté disponible)
- **Reportes:** Información que proporciones al reportar problemas o contactar soporte

### 2.3 Información de Servidor

Para servidores que usan el Bot, podemos recopilar:

- **Configuración del servidor:** Ajustes de módulos, canales configurados, roles configurados
- **Logs de moderación:** Advertencias, acciones de moderación, registro de eventos
- **Datos de automoderación:** Mensajes filtrados, usuarios sancionados automáticamente
- **Estadísticas del servidor:** Conteo de miembros, actividad general
- **Mensajes de bienvenida/despedida:** Configuraciones personalizadas

### 2.4 Datos de Interacción

- **Estadísticas de interacciones:** Registro de interacciones entre usuarios (abrazos, besos, etc.)
- **Historial de acciones:** Tipo y frecuencia de interacciones entre pares de usuarios
- **Bloqueos:** Lista de usuarios bloqueados por cada usuario
- **Solicitudes pendientes:** Solicitudes de interacción activas

### 2.5 Datos de IA Conversacional

- **Memoria a corto plazo:** Últimos mensajes de la conversación (temporal)
- **Memoria de sesión:** Contexto de la conversación actual (temporal)
- **Memoria a largo plazo:** Información persistente de conversaciones (si está habilitada)
- **Preferencias de usuario:** Información proporcionada en conversaciones con la IA

## 3. Cómo Usamos la Información

Utilizamos la información recopilada para:

### 3.1 Proporcionar y Mejorar el Servicio

- Procesar y responder a comandos
- Personalizar la experiencia del usuario
- Proporcionar funcionalidades de música, IA, moderación y otras características
- Recordar configuraciones y preferencias
- Mantener sistemas de niveles, economía y minijuegos

### 3.2 Moderación y Seguridad

- Detectar y prevenir spam, abuso y comportamiento malicioso
- Aplicar automoderación según configuraciones del servidor
- Investigar violaciones de los Términos de Servicio
- Proteger la seguridad e integridad del Bot

### 3.3 Análisis y Mejoras

- Analizar patrones de uso para mejorar funcionalidades
- Identificar y corregir errores
- Desarrollar nuevas características
- Generar estadísticas agregadas y anónimas

### 3.4 Comunicación

- Responder a consultas de soporte
- Enviar notificaciones importantes sobre el servicio
- Informar sobre cambios en la Política de Privacidad o Términos de Servicio

### 3.5 Funcionalidades Específicas

- **IA Conversacional:** Generar respuestas contextuales y coherentes
- **Música:** Buscar y reproducir contenido solicitado
- **Estadísticas:** Mostrar información de interacciones entre usuarios
- **Comandos personalizados:** Ejecutar comandos creados por administradores
- **Logs:** Registrar eventos para auditoría y moderación

## 4. Base Legal para el Procesamiento (GDPR)

Procesamos datos personales bajo las siguientes bases legales:

- **Consentimiento:** Al usar el Bot, consientes la recopilación de datos
- **Ejecución de contrato:** Para proporcionar el servicio solicitado
- **Intereses legítimos:** Para mejorar el servicio, prevenir abuso y garantizar seguridad
- **Cumplimiento legal:** Cuando sea requerido por ley

## 5. Almacenamiento y Retención de Datos

### 5.1 Dónde Almacenamos los Datos

Los datos se almacenan en:

- **Firebase Realtime Database (Google Cloud):** Datos persistentes
- **Memoria del servidor:** Datos temporales (cooldowns, sesiones, caché)
- **Servicios de terceros:** Según se describe en la sección 7

### 5.2 Cuánto Tiempo Conservamos los Datos

- **Datos de comandos activos:** Mientras sean necesarios para la funcionalidad
- **Memoria de IA a corto plazo:** Hasta 24 horas
- **Memoria de IA a largo plazo:** Hasta que el usuario la elimine o 1 año de inactividad
- **Estadísticas de interacciones:** Hasta que el usuario las elimine o 2 años de inactividad
- **Comandos personalizados:** Mientras el servidor use el Bot
- **Logs de moderación:** Hasta 180 días o según configuración del servidor
- **Datos de economía/niveles:** Mientras el servidor use el Bot o hasta reseteo
- **Cooldowns y caché:** Desde minutos hasta horas
- **Bloqueos de usuarios:** Hasta que el usuario los elimine

Podemos retener ciertos datos por períodos más largos si es legalmente requerido o necesario para resolver disputas.

### 5.3 Eliminación de Datos al Abandonar Servidores

Cuando el Bot es removido de un servidor:

- Los datos específicos del servidor pueden ser eliminados automáticamente después de 30 días
- Los datos de usuarios individuales de ese servidor pueden ser conservados para funcionalidades cross-server
- Algunos datos pueden conservarse de forma anónima con fines estadísticos

## 6. Cómo Compartimos la Información

### 6.1 No Vendemos Datos

**Nunca** vendemos, alquilamos o comercializamos tus datos personales a terceros.

### 6.2 Compartimos Información Con:

**Servicios de Terceros Necesarios:**

- **Discord:** Toda interacción ocurre a través de la plataforma Discord
- **Google (Firebase):** Para almacenamiento de datos persistentes
- **Google (Gemini API):** Para procesamiento de IA (los mensajes se envían a la API)
- **Tenor (Google):** Para búsqueda de GIFs
- **Danbooru:** Para búsqueda de imágenes
- **Plataformas de música:** YouTube, Spotify, SoundCloud, etc., para búsqueda y streaming

**Otros Usuarios del Bot:**

- Estadísticas de interacciones (solo entre usuarios que interactúan)
- Información pública del perfil de Discord
- Contenido de comandos personalizados visibles en el servidor
- Posiciones en tablas de clasificación (cuando la funcionalidad esté disponible)

**Administradores de Servidor:**

- Logs de moderación de su servidor
- Configuraciones y comandos personalizados de su servidor
- Estadísticas de uso del Bot en su servidor

**Requerimientos Legales:**

Podemos divulgar información si:

- Es requerido por ley, regulación o proceso legal
- Es necesario para proteger nuestros derechos o seguridad
- Es necesario para prevenir fraude o abuso
- Es necesario para hacer cumplir nuestros Términos de Servicio

## 7. Servicios de Terceros y APIs

El Bot utiliza los siguientes servicios de terceros que tienen sus propias políticas de privacidad:

- **Discord:** [Política de Privacidad de Discord](https://discord.com/privacy)
- **Google Cloud/Firebase:** [Política de Privacidad de Google](https://policies.google.com/privacy)
- **Google Gemini API:** [Políticas de Google AI](https://ai.google.dev/gemini-api/terms)
- **Tenor (Google):** [Política de Privacidad de Google](https://policies.google.com/privacy)
- **YouTube:** [Política de Privacidad de Google](https://policies.google.com/privacy)
- **Spotify:** [Política de Privacidad de Spotify](https://www.spotify.com/privacy)
- **SoundCloud:** [Política de Privacidad de SoundCloud](https://soundcloud.com/pages/privacy)

No controlamos las prácticas de privacidad de estos servicios y no somos responsables de ellas.

## 8. Seguridad de los Datos

Implementamos medidas de seguridad razonables para proteger tus datos:

- **Cifrado en tránsito:** Uso de HTTPS/WSS para todas las comunicaciones
- **Cifrado en reposo:** Los datos almacenados en Firebase están cifrados
- **Autenticación:** Uso de tokens seguros para APIs
- **Control de acceso:** Acceso limitado a datos sensibles
- **Monitoreo:** Detección de accesos no autorizados
- **Actualizaciones:** Mantenimiento regular de dependencias de seguridad

Sin embargo, **ningún método de transmisión o almacenamiento es 100% seguro**. No podemos garantizar la seguridad absoluta de los datos.

## 9. Derechos de los Usuarios

Dependiendo de tu jurisdicción, puedes tener los siguientes derechos:

### 9.1 Derechos GDPR (Usuarios de la UE/EEE)

- **Derecho de acceso:** Solicitar una copia de tus datos personales
- **Derecho de rectificación:** Corregir datos inexactos o incompletos
- **Derecho de eliminación:** Solicitar la eliminación de tus datos ("derecho al olvido")
- **Derecho a la portabilidad:** Recibir tus datos en formato estructurado
- **Derecho a la restricción:** Limitar el procesamiento de tus datos
- **Derecho de oposición:** Oponerte al procesamiento de tus datos
- **Derecho a retirar el consentimiento:** En cualquier momento
- **Derecho a presentar una queja:** Ante una autoridad de protección de datos

### 9.2 Derechos CCPA (Usuarios de California)

- Derecho a saber qué datos se recopilan
- Derecho a saber si se venden o comparten datos personales
- Derecho a optar por no vender datos (no vendemos datos)
- Derecho a eliminar datos personales
- Derecho a no discriminación por ejercer derechos

### 9.3 Cómo Ejercer tus Derechos

Para ejercer cualquiera de estos derechos:

1. Contacta al desarrollador a través del servidor de soporte del Bot
2. Proporciona tu ID de Discord y describe tu solicitud
3. Verificaremos tu identidad
4. Procesaremos tu solicitud dentro de 30 días

**Eliminación de datos dentro del Bot:**

Algunos datos pueden ser eliminados directamente:

- Memoria de IA: Usando comandos específicos del Bot
- Estadísticas de interacciones: Usando comandos del Bot
- Bloqueos de usuarios: Usando comandos del Bot

## 10. Privacidad de Menores

El Bot no está dirigido a menores de 13 años (o 16 en el EEE). No recopilamos intencionalmente información de menores de estas edades. Si descubrimos que hemos recopilado datos de un menor, eliminaremos esa información de inmediato.

Si eres padre/tutor y crees que tu hijo nos ha proporcionado información personal, contáctanos.

## 11. Transferencias Internacionales de Datos

Los datos pueden ser transferidos y procesados en países fuera de tu país de residencia, incluyendo Estados Unidos y otros países donde operan nuestros proveedores de servicios.

Estos países pueden tener leyes de protección de datos diferentes a las de tu país. Al usar el Bot, consientes la transferencia de tus datos a estos países.

## 12. Cookies y Tecnologías de Seguimiento

El Bot en sí no utiliza cookies ya que opera a través de Discord. Sin embargo:

- Discord utiliza cookies según su propia política de privacidad
- Los servicios de terceros que usamos pueden utilizar cookies
- Almacenamos datos en caché temporalmente en memoria para mejorar rendimiento

## 13. Cambios en la Política de Privacidad

Nos reservamos el derecho de actualizar esta Política de Privacidad en cualquier momento. Los cambios sustanciales serán notificados a través de:

- Actualización de la fecha "Última actualización" al inicio de este documento
- Anuncio en el servidor de soporte del Bot
- Notificación en canales configurados (para cambios importantes)

El uso continuado del Bot después de los cambios constituye la aceptación de la nueva Política de Privacidad.

## 14. Enlaces a Otros Sitios

El Bot puede proporcionar enlaces a sitios web o servicios de terceros. No somos responsables de las prácticas de privacidad de estos sitios. Te recomendamos leer sus políticas de privacidad.

## 15. Tus Opciones de Privacidad

Puedes controlar tu privacidad:

- **Limitar el uso del Bot:** Usa solo los comandos que te resulten cómodos
- **Configurar permisos:** Los administradores pueden limitar qué canales pueden usar el Bot
- **Bloquear interacciones:** Usa el sistema de bloqueo para evitar interacciones con usuarios específicos
- **Eliminar datos:** Solicita la eliminación de tus datos personales
- **Remover el Bot:** Los administradores pueden eliminar el Bot del servidor en cualquier momento

## 16. Retención de Datos para Fines Legales

Podemos retener ciertos datos cuando:

- Sea legalmente requerido (órdenes judiciales, investigaciones)
- Sea necesario para resolver disputas o hacer cumplir acuerdos
- Sea necesario para prevenir fraude o abuso
- Sea necesario para proteger la seguridad de usuarios

## 17. Datos Anónimos y Agregados

Podemos crear datos estadísticos anónimos y agregados a partir de la información recopilada. Estos datos no te identifican personalmente y podemos usarlos para:

- Análisis de tendencias y patrones de uso
- Mejora del servicio
- Reportes públicos sobre el uso del Bot

## 18. Contacto para Privacidad

Si tienes preguntas, inquietudes o solicitudes relacionadas con esta Política de Privacidad o el manejo de tus datos personales:

**Desarrollador:** MirtZerck

**Métodos de contacto:**
- Servidor de soporte del Bot en Discord
- GitHub (si el repositorio está disponible públicamente)

**Para solicitudes relacionadas con privacidad, incluye:**
- Tu ID de Discord
- Descripción detallada de tu solicitud
- Cualquier información relevante para verificar tu identidad

Responderemos a las solicitudes de privacidad dentro de 30 días.

## 19. Autoridad de Supervisión

Si resides en el EEE y crees que no hemos manejado adecuadamente tus datos personales, tienes derecho a presentar una queja ante tu autoridad de protección de datos local.

## 20. Responsabilidad del Usuario

Los usuarios son responsables de:

- Mantener la confidencialidad de su cuenta de Discord
- No compartir información sensible con el Bot o en comandos personalizados
- Configurar adecuadamente los permisos del Bot en su servidor
- Informar a los miembros de su servidor sobre el uso del Bot y esta Política de Privacidad

---

**Desarrollador:** MirtZerck
**Versión de la Política:** 1.0
**Fecha de entrada en vigor:** 28 de noviembre de 2025

Al usar Hikari Koizumi, reconoces que has leído y comprendido esta Política de Privacidad y consientes la recopilación, uso y divulgación de tu información según se describe aquí.

**Última revisión:** 28 de noviembre de 2025
