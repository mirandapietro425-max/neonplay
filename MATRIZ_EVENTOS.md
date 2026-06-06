# MATRIZ DE EVENTOS — NeonPlay R21 + R22
**Legenda:**  
✅ Funcional | ❌ Quebrado (bug comprovado) | ⚠️ Parcial | 🔧 Corrigido pelo R22

---

## NPBus (bus simples, aceita qualquer string)

| Evento (constante EV) | String real | Emissor | Consumidor | Status R21 | Status R22 |
|---|---|---|---|---|---|
| `EV.XP_GAIN` | `'xp:gain'` | np-r21-progression-bridge, neonplay-init | NPMissions, NPProfile, NPAchievements (via bridge check), ZapNotifications | ✅ | ✅ |
| `EV.LEVEL_UP` | `'xp:levelup'` | np-r21-progression-bridge, neonplay-init | NPAchievements, NPCompanionEvolution | ❌ Payload `{level}` ≠ `{newLevel}` | 🔧 R22-04 |
| `EV.GAME_OPEN` | `'game:open'` | neonplay-init (patchGameClicks), np-r20-8 | ZapCompanionController, ZapBrain | ✅ | ✅ |
| `EV.GAMEPLAY_SESSION` | **undefined** (ausente!) | NPGameplay | NPMissions, NPAchievements, NPProfile | ❌ EV não existe | 🔧 R22-01 → `'gameplay:session'` |
| `EV.MISSION_DONE` | **undefined** (ausente!) | NPMissions | NPAchievements, NPProfile | ❌ EV não existe | 🔧 R22-01 → `'mission:done'` |
| `EV.MISSION_PROGRESS` | **undefined** (ausente!) | NPMissions | (sem consumer atual) | ❌ EV não existe | 🔧 R22-01 → `'mission:progress'` |
| `EV.PROFILE_UPDATE` | **undefined** (ausente!) | NPProfile | (sem consumer atual) | ❌ EV não existe | 🔧 R22-01 → `'profile:update'` |
| `EV.QUEST_DONE` | `'quest:done'` | ZapQuestEngine | ZapBrain, ZapSentience | ✅ | ✅ |
| `EV.QUEST_ALL_DONE` | `'quest:alldone'` | ZapQuestEngine | ZapBrain | ✅ | ✅ |
| `EV.IDLE_ACTIVE` | `'idle:active'` | NPClock | ZapBrain, ZapSentience | ✅ | ✅ |
| `EV.IDLE_IDLE` | `'idle:idle'` | NPClock | ZapBrain | ✅ | ✅ |
| `EV.IDLE_SLEEPY` | `'idle:sleepy'` | NPClock | ZapSentience | ✅ | ✅ |
| `EV.IDLE_DREAMING` | `'idle:dreaming'` | NPClock | ZapSentience | ✅ | ✅ |
| `EV.MOOD_CHANGE` | `'mood:change'` | ZapMoodSystem | ZapBioreactive, ZapSentience | ✅ | ✅ |
| `EV.SPEAK` | `'zap:speak'` | ZapBrain | ZapSpeech | ✅ | ✅ |
| `EV.STATE_CHANGE` | `'zap:state_change'` | ZapStateCoordinator | múltiplos | ✅ | ✅ |
| `EV.RUNTIME_SLEEP` | `'runtime:sleep'` | NPClock | np-r20-4 | ✅ | ✅ |
| `EV.RUNTIME_RESUME` | `'runtime:resume'` | NPClock | np-r20-4 | ✅ | ✅ |
| `EV.PERF_DEGRADED` | `'perf:degraded'` | NPPerformanceBudget | ZapBehaviorDirector | ✅ | ✅ |
| `'gameplay:start'` (string literal) | `'gameplay:start'` | np-r20-6, np-r20-8 | np-r20-8 | ✅ | ✅ |
| `'gameplay:end'` (string literal) | `'gameplay:end'` | np-r20-6, np-r20-8 | np-r20-8 | ✅ | ✅ |

---

## ZapEventBus (governado, valida tipo + payload)

| Evento (constante ZAP_EVENTS) | String real | Emissor | Consumidor | Status R21 | Status R22 |
|---|---|---|---|---|---|
| `CORE_XP_CHANGED` | `'CORE:XP_CHANGED'` | np-r21-progression-bridge | NPProfile | ✅ Registrado na base | ✅ |
| `CORE_LEVEL_UP` | `'CORE:LEVEL_UP'` | np-r21-progression-bridge | NPAchievements, NPCompanionEvolution | ✅ Registrado na base | ✅ |
| `ECONOMY_COINS_CHANGED` | `'ECONOMY:COINS_CHANGED'` | ZapEconomy | ZapBadges, ZapStore UI | ✅ | ✅ |
| `QUEST_PROGRESS` | `'QUEST:PROGRESS'` | ZapQuestEngine | ZapCompanion HUD | ✅ | ✅ |
| `COMPANION_DROP` | `'COMPANION:DROP'` | ZapCompanionController | ZapBadges | ✅ | ✅ |
| `COMPANION_MOOD` | `'COMPANION:MOOD'` | ZapMoodSystem | ZapBioreactive | ✅ | ✅ |
| `COMPANION_SPEECH` | `'COMPANION:SPEECH'` | ZapBrain | ZapCompanion UI | ✅ | ✅ |
| `ACHIEVEMENT_UNLOCK` | `'ACHIEVEMENT:UNLOCK'` | NPAchievements, ZapBadges | NPProfile, ZapBadges bridge | ✅ | ✅ |
| `LORE_FRAGMENT_UNLOCK` | `'LORE:FRAGMENT_UNLOCK'` | ZapLoreEngine | ZapBrain | ✅ | ✅ |
| `WORLD_THEME_CHANGE` | `'WORLD:THEME_CHANGE'` | ZapWorldEngine | ZapBioreactive | ✅ | ✅ |
| `WORLD_GLITCH_START` | `'WORLD:GLITCH_START'` | ZapWorldEngine | ZapSentience | ✅ | ✅ |
| `WORLD_GLITCH_END` | `'WORLD:GLITCH_END'` | ZapWorldEngine | ZapSentience | ✅ | ✅ |
| `BRAIN_SPEECH` | `'BRAIN:SPEECH'` | ZapBrain | ZapSpeech | ✅ | ✅ |
| `BRAIN_MOOD_CHANGED` | `'BRAIN:MOOD_CHANGED'` | ZapBrain | ZapBioreactive | ✅ | ✅ |
| `BRAIN_LORE_TRIGGER` | `'BRAIN:LORE_TRIGGER'` | ZapBrain | ZapLoreEngine | ✅ | ✅ |
| `LIFECYCLE_DESTROY` | `'LIFECYCLE:DESTROY'` | NP.lifecycle | todos com registerCleanup | ⚠️ Chave duplicada no base contract (inofensivo — mesmo valor) | ✅ |
| `GAMEPLAY_SESSION_COMPLETE` | `'GAMEPLAY:SESSION_COMPLETE'` | NPGameplay | NPMissions | ❌ Não registrado em ZAP_EVENTS | 🔧 R22-02 |
| `PROFILE_SNAPSHOT_UPDATE` | `'PROFILE:SNAPSHOT_UPDATE'` | NPProfile | (sem consumer atual) | ❌ Não registrado | 🔧 R22-02 |
| `MISSION_PROGRESS` | `'MISSION:PROGRESS'` | NPMissions | (sem consumer atual) | ❌ Não registrado | 🔧 R22-02 |
| `MISSION_COMPLETE` | `'MISSION:COMPLETE'` | NPMissions | (sem consumer atual) | ❌ Não registrado | 🔧 R22-02 |
| `ACHIEVEMENT_PROGRESS` | `'ACHIEVEMENT:PROGRESS'` | NPAchievements | (sem consumer atual) | ❌ Não registrado | 🔧 R22-02 |
| `COMPANION_FORM_CHANGE` | `'COMPANION:FORM_CHANGE'` | NPCompanionEvolution | (sem consumer atual) | ❌ Não registrado | 🔧 R22-02 |

---

## NP.events (bus legado de baixo nível, R20.x)

| Evento | Emissor | Consumidor | Status |
|---|---|---|---|
| `'gameplay:start'` | np-r20-6 MutationObserver | NPGameplay.init, np-r20-8 | ✅ |
| `'gameplay:end'` | np-r20-6 | NPGameplay.init, np-r20-8 | ✅ |

---

## Eventos emitidos mas sem consumer ativo (R21)

Estes eventos são emitidos corretamente mas nenhum módulo R21 atual os consome. Não são bugs — são extensões para futuras features:

- `PROFILE:SNAPSHOT_UPDATE` — emitido por NPProfile, nenhum consumer
- `MISSION:PROGRESS` — emitido por NPMissions, nenhum consumer (UI renderiza via `getDailyMissions()`)
- `MISSION:COMPLETE` — emitido por NPMissions, nenhum consumer upstream de XP
- `ACHIEVEMENT:PROGRESS` — emitido por NPAchievements, nenhum consumer
- `COMPANION:FORM_CHANGE` — emitido por NPCompanionEvolution, nenhum consumer
- `profile:update` (NPBus) — emitido por NPProfile, nenhum consumer

**Nota sobre XP de Missão:** NPMissions emite `MISSION_COMPLETE` mas nenhum módulo o consome para conceder XP via `addXP()`. O XP de missão (`mission.xp`) fica declarado nos objetos mas **nunca é concedido**. Este é um gap funcional — não é um crash, mas significa que completar missões R21 não adiciona XP à barra de progresso. Listado como melhoria futura crítica para R23.
