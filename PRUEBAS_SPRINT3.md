# 🧪 **GUÍA DE PRUEBAS - SPRINT 3: Generación de Respuestas**

> **Objetivo:** Verificar que el sistema de IA genere respuestas correctamente usando Gemini 2.0 Flash

## **📋 Pre-requisitos**

✅ Sprint 1 probado (Filtrado funcionando)
✅ Sprint 2 probado (Memoria funcionando)
✅ Compilación exitosa
✅ GEMINI_API_KEY configurado en .env
✅ Bot iniciado y conectado a Discord

---

## **🎯 CASOS DE PRUEBA - SPRINT 3**

### **Prueba 1: Respuesta básica en servidor**
**Objetivo:** Verificar que el bot responde cuando lo mencionas

**Pasos:**
1. En un canal de servidor, escribe:
   ```
   @Hikari hola, ¿cómo estás?
   ```

**Resultado esperado:**
- ✅ El bot muestra indicador de "escribiendo..."
- ✅ Responde en 1-3 segundos
- ✅ La respuesta es natural y en español
- ✅ Respuesta corta (1-3 oraciones)
- ✅ Usa el estilo de Hikari (alegre, amigable)

**Logs esperados:**
```
[DEBUG] [AI-Event] 🔔 Evento recibido de usuario: "@Hikari hola..."
[DEBUG] [AI] ✅ Mensaje aprobado para procesamiento
[DEBUG] [ContextBuilder] Contexto construido: 0 mensajes, ~200 tokens
[DEBUG] [AI] 🧠 Generando respuesta con 0 mensajes de historial
[DEBUG] [GeminiProvider] Respuesta generada en 1523ms, tokens: 145
[INFO] [AI] ✅ Respuesta enviada a usuario (145 tokens, 1523ms)
```

---

### **Prueba 2: Conversación con contexto**
**Objetivo:** Verificar que el bot recuerda mensajes previos

**Pasos:**
1. Menciona al bot:
   ```
   @Hikari mi nombre es [TuNombre]
   ```
2. Espera la respuesta
3. Envía otro mensaje:
   ```
   @Hikari ¿cuál es mi nombre?
   ```

**Resultado esperado:**
- ✅ El bot menciona tu nombre correctamente
- ✅ Demuestra memoria de la conversación
- ✅ Respuesta coherente con el contexto

**Logs esperados:**
```
[DEBUG] [ContextBuilder] Contexto construido: 2 mensajes, ~250 tokens
[DEBUG] [AI] 🧠 Generando respuesta con 2 mensajes de historial
```

---

### **Prueba 3: Respuesta en DM (mensaje directo)**
**Objetivo:** Verificar que adapta su tono en DM

**Pasos:**
1. Envía un DM al bot (sin mencionar):
   ```
   hola Hikari, cuéntame algo interesante
   ```

**Resultado esperado:**
- ✅ Responde sin necesidad de mención
- ✅ Respuesta más personal y detallada
- ✅ Puede ser más larga que en servidor

**Logs esperados:**
```
[DEBUG] [ContextBuilder] Contexto construido: 0 mensajes, ~220 tokens
```

---

### **Prueba 4: Respuesta con historial largo**
**Objetivo:** Verificar optimización de historial

**Pasos:**
1. Ten una conversación de 5+ mensajes con el bot
2. Verifica que mantiene coherencia

**Resultado esperado:**
- ✅ El bot recuerda los últimos 5 mensajes en servidor
- ✅ El bot recuerda los últimos 10 mensajes en DM
- ✅ Respuestas coherentes con el contexto

**Logs esperados:**
```
[DEBUG] [ContextBuilder] Contexto construido: 5 mensajes, ~400 tokens
[DEBUG] [AI] 🧠 Generando respuesta con 5 mensajes de historial
```

---

### **Prueba 5: Control de cooldown**
**Objetivo:** Verificar que respeta el cooldown de 4 segundos

**Pasos:**
1. Envía dos mensajes rápidamente (menos de 4 segundos):
   ```
   @Hikari mensaje 1
   @Hikari mensaje 2
   ```

**Resultado esperado:**
- ✅ Responde al primer mensaje
- ⏸️ Ignora el segundo (cooldown activo)

**Logs esperados:**
```
[DEBUG] [AI] ❌ Bloqueado L3-Command: Usuario en período de espera (3s restantes)
```

---

### **Prueba 6: Rate limiting**
**Objetivo:** Verificar límite de 10 mensajes por minuto

**Pasos:**
1. Intenta enviar 11 mensajes en menos de 1 minuto

**Resultado esperado:**
- ✅ Responde a los primeros 10 mensajes
- ⏸️ Bloquea el mensaje 11

**Logs esperados:**
```
[DEBUG] [AI] ❌ Bloqueado L3-Command: Límite de mensajes excedido (45s restantes)
```

---

### **Prueba 7: Personalidad de Hikari**
**Objetivo:** Verificar que mantiene su personalidad

**Pasos:**
1. Haz diferentes tipos de preguntas:
   ```
   @Hikari cuéntame un chiste
   @Hikari ¿qué opinas del clima?
   @Hikari ayúdame con algo
   ```

**Resultado esperado:**
- ✅ Respuestas alegres y amigables
- ✅ Usa lenguaje casual
- ✅ Puede usar emojis ocasionalmente
- ✅ Nunca menciona que es una IA

---

### **Prueba 8: Manejo de errores de API**
**Objetivo:** Verificar comportamiento cuando hay error

**Pasos:**
1. Si llegas al límite de cuota de Gemini, verifica el mensaje

**Resultado esperado:**
- ✅ Muestra mensaje de error amigable
- ✅ No crashea el bot

**Logs esperados:**
```
[ERROR] [GeminiProvider] Error al generar respuesta
[INFO] [AI] Lo siento, he alcanzado mi límite de conversaciones por hoy
```

---

### **Prueba 9: Tokens consumidos**
**Objetivo:** Verificar que se registran los tokens usados

**Pasos:**
1. Envía varios mensajes
2. Usa el comando dev para ver estadísticas:
   ```
   *dev
   ```

**Resultado esperado:**
- ✅ Muestra tokens consumidos
- ✅ Muestra presupuesto restante
- ✅ Actualiza después de cada respuesta

**Ejemplo de salida:**
```
📊 FILTROS
─────────────────────────────────────────────
  Procesados: 15
  Aprobados : 12
  Bloqueados: 3

💾 TOKENS
─────────────────────────────────────────────
  Usados    : 1,245
  Restantes : 26,755
```

---

### **Prueba 10: Mención sin texto**
**Objetivo:** Verificar embed de ayuda

**Pasos:**
1. Solo menciona al bot sin texto:
   ```
   @Hikari
   ```

**Resultado esperado:**
- ✅ Muestra embed con información de ayuda
- ✅ No intenta generar respuesta con IA
- ✅ Explica cómo usar el bot

---

## **🔍 VERIFICACIÓN DE LOGS**

Durante las pruebas, verifica que aparezcan estos logs:

### **Logs de inicialización:**
```
[INFO] [AIManager] Sistema de IA inicializado
[INFO] [GeminiProvider] Provider inicializado correctamente
```

### **Logs de procesamiento:**
```
[DEBUG] [AI-Event] 🔔 Evento recibido de usuario
[DEBUG] [AI] ✅ Mensaje aprobado para procesamiento
[DEBUG] [ContextBuilder] Contexto construido: X mensajes, ~Y tokens
[DEBUG] [AI] 🧠 Generando respuesta con X mensajes de historial
[DEBUG] [GeminiProvider] Respuesta generada en Xms, tokens: Y
[INFO] [AI] ✅ Respuesta enviada a usuario (Y tokens, Xms)
[DEBUG] [ContextBuilder] Interacción guardada para usuario
```

---

## **✅ CHECKLIST DE VERIFICACIÓN**

Marca cada item cuando lo pruebes:

**Funcionalidad básica:**
- [ ] Responde cuando lo mencionan
- [ ] Muestra "escribiendo..." antes de responder
- [ ] Respuestas en 1-3 segundos
- [ ] Respuestas en español
- [ ] No crashea con errores

**Personalidad:**
- [ ] Tono alegre y amigable
- [ ] Respuestas naturales y cortas
- [ ] Lenguaje casual
- [ ] Nunca menciona que es IA
- [ ] Usa emojis ocasionalmente

**Contexto y memoria:**
- [ ] Recuerda mensajes previos
- [ ] Respuestas coherentes con el contexto
- [ ] Diferentes tonos: DM vs Servidor
- [ ] Historial optimizado (3, 5, 10 mensajes)

**Control de recursos:**
- [ ] Cooldown de 4 segundos funciona
- [ ] Rate limiting de 10 msg/min funciona
- [ ] Tokens se registran correctamente
- [ ] Presupuesto diario se controla

**Logs y debugging:**
- [ ] Logs de inicialización aparecen
- [ ] Logs de procesamiento son claros
- [ ] Errores se manejan correctamente
- [ ] Comando dev muestra estadísticas

---

## **🚨 PROBLEMAS COMUNES**

### **Problema: Bot no responde**
**Solución:**
1. Verifica logs: ¿Se activó el evento?
2. Verifica filtros: ¿Fue bloqueado?
3. Verifica API key: ¿Es válida?
4. Verifica cuota: ¿Llegaste al límite?

### **Problema: Error 429 (Too Many Requests)**
**Solución:**
1. Espera 1 minuto
2. Verifica que usas `gemini-2.0-flash` (no `-exp`)
3. Revisa tu cuota en: https://ai.dev/usage

### **Problema: Respuestas muy lentas**
**Solución:**
1. Es normal: 1-3 segundos
2. Verifica conexión a internet
3. Revisa logs de tiempo de procesamiento

### **Problema: Bot menciona que es IA**
**Solución:**
1. Esto NO debería pasar
2. Verifica que `PromptBuilder.ts` tenga las reglas correctas
3. Reporta el mensaje exacto

---

## **📊 MÉTRICAS ESPERADAS**

Después de las pruebas, verifica estas métricas:

**Rendimiento:**
- ⏱️ Tiempo de respuesta: 1-3 segundos
- 🔢 Tokens por mensaje: 100-300
- 💾 Memoria usada: < 100MB adicional

**Precisión:**
- ✅ 100% respuestas en español
- ✅ 100% respeta cooldown
- ✅ 100% recuerda contexto reciente
- ✅ 0% menciona que es IA

**Estabilidad:**
- ✅ 0 crashes durante pruebas
- ✅ Manejo correcto de errores
- ✅ Logs claros y útiles

---

## **🎉 SPRINT 3 APROBADO SI:**

✅ Todas las pruebas básicas (1-5) pasan
✅ Personalidad de Hikari es consistente
✅ Contexto y memoria funcionan correctamente
✅ Control de recursos (cooldowns, tokens) funciona
✅ Logs son claros y completos
✅ No hay crashes ni errores críticos

---

**¡Buena suerte con las pruebas!** 🚀

Si encuentras algún problema, revisa los logs y compártelos para debugging.
