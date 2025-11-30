Sistema Gacha - Documento de Diseño Completo
📋 Índice

**IMPLEMENTACIÓN FASE 1 (MVP):**
- Estructura de Base de Datos
- Sistema de Cartas Básico
- Sistema de Inventario

**FUTURO (Pendiente):**
- Economía Completa
- Sistema de Estrellas con Evolución
- Combate
- Casino
- Robo y Hackeo

---

## 🎯 DECISIONES DE DISEÑO CLAVE

### Sistema Global vs Por Servidor
✅ **GLOBAL:** Todas las cartas únicas/limitadas son globales al bot entero
- 1 carta única = solo 1 persona en TODO el bot puede tenerla
- Cartas limitadas = límite global (ej: 25 copias en total)
- Inventarios son por usuario, no por servidor

### Estrellas y Rareza
✅ **Independientes:**
- **Rareza** (común/rara/épica/legendaria) = Dificultad de obtener del gacha
- **Estrellas** (★ a ★★★★★) = Poder de la carta, nivel fijo
- Una carta única puede ser ★ o ★★★★★
- Útil para futuras ligas con restricciones (ej: liga solo ★★★ o menos)

### Sistema de Estrellas
✅ **Fijo:** Las cartas NO evolucionan
- Cada carta tiene estrellas predefinidas al crearla
- Las estrellas nunca cambian
- No hay sistema de experiencia ni level-up

### Creación de Cartas
✅ **Manual en Supabase:**
- Cartas se crean directamente en la base de datos
- No hay comandos de admin en el bot para crear cartas
- Control total sobre stats, balance y diseño

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS (Supabase)

### Tabla 1: `cards` (Catálogo de Cartas)

**Propósito:** Almacena todas las cartas del sistema. Se crean manualmente desde Supabase.

```sql
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- Rareza y Estrellas
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5), -- ★ a ★★★★★ fijo

  -- Tipo de Carta
  is_unique BOOLEAN DEFAULT false, -- Solo 1 en TODO el bot (globalmente)
  unique_number INTEGER, -- Número global de carta única (ej: 1, 2, 3...)

  is_limited BOOLEAN DEFAULT false, -- Ediciones limitadas
  max_editions INTEGER, -- NULL si no es limitada, número si lo es (ej: 25 globalmente)

  -- Stats (para futuro combate)
  base_hp INTEGER NOT NULL,
  base_attack INTEGER NOT NULL,
  base_defense INTEGER NOT NULL,
  base_speed INTEGER NOT NULL,

  -- Visual
  image_url TEXT,
  color_hex TEXT DEFAULT '#000000',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cards_rarity ON cards(rarity);
CREATE INDEX idx_cards_unique ON cards(is_unique) WHERE is_unique = true;
CREATE INDEX idx_cards_unique_number ON cards(unique_number) WHERE unique_number IS NOT NULL;
```

**Campos Clave:**
- `stars`: Nivel fijo de 1-5 estrellas (no evoluciona, puede ser cualquier valor)
- `is_unique`: Si es única (solo 1 en TODO el sistema)
- `unique_number`: Número global de la carta única (1, 2, 3...) - se asigna manualmente al crear
- `is_limited`: Si es edición limitada (limitada globalmente)
- `max_editions`: Cuántas copias existen EN TOTAL en el bot (ej: 25)

**Nota sobre Únicas:**
- Una carta única puede ser ★ o ★★★★★, el nivel de estrellas es independiente
- Útil para futuras ligas con restricciones de estrellas (ej: liga ≤★★★)

### Tabla 2: `user_cards` (Inventario de Usuarios)

**Propósito:** Guarda las cartas que posee cada usuario globalmente.

```sql
CREATE TABLE user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Propietario (Discord ID global)
  user_id TEXT NOT NULL,

  -- Carta
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

  -- Edición (solo para limitadas)
  edition_number INTEGER, -- ej: 17 (de 25 globalmente)

  -- Metadata
  obtained_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_cards_owner ON user_cards(user_id);
CREATE INDEX idx_user_cards_card ON user_cards(card_id);

-- Constraint: Solo puede haber 1 carta única en todo el sistema
CREATE UNIQUE INDEX idx_unique_card_globally ON user_cards(card_id)
  WHERE card_id IN (SELECT id FROM cards WHERE is_unique = true);
```

### Tabla 3: `unique_card_ownership` (Tracking de Cartas Únicas)

**Propósito:** Control de quién tiene cada carta única GLOBALMENTE.

```sql
CREATE TABLE unique_card_ownership (
  card_id UUID PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
  current_owner_id TEXT, -- NULL si nadie la tiene aún
  obtained_at TIMESTAMPTZ
);

CREATE INDEX idx_unique_ownership_owner ON unique_card_ownership(current_owner_id);
```

**Nota:** Al ser global, solo hay 1 entrada por carta única (sin server_id).

---

## 🎴 SISTEMA DE ENUMERACIÓN

### Cartas Normales (Común, Rara, Épica, Legendaria)
- Sin numeración especial
- Pueden tener múltiples copias
- Se muestran con nombre y estrellas: `"Dragón de Fuego ★★★★"`

### Cartas Limitadas
**Formato de Display:** `#17/25`
- El primer número (17) es la edición específica que posees
- El segundo número (25) es el total de ediciones que existen
- Se calcula al obtener la carta: cuenta cuántas existen en `user_cards` y asigna el siguiente número
- Ejemplo: `"Sakura Primavera ★★★★ #8/25"`

### Cartas Únicas ⭐
**Formato de Display:** `#1` o `#3/7` (dependiendo del contexto)

**Opción A - Solo Número Global:**
```
"Hikari Primordial ★★★★★ #1"
```
- Muestra solo el `unique_number` de la carta
- #1 significa que fue la primera carta única creada en el sistema
- Simple y directo

**Opción B - Número Global con Total:**
```
"Hikari Primordial ★★★★★ #1/7"
```
- Muestra `unique_number / total_unique_cards`
- #1/7 significa "la primera de 7 cartas únicas que existen"
- Requiere calcular total de únicas en el sistema

**Opción C - Contexto Variable:**
```
En gacha: "¡Obtuviste carta ÚNICA #3!"
En inventario: "Dragón Ancestral ★★★ #3/10"
```
- Muestra diferentes formatos según dónde se vea
- Más flexible pero requiere más lógica

**DECISIÓN RECOMENDADA:** Opción B
- Da contexto de rareza (ver #1/100 es más impactante que solo #1)
- Los números bajos (#1, #2, #3) son más valiosos
- Es consistente con el formato de limitadas

### Ejemplos Visuales

```
INVENTARIO DE USUARIO:

[ÚNICA] Espada del Destino ★★★★★ #1/5
[LIMITADA] Sakura Primavera ★★★ #12/50
[LEGENDARIA] Dragón Antiguo ★★★★
[ÉPICA] Mago Arcano ★★★
[COMÚN] Slime Azul ★
```

---

## 🎲 SISTEMA DE OBTENCIÓN (Gacha)

### Pools de Cartas (Global)

**Pool Normal:**
- Todas las cartas normales (común, rara, épica, legendaria)
- Todas las cartas limitadas que no alcanzaron `max_editions` GLOBALMENTE
- Todas las cartas únicas que NO han sido obtenidas por NADIE aún

**Filtros al seleccionar carta:**
1. Determinar rareza usando pesos (60% común, 25% rara, 12% épica, 3% legendaria)
2. Filtrar cartas disponibles de esa rareza:
   - ✅ Cartas normales siempre disponibles
   - ✅ Cartas limitadas si `COUNT(user_cards WHERE card_id = X) < max_editions` (global)
   - ✅ Cartas únicas si `current_owner_id IS NULL` en `unique_card_ownership`
3. Seleccionar aleatoria del pool filtrado
4. Si es única/limitada, hacer validaciones extra antes de asignar

### Proceso de Asignación

**Carta Normal:**
```
1. INSERT en user_cards (user_id, card_id)
2. Retornar carta
```

**Carta Limitada:**
```
1. COUNT ediciones existentes GLOBALMENTE: SELECT COUNT(*) FROM user_cards WHERE card_id = X
2. Si count < max_editions:
   - edition_number = count + 1
   - INSERT en user_cards con edition_number
3. Retornar carta con formato "#X/Y"
4. Si count >= max_editions: error (no debería pasar si el filtro funciona)
```

**Carta Única:**
```
1. Verificar unique_card_ownership: current_owner_id IS NULL
2. Si disponible:
   - INSERT en user_cards (user_id, card_id)
   - UPDATE unique_card_ownership SET current_owner_id = user_id, obtained_at = NOW()
3. Retornar carta con formato "#X/Y" (donde X es unique_number, Y es total de únicas)
4. Si NO disponible: error (no debería pasar si el filtro funciona)
```

**⚠️ Implicaciones del Sistema Global:**
- Una carta única solo puede ser obtenida por 1 persona en TODO el bot
- Las cartas limitadas tienen ediciones globales (ej: solo 25 copias en todo el bot)
- Hace las cartas únicas/limitadas EXTREMADAMENTE valiosas
- Requiere sistema de intercambio/trading bien pensado para el futuro

---

## 📊 STATS Y BALANCE

### Relación Estrellas → Stats Base

Las cartas se crean manualmente, pero estas son referencias para balance:

| Estrellas | HP Base | ATK Base | DEF Base | SPD Base |
|-----------|---------|----------|----------|----------|
| ★         | 100-200 | 20-40    | 15-30    | 30-50    |
| ★★        | 200-350 | 40-70    | 30-55    | 50-70    |
| ★★★       | 350-550 | 70-110   | 55-85    | 70-90    |
| ★★★★      | 550-800 | 110-160  | 85-120   | 90-110   |
| ★★★★★     | 800-1200| 160-240  | 120-180  | 110-140  |

**Nota:** Estos son rangos sugeridos. Una carta común ★★★★★ puede tener stats más bajos que una legendaria ★★★★★.

### Rareza vs Estrellas

**NO están directamente relacionados:**
- Una carta común puede ser ★★★★★ (muy rara de obtener del gacha)
- Una legendaria puede ser ★ (más fácil de conseguir pero legendaria en lore)

**Ejemplos:**
```
Slime Común ★ (Común) - Fácil de obtener, débil
Rey Slime ★★★★★ (Común) - Muy raro de obtener, fuerte
Dragón Bebé ★★ (Legendaria) - Raro del gacha, moderado
Dragón Anciano ★★★★★ (Legendaria) - Ultra raro, ultra fuerte
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Base de Datos
- [ ] Crear tabla `cards` en Supabase
- [ ] Crear tabla `user_cards` en Supabase
- [ ] Crear tabla `unique_card_ownership` en Supabase
- [ ] Crear tabla `user_economy` en Supabase
- [ ] Crear tabla `user_achievements` en Supabase
- [ ] Crear tabla `achievements` en Supabase (catálogo)
- [ ] Crear tabla `daily_missions` en Supabase
- [ ] Crear tabla `mission_templates` en Supabase (catálogo)
- [ ] Poblar tabla `achievements` con todos los logros
- [ ] Poblar tabla `mission_templates` con misiones variadas
- [ ] Crear 5-10 cartas de prueba manualmente:
  - [ ] 2-3 cartas comunes normales (diferentes estrellas)
  - [ ] 1-2 cartas raras normales
  - [ ] 1 carta épica normal
  - [ ] 1 carta legendaria normal
  - [ ] 1 carta limitada (ej: 10 ediciones)
  - [ ] 1 carta única (cualquier rareza/estrellas)

### Fase 2: Sistema Económico Base
- [ ] Comando `/daily` - Recompensa diaria + streak
- [ ] Sistema de login streak con perdón de 1 día
- [ ] Comando `/weekly` - Recompensa semanal
- [ ] Comando `/balance` o `/profile` - Ver oro y stats
- [ ] Funciones helper para verificar cooldowns
- [ ] Sistema de roll gratis (día 7 de streak)
- [ ] Oro inicial (5000) para nuevos usuarios

### Fase 3: Sistema de Gacha
- [ ] Función para obtener pool de cartas disponibles
- [ ] Función para seleccionar carta aleatoria con pesos
- [ ] Función para asignar carta a usuario
- [ ] Manejo de cartas únicas (verificar disponibilidad)
- [ ] Manejo de cartas limitadas (calcular edition_number)
- [ ] Comando `/roll [cantidad]` - 1 o 10 rolls
- [ ] Validación de oro suficiente
- [ ] Descuento en roll x10 (9000 oro vs 10000)
- [ ] Legendaria garantizada en slot 10 del roll x10
- [ ] Usar roll gratis si está disponible

### Fase 4: Inventario
- [ ] Comando `/inventory` - Ver cartas del usuario
- [ ] Comando `/card <id>` - Ver detalles de carta
- [ ] Formatear display según tipo (normal/limitada/única)
- [ ] Mostrar numeración correcta (#X/Y)
- [ ] Ordenar por rareza, estrellas, fecha obtenida
- [ ] Paginación para inventarios grandes

### Fase 5: Sistema de Venta (Burn)
- [ ] Comando `/burn <card_name> [cantidad]`
- [ ] Validar que no sea única/limitada
- [ ] Validar que tenga al menos 2 copias
- [ ] Calcular oro según rareza
- [ ] Eliminar cartas del inventario
- [ ] Actualizar stats (total_cards_burned)
- [ ] Verificar logro "Vende Tu Primera Carta"

### Fase 6: Sistema de Logros
- [ ] Comando `/achievements [categoria]`
- [ ] Mostrar logros completados/en progreso/bloqueados
- [ ] Calcular progreso de cada logro
- [ ] Comando `/claim-achievement <id>` o botón
- [ ] Sistema automático de verificación de logros
- [ ] Notificaciones cuando se completa un logro
- [ ] Dar recompensas al reclamar logros

### Fase 7: Sistema de Misiones Diarias
- [ ] Comando `/missions` - Ver misiones del día
- [ ] Generar 3 misiones aleatorias diarias
- [ ] Sistema automático de tracking de progreso
- [ ] Completar misiones automáticamente
- [ ] Notificaciones al completar misiones
- [ ] Bonus por completar las 3 misiones (+500 oro)
- [ ] Reset diario de misiones

### Fase 8: Pulido y UX
- [ ] Embeds bonitos para mostrar cartas
- [ ] Mensajes visuales atractivos para rolls
- [ ] Animación/efecto especial al obtener carta única
- [ ] Animación al completar logros
- [ ] Notificaciones de misiones completadas
- [ ] Sistema de paginación para todos los listados
- [ ] Leaderboards opcionales (más oro, más cartas, etc.)

### Fase 9: Testing y Balance
- [ ] Testear todos los comandos
- [ ] Verificar que el balance económico funciona
- [ ] Testear edge cases (0 oro, sin cartas, etc.)
- [ ] Verificar que logros se completan correctamente
- [ ] Testear misiones con diferentes requisitos
- [ ] Ajustar números si es necesario

---

## 💰 SISTEMA ECONÓMICO (MVP)

### Monedas

**Oro (Moneda Principal)**
- Usado para rolls del gacha
- Se obtiene mediante dailies, logros, eventos
- No se puede comprar (free-to-play)

**Gemas (Moneda Premium) - FUTURO**
- Para rolls premium con mejores tasas
- Para funciones especiales
- ⚠️ De momento NO implementar, solo oro

---

### Costos del Gacha

| Acción | Costo | Notas |
|--------|-------|-------|
| Roll x1 | 1000 oro | Una carta aleatoria |
| Roll x10 | 9000 oro | 10% descuento, legendaria garantizada en slot 10 |

**Tasas del Roll Normal (1000 oro):**
- Común: 60%
- Rara: 25%
- Épica: 12%
- Legendaria: 3%

**Roll x10 Garantías:**
- Mismas tasas individuales
- Slot 10 SIEMPRE es legendaria
- Más eficiente que hacer 10 rolls individuales

---

### Fuentes de Oro (Diarias) - Diseño Casual-Friendly

⏱️ **Tiempo requerido: ~30 segundos**

**Daily Reward** - Comando `/daily`
- Recompensa: **1500 oro fijo** (sin RNG)
- Cooldown: 24 horas
- Instantáneo, solo ejecutar comando
- ¡Ya puedes hacer 1 roll diario garantizado!

**Login Streak** - Sistema GENEROSO
- Bonus adicional por días consecutivos
- **Perdona 1 día de ausencia** (no resetea si faltas 1 día)
- Día 1: +500 oro
- Día 2: +600 oro
- Día 3: +700 oro
- Día 4: +800 oro
- Día 5: +900 oro
- Día 6: +1000 oro
- Día 7: +1500 oro + **ROLL x10 GRATIS**

**Tabla de Streak:**
| Día | Bonus Oro | Extra | Total con Daily |
|-----|-----------|-------|-----------------|
| 1 | +500 | - | 2000 oro |
| 2 | +600 | - | 2100 oro |
| 3 | +700 | - | 2200 oro |
| 4 | +800 | - | 2300 oro |
| 5 | +900 | - | 2400 oro |
| 6 | +1000 | - | 2500 oro |
| 7 | +1500 | Roll x10 Gratis | 3000 oro + 9000 valor |

**Mecánica de Perdón:**
- Si faltas 1 día: streak se mantiene
- Si faltas 2+ días consecutivos: streak resetea a día 1
- Ejemplo: Día 1, 2, 3, FALTA, Día 5 → Sigue siendo día 5
- Ejemplo: Día 1, 2, FALTA, FALTA, → Resetea a día 1

**Total Diario:**
- **Mínimo (día 1):** 2000 oro = 2 rolls
- **Máximo (día 7):** 3000 oro + roll x10 gratis = 12,000 oro de valor

---

### Fuentes de Oro (Semanales)

⏱️ **Tiempo requerido: ~30 segundos**

**Weekly Reward** - Comando `/weekly`
- Recompensa: **10,000 oro** (aumentado para jugadores casuales)
- Cooldown: 7 días
- Instantáneo, solo ejecutar comando
- Suficiente para 1 roll x10 + 1 roll individual

---

### Oro Inicial (Nuevos Usuarios)

**Primera vez que usan el bot:**
- **5000 oro de bienvenida**
- Suficiente para 5 rolls iniciales o medio roll x10
- Les permite probar el sistema inmediatamente
- Sin necesidad de esperar al daily

---

### Fuentes de Oro Opcionales (Para Jugadores Activos)

Estas fuentes son **OPCIONALES** y permiten a jugadores dedicados progresar más rápido sin romper el balance casual.

---

## 🔥 VENTA DE DUPLICADOS (Burn/Sell)

⏱️ **Tiempo requerido: ~1-2 minutos**

**Concepto:**
- Vende/quema cartas duplicadas que ya tienes
- Solo si posees 2+ copias de la misma carta
- Genera oro reciclando duplicados

**Precios de Venta:**

| Rareza | Oro por Carta |
|--------|---------------|
| Común | 100 oro |
| Rara | 400 oro |
| Épica | 1500 oro |
| Legendaria | 5000 oro |

**Restricciones:**
- ✅ Solo cartas normales
- ❌ NO puedes vender cartas únicas
- ❌ NO puedes vender cartas limitadas
- ✅ Debes tener al menos 2 copias de la carta
- ⚠️ Irreversible (no se puede deshacer)

**Comando:** `/burn <card_name> [cantidad]`

**Ejemplo:**
```
Inventario:
- Slime Común (x15)
- Dragón de Fuego ★★★★ (x3)
- Mago Arcano ★★ (x1)

/burn "Slime Común" 10
→ -10 Slime Común
→ +1000 oro (10 × 100)
→ Te quedan 5 copias

/burn "Dragón de Fuego" 2
→ -2 Dragón de Fuego
→ +10,000 oro (2 × 5000)
→ Te queda 1 copia

/burn "Mago Arcano"
→ ERROR: Solo tienes 1 copia, necesitas mínimo 2
```

**Oro Potencial:**
- Usuarios activos: 500-2000 oro/día vendiendo duplicados comunes/raras
- Usuarios muy activos: 2000-5000 oro/día incluyendo épicas/legendarias duplicadas

---

## 🏆 LOGROS PERMANENTES

⏱️ **Tiempo requerido: 0 minutos (progreso natural)**

**Concepto:**
- Objetivos a largo plazo
- Recompensas únicas (solo se obtienen 1 vez)
- Se completan jugando naturalmente

**Categorías de Logros:**

### Colección
```
"Primera Carta" → 1,000 oro
"10 Cartas Totales" → 2,000 oro
"50 Cartas Totales" → 5,000 oro
"100 Cartas Totales" → 10,000 oro + 1 Roll x10 Gratis
"250 Cartas Totales" → 25,000 oro
"500 Cartas Totales" → 50,000 oro + 5 Rolls x10 Gratis

"Primera Legendaria" → 3,000 oro
"Primera Carta Única" → 5,000 oro + 1 Roll x10 Gratis
"Primera Carta Limitada" → 2,000 oro

"5 Legendarias Diferentes" → 10,000 oro
"10 Legendarias Diferentes" → 25,000 oro
```

### Gacha
```
"Primer Roll" → 500 oro
"10 Rolls Totales" → 2,000 oro
"100 Rolls Totales" → 10,000 oro
"500 Rolls Totales" → 30,000 oro
"1000 Rolls Totales" → 75,000 oro

"Primer Roll x10" → 1,500 oro
"10 Roll x10 Totales" → 15,000 oro
```

### Racha y Dedicación
```
"Primer /daily" → 500 oro
"Streak de 7 días" → 3,000 oro
"Streak de 30 días" → 15,000 oro + 2 Rolls x10 Gratis
"Usar /daily 100 veces" → 20,000 oro
"Usar /weekly 10 veces" → 15,000 oro
```

### Rareza por Tipo
```
"Colecciona 1 de Cada Rareza" → 5,000 oro
"10 Comunes Diferentes" → 2,000 oro
"10 Raras Diferentes" → 5,000 oro
"5 Épicas Diferentes" → 10,000 oro
"3 Legendarias Diferentes" → 15,000 oro
```

### Economía
```
"Acumula 10,000 Oro" → 2,000 oro
"Acumula 50,000 Oro" → 10,000 oro
"Gasta 100,000 Oro Total" → 20,000 oro
"Vende Tu Primera Carta" → 500 oro
"Vende 100 Cartas" → 10,000 oro
```

**Comando:** `/achievements` o `/logros`
- Muestra todos los logros
- Indica cuáles están completados
- Muestra progreso de los incompletos

**Oro Total Disponible:** ~350,000+ oro en logros

---

## 📋 MISIONES DIARIAS

⏱️ **Tiempo requerido: ~10-15 minutos**

**Concepto:**
- 3 misiones diarias aleatorias
- Opcionales, no obligatorias
- Resetean cada 24h
- Variedad día a día

**Tipos de Misiones:**

### Fáciles (500 oro)
```
"Obtén 3 cartas comunes"
"Haz 3 rolls individuales"
"Revisa tu inventario"
"Usa el comando /balance"
"Obtén 1 carta de cualquier rareza"
"Vende 1 carta duplicada"
```

### Medias (800 oro)
```
"Obtén 5 cartas hoy"
"Obtén 1 carta rara o mejor"
"Haz un roll x10"
"Gasta 5,000 oro"
"Vende 5 cartas duplicadas"
"Obtén 3 cartas de la misma rareza"
```

### Difíciles (1,200 oro)
```
"Obtén 1 carta épica o legendaria"
"Haz 10 rolls individuales hoy"
"Obtén 3 cartas raras o mejores"
"Gasta 10,000 oro hoy"
"Vende 10 cartas duplicadas"
"Obtén 2 cartas épicas"
```

**Sistema:**
- Cada día a las 00:00 UTC se asignan 3 misiones:
  - 1 misión fácil (500 oro)
  - 1 misión media (800 oro)
  - 1 misión difícil (1,200 oro)
- Total posible: **2,500 oro/día**
- Se pueden completar en cualquier orden
- Se pueden ignorar sin penalización

**Comandos:**
- `/missions` o `/misiones` - Ver misiones del día
- Las misiones se completan automáticamente al cumplir el objetivo
- Notificación cuando completas una misión

**Recompensas:**
- Al completar 1 misión: oro correspondiente
- Al completar las 3 misiones del día: +500 oro bonus
- **Total completando todo: 3,000 oro/día**

---

### Fuentes de Oro (Futuro - No Implementar Aún)

Estas se implementarán en versiones posteriores:
- Progreso de campaña/niveles
- Victorias en combate PvE/PvP
- Eventos especiales temporales
- Sistema de votación en bot lists
- Sistema de referidos

---

### Base de Datos - Sistema Económico Completo

**Tabla 1: `user_economy`**
```sql
CREATE TABLE user_economy (
  user_id TEXT PRIMARY KEY,
  gold INTEGER DEFAULT 5000 CHECK (gold >= 0), -- Oro inicial para nuevos usuarios

  -- Dailies y Streak
  last_daily_claim TIMESTAMPTZ,
  streak_days INTEGER DEFAULT 0 CHECK (streak_days >= 0 AND streak_days <= 7),
  last_streak_update TIMESTAMPTZ,
  missed_days INTEGER DEFAULT 0,

  -- Weekly
  last_weekly_claim TIMESTAMPTZ,

  -- Stats Generales
  total_rolls INTEGER DEFAULT 0,
  total_gold_earned INTEGER DEFAULT 0,
  total_gold_spent INTEGER DEFAULT 0,
  free_rolls_available INTEGER DEFAULT 0,

  -- Stats para Logros
  total_cards_burned INTEGER DEFAULT 0,
  daily_claims_count INTEGER DEFAULT 0,
  weekly_claims_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_economy_user ON user_economy(user_id);
```

**Tabla 2: `user_achievements`**
```sql
CREATE TABLE user_achievements (
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  reward_claimed BOOLEAN DEFAULT false,

  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unclaimed ON user_achievements(user_id, reward_claimed)
  WHERE reward_claimed = false;
```

**Tabla 3: `achievements` (Catálogo de logros)**
```sql
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'collection', 'gacha', 'streak', 'rarity', 'economy'

  -- Recompensas
  gold_reward INTEGER DEFAULT 0,
  free_rolls_reward INTEGER DEFAULT 0,

  -- Requisitos (JSON para flexibilidad)
  requirement_type TEXT NOT NULL, -- 'total_cards', 'total_rolls', 'streak_days', etc.
  requirement_value INTEGER NOT NULL,

  -- Orden y display
  display_order INTEGER DEFAULT 0,
  icon TEXT, -- Emoji o URL de icono

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_achievements_category ON achievements(category);
```

**Tabla 4: `daily_missions`**
```sql
CREATE TABLE daily_missions (
  user_id TEXT NOT NULL,
  mission_date DATE NOT NULL, -- Fecha del día (para resetear diariamente)

  -- Misión 1 (Fácil)
  mission1_id TEXT NOT NULL,
  mission1_progress INTEGER DEFAULT 0,
  mission1_completed BOOLEAN DEFAULT false,

  -- Misión 2 (Media)
  mission2_id TEXT NOT NULL,
  mission2_progress INTEGER DEFAULT 0,
  mission2_completed BOOLEAN DEFAULT false,

  -- Misión 3 (Difícil)
  mission3_id TEXT NOT NULL,
  mission3_progress INTEGER DEFAULT 0,
  mission3_completed BOOLEAN DEFAULT false,

  -- Bonus por completar todas
  all_completed_bonus_claimed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, mission_date)
);

CREATE INDEX idx_daily_missions_user ON daily_missions(user_id);
CREATE INDEX idx_daily_missions_date ON daily_missions(mission_date);
```

**Tabla 5: `mission_templates` (Catálogo de misiones)**
```sql
CREATE TABLE mission_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),

  -- Recompensa
  gold_reward INTEGER NOT NULL,

  -- Requisito
  requirement_type TEXT NOT NULL, -- 'obtain_cards', 'do_rolls', 'spend_gold', etc.
  requirement_value INTEGER NOT NULL,
  requirement_filter TEXT, -- Filtro adicional (ej: 'rarity:common', 'rarity:epic+')

  -- Peso para selección aleatoria
  weight INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mission_templates_difficulty ON mission_templates(difficulty);
```

**Campos Clave:**

`user_economy`:
- `gold`: Oro actual (inicia en 5000)
- `total_cards_burned`: Cartas vendidas totales (para logros)
- `daily_claims_count`: Veces que usó /daily (para logros)

`user_achievements`:
- Relación usuario-logro
- `reward_claimed`: Si ya reclamó la recompensa

`achievements`:
- Catálogo de todos los logros disponibles
- `requirement_type` + `requirement_value`: Define qué se necesita

`daily_missions`:
- Misiones del día para cada usuario
- Se resetea diariamente
- Tracking de progreso individual

`mission_templates`:
- Catálogo de misiones posibles
- Se seleccionan aleatoriamente cada día

---

### Lógica de Comandos

**`/daily`**
```
1. Verificar que han pasado 24h desde last_daily_claim
   - Si no: mostrar tiempo restante

2. Calcular días desde last_streak_update:
   - Si es NULL (primer uso): streak_days = 1
   - Si pasó 1 día (24-48h): streak_days++ (continúa)
   - Si pasó 2 días (48-72h): missed_days = 1 (perdón, continúa)
   - Si pasó 3+ días (>72h): streak_days = 1, missed_days = 0 (resetea)

3. Calcular recompensas:
   - Daily base: 1500 oro
   - Streak bonus según tabla: 500-1500 oro
   - Total: 2000-3000 oro

4. Si streak_days == 7:
   - Dar oro del día 7
   - free_rolls_available++
   - streak_days = 0 (resetear)
   - Notificar: "¡Tienes 1 roll x10 gratis disponible!"

5. Actualizar:
   - gold += total_oro
   - total_gold_earned += total_oro
   - last_daily_claim = NOW()
   - last_streak_update = NOW()

6. Retornar: oro ganado, día de streak, bonus, rolls gratis disponibles
```

**`/weekly`**
```
1. Verificar que han pasado 7 días desde last_weekly_claim
   - Si no: mostrar tiempo restante

2. Dar 10,000 oro

3. Actualizar:
   - gold += 10000
   - total_gold_earned += 10000
   - last_weekly_claim = NOW()

4. Retornar mensaje de confirmación con nuevo balance
```

**`/roll [cantidad]`** (cantidad: 1 o 10)
```
1. Si cantidad no especificada: cantidad = 1

2. Verificar si hay free_rolls_available y cantidad == 10:
   - Preguntar: "¿Usar roll gratis? (sí/no)"
   - Si sí: free_rolls_available--, ejecutar gacha, retornar
   - Si no: continuar con lógica normal

3. Calcular costo:
   - 1 roll: 1000 oro
   - 10 rolls: 9000 oro

4. Verificar oro suficiente:
   - Si no: mostrar oro actual y cuánto falta

5. Descontar oro:
   - gold -= costo
   - total_gold_spent += costo
   - total_rolls += cantidad

6. Ejecutar gacha (función separada):
   - Si cantidad == 1: 1 carta aleatoria
   - Si cantidad == 10: 9 cartas aleatorias + 1 legendaria garantizada

7. Retornar cartas obtenidas con animación/embed

8. Actualizar updated_at
```

**`/balance` o `/profile`**
```
1. Obtener datos de user_economy

2. Calcular tiempos restantes:
   - Daily: 24h - (NOW - last_daily_claim)
   - Weekly: 7d - (NOW - last_weekly_claim)

3. Mostrar:
   - Oro actual
   - Streak actual (X/7)
   - Rolls gratis disponibles
   - Próximo daily disponible en: X horas
   - Próximo weekly disponible en: X días
   - Stats: total rolls, oro ganado, oro gastado
   - Total de cartas (COUNT de user_cards)
   - Logros completados (COUNT de user_achievements)
   - Misiones completadas hoy (COUNT de daily_missions)

4. Opcional: Mostrar progreso visual del streak (⭐⭐⭐☆☆☆☆)
```

**`/burn <card_name> [cantidad]`**
```
1. Buscar carta en inventario del usuario:
   - Si no existe: ERROR "No tienes esa carta"

2. Contar cuántas copias tiene:
   - Si tiene solo 1: ERROR "Necesitas al menos 2 copias para vender"

3. Validar carta:
   - Si es única: ERROR "No puedes vender cartas únicas"
   - Si es limitada: ERROR "No puedes vender cartas limitadas"

4. Si cantidad no especificada: cantidad = 1

5. Validar cantidad:
   - Si cantidad >= total_copias: ERROR "No puedes vender todas, debes guardar al menos 1"
   - Si cantidad < 1: ERROR "Cantidad inválida"

6. Calcular oro según rareza:
   - Común: 100 oro/carta
   - Rara: 400 oro/carta
   - Épica: 1500 oro/carta
   - Legendaria: 5000 oro/carta

7. Ejecutar venta:
   - DELETE cantidad de cartas del inventario
   - gold += (cantidad × precio)
   - total_cards_burned += cantidad
   - total_gold_earned += oro_ganado

8. Verificar logro "Vende Tu Primera Carta" si es primera vez

9. Retornar: cartas vendidas, oro ganado, nuevo balance
```

**`/achievements` o `/logros [categoria]`**
```
1. Obtener todos los logros del sistema

2. Si categoria especificada:
   - Filtrar por categoria

3. Para cada logro:
   - Verificar si el usuario lo completó (buscar en user_achievements)
   - Calcular progreso actual basado en stats del usuario
   - Marcar como: ✅ Completado, 🔒 No completado, 📊 En progreso

4. Ordenar por:
   - Completados al final
   - En progreso primero
   - Luego bloqueados

5. Mostrar:
   - Nombre del logro
   - Descripción
   - Progreso (ej: "25/100 cartas")
   - Recompensa
   - Estado (completado/en progreso/bloqueado)

6. Si hay logros completados pero no reclamados:
   - Mostrar notificación
   - Opción para reclamar todos

7. Paginación si hay muchos logros
```

**`/claim-achievement <achievement_id>` o botón en /achievements**
```
1. Verificar que el logro está completado
2. Verificar que no ha sido reclamado
3. Dar recompensa:
   - gold += gold_reward
   - free_rolls_available += free_rolls_reward
4. Marcar reward_claimed = true
5. Retornar mensaje de felicitación + recompensas obtenidas
```

**`/missions` o `/misiones`**
```
1. Obtener fecha actual (DATE)

2. Buscar misiones del usuario para hoy:
   - SELECT * FROM daily_missions WHERE user_id = X AND mission_date = TODAY

3. Si no existen misiones para hoy:
   - Generar 3 misiones aleatorias:
     - 1 fácil (random de mission_templates WHERE difficulty = 'easy')
     - 1 media (random de mission_templates WHERE difficulty = 'medium')
     - 1 difícil (random de mission_templates WHERE difficulty = 'hard')
   - INSERT en daily_missions

4. Para cada misión:
   - Obtener template de mission_templates
   - Calcular progreso actual basado en actions del día
   - Mostrar:
     - Nombre
     - Descripción
     - Progreso (ej: "3/10 cartas obtenidas")
     - Recompensa
     - Estado (✅ completada / 📊 en progreso / ⬜ pendiente)

5. Mostrar bonus por completar todas (500 oro)

6. Si todas completadas: mostrar mensaje de felicitación
```

**Sistema automático: Verificar progreso de misiones**
```
Después de cada acción relevante (roll, burn, etc.):
1. Obtener misiones del día del usuario
2. Para cada misión:
   - Si requirement_type coincide con la acción:
     - mission_progress++
     - Si progress >= requirement_value:
       - mission_completed = true
       - gold += gold_reward
       - Notificar usuario
3. Si todas completadas y bonus no reclamado:
   - gold += 500
   - all_completed_bonus_claimed = true
   - Notificar usuario
```

**Sistema automático: Verificar logros**
```
Después de cada acción relevante:
1. Obtener logros NO completados del usuario
2. Para cada logro:
   - Verificar requisito según requirement_type:
     - total_cards: COUNT(user_cards)
     - total_rolls: user_economy.total_rolls
     - etc.
   - Si requisito cumplido:
     - INSERT en user_achievements (reward_claimed = false)
     - Notificar usuario con mensaje especial
```

---

### Balance del Sistema (Casual-Friendly + Opciones)

**JUGADOR CASUAL (Solo /daily + /weekly)**

⏱️ Tiempo: 5-15 min/día

```
Día 1-6:
  Daily base: 1500 oro
  Streak promedio: ~700 oro
  Total: ~2200 oro/día

Día 7:
  Daily base: 1500 oro
  Streak día 7: 1500 oro
  Roll x10 gratis: 9000 oro de valor
  Total: ~12,000 oro de valor

Semana completa:
  Dailies (7 días): 10,500 oro
  Streaks: 5,600 oro
  Weekly: 10,000 oro
  Roll x10 gratis: 9,000 oro valor
  TOTAL: ~35,100 oro de valor/semana

Rolls/semana: ~30 cartas (3 roll x10)
```

---

**JUGADOR ACTIVO (Daily + Weekly + Misiones + Burn ocasional)**

⏱️ Tiempo: 20-30 min/día

```
Por día:
  Daily + Streak: 2,000-3,000 oro
  Misiones (3/3 completas): 3,000 oro
  Burn duplicados: ~500-2,000 oro
  Total: 5,500-8,000 oro/día

Semana completa:
  Dailies + Streaks: 16,100 oro
  Weekly: 10,000 oro
  Roll x10 gratis: 9,000 oro valor
  Misiones (7 días): 21,000 oro
  Burn: 7,000 oro (promedio)
  TOTAL: ~63,100 oro de valor/semana

Rolls/semana: ~60 cartas (casi 7 roll x10)
```

---

**JUGADOR HARDCORE (Todo lo anterior + Logros)**

⏱️ Tiempo: 30-40 min/día (primeras semanas)

```
Por día:
  Daily + Streak: 2,000-3,000 oro
  Misiones: 3,000 oro
  Burn: ~2,000-5,000 oro (más activo)
  Total: 7,000-11,000 oro/día

Semana completa:
  Dailies + Streaks: 16,100 oro
  Weekly: 10,000 oro
  Roll x10 gratis: 9,000 oro valor
  Misiones (7 días): 21,000 oro
  Burn: 21,000 oro (muy activo)
  Logros (primeras semanas): 10,000-30,000 oro
  TOTAL: ~87,100+ oro de valor/semana (sin contar logros)

Rolls/semana: ~90 cartas (10 roll x10)

Nota: Los logros dan boosts grandes al inicio pero son one-time
```

---

**Comparación Rápida:**

| Tipo Jugador | Tiempo/Día | Oro/Semana | Rolls/Semana | Cartas/Semana |
|--------------|------------|------------|--------------|---------------|
| **Casual** | 5-15 min | ~26,100 | ~29 | ~30 |
| **Activo** | 20-30 min | ~54,100 | ~60 | ~60 |
| **Hardcore** | 30-40 min | ~78,100+ | ~87+ | ~90+ |

---

**Tiempo Invertido Detallado:**

```
CASUAL:
  /daily: 30 seg
  Ver rolls (2-3): 3-5 min
  Ver inventario (ocasional): 5 min
  TOTAL: 5-15 min/día

ACTIVO:
  /daily: 30 seg
  /missions: 30 seg
  Completar misiones: 10-15 min
  /burn ocasional: 1-2 min
  Ver rolls/inventario: 5-10 min
  TOTAL: 20-30 min/día

HARDCORE:
  Todo lo anterior
  /achievements: 2-3 min
  /burn frecuente: 3-5 min
  Optimizar estrategia: 5-10 min
  TOTAL: 30-40 min/día
```

---

**Conclusión del Balance:**

✅ **Para Casuales:**
- Solo 5-15 min/día
- 2-3 rolls diarios
- ~30 cartas/semana
- Sin presión, todo opcional

✅ **Para Activos:**
- 20-30 min/día
- 6-8 rolls diarios
- ~60 cartas/semana
- Misiones dan variedad

✅ **Para Hardcore:**
- 30-40 min/día (cómodo)
- 10-12 rolls diarios
- ~90 cartas/semana
- Logros dan satisfacción extra

✅ **Sistema Balanceado:**
- Casuales no se sienten atrás
- Activos tienen incentivos
- Hardcore no se queman
- Todos progresan de forma satisfactoria

---

<!--
═══════════════════════════════════════════════════════════════
SECCIÓN COMENTADA - DISEÑO ORIGINAL (NO USAR)
═══════════════════════════════════════════════════════════════
El contenido a continuación es del diseño original que incluía
sistema de evolución, combate, casino, etc. NO está adaptado
al sistema actual (estrellas fijas, sin evolución).

Se mantiene como referencia pero NO implementar.
═══════════════════════════════════════════════════════════════

💰 Economía ORIGINAL (CON EVOLUCIÓN - NO USAR)
Monedas
Oro (Moneda Principal)
Fuentes diarias (~3900-7500 oro/día):

Daily Reward: 500-1000 oro (CD: 24h)
Login Streak: +100 oro/día consecutivo (máx día 7: 1500 oro + roll gratis)
Misiones Diarias (3): ~2000 oro total
Batallas PvE: 300-2500 oro según dificultad
Batallas PvP: 150-300 oro/victoria (máx 5 victorias/día recompensadas)
Casino: Variable (alto riesgo)
Venta de cartas duplicadas:

Común: 50 oro
Rara: 200 oro
Épica: 800 oro
Legendaria: 3000 oro



Fuentes semanales:

Weekly Bonus: 5000 oro
Misiones Semanales: ~10000 oro total
Temporada PvP: 1000-10000 según tier

Fuentes únicas:

Logros permanentes: 1000-5000 oro c/u
Progreso de campaña: 200-500 oro/nivel
Torre infinita: 100-500 oro/piso

Gemas (Moneda Premium)
Fuentes limitadas (gratuitas):

Login Streak día 7: 10 gemas
Logros importantes: 50 gemas
Evento mensual: 100 gemas
Total mensual gratis: ~200-250 gemas

Usos:

Roll premium: 100 gemas
Reroll misión: 10 gemas
Escudo protección: 20 gemas (24h)
Expansión slots: 50 gemas


🃏 Sistema de Cartas
Tipos de Cartas
1. Cartas Normales

Rareza: Común, Rara, Épica, Legendaria
Stats según rareza
Evolucionables: ★ → ★★★★★
Pueden obtenerse múltiples copias
Costo evolución estándar

2. Cartas Limitadas
Características:

Ediciones numeradas (ej: #17/25)
10-100 copias totales según serie
Stats IGUALES a cartas normales de su rareza
Arte alternativo exclusivo
Efectos visuales especiales

Beneficios (fuera de combate):

-25% costo de evolución
-15% experiencia requerida
+15% exp ganada en batallas
+10% oro de daily reward
-5% fee en mercado
Título especial visible
Acceso a raids exclusivos

NO son más poderosas en combate
3. Cartas Únicas
Características:

Solo 1 copia en todo el servidor
Borde dorado animado
Nombre propio especial
Stats IGUALES a legendarias normales

Lo que las hace especiales:

Pasiva única que afecta el deck completo:

"Dominio Dracónico": Cartas dragón +15% ATK
"Aura de Liderazgo": Cartas adyacentes +10% DEF
"Inspiración": Todas las cartas +5% exp al ganar


Mecánica exclusiva situacional:

"Sacrificio Noble": Protege otra carta 1 vez/batalla
"Memoria de Batalla": Copia última habilidad enemiga
"Resonancia": Cambia de elemento temporalmente


Utilidad fuera de combate:

+5% oro en batallas PvE
-10% costo de mejoras
-15% chance de ser robado



Ventajas de evolución:

-50% costo de evolución
-30% experiencia requerida
Más fácil llevar a ★★★★★

PROTECCIÓN ABSOLUTA:

❌ NO pueden ser robadas/hackeadas
❌ NO pueden ser intercambiadas sin consentimiento
Solo transferibles mediante:

Venta voluntaria (CD 30 días)
Duelo de Honor (ambos aceptan)
Eventos oficiales
Sistema de Legado (inactividad +90 días)



Rareza y Tasas
Roll Básico (1000 oro):

Común: 60%
Rara: 25%
Épica: 12%
Legendaria: 3%

Roll x10 (9000 oro - 10% descuento):

Mismas tasas
Legendaria garantizada en posición 10

Roll Premium (100 gemas):

Común: 40%
Rara: 30%
Épica: 20%
Legendaria: 10%


⭐ Sistema de Estrellas
Filosofía

Todas las cartas inician en ★ cuando se obtienen
Únicas, Limitadas y Normales evolucionan igual
Sistema universal que crea múltiples metas

Costos de Evolución
De → AComúnRaraÉpicaLegendariaÚnicaLimitada★→★★500g + 500exp800g + 500exp1500g + 500exp3000g + 500exp1500g + 350exp2250g + 425exp★★→★★★2000g + 1500exp3000g + 1500exp5000g + 1500exp10000g + 1500exp5000g + 1050exp7500g + 1275exp★★★→★★★★5000g + 5000exp8000g + 5000exp15000g + 5000exp30000g + 5000exp15000g + 3500exp22500g + 4250exp★★★★→★★★★★15000g + 15000exp25000g + 15000exp50000g + 15000exp100000g + 15000exp50000g + 10500exp75000g + 12750exp
Materiales adicionales:

★★★: 5 fragmentos de rareza
★★★★: 15 fragmentos + 1 cristal raro
★★★★★: 30 fragmentos + 5 cristales raros + 1 esencia legendaria

Ganancia de Experiencia

100 exp por batalla ganada
25 exp por batalla perdida
Bonus con cartas limitadas: +15% exp
Eventos especiales: x2 exp

Incremento de Stats por Estrella
Ejemplo - Dragón de Fuego (Legendaria):

-->
