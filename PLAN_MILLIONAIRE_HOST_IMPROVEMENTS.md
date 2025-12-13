# Plan de Mejoras: Rol del Anfitrión en Millonario

## Análisis del Estado Actual

### Modo Sin Anfitrión (Automático)
- ✅ Pregunta aparece inmediatamente con todas las opciones
- ✅ Contador de 3 minutos comienza automáticamente
- ✅ Jugador selecciona respuesta directamente
- ✅ Resultado se muestra inmediatamente

### Modo Con Anfitrión (Actual)
- ⚠️ Anfitrión solo recibe la pregunta y respuesta correcta por DM
- ⚠️ Pregunta aparece igual que en modo automático
- ⚠️ Anfitrión no tiene control sobre el flujo del juego
- ⚠️ Anfitrión no puede interactuar con el jugador
- ❌ **Problema**: El anfitrión es solo un espectador con información privilegiada

## Objetivos de Mejora

1. **Dar control al anfitrión** sobre el ritmo del juego
2. **Crear momentos de tensión** como en el programa original
3. **Permitir interacción** anfitrión-jugador
4. **Mantener la experiencia** entretenida para espectadores

## Inspiración del Programa Original

### Elementos Clave del Anfitrión
1. **Lee la pregunta** dramáticamente
2. **Revela opciones** una por una (A... B... C... D...)
3. **Pregunta "¿Respuesta final?"** antes de validar
4. **Crea pausas** para aumentar la tensión
5. **Comenta** sobre el progreso del jugador
6. **Explica** la respuesta correcta/incorrecta
7. **Anuncia** el monto ganado

## Propuesta de Flujo Mejorado

### Fase 1: Presentación de la Pregunta

```
┌─────────────────────────────────────────┐
│ Panel del Anfitrión (DM)                │
├─────────────────────────────────────────┤
│ 📋 PREGUNTA 7 - $4,000                  │
│                                         │
│ Pregunta: ¿Cuál es el símbolo...?      │
│ Correcta: A) Au                         │
│                                         │
│ [🎬 Leer Pregunta] [⏭️ Saltar Intro]   │
└─────────────────────────────────────────┘
```

**Cuando presiona "Leer Pregunta":**

```
Canal Principal:
┌─────────────────────────────────────────┐
│ 💰 PREGUNTA 7 - $4,000 💰               │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                         │
│ 🎬 Anfitrión está leyendo la pregunta...│
│                                         │
│ Esperando...                            │
└─────────────────────────────────────────┘
```

### Fase 2: Revelación de la Pregunta

**Anfitrión presiona "Revelar Pregunta" en su DM:**

```
Canal Principal:
┌─────────────────────────────────────────┐
│ 💰 PREGUNTA 7 - $4,000 💰               │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ 🟡 Categoría: Ciencia                   │
│                                         │
│ ¿Cuál es el símbolo químico del oro?    │
│                                         │
│ 🎬 Anfitrión revelará las opciones...   │
└─────────────────────────────────────────┘
```

### Fase 3: Revelación de Opciones (Una por Una)

**Opción 1: Automática (Recomendada)**
- Anfitrión presiona "Revelar Opciones"
- Opciones aparecen cada 2 segundos automáticamente

**Opción 2: Manual**
- Anfitrión presiona un botón para cada opción

```
Panel Anfitrión:
[A ✓] [B ⏸️] [C ⏸️] [D ⏸️]
[🎯 Auto-Revelar Todas] [⏭️ Mostrar Todo Ya]
```

```
Canal (Progresivo):

Paso 1:
│ A) Au                                   │

Paso 2 (+2s):
│ A) Au                                   │
│ B) Ag                                   │

Paso 3 (+2s):
│ A) Au                                   │
│ B) Ag                                   │
│ C) Fe                                   │

Paso 4 (+2s):
│ A) Au                                   │
│ B) Ag                                   │
│ C) Fe                                   │
│ D) Pb                                   │
│                                         │
│ ⏱️ Tiempo: <t:TIMESTAMP:R>             │
│ 🏦 Punto seguro: $1,000                │
│                                         │
│ [A] [B] [C] [D]                        │
│ [50:50] [📊] [📞] [🔄]                 │
│ [💰 Retirarse] [❌ Abandonar]          │
└─────────────────────────────────────────┘
```

### Fase 4: Jugador Selecciona Respuesta

**Cuando el jugador presiona una opción:**

```
Canal Principal:
┌─────────────────────────────────────────┐
│ 🤔 @Jugador ha seleccionado una opción  │
│                                         │
│ 🎬 Esperando confirmación del anfitrión...│
└─────────────────────────────────────────┘
```

```
Panel Anfitrión (DM):
┌─────────────────────────────────────────┐
│ ⚠️ JUGADOR SELECCIONÓ: B                │
│                                         │
│ Respuesta correcta: A ❌                │
│                                         │
│ [❓ "¿Respuesta Final?"]                │
│ [✅ Validar Directamente]               │
│ [🔙 Permitir Cambio]                    │
└─────────────────────────────────────────┘
```

### Fase 5: Confirmación "¿Respuesta Final?"

**Anfitrión presiona "¿Respuesta Final?":**

```
Canal Principal:
┌─────────────────────────────────────────┐
│ 🎬 Anfitrión: "@Jugador, has elegido    │
│    la opción B... ¿Es tu respuesta      │
│    final?"                              │
│                                         │
│ [✅ Sí, respuesta final]                │
│ [🔄 No, quiero cambiar]                 │
└─────────────────────────────────────────┘
```

**Si jugador confirma:**
- Anfitrión puede añadir pausa dramática
- Anfitrión revela si es correcta o incorrecta

**Si jugador cambia:**
- Puede seleccionar otra opción
- Proceso se repite

### Fase 6: Revelación del Resultado

**Panel Anfitrión:**
```
┌─────────────────────────────────────────┐
│ Jugador confirmó: B                     │
│ Respuesta correcta: A                   │
│                                         │
│ [😔 Revelar Incorrecta]                 │
│ [⏱️ Crear Suspenso (5s)]               │
└─────────────────────────────────────────┘
```

**Con suspenso:**
```
Canal Principal:
┌─────────────────────────────────────────┐
│ 🎬 Veamos si es correcta...             │
│                                         │
│ ⏱️ ...                                  │
└─────────────────────────────────────────┘

(Después de 5s)

┌─────────────────────────────────────────┐
│ ❌ RESPUESTA INCORRECTA                 │
│                                         │
│ La respuesta correcta era: A) Au        │
│                                         │
│ 🎬 Anfitrión: "Lo siento @Jugador,      │
│    la respuesta correcta era A.         │
│    Te llevas $1,000."                   │
└─────────────────────────────────────────┘
```

## Implementación Técnica

### Nuevas Estructuras de Estado

```typescript
interface MillionaireGameRoom {
    // ... propiedades existentes ...

    // Nuevas propiedades para modo anfitrión
    hostMode?: 'auto' | 'full_control';
    questionRevealed?: boolean;
    optionsRevealed?: number; // 0-4, cuántas opciones se revelaron
    playerSelectedAnswer?: string;
    awaitingFinalAnswer?: boolean;
    hostPaused?: boolean;
}
```

### Panel de Control del Anfitrión

**Estados del Panel:**

1. **WAITING_QUESTION_READ** (Inicial)
   - Botones: `[Leer Pregunta]` `[Saltar al Final]`

2. **QUESTION_READ** (Después de leer)
   - Botones: `[Revelar Pregunta]`

3. **QUESTION_REVEALED** (Pregunta visible)
   - Botones: `[Revelar Opciones (Auto)]` `[Revelar Manual]`

4. **OPTIONS_REVEALING** (Mostrando opciones)
   - Automático: Muestra progreso "2/4 opciones reveladas..."
   - Manual: Botones `[Opción A]` `[Opción B]` `[Opción C]` `[Opción D]`

5. **WAITING_PLAYER** (Todas las opciones visibles)
   - Mensaje: "Esperando respuesta del jugador..."
   - Botones: `[⏸️ Pausar Tiempo]` `[💬 Mensaje Aliento]`

6. **PLAYER_SELECTED** (Jugador seleccionó)
   - Mensaje: "Jugador seleccionó: X (❌/✅)"
   - Botones: `[¿Respuesta Final?]` `[Validar Ya]` `[Permitir Cambio]`

7. **AWAITING_CONFIRMATION** (Preguntó "¿final?")
   - Mensaje: "Esperando confirmación..."

8. **READY_TO_REVEAL** (Confirmado)
   - Botones: `[Revelar Correcta ✅]` `[Revelar Incorrecta ❌]` `[Suspenso 5s]`

### Funciones Clave

```typescript
// Manejo del flujo del anfitrión
async function handleHostControl(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    action: HostAction
): Promise<void>

// Actualizar panel del anfitrión
async function updateHostPanel(
    room: MillionaireGameRoom,
    state: HostPanelState
): Promise<void>

// Revelar opciones progresivamente
async function revealOptionsProgressively(
    room: MillionaireGameRoom,
    auto: boolean
): Promise<void>

// Confirmar respuesta final
async function askFinalAnswer(
    room: MillionaireGameRoom,
    selectedAnswer: string
): Promise<void>

// Crear suspenso antes de revelar
async function createSuspense(
    room: MillionaireGameRoom,
    duration: number
): Promise<void>
```

### Timeouts y Control de Tiempo

**Comportamiento del Tiempo:**

1. **Sin Anfitrión**:
   - Contador inicia al mostrar pregunta
   - 3 minutos totales

2. **Con Anfitrión (Modo Rápido)**:
   - Contador inicia al revelar todas las opciones
   - 3 minutos desde ese momento
   - Anfitrión puede pausar/reanudar (máx 2 pausas de 30s)

3. **Con Anfitrión (Modo Completo)**:
   - Sin límite de tiempo para lectura/revelación
   - Contador inicia cuando aparecen botones de respuesta
   - 3 minutos para responder
   - Anfitrión puede pausar para comentar

```typescript
interface TimeControl {
    startedAt?: number;
    pausedAt?: number;
    pausedTotal: number; // tiempo total en pausa
    maxPauseDuration: 60000; // 1 min máximo
    pausesRemaining: 2;
}
```

## Opciones de Configuración

### Nivel 1: Modo Rápido con Anfitrión
- Anfitrión solo pregunta "¿Respuesta final?"
- Todo lo demás es automático
- **Más sencillo de implementar**
- Añade algo de tensión sin complicar

### Nivel 2: Modo Narrativo
- Anfitrión controla revelación de pregunta
- Opciones se revelan automáticamente (2s cada una)
- Anfitrión pregunta "¿Respuesta final?"
- Anfitrión controla revelación del resultado

### Nivel 3: Modo Control Total
- Anfitrión controla cada paso
- Revelación manual de opciones
- Mensajes personalizados del anfitrión
- Pausas dramáticas configurables
- **Más complejo pero muy inmersivo**

## Comandos de Configuración Sugeridos

```typescript
/millionaire crear [modo_anfitrion:string]
// Opciones:
// - "ninguno" (default)
// - "rapido" (solo confirmación final)
// - "narrativo" (revelación automática + confirmación)
// - "completo" (control total)
```

## Mensajes Predefinidos del Anfitrión

Para añadir personalidad sin que el anfitrión escriba:

```typescript
const HOST_MESSAGES = {
    // Inicios de pregunta
    questionIntros: [
        "Veamos la siguiente pregunta...",
        "Muy bien, ahora viene una pregunta de {category}...",
        "Atención, pregunta por ${amount}...",
    ],

    // Después de seleccionar
    afterSelection: [
        "Has elegido {option}...",
        "Interesante elección...",
        "Veamos si es correcta...",
    ],

    // Respuestas finales
    askingFinal: [
        "¿Es tu respuesta final?",
        "¿Estás seguro de {option}?",
        "¿Definitivamente {option}?",
    ],

    // Correctas
    correctReveal: [
        "¡Correcto! Has ganado ${amount}!",
        "¡Excelente! La respuesta correcta era {answer}",
        "¡Así se hace! ${amount} son tuyos",
    ],

    // Incorrectas
    incorrectReveal: [
        "Lo siento, la respuesta correcta era {answer}...",
        "Incorrecto. Te llevas ${amount}",
        "No es correcta. La respuesta era {answer}",
    ]
};
```

## Compatibilidad con Comodines

### 50:50
- **Sin anfitrión**: Elimina 2 opciones inmediatamente
- **Con anfitrión**:
  - Anfitrión recibe notificación
  - Anfitrión dice algo como "Vamos a eliminar dos respuestas incorrectas..."
  - Eliminación con pausa de 2s

### Preguntar al Público
- **Sin anfitrión**: Votación de 30s
- **Con anfitrión**:
  - Anfitrión anuncia "Vamos a preguntar al público..."
  - Votación procede igual
  - Anfitrión lee resultados dramáticamente
  - Puede comentar sobre las respuestas

### Llamar a un Amigo
- **Sin anfitrión**: Selector + espera respuesta
- **Con anfitrión**:
  - Anfitrión anuncia "¿A quién quieres llamar?"
  - Jugador selecciona
  - Anfitrión dice "Llamando a {friend}..."
  - Espera respuesta
  - Anfitrión lee la respuesta del amigo

### Cambiar Pregunta
- **Sin anfitrión**: Nueva pregunta directa
- **Con anfitrión**:
  - Anfitrión anuncia "Vamos a cambiar de pregunta..."
  - Pausa de 3s
  - Anfitrión presenta nueva pregunta con mismo flujo

## Consideraciones UX

### ✅ Ventajas
1. **Mucho más inmersivo** y parecido al programa
2. **Aumenta la tensión** dramática
3. **Mejor para streams** o juegos en vivo
4. **Rol significativo** para el anfitrión
5. **Más entretenido** para espectadores

### ⚠️ Desafíos
1. **Requiere anfitrión activo** y disponible
2. **Juego más largo** (puede ser 2-3x más lento)
3. **Más complejo** de implementar
4. **Puede frustrarse** si anfitrión se desconecta
5. **Necesita buenos anfitriones** para ser divertido

### 🔧 Mitigaciones
1. **Timeout de anfitrión**: Si no responde en 30s, modo auto
2. **Botón de emergencia**: "Pasar a modo automático"
3. **Configuración de ritmo**: Anfitrión puede elegir velocidad
4. **Sugerencias visuales**: Panel muestra qué hacer siguiente
5. **Plantillas de mensajes**: Botones rápidos en lugar de escribir

## Plan de Implementación

### Fase 1: Modo Rápido (1-2 días)
- ✅ Panel básico del anfitrión
- ✅ Confirmación "¿Respuesta final?"
- ✅ Control de revelación de resultado
- **Objetivo**: Funcional básico

### Fase 2: Modo Narrativo (3-4 días)
- ✅ Control de revelación de pregunta
- ✅ Revelación automática de opciones
- ✅ Mensajes predefinidos
- ✅ Pausas de suspenso
- **Objetivo**: Experiencia mejorada

### Fase 3: Modo Completo (5-7 días)
- ✅ Revelación manual de opciones
- ✅ Control total de tiempo
- ✅ Integración completa de comodines
- ✅ Mensajes personalizables
- **Objetivo**: Experiencia premium

### Fase 4: Pulido (2-3 días)
- ✅ Manejo de desconexiones
- ✅ Modo emergencia automático
- ✅ Estadísticas del anfitrión
- ✅ Tutorial para anfitriones nuevos
- **Objetivo**: Producción

## Prototipo de Flujo Visual

```
                    ┌──────────────────┐
                    │ Juego Comienza   │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ ¿Tiene Anfitrión?│
                    └────┬────────┬────┘
                         │        │
                      NO │        │ SÍ
                         │        │
          ┌──────────────▼──┐  ┌──▼───────────────────┐
          │ Modo Automático │  │ Panel Anfitrión Activo│
          │ (Actual)        │  │ Estado: WAITING_READ  │
          └──────────────────┘  └──┬────────────────────┘
                                   │
                         ┌─────────▼──────────┐
                         │ Anfitrión: [Leer]  │
                         └─────────┬──────────┘
                                   │
                         ┌─────────▼──────────────┐
                         │ Canal: "Leyendo..."    │
                         │ Panel: QUESTION_READ   │
                         └─────────┬──────────────┘
                                   │
                         ┌─────────▼────────────────┐
                         │ Anfitrión: [Revelar Q]   │
                         └─────────┬────────────────┘
                                   │
                         ┌─────────▼────────────────┐
                         │ Canal: Muestra Pregunta  │
                         │ Panel: QUESTION_REVEALED │
                         └─────────┬────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ Anfitrión: [Revelar Opc]   │
                    │ Auto o Manual              │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ Opciones Aparecen          │
                    │ (Progresivamente)          │
                    │ ⏱️ Contador INICIA        │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ Jugador Selecciona         │
                    │ Panel: PLAYER_SELECTED     │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ Anfitrión: [¿Final?]       │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ Jugador: [✅ Sí] [🔄 No]  │
                    └──────┬──────────────────────┘
                           │
                  ┌────────▼────────┐
                  │ Confirmó: SÍ    │
                  └────────┬────────┘
                           │
            ┌──────────────▼──────────────┐
            │ Anfitrión: [Revelar]        │
            │ Opción: [Suspenso 5s]       │
            └──────────────┬──────────────┘
                           │
            ┌──────────────▼──────────────┐
            │ Resultado Mostrado          │
            │ (Correcto/Incorrecto)       │
            └──────────────┬──────────────┘
                           │
                  ┌────────▼────────┐
                  │ ¿Continuar?     │
                  │ o Fin del Juego │
                  └─────────────────┘
```

## Conclusión

Este sistema transforma el modo anfitrión de una característica cosmética a una **experiencia interactiva completa** que replica fielmente el programa original. La implementación por fases permite ir agregando funcionalidad gradualmente mientras se prueba cada nivel de complejidad.

### Recomendación de Inicio
Comenzar con **Fase 1: Modo Rápido**, que solo requiere:
- Panel de anfitrión mejorado
- Confirmación "¿Respuesta final?"
- Control de revelación

Esto ya añade **80% del valor** con solo **20% de la complejidad**.

---

## 📊 Progreso de Implementación

### ✅ Fase 1: Modo Rápido (COMPLETADA)
**Fecha de completación:** 12 de Diciembre, 2025

#### Funcionalidades Implementadas:

1. **Interfaces y Estructuras de Datos**
   - ✅ `playerSelectedAnswer`: Almacena la respuesta seleccionada
   - ✅ `awaitingFinalAnswer`: Flag para control de flujo
   - ✅ `hostPanelMessage`: Referencia al panel del anfitrión

2. **Flujo con Anfitrión**
   - ✅ Detección automática: Si hay anfitrión, usa flujo mejorado
   - ✅ `handleAnswerWithHost()`: Maneja selección con anfitrión
   - ✅ Sin anfitrión mantiene comportamiento original

3. **Panel de Control del Anfitrión**
   - ✅ `updateHostPanelWithSelection()`: Muestra selección del jugador
   - ✅ 3 opciones de control:
     - ❓ "¿Respuesta Final?" - Pregunta al jugador
     - ✅ Validar Directamente - Salta confirmación
     - 🔄 Permitir Cambiar - Permite nueva selección

4. **Confirmación del Jugador**
   - ✅ `handleHostAskFinal()`: Pregunta "¿Respuesta final?"
   - ✅ Botones para jugador: [Sí, respuesta final] [No, quiero cambiar]
   - ✅ Timeout de 60s con fallback automático
   - ✅ `handleFinalAnswerConfirmed()`: Procesa confirmación
   - ✅ `handleFinalAnswerRejected()`: Permite cambio de respuesta

5. **Control de Revelación**
   - ✅ `updateHostPanelForReveal()`: Panel para revelar resultado
   - ✅ 2 opciones de revelación:
     - 📢 Revelar Ahora - Inmediato
     - ⏱️ Crear Suspenso (5s) - Con pausa dramática
   - ✅ `createSuspenseAndReveal()`: Genera suspenso de 5 segundos
   - ✅ `revealAnswer()`: Valida y muestra resultado

6. **Manejo de Errores**
   - ✅ Fallback a modo automático si anfitrión no responde
   - ✅ Timeouts configurables en cada paso
   - ✅ Logging de errores sin romper el juego

#### Archivos Modificados:
- `src/types/millionaire.ts` - Interfaces actualizadas
- `src/commands/games/millionaire.ts` - Lógica del modo anfitrión
  - ~370 líneas de código nuevo
  - 9 funciones nuevas

#### Resultado:
El anfitrión ahora tiene control real sobre:
- Confirmación de respuestas
- Revelación de resultados
- Creación de momentos de tensión
- Permitir cambios de decisión

---

### ✅ Fase 2: Modo Narrativo (COMPLETADA)
**Fecha de completación:** 12 de Diciembre, 2025

#### Funcionalidades Implementadas:

1. **Sistema de Estados del Panel**
   - ✅ `HostPanelState` type con 8 estados diferentes
   - ✅ `questionRevealed` y `optionsRevealed` para tracking
   - ✅ Flujo completo de estados desde inicio hasta fin

2. **Revelación Progresiva de Pregunta**
   - ✅ `displayQuestionWithHost()`: Modo especial con anfitrión
   - ✅ `displayQuestionAutomatic()`: Modo sin anfitrión (sin cambios)
   - ✅ `initializeHostPanelForQuestion()`: Panel inicial con 2 opciones
   - ✅ Botones: [📖 Leer Pregunta] [⏭️ Revelar Todo]

3. **Control de Lectura**
   - ✅ `handleHostReadQuestion()`: Modo narrativo
   - ✅ `showHostRevealQuestionPanel()`: Panel para revelar pregunta
   - ✅ `handleHostRevealQuestion()`: Muestra pregunta sin opciones
   - ✅ `handleHostSkipIntro()`: Salta al modo automático

4. **Revelación de Opciones**
   - ✅ `showHostRevealOptionsPanel()`: 2 modos de revelación
   - ✅ `handleHostRevealOptionsAuto()`: Una cada 2 segundos
   - ✅ `handleHostRevealOptionsAll()`: Todas instantáneas
   - ✅ `revealOptionsProgressively()`: Lógica de revelación

5. **Finalización**
   - ✅ `finalizeQuestionReveal()`: Activa botones y tiempo
   - ✅ Integra con sistema de respuestas de Fase 1
   - ✅ Manejo completo de collectors

#### Flujo Implementado:

```
Panel Anfitrión: [Leer Pregunta] [Revelar Todo]
       │                                  │
       │                                  └→ Modo Automático
       ↓
Canal: "Anfitrión está leyendo..."
       ↓
Panel: [Revelar Pregunta]
       ↓
Canal: Muestra solo pregunta
       ↓
Panel: [Auto (2s cada una)] [Mostrar Todas]
       │              │
       ↓              ↓
   A...         A B C D
   A B...       (instant)
   A B C...
   A B C D
       ↓
   ⏱️ Tiempo empieza
   Botones activos
       ↓
   (Continúa con Fase 1)
```

#### Archivos Modificados:
- `src/types/millionaire.ts`:
  - Añadido `HostPanelState` type
  - Propiedades: `hostPanelState`, `questionRevealed`, `optionsRevealed`

- `src/commands/games/millionaire.ts`:
  - ~450 líneas de código nuevo
  - 10 funciones nuevas para revelación progresiva
  - Integración perfecta con Fase 1

#### Resultado:
El anfitrión ahora controla:
- Cuándo se revela la pregunta
- Cómo se revelan las opciones (progresivo o todo)
- Ritmo narrativo del juego
- Opción de saltar al modo rápido

---

### ✅ Fase 3: Modo Control Total (COMPLETADA)
**Fecha de completación:** 12 de Diciembre, 2025

#### Funcionalidades Implementadas:

1. **Revelación Manual de Opciones**
   - ✅ Nuevo modo "Control Total" en panel de revelación
   - ✅ Botones individuales [Revelar A] [Revelar B] [Revelar C] [Revelar D]
   - ✅ Solo se habilita el siguiente botón (revelación secuencial)
   - ✅ Panel muestra estado: ✅ para reveladas, ⏸️ para pendientes
   - ✅ Botón "Revelar Todas Ya" para saltar al modo rápido
   - ✅ Actualización progresiva del mensaje del juego
   - ✅ Modo emergencia si host no responde en 5 minutos

2. **Control Total de Tiempo**
   - ✅ Sistema de pausa/reanudación del cronómetro
   - ✅ Máximo 2 pausas permitidas por pregunta
   - ✅ Máximo 60 segundos de tiempo pausado total
   - ✅ Tracking de tiempo pausado en `TimeControl` interface
   - ✅ Ajuste automático del cronómetro al reanudar
   - ✅ Panel muestra pausas restantes y tiempo disponible
   - ✅ Botones [⏸️ Pausar Tiempo] y [▶️ Reanudar Tiempo]
   - ✅ Notificaciones al canal cuando se pausa/reanuda

3. **Mensajes Personalizables del Anfitrión**
   - ✅ Sistema de plantillas de mensajes `HOST_MESSAGES`
   - ✅ 5 categorías de mensajes:
     - questionIntros - Introducción de pregunta
     - afterSelection - Después de selección del jugador
     - askingFinal - Confirmación "¿Respuesta final?"
     - correctReveal - Revelación de respuesta correcta
     - incorrectReveal - Revelación de respuesta incorrecta
   - ✅ 6 variaciones por categoría para diversidad
   - ✅ Sistema de reemplazo de variables {option}, {answer}, {amount}, etc.
   - ✅ Función `getHostMessage()` para selección aleatoria

4. **Modo Emergencia Automático**
   - ✅ Botón "⚠️ Modo Automático" en panel de control de tiempo
   - ✅ Activación automática si host no responde (timeout)
   - ✅ Flag `emergencyMode` en room state
   - ✅ Transición suave a modo automático
   - ✅ Notificación al canal cuando se activa
   - ✅ Configuración automática de collectors
   - ✅ Continúa juego sin intervención del anfitrión

5. **Funciones Implementadas**
   - ✅ `handleHostRevealOptionsManual()` - Entrada a modo manual
   - ✅ `showManualRevealPanel()` - Panel con botones A, B, C, D
   - ✅ `handleHostRevealSingleOption()` - Revela una opción
   - ✅ `handleHostRevealAllNow()` - Revela todas restantes
   - ✅ `updateGameMessageWithOptions()` - Actualiza mensaje progresivamente
   - ✅ `handleEmergencyReveal()` - Modo emergencia por timeout
   - ✅ `updateHostPanelWithTimeControls()` - Panel de control de tiempo
   - ✅ `handleHostPauseTime()` - Pausa el cronómetro
   - ✅ `handleHostResumeTime()` - Reanuda el cronómetro
   - ✅ `handleHostEmergencyAuto()` - Botón de emergencia manual
   - ✅ `getHostMessage()` - Obtiene mensaje personalizable

#### Archivos Modificados:

**`src/types/millionaire.ts`:**
- Añadido `RevealMode` type ('auto' | 'manual')
- Añadido `HostMessageType` type
- Añadido `TimeControl` interface con:
  - `startedAt`, `pausedAt`, `pausedTotal`
  - `maxPauseDuration`, `pausesRemaining`, `isPaused`
- Añadido `HostMessage` interface
- Añadidas propiedades a `MillionaireGameRoom`:
  - `revealMode`, `timeControl`, `emergencyMode`
  - `hostPanelCollector`
- Añadido estado `OPTIONS_REVEALING_MANUAL` a `HostPanelState`

**`src/commands/games/millionaire.ts`:**
- ~600 líneas de código nuevo
- 11 funciones nuevas para control total
- Sistema de mensajes HOST_MESSAGES con 30 variaciones
- Integración completa con sistema de collectors
- Manejo robusto de errores y timeouts

#### Flujo de Modo Control Total:

```
Panel: [🎬 Auto] [🎯 Manual] [⏭️ Todas]
              │
              ↓ (Manual)
Panel: [Revelar A] [Revelar B*] [Revelar C*] [Revelar D*] [⏭️ Todas Ya]
       (* = deshabilitado hasta que se revele el anterior)
              │
              ↓ Host presiona "Revelar A"
Canal: Muestra opción A
Panel: [Revelar B] [Revelar C*] [Revelar D*] [⏭️ Todas Ya]
              │
              ↓ Host presiona "Revelar B"
Canal: Muestra opciones A, B
Panel: [Revelar C] [Revelar D*] [⏭️ Todas Ya]
              │
              ↓ Continúa hasta revelar todas...
              ↓
Panel: ✅ Pregunta Revelada
       [⏸️ Pausar Tiempo] [⚠️ Modo Automático]
       Pausas restantes: 2 | Tiempo pausa: 1m 0s
              │
              ↓ Host pausa tiempo
Panel: ⏸️ TIEMPO EN PAUSA
       [▶️ Reanudar Tiempo] [⚠️ Modo Automático]
       Pausas restantes: 1 | Tiempo pausa: 0m 45s
              │
              ↓ Jugador selecciona respuesta
       (Continúa con flujo de Fase 1)
```

#### Control de Tiempo - Detalles Técnicos:

1. **Inicialización:**
   - Se crea `TimeControl` al revelar todas las opciones
   - `startedAt` = timestamp cuando empieza el cronómetro
   - 2 pausas disponibles, 60s total de pausa

2. **Pausa:**
   - Valida que haya pausas restantes
   - Valida que haya tiempo de pausa disponible
   - Marca `isPaused = true`, guarda `pausedAt`
   - Decrementa `pausesRemaining`
   - Notifica al canal

3. **Reanudación:**
   - Calcula duración de la pausa: `now - pausedAt`
   - Suma a `pausedTotal`
   - Ajusta `questionStartTime` sumando la duración de pausa
   - Marca `isPaused = false`
   - Notifica tiempo restante

4. **Integración con Collector:**
   - El collector del juego usa `questionStartTime`
   - Al pausar, se ajusta el tiempo para que no cuente
   - El timeout se extiende efectivamente

#### Modo Emergencia - Detalles Técnicos:

1. **Activación Automática:**
   - Timeout de 5 minutos en modo manual
   - Si no se han revelado todas las opciones al timeout
   - `handleEmergencyReveal()` se ejecuta automáticamente

2. **Activación Manual:**
   - Botón "⚠️ Modo Automático" siempre disponible
   - Permite al anfitrión abandonar control si necesita
   - No penaliza al jugador

3. **Comportamiento:**
   - Marca `emergencyMode = true`
   - Revela todas las opciones pendientes
   - Configura collectors automáticos
   - Detiene todos los collectors del host
   - Mensaje al canal notificando el cambio

#### Resultado:

El anfitrión ahora tiene **control total** sobre:
- ✅ Revelación individual de cada opción (A, B, C, D)
- ✅ Pausar/reanudar el cronómetro
- ✅ Ritmo completo del juego
- ✅ Opciones de emergencia si necesita
- ✅ Mensajes variados y naturales

El sistema es **robusto**:
- ✅ Timeouts en todos los paneles
- ✅ Validaciones de estado
- ✅ Fallback a modo automático
- ✅ No interrumpe el juego del jugador

---

### ⏳ Fase 4: Pulido (PENDIENTE)
#### Objetivos:
1. Manejo avanzado de desconexiones
2. Estadísticas del anfitrión
3. Tutorial para anfitriones
4. Optimizaciones de rendimiento
