# Plan de Implementación: Juego "¿Quién Quiere Ser Millonario?" para Discord Bot

## Resumen Ejecutivo

Implementar un juego interactivo de trivia basado en "¿Quién Quiere Ser Millonario?" con las siguientes características:
- Modo individual con opción de anfitrión (maestro de ceremonias)
- 15 preguntas de dificultad progresiva (fácil → medio → difícil)
- 4 comodines: 50:50, Pregunta al público, Llamar a un amigo, Cambiar pregunta
- Preguntas de Open Trivia Database API con imágenes mejoradas por IA
- Sistema de leaderboard persistente en Firebase
- Escalera de premios con puntos de control ($1,000 y $32,000)

## Arquitectura General

**Patrón base**: Seguir la estructura de `impostor.ts` (2,210 líneas)
- Estado en memoria con `Map<string, GameRoom>`
- Message collectors para interacciones
- Botones y select menus para UI
- Firebase para persistencia de estadísticas

## Archivos a Crear

### 1. Archivo Principal del Juego
**Ruta**: `src/commands/games/millionaire.ts` (~2,000 líneas)

Estructura:
```typescript
// Imports (discord.js, types, services, utils)
// Interface GameRoom extendida
// activeRooms Map
// Funciones de lobby (create, join, volunteer_host, start)
// Funciones de juego (displayQuestion, handleAnswer, checkAnswer)
// Implementación de 4 lifelines
// Lógica de premios y safe havens
// Manejo de modo anfitrión
// Command export (SlashOnlyCommand)
```

### 2. Servicio de Trivia
**Ruta**: `src/services/TriviaService.ts` (~350 líneas)

Responsabilidades:
- Integración con Open Trivia Database API
- Gestión de session tokens (prevenir repeticiones)
- Cache de preguntas en memoria (50 por dificultad)
- Mejora de preguntas con imágenes usando Gemini AI
- Fallback a preguntas generadas por IA si API falla

### 3. Tipos e Interfaces
**Ruta**: `src/types/millionaire.ts` (~200 líneas)

Definir:
```typescript
interface MillionaireGameRoom {
    hostId: string;
    playerId: string;
    channelId: string;
    guildId: string;
    started: boolean;
    hasHost: boolean;
    currentQuestionIndex: number; // 0-14
    currentPrize: number;
    safeHavenReached: number;
    currentQuestion?: TriviaQuestion;
    usedQuestionIds: Set<string>;
    lifelines: {
        fiftyFifty: boolean;
        askAudience: boolean;
        callFriend: boolean;
        changeQuestion: boolean;
    };
    lobbyMessage?: Message;
    gameMessage?: Message;
    timeoutId?: NodeJS.Timeout;
}

interface TriviaQuestion {
    id: string;
    question: string;
    correctAnswer: string;
    incorrectAnswers: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    imageUrl?: string;
}

interface PrizeLadder {
    level: number;
    amount: number;
    isSafeHaven: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
}

interface MillionaireStats {
    gamesPlayed: number;
    totalWinnings: number;
    highestLevel: number;
    highestWinning: number;
    lifelinesUsed: { ... };
    questionsAnswered: number;
    correctAnswers: number;
    lastPlayed: number;
}
```

### 4. Configuración de Premios
**Ruta**: `src/config/millionairePrizes.ts` (~80 líneas)

Exportar:
```typescript
export const PRIZE_LADDER: PrizeLadder[] = [
    { level: 1, amount: 100, isSafeHaven: false, difficulty: 'easy' },
    { level: 2, amount: 200, isSafeHaven: false, difficulty: 'easy' },
    { level: 3, amount: 300, isSafeHaven: false, difficulty: 'easy' },
    { level: 4, amount: 500, isSafeHaven: false, difficulty: 'easy' },
    { level: 5, amount: 1000, isSafeHaven: true, difficulty: 'easy' },
    { level: 6, amount: 2000, isSafeHaven: false, difficulty: 'medium' },
    { level: 7, amount: 4000, isSafeHaven: false, difficulty: 'medium' },
    { level: 8, amount: 8000, isSafeHaven: false, difficulty: 'medium' },
    { level: 9, amount: 16000, isSafeHaven: false, difficulty: 'medium' },
    { level: 10, amount: 32000, isSafeHaven: true, difficulty: 'medium' },
    { level: 11, amount: 64000, isSafeHaven: false, difficulty: 'hard' },
    { level: 12, amount: 125000, isSafeHaven: false, difficulty: 'hard' },
    { level: 13, amount: 250000, isSafeHaven: false, difficulty: 'hard' },
    { level: 14, amount: 500000, isSafeHaven: false, difficulty: 'hard' },
    { level: 15, amount: 1000000, isSafeHaven: false, difficulty: 'hard' }
];

// Helper functions
export function getPrizeForLevel(level: number): PrizeLadder
export function getDifficultyForLevel(level: number): string
export function getNextSafeHaven(currentLevel: number): number
```

## Archivos a Modificar

### FirebaseAdminManager.ts
**Ruta existente**: `src/managers/FirebaseAdminManager.ts`

**Añadir métodos**:
```typescript
async updateMillionaireStats(userId: string, gameData: GameEndData): Promise<void>
async getMillionaireLeaderboard(sortBy: 'totalWinnings' | 'highestLevel'): Promise<LeaderboardEntry[]>
async getPlayerMillionaireStats(userId: string): Promise<MillionaireStats | null>
```

**Esquema Firebase**:
```
millionaire/
├── leaderboard/
│   └── {userId}/
│       ├── totalWinnings
│       ├── highestLevel
│       ├── highestWinning
│       ├── gamesPlayed
│       ├── questionsAnswered
│       ├── correctAnswers
│       ├── lastPlayed
│       └── lifelines/
│           ├── fiftyFifty
│           ├── askAudience
│           ├── callFriend
│           └── changeQuestion
```

## Flujo del Juego

### Fase 1: Lobby
**Comandos**:
- `/millionaire crear [con_anfitrion:boolean]` - Crear sala
- `/millionaire unirse` - Unirse como concursante
- `/millionaire voluntario_anfitrion` - Ser anfitrión
- `/millionaire iniciar` - Comenzar juego

**UI del Lobby**:
```
🎮 ¿Quién Quiere Ser Millonario? 🎮

Modo: [Con Anfitrión / Automático]
Concursante: [Usuario] o "Esperando..."
Anfitrión: [Usuario] o "N/A"

Botones: [Unirse] [Ser Anfitrión] [Iniciar] [Cancelar]
```

### Fase 2: Preguntas
**Flujo por pregunta**:
1. Obtener pregunta de TriviaService (dificultad según nivel)
2. Si tiene host: enviar DM al anfitrión con respuesta correcta
3. Mostrar pregunta en canal con 4 botones (A, B, C, D)
4. Mostrar comodines disponibles
5. Esperar respuesta (timeout 120s)
6. Procesar respuesta:
   - Correcta → Mostrar premio ganado, botones [Continuar] [Retirarse con $X]
   - Incorrecta → Fin del juego, otorgar safe haven si aplica
7. Repetir hasta nivel 15 o error

**Display de Pregunta (Modo Automático)**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 PREGUNTA 7 - $4,000 💰
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Categoría: Ciencia
Dificultad: Media

¿Cuál es el símbolo químico del oro?

[Imagen relacionada si está disponible]

A) Au
B) Ag
C) Fe
D) Pb

⏱️ Tiempo: 2:00
Punto de control: $1,000

Comodines: [50:50] [📊 Público] [📞 Amigo] [🔄 Cambiar]
Acciones: [A] [B] [C] [D] [💰 Retirarse] [❌ Abandonar]
```

### Fase 3: Comodines

#### 1. 50:50
- Eliminar 2 respuestas incorrectas aleatoriamente
- Actualizar display con solo 2 opciones
- Marcar como usado

#### 2. Pregunta al Público
- Generar porcentajes simulados (correcto: 60-75%, resto distribuido)
- Mostrar en gráfico de barras ASCII
```
📊 RESULTADOS DE LA AUDIENCIA 📊

A) Au:     ████████████████░░ 78%
B) Ag:     ████░░░░░░░░░░░░░░ 12%
C) Fe:     ██░░░░░░░░░░░░░░░░  6%
D) Pb:     █░░░░░░░░░░░░░░░░░  4%
```

#### 3. Llamar a un Amigo
- Modal para seleccionar usuario
- Enviar DM al amigo con pregunta
- 30 segundos para responder
- Mostrar respuesta del amigo al concursante

#### 4. Cambiar Pregunta
- Fetchear nueva pregunta del mismo nivel de dificultad
- Asegurar que no esté en `usedQuestionIds`
- Reemplazar pregunta actual

### Fase 4: Modo Anfitrión

**Diferencias con modo automático**:

| Aspecto | Automático | Con Anfitrión |
|---------|-----------|---------------|
| Lectura de pregunta | Bot publica directamente | Host lee en voz alta, bot muestra al hacer clic |
| Revelación de respuesta | Automática | Host controla cuándo revelar |
| Ritmo | Timeouts fijos | Host controla el ritmo |
| Panel de control | N/A | DM privado al host con respuestas correctas |

**Panel de Control del Anfitrión (DM)**:
```
🎬 PANEL DE ANFITRIÓN 🎬

Pregunta 7 de 15 - $4,000

Pregunta: ¿Cuál es el símbolo químico del oro?
✅ Respuesta correcta: A) Au
Categoría: Ciencia

Estado: ⏸️ Esperando respuesta del concursante...

Controles:
[Revelar Pregunta] [Revelar Respuesta] [Siguiente] [Terminar Juego]
```

## Integración con APIs Externas

### Open Trivia Database
**Endpoint**: `https://opentdb.com/api.php`

**Parámetros**:
- `amount=1` - Una pregunta a la vez
- `difficulty={easy|medium|hard}` - Según nivel
- `type=multiple` - 4 opciones
- `token={session_token}` - Prevenir repeticiones

**Session Token Flow**:
1. Al crear sala: obtener token de `https://opentdb.com/api_token.php?command=request`
2. Usar token en todas las peticiones
3. Si se agota (código 4): resetear token

### Gemini AI (Mejora de Imágenes)
**Uso**: Generar query de búsqueda de imagen relevante

**Prompt**:
```
Para esta pregunta de trivia: "{question}"
Categoría: {category}

Genera una consulta de búsqueda (máximo 5 palabras) para encontrar
una imagen relevante que ayude a visualizar esta pregunta.
Responde SOLO con la consulta.
```

**Luego**: Usar Tenor API con query generado para obtener imagen/GIF

### Tenor API
**Ya configurado en el bot**: `config.tenorApiKey`

Buscar imagen relacionada con el query de Gemini y añadir `imageUrl` al embed.

## Manejo de Errores

### API Trivia Caída
1. Intentar con cache en memoria (50 preguntas/dificultad precargadas)
2. Si cache vacío: generar pregunta con Gemini AI
3. Si todo falla: terminar juego gracefully, otorgar premio actual

### Usuario Desconecta
- Timeout de 2 minutos por pregunta
- Al timeout: otorgar premio actual o safe haven
- Actualizar stats en Firebase

### Anfitrión Abandona (Modo Host)
- Ofrecer continuar en modo automático
- O terminar juego y otorgar premio actual

## Comandos Slash

```typescript
/millionaire crear [con_anfitrion:boolean]
/millionaire unirse
/millionaire voluntario_anfitrion
/millionaire iniciar
/millionaire abandonar
/millionaire clasificacion [ordenar_por:string]
/millionaire estadisticas [usuario:User]
/millionaire reglas
```

## Custom IDs de Botones

```typescript
// Respuestas
millionaire_answer_A
millionaire_answer_B
millionaire_answer_C
millionaire_answer_D

// Acciones
millionaire_cashout
millionaire_quit
millionaire_continue

// Comodines
millionaire_lifeline_5050
millionaire_lifeline_audience
millionaire_lifeline_friend
millionaire_lifeline_change

// Lobby
millionaire_join
millionaire_volunteer_host
millionaire_start
millionaire_cancel

// Anfitrión
millionaire_host_reveal_question
millionaire_host_reveal_answer
millionaire_host_next
millionaire_host_end
```

## Orden de Implementación

### Semana 1: Fundación
1. ✅ Crear `src/types/millionaire.ts` con todas las interfaces
2. ✅ Crear `src/config/millionairePrizes.ts` con escalera de premios
3. ✅ Crear `src/services/TriviaService.ts`:
   - Integración con OpenTDB
   - Session token management
   - Cache básico (array de 50 preguntas por dificultad)
   - Método `getQuestion(difficulty)` que retorna TriviaQuestion
4. ✅ Probar TriviaService con 20 preguntas de prueba

### Semana 2: Juego Básico
5. ✅ Crear `src/commands/games/millionaire.ts` estructura base:
   - Imports y activeRooms Map
   - SlashCommandBuilder con subcomandos
   - Registrar en CATEGORIES.FUN
6. ✅ Implementar sistema de lobby (modo automático primero):
   - `/millionaire crear` → crea sala, muestra embed con botón [Unirse]
   - `handleJoin()` → añade jugador
   - `/millionaire iniciar` → valida y arranca juego
7. ✅ Implementar flujo básico de preguntas (15 niveles):
   - `startGame()` → inicializa estado
   - `displayQuestion()` → muestra pregunta con 4 botones A/B/C/D
   - `handleAnswer()` → procesa respuesta del usuario
   - `checkAnswer()` → valida correcto/incorrecto
   - `progressToNextQuestion()` → avanza o termina
8. ✅ Implementar sistema de premios:
   - Calcular premio según nivel
   - Safe havens en niveles 5 y 10
   - Botón "Retirarse" para cash out
9. ✅ **Testing**: Juego completo de 15 preguntas en modo automático

### Semana 3: Comodines y Modo Anfitrión
10. ✅ Implementar comodín 50:50:
    - Botón → elimina 2 incorrectas
    - Actualiza UI con 2 opciones
    - Deshabilita botón
11. ✅ Implementar comodín Pregunta al Público:
    - Generar porcentajes simulados (correcto: 60-75%)
    - Mostrar embed con barras ASCII
12. ✅ Implementar comodín Llamar a un Amigo:
    - Modal para seleccionar usuario (mention)
    - DM al amigo con pregunta + 30s timer
    - Mostrar respuesta al concursante
13. ✅ Implementar comodín Cambiar Pregunta:
    - Fetchear nueva pregunta misma dificultad
    - Verificar no repetición
14. ✅ **Testing**: Probar todos los comodines individualmente
15. ✅ Implementar modo anfitrión:
    - Modificar lobby para slot de host
    - `/millionaire voluntario_anfitrion`
    - Flag `hasHost` en GameRoom
16. ✅ Crear panel DM para anfitrión:
    - Enviar pregunta + respuesta correcta en privado
    - Botones: [Revelar Pregunta] [Revelar Respuesta] [Siguiente]
17. ✅ Adaptar flujo de preguntas para modo host:
    - Si `hasHost`: enviar panel a host DM, mensaje genérico a canal
    - Host controla revelación
18. ✅ **Testing**: Juego completo con anfitrión (2 personas)

### Semana 4: Persistencia y Pulido
19. ✅ Extender FirebaseAdminManager:
    - `updateMillionaireStats(userId, gameData)`
    - `getMillionaireLeaderboard(sortBy)`
    - `getPlayerMillionaireStats(userId)`
20. ✅ Actualizar stats al finalizar cada juego
21. ✅ Implementar `/millionaire clasificacion`:
    - Top 10 por total ganado
    - Opciones de ordenamiento
22. ✅ Implementar `/millionaire estadisticas [usuario]`:
    - Mostrar stats personales en embed
23. ✅ Mejora de imágenes con Gemini + Tenor:
    - En TriviaService: método `enhanceWithImage(question)`
    - Gemini genera query → Tenor busca imagen
    - Añadir `imageUrl` a embed de pregunta
24. ✅ Implementar manejo de errores:
    - Fallback de API
    - Timeouts de usuario
    - Host abandona mid-game
25. ✅ Timeouts y cleanup:
    - Lobby: 10 min
    - Pregunta: 2 min
    - Lifeline amigo: 30s
    - Auto-cleanup de `activeRooms`
26. ✅ Implementar `/millionaire reglas`:
    - Embed explicativo con reglas del juego
27. ✅ **Testing completo**:
    - Juego completo modo automático
    - Juego completo modo host
    - Todos los comodines
    - Cash out en varios niveles
    - Respuesta incorrecta (con y sin safe haven)
    - API caída (fallback)
    - Usuario timeout
    - Juegos simultáneos en diferentes canales

## Archivos Clave de Referencia

Durante implementación, consultar:
- **Patrón de juego**: `src/commands/games/impostor.ts` (líneas 1-2210)
- **Uso de Firebase**: `src/managers/FirebaseAdminManager.ts` (líneas 1-115+)
- **Tipos de comando**: `src/types/Command.ts` (líneas 46-59 para SlashOnlyCommand)
- **Utilidades de mensaje**: `src/utils/messageUtils.ts` (líneas 42-80)
- **Gemini AI**: `src/commands/games/impostor.ts` (líneas 67-114 para patrón de uso)
- **Configuración**: `src/config.ts` (líneas 25, 67 para API keys)

## Notas Importantes

1. **No usar bases de datos SQL**: Firebase Realtime DB ya está integrado
2. **Seguir patrón SlashOnlyCommand**: No implementar versión de prefijo
3. **Usar helpers existentes**: `createInfoEmbed()`, `sendMessage()`, `handleCommandError()`
4. **Custom IDs únicos**: Prefijo `millionaire_` en todos los botones
5. **Room key format**: `${guildId}-${channelId}` (igual que impostor)
6. **Cleanup obligatorio**: Siempre limpiar `activeRooms` al terminar
7. **DMs pueden fallar**: Validar `sendDM()` retorna boolean, tener fallback
8. **Embeds consistentes**: Usar colores de COLORS constant
9. **Rate limiting de APIs**:
   - OpenTDB: 1 request/5s
   - Gemini: Ya tiene rate limiting en config
   - Tenor: Ya configurado

## Estimación de Líneas de Código

- `millionaire.ts`: ~2,000 líneas
- `TriviaService.ts`: ~350 líneas
- `millionaire.ts` (types): ~200 líneas
- `millionairePrizes.ts`: ~80 líneas
- Modificaciones a `FirebaseAdminManager.ts`: ~150 líneas adicionales
- **Total**: ~2,780 líneas nuevas

## Resultado Final Esperado

Un juego completo de trivia que:
- ✅ Permite jugar solo o con anfitrión
- ✅ 15 preguntas de dificultad progresiva
- ✅ 4 comodines funcionales
- ✅ Preguntas de API externa con imágenes
- ✅ Sistema de premios con safe havens
- ✅ Leaderboard persistente
- ✅ Manejo robusto de errores
- ✅ UI consistente con el resto del bot
- ✅ Multicanal (varios juegos simultáneos)
