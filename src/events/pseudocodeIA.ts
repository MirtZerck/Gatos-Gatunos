/*
Pseudocódigo para el Chatbot de Hikari Koizumi

ESTRATEGIAS DE OPTIMIZACIÓN
--------------------------
1. Gestión de Tokens
   - Límite diario: 1000 tokens (reducido para mejor rendimiento)
   - Reset diario automático
   - Monitoreo de uso en tiempo real
   - Priorización de mensajes importantes

2. Caché Inteligente
   - Caché de respuestas frecuentes (LRU Cache)
   - Caché de contexto de usuario (TTL: 3 minutos)
   - Limpieza automática cada 5 minutos
   - Máximo 100 entradas en caché

3. Compresión de Datos
   - Mensajes: mantener solo inicio y final
   - Historial: últimos 3 mensajes relevantes
   - Personalidad: solo rasgos activos
   - Memoria: solo información crítica

4. Priorización de Interacciones
   - Menciones directas: prioridad alta
   - Conversaciones activas: prioridad media
   - Mensajes generales: prioridad baja
   - Ignorar mensajes no relevantes

CONSTANTES OPTIMIZADAS
---------------------
- MAX_TOKENS_PER_MESSAGE: 30
- MAX_CONTEXT_MESSAGES: 3
- MAX_CONVERSATION_HISTORY: 20    # Máximo de conversaciones a mantener
- CACHE_DURATION: 180000 (3 minutos)
- MAX_STORED_FACTS: 5
- MAX_STORED_PREFERENCES: 3
- MAX_DAILY_TOKENS: 50000
- CACHE_CLEANUP_INTERVAL: 300000 (5 minutos)
- DB_CLEANUP_INTERVAL: 86400000 (24 horas)
- MEMORY_RELEVANCE_THRESHOLD: 0.8

ESTRUCTURA PRINCIPAL
-------------------
1. Inicialización
   - Verificar/Crear estructura en Firebase
   - Inicializar conexión con Gemini
   - Cargar personalidad base (prompt inicial)
   - Inicializar caché

2. Sistema de Base de Datos
   Estructura en Firebase:
   /geminiChat
     /basePrompt           # Prompt inicial de personalidad (nunca se elimina)
       - content          # Contenido del prompt
       - lastUpdated      # Última actualización
     /conversations
       /{timestamp}
         - message
         - response
         - userId
         - channelId
         - priority
         - serverId        # ID del servidor (opcional)
         - isMentioned     # Si el bot fue mencionado
         - isResponse      # Si es una respuesta del bot
     /personality
       - traits
       - lastUpdated
     /userMemory
       /{userId}
         - userName
         - preferences
         - importantFacts
         - lastInteraction
         - servers         # Mapa de servidores activos
           /{serverId}
             - lastSeen    # Última vez que el usuario escribió
             - messageCount # Contador de mensajes
     /cache
       /responses
       /lastCleanup

3. Manejo de Mensajes
   Cuando llega un mensaje:
   1. Guardar mensaje en historial
   2. Si el bot es mencionado:
      - Obtener prompt base
      - Obtener historial reciente (últimas 20 conversaciones)
      - Generar respuesta
      - Guardar conversación
      - Si se excede el límite de 20 conversaciones:
        - Eliminar la conversación más antigua
        - Añadir la nueva conversación al final
      - Actualizar caché
   3. Actualizar memoria y estadísticas

4. Sistema de Personalidad
   - Cargar prompt base (nunca se elimina)
   - Mantener consistencia en respuestas
   - Adaptar personalidad al contexto
   - Evolución autónoma de personalidad:
     * Aprender de interacciones exitosas
     * Adaptar rasgos según el contexto
     * Desarrollar preferencias propias
     * Mantener coherencia en cambios
   - Sistema de evolución:
     * Análisis de respuestas bien recibidas
     * Identificación de patrones de éxito
     * Adaptación gradual de rasgos
     * Preservación de rasgos fundamentales

5. Memoria de Usuarios
   - Almacenar información crítica
   - Aprender preferencias importantes
   - Mantener hechos significativos
   - Actualizar con interacciones prioritarias
   - Sistema de aprendizaje:
     * Patrones de interacción
     * Preferencias de usuarios
     * Contexto de conversaciones
     * Relaciones entre usuarios
   - Adaptación personalizada:
     * Ajustar respuestas por usuario
     * Recordar interacciones significativas
     * Desarrollar relaciones únicas
     * Mantener consistencia en trato

6. Gestión de Conversaciones
   - Mantener máximo 20 conversaciones
   - Eliminar la más antigua al exceder el límite
   - Comprimir mensajes automáticamente
   - Priorizar por importancia
   - Sistema de aprendizaje conversacional:
     * Análisis de flujos de conversación
     * Identificación de temas recurrentes
     * Adaptación de estilo conversacional
     * Mejora de coherencia en diálogos
   - Evolución de respuestas:
     * Aprender de respuestas exitosas
     * Adaptar estilo según contexto
     * Desarrollar patrones propios
     * Mantener coherencia en cambios

7. Interacción con Gemini
   - Configuración optimizada
   - Manejo eficiente de tokens
   - Generación de respuestas concisas
   - Validación de respuestas
   - Sistema de aprendizaje autónomo:
     * Análisis de respuestas generadas
     * Evaluación de éxito en interacciones
     * Adaptación de parámetros
     * Mejora continua de calidad
   - Evolución de personalidad:
     * Ajuste de rasgos según interacciones
     * Desarrollo de preferencias propias
     * Mantenimiento de coherencia
     * Preservación de identidad base

FLUJO DE DATOS OPTIMIZADO
------------------------
1. Mensaje → Guardar en Historial
2. Si es Mencionado:
   - Obtener Prompt Base
   - Obtener Historial (máx 20)
   - Analizar Contexto y Patrones
   - Generar Respuesta Adaptada
   - Guardar y Limpiar si es necesario
   - Actualizar Patrones de Aprendizaje
3. Respuesta → Actualizar Caché
4. Interacción → Actualizar Memoria
5. Aprendizaje → Actualizar Personalidad

SISTEMA DE APRENDIZAJE AUTÓNOMO
------------------------------
1. Análisis de Interacciones
   - Patrones de conversación exitosos
   - Respuestas bien recibidas
   - Contextos favorables
   - Relaciones significativas

2. Evolución de Personalidad
   - Adaptación gradual de rasgos
   - Desarrollo de preferencias
   - Mantenimiento de coherencia
   - Preservación de identidad base

3. Aprendizaje de Usuarios
   - Patrones de interacción
   - Preferencias individuales
   - Contextos específicos
   - Relaciones únicas

4. Mejora Continua
   - Análisis de éxito
   - Adaptación de parámetros
   - Refinamiento de respuestas
   - Evolución autónoma

INTERFACES PRINCIPALES
---------------------
Context {
    user: UserData
    personality: PersonalityData
    recentConversations: Conversation[]
    currentMessage: DiscordMessage
    priority: number
    cacheKey: string
    serverId?: string        # ID del servidor (opcional)
}

UserData {
    userId: string
    userName: string
    preferences: {
        likes: string[]
        dislikes: string[]
    }
    importantFacts: string[]
    lastInteraction: number
    priority: number
    servers: Record<string, ServerActivity>  # Actividad por servidor
}

ServerActivity {
    lastSeen: number
    messageCount: number
}

PersonalityData {
    traits: Record<string, any>
    lastUpdated: number
    activeTraits: string[]
}

Conversation {
    message: string
    response: string
    timestamp: number
    channelId: string
    userId: string
    priority: number
    cached: boolean
    serverId?: string        # ID del servidor (opcional)
}

ESTRUCTURA MODULAR INTEGRADA
---------------------------
src/
  ├── ai_service/           # Servicio de IA
  │   ├── core/
  │   │   ├── config/
  │   │   │   ├── constants.ts
  │   │   │   └── types.ts
  │   │   ├── errors/
  │   │   │   └── aiError.ts
  │   │   └── logging/
  │   │       └── logger.ts
  │   │
  │   ├── domain/
  │   │   ├── personality/
  │   │   │   ├── personalityService.ts
  │   │   │   └── personalityTypes.ts
  │   │   ├── memory/
  │   │   │   ├── memoryService.ts
  │   │   │   └── memoryTypes.ts
  │   │   └── conversation/
  │   │       ├── conversationService.ts
  │   │       └── conversationTypes.ts
  │   │
  │   ├── infrastructure/
  │   │   ├── database/
  │   │   │   └── firebaseService.ts
  │   │   ├── cache/
  │   │   │   └── cacheService.ts
  │   │   └── ai/
  │   │       └── geminiService.ts
  │   │
  │   └── application/
  │       ├── services/
  │       │   └── chatService.ts
  │       └── handlers/
  │           └── messageHandler.ts
  │
  ├── commands/            # Estructura existente
  ├── constants/          # Estructura existente
  ├── db_service/         # Estructura existente
  ├── events/            # Estructura existente
  ├── types/             # Estructura existente
  ├── utils/             # Estructura existente
  └── michi.ts           # Archivo principal

INTEGRACIÓN CON ESTRUCTURA EXISTENTE
----------------------------------
1. Relaciones con Módulos Existentes
   - commands/: Comandos que utilizan el servicio de IA
   - constants/: Constantes compartidas
   - db_service/: Servicios de base de datos compartidos
   - events/: Eventos que utilizan el servicio de IA
   - types/: Tipos compartidos
   - utils/: Utilidades compartidas

2. Puntos de Integración
   - Importaciones desde ai_service a módulos existentes
   - Exportaciones desde ai_service para uso en otros módulos
   - Compartir tipos y constantes
   - Reutilizar utilidades existentes

3. Ejemplo de Integración
   // En un comando existente
   import { ChatService } from '../ai_service/application/services/chatService';
   import { PersonalityService } from '../ai_service/domain/personality/personalityService';

   // En un evento existente
   import { MessageHandler } from '../ai_service/application/handlers/messageHandler';

4. Manejo de Dependencias
   - Compartir instancias de servicios
   - Inyección de dependencias
   - Reutilización de código
   - Evitar duplicación

OPTIMIZACIONES ESPECÍFICAS
-------------------------
1. Reducción de Carga
   - Menos tokens por mensaje
   - Menos mensajes en historial
   - Caché más pequeño
   - Limpieza más frecuente

2. Mejora de Rendimiento
   - Caché LRU para respuestas frecuentes
   - Compresión de mensajes
   - Priorización de interacciones
   - Limpieza automática

3. Gestión de Memoria
   - Menos datos almacenados
   - Limpieza más frecuente
   - Priorización de información
   - Compresión de datos

4. Optimización de Base de Datos
   - Estructura más plana
   - Menos campos por registro
   - Limpieza periódica
   - Actualizaciones en batch

5. Manejo de Errores
   - Recuperación graceful
   - Fallback a respuestas predefinidas
   - Logging estructurado
   - Monitoreo de errores
*/
