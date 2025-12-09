# 🧪 Plan de Pruebas - Sistema Premium
## Bot de Discord "Hikari Koizumi 2.0"

---

## 📋 Índice

1. [Preparación del Entorno](#-preparación-del-entorno)
2. [Pruebas Básicas](#-pruebas-básicas)
3. [Pruebas de Códigos de Canje](#-pruebas-de-códigos-de-canje)
4. [Pruebas de Gestión Premium](#-pruebas-de-gestión-premium)
5. [Pruebas de Comandos de Usuario](#-pruebas-de-comandos-de-usuario)
6. [Pruebas de Sistema de Expiración](#-pruebas-de-sistema-de-expiración)
7. [Pruebas de Webhooks](#-pruebas-de-webhooks)
8. [Pruebas de Seguridad](#-pruebas-de-seguridad)
9. [Pruebas de Integración](#-pruebas-de-integración)
10. [Checklist Final](#-checklist-final)

---

## 🔧 Preparación del Entorno

### Paso 1: Configurar Variables de Entorno

Antes de comenzar, asegúrate de tener estas variables configuradas en tu `.env`:

```env
# Sistema Premium (para testing)
PREMIUM_ENABLED=true
PREMIUM_GLOBAL_TIER=none
PREMIUM_GLOBAL_EXPIRES_AT=

# Webhooks (opcional para testing inicial)
KOFI_VERIFICATION_TOKEN=test_token_123
TOPGG_WEBHOOK_SECRET=test_secret_456
DBL_WEBHOOK_SECRET=test_secret_789
WEBHOOK_SERVER_PORT=3000
ENABLE_WEBHOOK_SERVER=false  # Dejar en false hasta pruebas de webhooks
PREMIUM_LOG_CHANNEL_ID=      # ID de un canal de pruebas
```

### Paso 2: Compilar el Proyecto

```bash
npx tsc
```

**Verificar:** ✅ Sin errores de compilación

### Paso 3: Iniciar el Bot

```bash
npm start
```

**Verificar en consola:**
- ✅ "Sistema premium listo"
- ✅ "Sistema de códigos de canje listo"
- ✅ "Sistema de donaciones listo"
- ✅ "Sistema de votos listo"
- ✅ "Checker de expiración premium iniciado" (si PREMIUM_ENABLED=true)

---

## ✅ Pruebas Básicas

### Prueba 1.1: Verificar que el Bot Responde

**Comando:**
```
*ping
```

**Resultado Esperado:**
- ✅ El bot responde con el tiempo de latencia

### Prueba 1.2: Verificar Comando Premium Info

**Comando:**
```
/premium info
```
**o**
```
*premium info
```

**Resultado Esperado:**
- ✅ Embed con información de los 3 tiers
- ✅ Muestra beneficios de cada tier
- ✅ Muestra métodos para obtener premium
- ✅ Colores y emojis correctos

### Prueba 1.3: Verificar Estado Premium (Sin Premium)

**Comando:**
```
/premium status
```

**Resultado Esperado:**
- ✅ Mensaje indicando que no tienes premium activo
- ✅ Sugiere usar `/premium info`

---

## 🎟️ Pruebas de Códigos de Canje

### Prueba 2.1: Generar Código Básico Temporal

**Comando:**
```
*dev premium generate basic temp 7
```

**Resultado Esperado:**
- ✅ Código generado con formato `XXX-XXX-XXX`
- ✅ Mensaje ANSI (si tienes hook configurado) o embed
- ✅ Muestra tier: basic, tipo: temporal, duración: 7 días

**Anotar el código:** `________________`

### Prueba 2.2: Generar Código Pro Temporal

**Comando:**
```
*dev premium generate pro temp 30
```

**Resultado Esperado:**
- ✅ Código generado correctamente
- ✅ Tier: pro, 30 días

**Anotar el código:** `________________`

### Prueba 2.3: Generar Código Ultra Permanente

**Comando:**
```
*dev premium generate ultra permanent
```

**Resultado Esperado:**
- ✅ Código generado correctamente
- ✅ Tier: ultra, tipo: permanente

**Anotar el código:** `________________`

### Prueba 2.4: Listar Códigos Activos

**Comando:**
```
*dev premium codes active
```

**Resultado Esperado:**
- ✅ Lista muestra los 3 códigos generados
- ✅ Todos muestran estado "ACTIVO"
- ✅ Muestra tier de cada código

### Prueba 2.5: Listar Todos los Códigos

**Comando:**
```
*dev premium codes all
```

**Resultado Esperado:**
- ✅ Muestra todos los códigos (activos + usados)

### Prueba 2.6: Canjear Código Básico (Primera Vez)

**Comando (usa el código de 2.1):**
```
/premium redeem ABC-DEF-123
```

**Resultado Esperado:**
- ✅ Mensaje de éxito
- ✅ Indica que recibiste Premium Básico por 7 días
- ✅ Sugiere usar `/premium status`

### Prueba 2.7: Verificar Estado Premium Después de Canje

**Comando:**
```
/premium status
```

**Resultado Esperado:**
- ✅ Muestra Premium Básico activo
- ✅ Muestra tipo: Temporal
- ✅ Muestra días restantes: ~7
- ✅ Muestra fuente: code
- ✅ Lista beneficios del tier

### Prueba 2.8: Intentar Canjear Código Usado

**Comando (usa el mismo código de 2.6):**
```
/premium redeem ABC-DEF-123
```

**Resultado Esperado:**
- ❌ Error: "Código ya utilizado"
- ✅ Muestra intentos restantes

### Prueba 2.9: Canjear Código Inválido

**Comando:**
```
/premium redeem XXX-YYY-ZZZ
```

**Resultado Esperado:**
- ❌ Error: "Código no encontrado"
- ✅ Muestra intentos restantes (4/5)

### Prueba 2.10: Rate Limiting de Canje (5 Intentos)

**Comandos (ejecutar 4 veces más con códigos inválidos):**
```
/premium redeem AAA-BBB-CCC
/premium redeem DDD-EEE-FFF
/premium redeem GGG-HHH-III
/premium redeem JJJ-KKK-LLL
```

**Resultado Esperado después del 5to intento:**
- ❌ Error: "Has alcanzado el límite de intentos"
- ✅ Mensaje indica "Podrás intentar de nuevo en 1 hora"

### Prueba 2.11: Verificar Códigos Usados

**Comando:**
```
*dev premium codes used
```

**Resultado Esperado:**
- ✅ Muestra el código canjeado en 2.6
- ✅ Estado: "USADO"
- ✅ Muestra tu usuario como quien lo usó

### Prueba 2.12: Eliminar Código No Usado

**Comando (usa el código de 2.2 que no se ha usado):**
```
*dev premium delete-code ABC-DEF-123
```

**Resultado Esperado:**
- ✅ Mensaje de éxito: "Código eliminado"

### Prueba 2.13: Intentar Eliminar Código Usado

**Comando (usa el código de 2.6 que ya se canjeó):**
```
*dev premium delete-code ABC-DEF-123
```

**Resultado Esperado:**
- ❌ Error: "Código no encontrado o ya usado"

---

## 👑 Pruebas de Gestión Premium

### Prueba 3.1: Otorgar Premium a Usuario (Temporal)

**Comando (menciona a un usuario de prueba):**
```
*dev premium grant @usuario basic 15
```

**Resultado Esperado:**
- ✅ Mensaje de éxito
- ✅ Indica tier, duración
- ✅ Usuario recibe DM de notificación (si no tiene DMs bloqueados)

### Prueba 3.2: Verificar Estado de Otro Usuario

**Comando:**
```
*dev premium check @usuario
```

**Resultado Esperado:**
- ✅ Muestra estado premium del usuario
- ✅ Tier: basic
- ✅ Días restantes: ~15
- ✅ Fuente: manual

### Prueba 3.3: Otorgar Premium Permanente

**Comando:**
```
*dev premium grant @usuario ultra permanent
```

**Resultado Esperado:**
- ✅ Mensaje de éxito
- ✅ Tipo: Permanente
- ✅ No muestra fecha de expiración

### Prueba 3.4: Revocar Premium de Usuario

**Comando:**
```
*dev premium revoke @usuario Prueba de revocación
```

**Resultado Esperado:**
- ✅ Mensaje de éxito
- ✅ Usuario ya no tiene premium

### Prueba 3.5: Verificar Usuario Sin Premium

**Comando:**
```
*dev premium check @usuario
```

**Resultado Esperado:**
- ✅ Mensaje: "No tiene premium activo"

### Prueba 3.6: Ver Estadísticas del Sistema

**Comando:**
```
*dev premium stats
```

**Resultado Esperado:**
- ✅ Muestra total de usuarios
- ✅ Muestra usuarios activos
- ✅ Muestra distribución por tier (basic, pro, ultra)
- ✅ Muestra distribución por fuente (kofi, topgg, dbl, code, manual)

---

## 👤 Pruebas de Comandos de Usuario

### Prueba 4.1: Premium Status con Prefix

**Comando:**
```
*premium status
```

**Resultado Esperado:**
- ✅ Funciona igual que `/premium status`
- ✅ Muestra tu estado premium actual

### Prueba 4.2: Premium Info con Prefix

**Comando:**
```
*premium info
```

**Resultado Esperado:**
- ✅ Funciona igual que `/premium info`

### Prueba 4.3: Premium Redeem con Prefix

**Comando (usa el código de 2.3 que es ultra permanente):**
```
*premium redeem ABC-DEF-123
```

**Resultado Esperado:**
- ✅ Código canjeado exitosamente
- ✅ Ahora tienes Premium Ultra permanente
- ✅ Reemplaza tu premium básico temporal

### Prueba 4.4: Verificar Upgrade de Tier

**Comando:**
```
/premium status
```

**Resultado Esperado:**
- ✅ Muestra Premium Ultra
- ✅ Tipo: Permanente
- ✅ No muestra expiración

### Prueba 4.5: Aliases de Prefix

**Comandos:**
```
*premium estado
*premium información
*premium canjear
```

**Resultado Esperado:**
- ✅ Todos los aliases funcionan correctamente

---

## ⏰ Pruebas de Sistema de Expiración

### Prueba 5.1: Crear Premium que Expire Pronto

**Comando (1 minuto para testing):**
```
*dev premium grant @usuario_prueba basic 0.0007
```
*(0.0007 días = ~1 minuto)*

**Resultado Esperado:**
- ✅ Premium otorgado

### Prueba 5.2: Verificar Expiración Automática

**Esperar ~2-3 minutos y luego ejecutar:**
```
*dev premium check @usuario_prueba
```

**Resultado Esperado:**
- ✅ Premium ya no está activo
- ✅ Sistema lo revocó automáticamente

### Prueba 5.3: Verificar Notificaciones de Expiración (Manual)

Para probar las notificaciones, necesitas modificar temporalmente Firebase:

**Paso 1:** Ir a Firebase Console
**Paso 2:** Navegar a `premium/users/{tu_user_id}`
**Paso 3:** Modificar `expiresAt` a 3 días en el futuro
**Paso 4:** Modificar `notificationsSent/threeDayWarning` a `false`
**Paso 5:** Esperar que el checker ejecute (cada hora)

**Resultado Esperado:**
- ✅ Recibes DM avisando que tu premium expira en 3 días
- ✅ `threeDayWarning` se marca como `true` en Firebase

**Repetir con:**
- 1 día en el futuro → `oneDayWarning`
- Tiempo pasado → `expired`

---

## 🌐 Pruebas de Webhooks

### Preparación: Activar Servidor de Webhooks

**Modificar `.env`:**
```env
ENABLE_WEBHOOK_SERVER=true
```

**Reiniciar el bot**

**Verificar en consola:**
- ✅ "Servidor de webhooks iniciado en puerto 3000"

### Prueba 6.1: Health Check

**Ejecutar en terminal (o navegador):**
```bash
curl http://localhost:3000/health
```

**Resultado Esperado:**
```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": 1234567890
}
```

### Prueba 6.2: Webhook Ko-fi (Simulado)

**Crear archivo `test-kofi.json`:**
```json
{
  "verification_token": "test_token_123",
  "message_id": "test123",
  "timestamp": "2025-12-09T10:00:00Z",
  "type": "Donation",
  "is_public": true,
  "from_name": "Usuario Test",
  "message": "Gracias por el bot!",
  "amount": "10.00",
  "url": "https://ko-fi.com/test",
  "email": "test@example.com",
  "currency": "USD",
  "is_subscription_payment": false,
  "is_first_subscription_payment": false,
  "kofi_transaction_id": "test-transaction-123"
}
```

**IMPORTANTE:** Antes de probar, necesitas registrar el email en Firebase:
```
firebase/users/{tu_user_id}/email = "test@example.com"
```

**Ejecutar:**
```bash
curl -X POST http://localhost:3000/webhooks/kofi \
  -H "Content-Type: application/json" \
  -d @test-kofi.json
```

**Resultado Esperado:**
- ✅ Respuesta: `{"success": true}`
- ✅ Recibes Premium Ultra por 30 días (por $10)
- ✅ DM de notificación de donación
- ✅ Log en consola

### Prueba 6.3: Webhook Ko-fi sin Usuario

**Modificar `test-kofi.json`:**
```json
{
  "verification_token": "test_token_123",
  ...
  "email": "noexiste@example.com",
  ...
}
```

**Ejecutar:**
```bash
curl -X POST http://localhost:3000/webhooks/kofi \
  -H "Content-Type: application/json" \
  -d @test-kofi.json
```

**Resultado Esperado:**
- ✅ Respuesta: `{"error": "Failed to process donation"}`
- ✅ Mensaje en canal de logs (si configurado)
- ✅ Log en consola advirtiendo que no se encontró usuario

### Prueba 6.4: Webhook Ko-fi Token Inválido

**Modificar `test-kofi.json`:**
```json
{
  "verification_token": "token_incorrecto",
  ...
}
```

**Ejecutar:**
```bash
curl -X POST http://localhost:3000/webhooks/kofi \
  -H "Content-Type: application/json" \
  -d @test-kofi.json
```

**Resultado Esperado:**
- ❌ Respuesta 401: `{"error": "Unauthorized"}`
- ✅ Log de advertencia

### Prueba 6.5: Webhook Top.gg (Simulado)

**Ejecutar:**
```bash
curl -X POST http://localhost:3000/webhooks/topgg \
  -H "Content-Type: application/json" \
  -H "Authorization: test_secret_456" \
  -d '{"bot":"123456789","user":"TU_USER_ID","type":"upvote","isWeekend":false,"query":""}'
```

**Resultado Esperado:**
- ✅ Respuesta: `{"success": true}`
- ✅ Recibes 12h de Premium Básico
- ✅ DM de notificación de voto
- ✅ Si ya tenías premium, se extiende la duración

### Prueba 6.6: Webhook Top.gg Fin de Semana

**Ejecutar:**
```bash
curl -X POST http://localhost:3000/webhooks/topgg \
  -H "Content-Type: application/json" \
  -H "Authorization: test_secret_456" \
  -d '{"bot":"123456789","user":"TU_USER_ID","type":"upvote","isWeekend":true,"query":""}'
```

**Resultado Esperado:**
- ✅ Recibes 24h en lugar de 12h

### Prueba 6.7: Webhook DBL (Simulado)

**Ejecutar:**
```bash
curl -X POST http://localhost:3000/webhooks/dbl \
  -H "Content-Type: application/json" \
  -H "Authorization: test_secret_789" \
  -d '{"id":"TU_USER_ID","username":"TestUser"}'
```

**Resultado Esperado:**
- ✅ Respuesta: `{"success": true}`
- ✅ Recibes 12h de Premium Básico
- ✅ DM de notificación

### Prueba 6.8: Rate Limiting de Webhooks

**Ejecutar 11 veces seguidas:**
```bash
for i in {1..11}; do curl http://localhost:3000/health; done
```

**Resultado Esperado:**
- ✅ Las primeras 10 funcionan
- ❌ La 11ª recibe 429: `{"error": "Rate limit exceeded"}`

---

## 🔒 Pruebas de Seguridad

### Prueba 7.1: Verificar que Solo Devs Pueden Generar Códigos

**Comando (ejecutar desde cuenta NO developer):**
```
*dev premium generate basic temp 7
```

**Resultado Esperado:**
- ❌ Error: No tienes permisos / Comando no encontrado

### Prueba 7.2: Verificar Unicidad de Códigos

**Generar múltiples códigos y verificar:**
```bash
*dev premium generate basic temp 7
*dev premium generate basic temp 7
*dev premium generate basic temp 7
```

**Verificar con:**
```
*dev premium codes all
```

**Resultado Esperado:**
- ✅ Todos los códigos son únicos
- ✅ Ningún código duplicado

### Prueba 7.3: Intentos de Canje Maliciosos

**Ejecutar script de fuerza bruta (simulación):**

Ejecutar 6 veces:
```
/premium redeem AAA-AAA-AAA
/premium redeem BBB-BBB-BBB
/premium redeem CCC-CCC-CCC
/premium redeem DDD-DDD-DDD
/premium redeem EEE-EEE-EEE
/premium redeem FFF-FFF-FFF
```

**Resultado Esperado:**
- ❌ Después de 5 intentos, bloqueado por 1 hora
- ✅ Sistema protegido contra fuerza bruta

---

## 🔗 Pruebas de Integración

### Prueba 8.1: Premium Global Temporal

**Modificar `.env`:**
```env
PREMIUM_ENABLED=true
PREMIUM_GLOBAL_TIER=ultra
PREMIUM_GLOBAL_EXPIRES_AT=1735776000000
```
*(Timestamp futuro, ej: 1 semana)*

**Reiniciar el bot**

**Comando (desde cualquier usuario):**
```
/premium status
```

**Resultado Esperado:**
- ✅ TODOS los usuarios tienen Premium Ultra
- ✅ Muestra fecha de expiración global

### Prueba 8.2: Reducción de Cooldowns por Tier

**Preparación:** Necesitas un comando con cooldown (ej: `*interact hug @usuario`)

**Sin Premium:**
```
*interact hug @usuario
*interact hug @usuario
```

**Resultado:** Cooldown de 5 segundos

**Con Premium Básico (-25%):**
- ✅ Cooldown reducido a 3.75 segundos

**Con Premium Pro (-50%):**
- ✅ Cooldown reducido a 2.5 segundos

**Con Premium Ultra (-75%):**
- ✅ Cooldown reducido a 1.25 segundos

### Prueba 8.3: Verificar Acceso a Comando Premium

**Crear un comando de prueba premium (opcional) o usar ejemplo:**

Si implementaste comandos premium de ejemplo:

**Sin Premium:**
```
/premium-stats
```

**Resultado:**
- ❌ Error: "Este comando requiere Premium Básico"

**Con Premium Básico:**
```
/premium-stats
```

**Resultado:**
- ✅ Comando funciona

### Prueba 8.4: Verificación por Subcomando

Si tienes un comando con subcomandos premium:

**Comando base (gratis):**
```
/music play canción
```
✅ Funciona

**Subcomando premium:**
```
/music filters bass-boost
```
❌ Requiere Premium Pro

---

## ✔️ Checklist Final

### Funcionalidades Básicas
- [ ] Bot inicia sin errores
- [ ] Sistema premium se inicializa correctamente
- [ ] Todos los managers cargan correctamente
- [ ] `/premium info` funciona
- [ ] `/premium status` funciona
- [ ] Comandos prefix funcionan igual que slash

### Sistema de Códigos
- [ ] Generar código básico temporal
- [ ] Generar código pro temporal
- [ ] Generar código ultra permanente
- [ ] Listar códigos activos
- [ ] Listar códigos usados
- [ ] Listar todos los códigos
- [ ] Canjear código válido
- [ ] Error al canjear código usado
- [ ] Error al canjear código inválido
- [ ] Rate limiting funciona (5 intentos/hora)
- [ ] Eliminar código no usado
- [ ] Error al eliminar código usado

### Gestión Premium
- [ ] Otorgar premium temporal
- [ ] Otorgar premium permanente
- [ ] Verificar estado de usuario
- [ ] Revocar premium
- [ ] Ver estadísticas del sistema
- [ ] Estadísticas son precisas

### Sistema de Expiración
- [ ] Premium expira automáticamente
- [ ] Checker ejecuta cada hora
- [ ] Notificación 3 días antes (manual)
- [ ] Notificación 1 día antes (manual)
- [ ] Notificación al expirar (manual)
- [ ] No envía notificaciones duplicadas

### Webhooks
- [ ] Servidor inicia correctamente
- [ ] Health check funciona
- [ ] Webhook Ko-fi procesa donación
- [ ] Ko-fi mapea monto a tier correcto
- [ ] Ko-fi valida token
- [ ] Ko-fi notifica al usuario
- [ ] Ko-fi notifica si no encuentra usuario
- [ ] Webhook Top.gg procesa voto
- [ ] Top.gg otorga 12h (24h fin de semana)
- [ ] Top.gg extiende premium existente
- [ ] Webhook DBL procesa voto
- [ ] DBL otorga 12h
- [ ] Rate limiting de webhooks funciona

### Seguridad
- [ ] Solo devs pueden generar códigos
- [ ] Solo devs pueden gestionar premium
- [ ] Códigos son únicos
- [ ] Rate limiting de canje protege contra brute force
- [ ] Tokens de webhook se validan
- [ ] Secrets de webhook se validan

### Integración
- [ ] Premium global funciona
- [ ] Cooldowns se reducen según tier
- [ ] Comandos premium validan tier correctamente
- [ ] Subcomandos premium funcionan independientes

### UX y Notificaciones
- [ ] Embeds tienen colores correctos
- [ ] Emojis se muestran correctamente
- [ ] Mensajes son claros y útiles
- [ ] DMs llegan a usuarios
- [ ] Logs llegan a canal dev (si configurado)

---

## 📊 Registro de Resultados

### Resumen de Pruebas

| Categoría | Total | Pasadas | Fallidas | % |
|-----------|-------|---------|----------|---|
| Básicas | 3 | | | |
| Códigos | 13 | | | |
| Gestión | 6 | | | |
| Usuario | 5 | | | |
| Expiración | 3 | | | |
| Webhooks | 8 | | | |
| Seguridad | 3 | | | |
| Integración | 4 | | | |
| **TOTAL** | **45** | | | |

### Errores Encontrados

| # | Prueba | Error | Severidad | Estado |
|---|--------|-------|-----------|--------|
| 1 | | | Alta/Media/Baja | Pendiente/Resuelto |
| 2 | | | | |
| 3 | | | | |

---

## 🚀 Después de las Pruebas

### Si TODO Pasa:
1. ✅ Marcar sistema como **listo para producción**
2. ✅ Configurar webhooks reales en Ko-fi, Top.gg, DBL
3. ✅ Establecer `PREMIUM_ENABLED=true` en producción
4. ✅ Monitorear logs durante las primeras 24h
5. ✅ Crear backup de Firebase antes del lanzamiento

### Si Hay Errores:
1. ❌ Documentar cada error en la tabla
2. ❌ Priorizar por severidad
3. ❌ Corregir errores de alta severidad primero
4. ❌ Volver a ejecutar pruebas después de correcciones
5. ❌ No desplegar hasta que TODO funcione

---

**Última Actualización:** 2025-12-09
**Estado:** Listo para Testing
**Tiempo Estimado de Pruebas:** 2-3 horas

---

## 💡 Consejos para Testing

1. **Usa un servidor de pruebas** - No pruebes en producción
2. **Crea usuarios de prueba** - No uses tu cuenta principal
3. **Documenta TODO** - Anota cada resultado
4. **Prueba casos extremos** - No solo el flujo feliz
5. **Verifica Firebase** - Revisa que los datos se guarden correctamente
6. **Revisa logs** - La consola te dará pistas de errores
7. **Toma screenshots** - De errores o comportamientos extraños
8. **Sé metódico** - Sigue el orden de las pruebas
9. **No saltes pasos** - Cada prueba prepara la siguiente
10. **Pide ayuda** - Si algo no funciona, pregunta

¡Buena suerte con las pruebas! 🍀
