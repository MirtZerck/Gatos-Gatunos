# Plan de Implementación: Sistema de Comandos Premium
## Bot de Discord "Hikari Koizumi 2.0"

---

## RESUMEN EJECUTIVO

Sistema completo de comandos premium con 3 tiers (Básico, Pro, Ultra) que se integra con la arquitectura existente del bot. Incluye 4 métodos de activación: Ko-fi (donaciones), Top.gg y Discord Bot List (votaciones), y códigos de canje (automáticos/manuales).

**Archivos a crear:** 15 archivos nuevos
**Archivos a modificar:** 9 archivos existentes
**Framework:** Discord.js v14 + TypeScript + Firebase Realtime Database

---

## DECISIONES CLAVE DEL USUARIO

### Sistema de Cooldowns
- **Básico:** -25% de cooldown
- **Pro:** -50% de cooldown
- **Ultra:** -75% de cooldown

### Sistema de Votaciones
- **Duración:** 12 horas de premium por voto
- **Tier otorgado:** Básico
- **Plataformas:** Top.gg y Discord Bot List

### Sistema de Donaciones (Ko-fi)
- **$3-4.99:** Básico por 30 días
- **$5-9.99:** Pro por 30 días
- **$10-24.99:** Ultra por 30 días
- **$25+:** Ultra permanente

---

## 1. ARQUITECTURA DE DATOS EN FIREBASE

### Estructura completa:

```
firebase/
├── premium/
│   ├── users/{userId}/
│   │   ├── tier: "basic" | "pro" | "ultra"
│   │   ├── type: "permanent" | "temporary"
│   │   ├── activatedAt: timestamp
│   │   ├── expiresAt: timestamp | null
│   │   ├── source: "kofi" | "topgg" | "dbl" | "code" | "manual"
│   │   ├── sourceId: string
│   │   └── notificationsSent: {
│   │       ├── threeDayWarning: boolean
│   │       ├── oneDayWarning: boolean
│   │       └── expired: boolean
│   │   }
│   │
│   ├── codes/{codeId}/
│   │   ├── code: string (único)
│   │   ├── tier: string
│   │   ├── type: string
│   │   ├── duration: number | null (ms)
│   │   ├── createdAt: timestamp
│   │   ├── createdBy: userId
│   │   ├── used: boolean
│   │   ├── usedBy: userId | null
│   │   ├── usedAt: timestamp | null
│   │   └── expiresAt: timestamp | null
│   │
│   ├── transactions/{transactionId}/
│   │   ├── userId: string
│   │   ├── type: "activation" | "expiration" | "renewal" | "revoke"
│   │   ├── tier: string
│   │   ├── source: string
│   │   ├── timestamp: number
│   │   └── metadata: object
│   │
│   └── stats/
│       ├── totalUsers: number
│       ├── activeUsers: number
│       ├── byTier: { basic, pro, ultra }
│       └── bySource: { kofi, topgg, dbl, code, manual }
```

---

## 2. TIPOS TYPESCRIPT

### Archivo: `src/types/Premium.ts` (NUEVO)

Enums y tipos principales:
- `PremiumTier`: BASIC, PRO, ULTRA
- `PremiumType`: PERMANENT, TEMPORARY
- `PremiumSource`: KOFI, TOPGG, DBL, CODE, MANUAL
- `TransactionType`: ACTIVATION, EXPIRATION, RENEWAL, REVOKE

Interfaces:
- `PremiumUser` - Datos del usuario premium
- `PremiumCode` - Estructura de códigos de canje
- `PremiumTransaction` - Logs de transacciones
- `PremiumStats` - Estadísticas globales
- `PremiumStatus` - Estado actual de un usuario
- `CreateCodeOptions` - Opciones para crear códigos
- `GrantPremiumOptions` - Opciones para otorgar premium
- `PremiumValidationResult` - Resultado de validación
- Payloads de webhooks (Ko-fi, Top.gg, DBL)

---

## 3. MANAGERS

### 3.1 PremiumManager (`src/managers/PremiumManager.ts`)

**Patrón:** Similar a WarnManager, recibe FirebaseAdminManager en constructor

**Métodos principales:**
```typescript
// Verificación
async hasPremium(userId: string): Promise<boolean>
async getPremiumStatus(userId: string): Promise<PremiumStatus>
async canUseCommand(userId: string, requiredTier: PremiumTier): Promise<PremiumValidationResult>

// Gestión
async grantPremium(options: GrantPremiumOptions): Promise<boolean>
async revokePremium(userId: string, adminId: string, reason?: string): Promise<boolean>

// Expiración (cron cada hora)
async checkExpiredUsers(): Promise<string[]>
async startExpirationChecker(): void
async checkUpcomingExpirations(): Promise<void>

// Estadísticas
async getStats(): Promise<PremiumStats>
```

**Responsabilidades:**
- Verificar estado premium de usuarios
- Otorgar y revocar premium
- Gestionar expiración automática
- Enviar notificaciones de expiración (3 días, 1 día, expirado)
- Mantener estadísticas actualizadas
- Aplicar cooldowns reducidos según tier

### 3.2 RedeemCodeManager (`src/managers/RedeemCodeManager.ts`)

**Métodos principales:**
```typescript
async generateCode(options: CreateCodeOptions): Promise<PremiumCode>
async generateRandomCode(length?: number): Promise<string>
async validateCode(code: string): Promise<{ valid: boolean; reason?: string }>
async redeemCode(code: string, userId: string): Promise<{ success: boolean; tier?: PremiumTier }>
async getActiveCodes(): Promise<PremiumCode[]>
async deleteCode(code: string): Promise<boolean>
```

**Características:**
- Generación segura con `crypto.randomBytes()`
- Formato: `TIER-XXX-XXX-XXX` (ej: `ULTRA-A3F-B2D-9C1`)
- Rate limiting: máx 5 intentos/hora por usuario
- Validación de un solo uso

### 3.3 DonationManager (`src/managers/DonationManager.ts`)

**Métodos principales:**
```typescript
async processKofiWebhook(payload: KofiWebhookPayload): Promise<boolean>
async mapAmountToTier(amount: number): Promise<{ tier: PremiumTier; duration: number | null }>
async findUserByEmail(email: string): Promise<string | null>
async notifyDonation(userId: string, tier: PremiumTier, duration: number | null): Promise<void>
```

**Mapeo de donaciones (configuración económica):**
- $3-4.99 → Básico 30 días
- $5-9.99 → Pro 30 días
- $10-24.99 → Ultra 30 días
- $25+ → Ultra permanente

### 3.4 VoteManager (`src/managers/VoteManager.ts`)

**Métodos principales:**
```typescript
async processTopggVote(payload: TopggWebhookPayload): Promise<boolean>
async processDBLVote(payload: DblWebhookPayload): Promise<boolean>
async grantVotePremium(userId: string, platform: string): Promise<boolean>
async extendExistingPremium(userId: string, hours: number): Promise<boolean>
```

**Configuración de votaciones:**
- Duración: 12 horas por voto
- Tier: Básico
- Si ya tiene premium, extiende la duración

---

## 4. SISTEMA DE VALIDACIÓN

### 4.1 Helper: `src/utils/premiumHelpers.ts`

Funciones auxiliares:
```typescript
async checkPremiumAccess(userId: string, requiredTier: PremiumTier, client: BotClient): Promise<PremiumValidationResult>
function compareTiers(tier1: PremiumTier, tier2: PremiumTier): number
function hasSufficientTier(userTier: PremiumTier, requiredTier: PremiumTier): boolean
function getTierEmoji(tier: PremiumTier): string
function getTierColor(tier: PremiumTier): number
function formatTimeRemaining(expiresAt: number): string
function calculateCooldownReduction(tier: PremiumTier): number // -25%, -50%, -75%
```

### 4.2 Embeds: `src/utils/premiumEmbeds.ts`

Embeds predefinidos:
```typescript
function createPremiumRequiredEmbed(requiredTier: PremiumTier, currentTier?: PremiumTier): EmbedBuilder
function createPremiumStatusEmbed(status: PremiumStatus): EmbedBuilder
function createPremiumInfoEmbed(): EmbedBuilder
function createCodeRedeemedEmbed(tier: PremiumTier, duration: number | null): EmbedBuilder
function createPremiumActivatedEmbed(tier: PremiumTier, source: string): EmbedBuilder
function createPremiumExpiringEmbed(expiresAt: number, tier: PremiumTier): EmbedBuilder
function createPremiumExpiredEmbed(tier: PremiumTier): EmbedBuilder
```

### 4.3 Integración en eventos

**Modificar `src/events/interactionCreate.ts` (después de cooldown, línea ~93):**
```typescript
// Verificar si el comando requiere premium
if ('premiumTier' in command && command.premiumTier) {
    const premiumCheck = await checkPremiumAccess(
        interaction.user.id,
        command.premiumTier,
        client
    );

    if (!premiumCheck.hasAccess) {
        const embed = createPremiumRequiredEmbed(
            command.premiumTier,
            premiumCheck.currentTier
        );
        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
        return;
    }
}
```

**Modificar cooldown en `src/managers/CooldownManager.ts`:**
Agregar método para aplicar reducción según tier premium del usuario.

**Modificar `src/events/messageCreate.ts`:**
Similar verificación de premium para comandos con prefijo.

### 4.4 Modificar tipos de Command

**En `src/types/Command.ts`, agregar a `BaseCommand` (línea ~24):**
```typescript
interface BaseCommand {
    name: string;
    description: string;
    category: CommandCategory;
    premiumTier?: PremiumTier; // NUEVA PROPIEDAD
}
```

---

## 5. COMANDOS DE USUARIO

### 5.1 Comando `/premium` (`src/commands/utility/premium.ts`)

**Tipo:** HybridCommand

**Subcomandos:**

1. **`/premium status`** - Ver estado premium personal
   - Muestra tier, tipo (permanente/temporal), fecha de expiración
   - Lista de beneficios activos
   - Fuente de activación

2. **`/premium info`** - Información sobre tiers
   - Comparación de los 3 tiers
   - Beneficios por tier
   - Métodos para obtener premium
   - Links a Ko-fi, Top.gg, DBL

3. **`/premium redeem <código>`** - Canjear código
   - Validación del código
   - Rate limiting (5 intentos/hora)
   - Activación automática
   - Mensaje de celebración

**También funciona con prefijo:**
- `*premium status`
- `*premium info`
- `*premium redeem ULTRA-ABC-123`

---

## 6. COMANDOS DE ADMINISTRACIÓN

### 6.1 Extensión de `*dev premium` (`src/commands/developer/dev.ts`)

**Agregar case 'premium' al switch existente (línea ~33):**

**Subcomandos:**

1. **`*dev premium grant @usuario <tier> [duración]`**
   - Otorga premium manualmente
   - Duración en días o "permanent"
   - Ejemplo: `*dev premium grant @User ultra 30`

2. **`*dev premium revoke @usuario [razón]`**
   - Revoca premium de un usuario
   - Registra razón en transacciones

3. **`*dev premium check @usuario`**
   - Estado premium detallado
   - Historial de transacciones

4. **`*dev premium generate <tier> <tipo> [opciones]`**
   - Genera código de canje
   - Opciones: `--duration 30d`, `--code CUSTOM123`
   - Ejemplo: `*dev premium generate ultra temp --duration 30d`

5. **`*dev premium codes [filtro]`**
   - Lista códigos: `active`, `used`, `expired`, `all`

6. **`*dev premium delete-code <código>`**
   - Elimina código no usado

7. **`*dev premium stats`**
   - Estadísticas del sistema premium

8. **`*dev premium expiring [días]`**
   - Lista usuarios con premium por expirar

---

## 7. SISTEMA DE WEBHOOKS

### 7.1 Servidor Express (`src/server/webhookServer.ts`)

**Nuevo servidor HTTP para webhooks:**

```typescript
export class WebhookServer {
    private app: Express;
    private server: http.Server | null = null;

    constructor(client: BotClient, port: number = 3000)

    // Rutas
    app.get('/health')                    // Health check
    app.post('/webhooks/kofi')            // Ko-fi donations
    app.post('/webhooks/topgg')           // Top.gg votes
    app.post('/webhooks/dbl')             // DBL votes

    async start(): Promise<void>
    async stop(): Promise<void>
}
```

**Seguridad:**
- Validar tokens de verificación
- Rate limiting: 10 req/min por IP
- Logs completos de todas las solicitudes
- CORS configurado

### 7.2 Variables de entorno

**Agregar a `.env.example` y `src/config.ts`:**
```env
# Premium System
KOFI_VERIFICATION_TOKEN=tu_token_kofi
TOPGG_WEBHOOK_SECRET=tu_secret_topgg
DBL_WEBHOOK_SECRET=tu_secret_dbl
WEBHOOK_SERVER_PORT=3000
ENABLE_WEBHOOK_SERVER=true
PREMIUM_LOG_CHANNEL_ID=id_del_canal
```

---

## 8. SISTEMA DE NOTIFICACIONES

### 8.1 Notificaciones a usuarios (DM)

1. **Premium activado** - Mensaje de bienvenida con beneficios
2. **3 días para expirar** - Recordatorio con opciones de renovación
3. **1 día para expirar** - Recordatorio urgente
4. **Premium expirado** - Mensaje de agradecimiento + opciones

### 8.2 Notificaciones a desarrolladores

**Canal de logs (configurable):**
- Nueva donación (usuario, cantidad, tier)
- Nuevo voto (usuario, plataforma)
- Código canjeado (usuario, código, tier)
- Premium expirado (usuario, tier)

### 8.3 Checker automático (Cron)

**En `PremiumManager.startExpirationChecker()`:**
- Ejecuta cada hora
- Revoca premium expirado
- Envía notificaciones pendientes (3 días, 1 día)
- Actualiza estadísticas

---

## 9. COMANDOS PREMIUM DE EJEMPLO

### 9.1 Premium Stats (`src/commands/utility/premium-stats.ts`)

**Tipo:** SlashOnlyCommand
**Tier requerido:** BASIC
**Descripción:** Estadísticas avanzadas del servidor

### 9.2 AI Generate (`src/commands/custom/ai-generate.ts`)

**Tipo:** SlashOnlyCommand
**Tier requerido:** PRO
**Descripción:** Generación de contenido con IA avanzada

### 9.3 Custom Unlimited (`src/commands/utility/custom-unlimited.ts`)

**Tipo:** HybridCommand
**Tier requerido:** ULTRA
**Descripción:** Comandos personalizados ilimitados (sin límite de 10)

---

## 10. ARCHIVOS A CREAR (15)

### Types
1. `src/types/Premium.ts`

### Managers
2. `src/managers/PremiumManager.ts`
3. `src/managers/RedeemCodeManager.ts`
4. `src/managers/DonationManager.ts`
5. `src/managers/VoteManager.ts`

### Server
6. `src/server/webhookServer.ts`

### Utils
7. `src/utils/premiumHelpers.ts`
8. `src/utils/premiumEmbeds.ts`

### Comandos
9. `src/commands/utility/premium.ts`
10. `src/commands/utility/premium-stats.ts`
11. `src/commands/custom/ai-generate.ts`
12. `src/commands/utility/custom-unlimited.ts`

### Documentación
13. `PREMIUM_SYSTEM.md` - Guía completa del sistema
14. `PREMIUM_SETUP.md` - Configuración de webhooks
15. `PREMIUM_USER_GUIDE.md` - Guía para usuarios

---

## 11. ARCHIVOS A MODIFICAR (9)

1. **`src/types/BotClient.ts`**
   - Agregar: `premiumManager`, `redeemCodeManager`, `donationManager`, `voteManager`, `webhookServer`

2. **`src/types/Command.ts`** (línea ~24)
   - Agregar `premiumTier?: PremiumTier` a `BaseCommand`

3. **`src/index.ts`**
   - Inicializar todos los managers de premium
   - Iniciar checker de expiraciones
   - Iniciar servidor de webhooks (si está habilitado)

4. **`src/events/interactionCreate.ts`** (después de línea ~93)
   - Agregar verificación de premium antes de ejecutar comandos

5. **`src/events/messageCreate.ts`**
   - Similar verificación para comandos con prefijo

6. **`src/commands/developer/dev.ts`** (línea ~33)
   - Agregar case 'premium' con todos los subcomandos administrativos

7. **`src/config.ts`**
   - Agregar variables de entorno del sistema premium

8. **`src/utils/constants.ts`**
   - Agregar constantes de premium (colores, emojis, duraciones)

9. **`package.json`**
   - Agregar dependencias: `express`, `@types/express`

---

## 12. ORDEN DE IMPLEMENTACIÓN

### FASE 1: Fundamentos (Paso 1-3)

**Paso 1: Types y configuración**
- Crear `src/types/Premium.ts`
- Modificar `src/types/Command.ts`
- Modificar `src/types/BotClient.ts`
- Actualizar `src/config.ts`
- Actualizar `src/utils/constants.ts`
- Instalar dependencias: `npm install express @types/express`

**Paso 2: Manager principal**
- Crear `src/managers/PremiumManager.ts`
- Implementar verificación, otorgar/revocar, expiración

**Paso 3: Sistema de validación**
- Crear `src/utils/premiumHelpers.ts`
- Crear `src/utils/premiumEmbeds.ts`
- Modificar `src/events/interactionCreate.ts`
- Modificar `src/events/messageCreate.ts`

### FASE 2: Códigos de canje (Paso 4-5)

**Paso 4: RedeemCodeManager**
- Crear `src/managers/RedeemCodeManager.ts`
- Generación segura, validación, canje

**Paso 5: Comando de usuario**
- Crear `src/commands/utility/premium.ts`
- Implementar `status`, `info`, `redeem`

### FASE 3: Administración (Paso 6)

**Paso 6: Comandos de dev**
- Modificar `src/commands/developer/dev.ts`
- Implementar todos los subcomandos de gestión

### FASE 4: Webhooks (Paso 7-9)

**Paso 7: Servidor Express**
- Crear `src/server/webhookServer.ts`
- Rutas y validación de seguridad

**Paso 8: Donation Manager**
- Crear `src/managers/DonationManager.ts`
- Procesar Ko-fi, mapeo a tiers

**Paso 9: Vote Manager**
- Crear `src/managers/VoteManager.ts`
- Procesar Top.gg y DBL

### FASE 5: Notificaciones (Paso 10)

**Paso 10: Sistema de notificaciones**
- Implementar DMs a usuarios
- Implementar logs a canal de devs
- Configurar checker automático (cron)

### FASE 6: Comandos premium (Paso 11)

**Paso 11: Comandos de ejemplo**
- Crear `premium-stats.ts` (Básico)
- Crear `ai-generate.ts` (Pro)
- Crear `custom-unlimited.ts` (Ultra)

### FASE 7: Integración final (Paso 12-13)

**Paso 12: Inicialización**
- Modificar `src/index.ts`
- Inicializar todos los managers
- Iniciar servicios

**Paso 13: Documentación y testing**
- Crear archivos `.md`
- Testing completo de todos los flujos

---

## 13. ARCHIVOS CRÍTICOS PARA LEER ANTES DE IMPLEMENTAR

1. `E:\MirtZerck\Programación\Discord Bots\Hikari Koizumi 2.0\src\managers\FirebaseAdminManager.ts` - Patrón base para managers
2. `E:\MirtZerck\Programación\Discord Bots\Hikari Koizumi 2.0\src\managers\WarnManager.ts` - Ejemplo de manager completo
3. `E:\MirtZerck\Programación\Discord Bots\Hikari Koizumi 2.0\src\types\Command.ts` - Estructura de comandos
4. `E:\MirtZerck\Programación\Discord Bots\Hikari Koizumi 2.0\src\events\interactionCreate.ts` - Manejo de interacciones
5. `E:\MirtZerck\Programación\Discord Bots\Hikari Koizumi 2.0\src\commands\developer\dev.ts` - Patrón de comandos dev

---

## 14. CONSIDERACIONES DE SEGURIDAD

### Validación de webhooks
- Ko-fi: Verificar `verification_token` siempre
- Top.gg/DBL: Verificar header `Authorization`
- Rate limiting: 10 req/min por IP
- Logs completos de intentos

### Protección de códigos
- `crypto.randomBytes()` para generación
- Rate limiting: 5 intentos/hora por usuario
- Transacciones atómicas en Firebase

### Protección de datos
- Acceso solo desde Admin SDK (backend)
- Nunca exponer tokens en cliente
- Reglas de Firebase: `.read: false, .write: false` en `premium/`

---

## 15. CONSIDERACIONES DE UX

### Mensajes claros
- Nunca decir solo "Error: PREMIUM_REQUIRED"
- Siempre explicar qué tier se necesita
- Siempre mostrar cómo conseguir premium
- Usar emojis para claridad visual

### Notificaciones no intrusivas
- Máximo 1 notificación cada 3 días antes de expirar
- 1 notificación el día antes
- 1 notificación al expirar
- Nunca spam diario

### Transparencia total
- Mostrar exactamente qué incluye cada tier
- Comparación clara entre tiers
- Beneficios visibles siempre en `/premium info`

---

## RESUMEN

Este plan implementa un sistema completo de premium que:
- Se integra perfectamente con la arquitectura existente
- Usa patrones establecidos del proyecto (Manager pattern, Firebase)
- Mantiene TypeScript estricto
- Tiene verificación de seguridad robusta
- Proporciona excelente UX
- Es escalable y fácil de mantener

El sistema está listo para implementarse paso a paso siguiendo las fases descritas.
