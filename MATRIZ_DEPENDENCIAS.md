# MATRIZ DE DEPENDÊNCIAS — NeonPlay R21
**Formato:** Módulo → deps obrigatórias → deps opcionais → riscos

---

## Ordem de carregamento (HTML script tags — ordem esperada)

```
1. ZapEventContract.js (base R9)     ← deve ser primeiro
2. ZapEventBus.js                    ← deps: ZapEventContract
3. js/zap/NPBus.js                   ← sem deps
4. neonplay-init.js (bundle principal)
   └─ ZapProgressionSystem
   └─ ZapQuestEngine
   └─ ZapEconomy
   └─ ZapStore
   └─ zapCinematics
5. np-r20-*.js (patches R20.x)
6. ZapEventContract.js (R21)         ⚠️ BLOQUEADO por singleton guard (bug R22-02)
7. np-r21-progression-bridge.js
8. NPGameplay.js
9. NPProfile.js
10. NPMissions.js
11. NPAchievements.js
12. NPCompanionEvolution.js
13. np-r21-boot.js                   ← coordena init dos módulos R21
14. np-r22-patch.js                  ← NOVO: deve ser o último
```

---

## Grafo de dependências por módulo

### np-r21-progression-bridge.js
| Dep | Tipo | Acesso | Risco se ausente |
|---|---|---|---|
| `ZapProgressionSystem` | Obrigatória | `window.ZapProgressionSystem` | Bridge não aplica (polling até 15s) |
| `ZapProgressionSystem._ready` | Obrigatória | flag boolean | Bridge não aplica se false |
| `NPBus` | Opcional | `window.NPBus` | XP_GAIN/LEVEL_UP via NPBus não emitidos |
| `ZapEventBus` | Opcional | `window.ZapEventBus` | CORE:XP_CHANGED/CORE:LEVEL_UP não emitidos |
| `ZAP_EVENTS` | Opcional | `window.ZAP_EVENTS` | Idem |
| `NP.lifecycle` | Opcional | `window.NP.lifecycle` | Cleanup do poll não registrado (inofensivo) |

**Dependência circular:** Nenhuma.  
**Riscos:** Se `ZapProgressionSystem` nunca ficar `_ready`, bridge nunca aplica. XP events nunca chegam a R21. Timeout máximo: 15s (30 tentativas × 500ms).

---

### NPGameplay.js
| Dep | Tipo | Acesso | Risco se ausente |
|---|---|---|---|
| `NP.events` | Preferida | `window.NP.events.on/off` | Fallback para NPBus.GAME_OPEN |
| `NPBus` | Fallback | `window.NPBus` | Sem rastreamento de sessão |
| `localStorage` | Opcional | `localStorage.setItem` | try/catch — sem histórico |
| `window._currentGame` | Opcional | leitura | gameId = 'unknown' |
| `NRT.gameSession` | Opcional | leitura para sanctuary | Toasts durante jogo |
| `NP.lifecycle` | Opcional | registerCleanup | Sem cleanup de listeners |

**Dependência circular:** Nenhuma.

---

### NPProfile.js
| Dep | Tipo | Acesso | Risco se ausente |
|---|---|---|---|
| `ZapProgressionSystem` | Obrigatória para sync XP | `getProgress()` | level/xp ficam em 1/0 |
| `ZapEconomy` | Opcional | `getCoins()`, `onChange()` | coins sempre 0 |
| `NPBus` | Opcional | XP_GAIN, GAMEPLAY_SESSION, MISSION_DONE | Profile não se atualiza automaticamente |
| `ZapEventBus` | Opcional | CORE:XP_CHANGED, ACHIEVEMENT_UNLOCK | Idem |
| `localStorage` | Opcional | try/catch | Perfil não persiste |
| `NP.lifecycle` | Opcional | registerCleanup | ⚠️ Leak: 3 NPBus listeners sem cleanup (bug R22-05) |

**Dependência circular:** Nenhuma.

---

### NPMissions.js
| Dep | Tipo | Acesso | Risco se ausente |
|---|---|---|---|
| `NPBus` | Obrigatória p/ XP | `NPBus.EV.XP_GAIN` | Missões de XP não progridem |
| `NPBus.EV.GAMEPLAY_SESSION` | Crítica | antes do R22: **undefined** | Sessões ignoradas — R22-01 fix |
| `ZapEventBus` | Opcional | GAMEPLAY_SESSION_COMPLETE | antes do R22: evento rejeitado — R22-02 fix |
| `ZapEconomy` | Opcional | `addCoins()` | Recompensas em moedas não entregues |
| `localStorage` | Obrigatória p/ persistência | try/catch | Missões reiniciam a cada reload |
| `NRT.gameSession` | Opcional | sanctuary check | Toasts durante jogo |
| `NP.lifecycle` | Opcional | registerCleanup | ✅ XP_GAIN e GAMEPLAY_SESSION removidos |

**Dependência circular:** Nenhuma.  
**Gap funcional:** Missões completadas emitem `MISSION_COMPLETE` mas nenhum módulo consome o `xpReward`. XP de missão nunca é concedido. Ver R23.

---

### NPAchievements.js
| Dep | Tipo | Acesso | Risco se ausente |
|---|---|---|---|
| `ZapEventBus` | Obrigatória | `CORE:LEVEL_UP`, `ACHIEVEMENT_UNLOCK` | ✅ Registrado na base — funciona |
| `NPBus.EV.LEVEL_UP` | Crítica | payload `{level}` vs `{newLevel}` | ❌ Nível não detectado — R22-04 fix |
| `NPBus.EV.MISSION_DONE` | Crítica | antes do R22: **undefined** | Conquistas de missão não desbloqueiam — R22-01 fix |
| `NPBus.EV.GAMEPLAY_SESSION` | Crítica | antes do R22: **undefined** | Conquistas de sessão não desbloqueiam — R22-01 fix |
| `ZapEconomy` | Opcional | `addCoins()` | Recompensas em moedas não entregues |
| `ZapProgressionSystem` | Opcional | `getProgress()` timeout 1500ms | Level check na init não executa |
| `localStorage` | Opcional | try/catch | Estado não persiste |
| `NP.lifecycle` | Opcional | registerCleanup | ✅ ZapEventBus listeners removidos. ⚠️ NPBus LEVEL_UP/MISSION_DONE/GAMEPLAY_SESSION não removidos (R22-05) |

**Dependência circular:** Nenhuma.

---

### NPCompanionEvolution.js
| Dep | Tipo | Acesso | Risco se ausente |
|---|---|---|---|
| `ZapEventBus` | Obrigatória | `CORE:LEVEL_UP` | ✅ Funciona |
| `NPBus.EV.LEVEL_UP` | Crítica | payload mismatch | ❌ Evolução via NPBus não ocorre — R22-04 fix |
| `document.querySelector('.zc-widget')` | Obrigatória p/ visual | DOM | Evolução não aplicada; sem crash |
| `ZapSentience._state` | Opcional | mutation direta de `arousal` | try/catch — sem arousal boost |
| `window.matchMedia` | Opcional | `prefers-reduced-motion` | Assume motion permitida |
| `NRT.gameSession` | Opcional | sanctuary | Toasts/evolução durante jogo |
| `localStorage` | Opcional | try/catch | Forma não persiste entre sessões |
| `NP.lifecycle` | Opcional | registerCleanup | ✅ ZapEventBus CORE:LEVEL_UP removido. ⚠️ NPBus LEVEL_UP não removido (R22-05) |

**Nota:** A mutação direta de `ZapSentience._state.arousal` é tecnicamente invasiva (acessa estado interno privado). Wrapped em try/catch. Risco: se ZapSentience mudar a estrutura `_state`, o código falha silenciosamente (aceitável pelo try/catch).

---

### np-r21-boot.js
| Dep | Tipo | Acesso | Risco se ausente |
|---|---|---|---|
| `ZapProgressionSystem._ready` | Obrigatória p/ timing | evento `NP:progression-ready` | Fallback por polling (12 tentativas × 500ms = 6s) |
| `NPGameplay` | Opcional | `window.NPGameplay.init()` | Modulo simplesmente não inicia |
| `NPProfile` | Opcional | `window.NPProfile.init()` | Idem |
| `NPMissions` | Opcional | `window.NPMissions.init()` | Idem |
| `NPAchievements` | Opcional | `window.NPAchievements.init()` | Idem |
| `NPCompanionEvolution` | Opcional | `window.NPCompanionEvolution.init()` | Idem |
| `document.head` | Obrigatória p/ CSS | `appendChild` | Animações sem keyframes |
| `NP.lifecycle` | Opcional | registerCleanup | Fallback poll não registra cleanup |

**Dependência circular:** Nenhuma.

---

## Riscos globais de arquitetura

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| ZapProgressionSystem nunca emite `NP:progression-ready` | Baixa | Alto — bridge não aplica | Polling 15s no bridge + 6s no boot |
| `ZAP_DEBUG.resetLevel()` zera `__bridged__` | Baixa (só em debug) | Médio — bridge re-wraps | R22-03 documenta; evitar em produção |
| XP de missão nunca concedido | Alta (bug de design) | Médio — feature silenciosa | Listado para R23 |
| Múltiplos inits em SPA (sem full-reload) | Baixa | Médio — listener accumulation | Guards `__NP_*__` previnem para 5 dos 6 bugs |
| ZapSentience mudança de API interna | Baixa | Mínimo — try/catch | Sem ação necessária |
