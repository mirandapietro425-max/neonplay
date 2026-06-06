# RELATÓRIO DE AUDITORIA R22 — NeonPlay
**Data:** 2026-06-06  
**Build auditado:** R21 (np-r21-*.js + ZapEventContract.js R21)  
**Base auditada:** R20.11 (zapgame-merged)  
**Arquiteto-Chefe / QA:** Auditoria automática completa  

---

## SUMÁRIO EXECUTIVO

O build R21 apresenta **5 bugs comprovados**, sendo 2 críticos (funcionalidade silenciosamente quebrada), 2 médios (memory leaks em cenários de SPA) e 1 baixo (risco latente). Nenhum bug causa crash ou perda de dados. O patch R22 os corrige sem modificar nenhum arquivo existente.

| Severidade | Qtd | IDs |
|---|---|---|
| 🔴 Crítico | 2 | R22-01, R22-02 |
| 🟡 Médio | 2 | R22-04, R22-05 |
| 🟢 Baixo | 1 | R22-03 |

---

## 1. ANÁLISE DO EVENT BUS

### 1.1 ZapEventBus (governado)

O bus é sólido. `ZapEventBus.emit()` valida tipo contra `ZAP_EVENT_VALID()` antes de despachar. Guard de payload ausente retorna `false` silenciosamente. `off()` funciona corretamente via filter. Nenhum memory leak estrutural no bus em si.

**Bug R22-02 detectado aqui:** `ZAP_EVENT_VALID()` é construído a partir de `ZAP_EVENTS` no momento da execução de `ZapEventContract.js`. Como o contrato base (R9) carrega antes do contrato R21 — e ambos têm `if (window.ZAP_EVENTS) return;` — o contrato R21 é um **no-op completo**. Os 6 eventos R21 nunca entram em `_validSet`. Resultado: todos os `ZapEventBus.emit()` de módulos R21 são silenciosamente descartados com `console.warn`.

### 1.2 NPBus

NPBus não valida event names — aceita qualquer string, incluindo `undefined`. Isso é correto por design (bus simples), mas cria risco quando consumers usam `NPBus.EV.X` e a constante não existe.

**Bug R22-01 detectado aqui:** `NPBus.EV` não define `GAMEPLAY_SESSION`, `MISSION_DONE`, `MISSION_PROGRESS` e `PROFILE_UPDATE`. Qualquer `NPBus.emit(NPBus.EV.GAMEPLAY_SESSION, ...)` emite para a chave `undefined`, produzindo silêncio total.

---

## 2. MATRIZ DE EVENTOS (resumo — ver MATRIZ_EVENTOS.md para tabela completa)

Eventos críticos quebrados no estado R21 sem patch:

| Evento | Emissor | Consumidor | Status R21 | Status R22 |
|---|---|---|---|---|
| `gameplay:session` (NPBus) | NPGameplay | NPMissions, NPAchievements, NPProfile | ❌ EV undefined | ✅ Fix R22-01 |
| `mission:done` (NPBus) | NPMissions | NPAchievements, NPProfile | ❌ EV undefined | ✅ Fix R22-01 |
| `GAMEPLAY:SESSION_COMPLETE` (ZapBus) | NPGameplay | NPMissions | ❌ Evento não registrado | ✅ Fix R22-02 |
| `MISSION:COMPLETE` (ZapBus) | NPMissions | — | ❌ Evento não registrado | ✅ Fix R22-02 |
| `CORE:LEVEL_UP` via NPBus | neonplay-init | NPAchievements, NPCompanionEvolution | ❌ payload `{level}` ≠ `{newLevel}` | ✅ Fix R22-04 |

---

## 3. ANÁLISE DO PROGRESSION BRIDGE

### Validação: addXP() dispara duas vezes?

**Não.** O guard `ZPS.__bridged__ = true` (linha 29 da bridge) impede que `_applyBridge()` execute duas vezes mesmo com a corrida entre `NP:progression-ready` (event listener) e o polling `setInterval` de 500ms.

### Validação: double-wrap

**Confirmado, mas impacto baixo.** A função `_applyBridge()` sobrescreve `ZPS.addXP` em dois pontos distintos dentro da mesma execução (linhas 33 e 96). A segunda sobrescrita envolve a primeira. A cadeia completa ao chamar `addXP(100, 'test')`:

```
ZPS.addXP [Layer 5 — bridge level-check]
  └→ ZPS.addXP [Layer 4 — bridge events]
       └→ ZPS.addXP [Layer 3 — neonplay-init coins]
            └→ ZPS.addXP [Layer 2 — neonplay-init weekend 2×]
                 └→ ZPS.addXP [Layer 1 — original state update]
```

Resultado: 1× state update, 1× XP_GAIN emitido, 1× _checkLevelUp agendado via setTimeout(100ms). **Funcionalmente correto.** Risco: se `ZAP_DEBUG.resetLevel()` zerar `__bridged__`, a bridge pode ser re-aplicada, criando Layer 6+7. O R22-03 documenta e mitiga esse risco.

### Validação: XP chega aos módulos?

Com o patch R22 aplicado:
- ✅ **Missions**: recebe via `NPBus.EV.XP_GAIN` (string `'xp:gain'` — já existia no EV)
- ✅ **Missions**: recebe sessões via `NPBus.EV.GAMEPLAY_SESSION` (R22-01 fix)
- ✅ **Achievements**: recebe level-up via `ZapEventBus CORE:LEVEL_UP` + NPBus após R22-04
- ✅ **Companion**: recebe level-up via `ZapEventBus CORE:LEVEL_UP` + NPBus após R22-04
- ✅ **Profile**: sincroniza via `ZapProgressionSystem.getProgress()` diretamente
- ✅ **Gameplay**: emite sessão corretamente; não depende de XP

Sem o patch R22:
- ❌ Missions não conta sessões (GAMEPLAY_SESSION undefined)
- ❌ Achievements não desbloqueia por level (payload `{level}` ignorado)
- ❌ Companion não evolui por level (mesmo payload mismatch)

---

## 4. COMPATIBILIDADE R20.11

| Check | Status |
|---|---|
| ZapQuestEngine continua funcionando | ✅ Intocado |
| ZapProgressionSystem.addXP chain | ✅ Preservado (patch não adiciona camadas) |
| neonplay-init.js showLevelUp / showXpToast | ✅ Não modificados |
| np-r20-11-init-coordinator.js | ✅ Intocado |
| ZapEventBus base listeners | ✅ R22 só adiciona ao _validSet |
| NPBus handlers existentes (R14-R20) | ✅ Nenhum removido |
| ZapCompanion, ZapBioreactive, ZapSentience | ✅ Intocados |
| LocalStorage keys existentes | ✅ Nenhuma alterada |

---

## 5. ANÁLISE DE PERFORMANCE

| Item | Ocorrência | Severidade | Status |
|---|---|---|---|
| `setInterval` sem clear — bridge poll | np-r21-progression-bridge.js:112 | Baixo | ✅ Tem `clearInterval` ao encontrar ZPS |
| `setInterval` sem clear — boot fallback | np-r21-boot.js:138 | Baixo | ✅ Tem `clearInterval` ao atingir _fallbackMax |
| MutationObserver sem disconnect | np-r20-11-init-coordinator.js:35 | Baixo | ✅ `disconnect()` em setTimeout(5000) e timeout(10000) |
| `requestAnimationFrame` em partículas | NPCompanionEvolution.js:193 | Baixo | ✅ RAF único por partícula, não loop infinito |
| `setTimeout` múltiplos aninhados | NPCompanionEvolution.js:151-241 | Mínimo | ✅ Todos têm duração finita (≤700ms) |
| Forced reflow em `getBoundingClientRect` | NPCompanionEvolution.js:164 `_spawnEvolutionParticles` | Baixo | ℹ️ Chamado apenas em level-up (raro) |
| Layout Thrashing | Nenhum detectado | — | ✅ |
| Event Storm | Nenhum detectado | — | ✅ |
| ResizeObserver | Não usado | — | ✅ |
| Intervalos eternos | Nenhum | — | ✅ |

**Conclusão de performance:** O build não apresenta regressões de performance. O único acesso ao layout (`getBoundingClientRect`) é infrequente (apenas em level-up com mudança de forma), o que é aceitável.

---

## 6. UX E INTERFACE

| Item | Status |
|---|---|
| Toast de missão (`z-index: 9001`) | ✅ Acima de overlays normais |
| Toast de conquista (`z-index: 9999`) | ✅ Mais alto — correto para prioridade |
| Notificação de evolução (`z-index: 9998`) | ✅ Abaixo de conquista — correto |
| Gameplay Sanctuary — toasts bloqueados durante jogo | ✅ Todos os módulos verificam `NRT.gameSession.active` |
| `prefers-reduced-motion` | ✅ NPCompanionEvolution e CSS R21 respeitam |
| Elementos invisíveis clicáveis | ✅ `pointer-events: none` nos containers de toast |
| Overflow horizontal | Não detectado |
| Mobile (375px) | ✅ Mencionado explicitamente em NPCompanionEvolution |
| Scroll lock | Não detectado |
| Modais presos | Não detectado |
| `aria-live` em toasts | ✅ Presente em todos os toasts |

---

## 7. ROBUSTEZ — CENÁRIOS EXTREMOS

| Cenário | Comportamento | Status |
|---|---|---|
| Sem LocalStorage | `_load()` retorna `_fresh()` com `catch(e){}` em todos os módulos | ✅ |
| LocalStorage corrompido (`JSON.parse` falha) | `catch(e)` retorna default em todos | ✅ |
| XP = 0 | `addXP(0)` propaga normalmente; `gained: 0` emitido | ✅ |
| XP negativo | ZapProgressionSystem lida internamente; bridge apenas passa o valor | ⚠️ Sem validação no bridge |
| XP muito alto | Sem overflow detectado; `Math.min` em progress bars | ✅ |
| Reload durante animação de toast | Toasts são DOM efêmero, desaparecem no reload | ✅ |
| Módulos carregando fora de ordem | Guards `__NP_*__` + polling em bridge/boot previnem race | ✅ |
| Ausência de EventBus | Todos os módulos verificam `window.ZapEventBus &&` | ✅ |
| Ausência de NPBus | Todos os módulos verificam `window.NPBus &&` | ✅ |

**Nota sobre XP negativo:** bridge não valida `amount`. Se `addXP(-50)` for chamado, o evento `XP_GAIN` é emitido com `gained: -50`. NPMissions soma esse valor ao contador de XP diário, podendo torná-lo negativo. Não é crítico mas é um risco de robustez. Listado como melhoria futura.

---

## 8. MAPA ARQUITETURAL

```
Boot (np-r21-boot.js)
├── ZapEventContract (base R9)           ← Carrega PRIMEIRO
│   └── [R22-02] R21 events BLOQUEADOS   ← Bug crítico corrigido pelo patch
├── ZapEventBus                          ← Depende de ZapEventContract
├── NPBus (js/zap/NPBus.js)
│   └── [R22-01] EV constants ausentes   ← Bug crítico corrigido pelo patch
├── ZapProgressionSystem (neonplay-init)
│   ├── addXP [Layer 1: original]
│   ├── addXP [Layer 2: weekend 2×]      ← neonplay-init linha 1139
│   └── addXP [Layer 3: coins]           ← neonplay-init linha 1556
│
├── np-r21-progression-bridge
│   ├── addXP [Layer 4: eventos]         ← emite XP_GAIN + CORE:XP_CHANGED
│   └── addXP [Layer 5: level-check]     ← [R22-03] double-wrap (baixo impacto)
│       └── _checkLevelUp (setTimeout 100ms)
│           └── emite LEVEL_UP + CORE:LEVEL_UP
│               └── [R22-04] payload {level} ≠ {newLevel} ← corrigido
│
├── NPGameplay                           ← Sem deps de XP; emite GAMEPLAY_SESSION
│   └── Emite: NPBus.EV.GAMEPLAY_SESSION [R22-01] + ZAP_EVENTS.GAMEPLAY_SESSION_COMPLETE [R22-02]
│
├── NPProfile                            ← Subscribe XP_GAIN, GAMEPLAY_SESSION, MISSION_DONE
│   └── [R22-05] 3 listeners anônimos não rastreados
│
├── NPMissions                           ← Subscribe XP_GAIN, GAMEPLAY_SESSION, MISSION_COMPLETE
│   └── Emite: MISSION_PROGRESS, MISSION_COMPLETE
│
├── NPAchievements                       ← Subscribe CORE:LEVEL_UP, LEVEL_UP (NPBus), MISSION_DONE
│   └── [R22-05] anonymous LEVEL_UP wrapper não removível
│       [R22-04] LEVEL_UP payload mismatch corrigido pelo patch
│
└── NPCompanionEvolution                 ← Subscribe CORE:LEVEL_UP, LEVEL_UP (NPBus)
    └── [R22-05] anonymous LEVEL_UP wrapper não removível
        [R22-04] LEVEL_UP payload mismatch corrigido pelo patch
```

---

## 9. MELHORIAS FUTURAS (não bugs)

1. **Validar `amount` em addXP bridge**: rejeitar valores negativos ou NaN antes de emitir.
2. **ZAP_SCHEMAS_R21**: ZapEventBus não valida schemas de eventos R21. Mover para `ZAP_SCHEMAS` na próxima versão do contrato.
3. **NPBus.EV deveria ser frozen**: evitaria adições acidentais de propriedades.
4. **Unificar versão do ZapEventContract**: ter um único arquivo que inclui todos os eventos (base + R21) eliminaria o singleton guard problem.
5. **Named handlers em NPAchievements/NPCompanionEvolution**: substituir wrappers anônimos por referências nomeadas para permitir `off()` limpo.
6. **NPProfile _subscribe() refactor**: extrair todos os `NPBus.on()` para array de `[unsub]` e iterar no cleanup.

---

## VEREDICTO

> O build R21 é **funcionalmente parcial** sem o patch R22. As pipelines de Missões e Conquistas operam em modo silencioso por causa dos bugs R22-01 e R22-02. O Companion não evolui via level-up por causa de R22-04. Com o patch R22 aplicado, o build atinge **estabilidade funcional completa**. Nenhum dado é corrompido e nenhum módulo R20.11 é afetado.
