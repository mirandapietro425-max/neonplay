;(function (window) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     NeonPlay R9 — ZapEventContract.js
     Registry imutável de todos os eventos do ecossistema Zap.
     ─────────────────────────────────────────────────────────────
     REGRAS:
       • Object.freeze em toda a árvore.
       • Nenhum módulo emite string solta — usa ZAP_EVENTS.X.
       • Payload schemas são documentação viva + validação leve.
     ─────────────────────────────────────────────────────────────
     Versão: R9.0
  ═══════════════════════════════════════════════════════════════ */

  /* Singleton guard */
  if (window.ZAP_EVENTS) return;

  /* ── Event registry ─────────────────────────────────────────── */
  window.ZAP_EVENTS = Object.freeze({

    /* Core progression */
    CORE_XP_CHANGED  : 'CORE:XP_CHANGED',
    CORE_LEVEL_UP    : 'CORE:LEVEL_UP',

    /* Economy */
    ECONOMY_COINS_CHANGED : 'ECONOMY:COINS_CHANGED',

    /* Quests */
    QUEST_PROGRESS   : 'QUEST:PROGRESS',

    /* Companion */
    COMPANION_DROP   : 'COMPANION:DROP',
    COMPANION_MOOD   : 'COMPANION:MOOD',
    COMPANION_SPEECH : 'COMPANION:SPEECH',

    /* Achievements */
    ACHIEVEMENT_UNLOCK : 'ACHIEVEMENT:UNLOCK',

    /* Lore */
    LORE_FRAGMENT_UNLOCK : 'LORE:FRAGMENT_UNLOCK',

    /* World / Environment */
    WORLD_THEME_CHANGE  : 'WORLD:THEME_CHANGE',
    WORLD_GLITCH_START  : 'WORLD:GLITCH_START',
    WORLD_GLITCH_END    : 'WORLD:GLITCH_END',

    /* Brain — Cognitive Command Layer (R10) */
    BRAIN_SPEECH        : 'BRAIN:SPEECH',
    BRAIN_MOOD_CHANGED  : 'BRAIN:MOOD_CHANGED',
    BRAIN_LORE_TRIGGER  : 'BRAIN:LORE_TRIGGER',

    /* Lifecycle */
    LIFECYCLE_DESTROY   : 'LIFECYCLE:DESTROY',

    /* ── R21 Events ──────────────────────────────────────────────
       Registrados antes dos módulos R21 carregarem.
       ZapEventBus rejeita eventos não registrados — todos os
       novos eventos DEVEM estar aqui antes de qualquer emit.
    ─────────────────────────────────────────────────────────────── */

    /* Gameplay tracking */
    GAMEPLAY_SESSION_COMPLETE : 'GAMEPLAY:SESSION_COMPLETE',

    /* Profile */
    PROFILE_SNAPSHOT_UPDATE   : 'PROFILE:SNAPSHOT_UPDATE',

    /* Missions */
    MISSION_PROGRESS          : 'MISSION:PROGRESS',
    MISSION_COMPLETE          : 'MISSION:COMPLETE',

    /* Achievements R21 */
    ACHIEVEMENT_PROGRESS      : 'ACHIEVEMENT:PROGRESS',

    /* Companion Evolution */
    COMPANION_FORM_CHANGE     : 'COMPANION:FORM_CHANGE'

  });

  /* ── Payload schemas (documentação + validação leve) ─────────
     Cada schema lista os campos obrigatórios.
     ZapEventBus valida presença antes de emitir.
  ─────────────────────────────────────────────────────────────── */
  window.ZAP_SCHEMAS = Object.freeze({

    'CORE:XP_CHANGED': Object.freeze({
      required: Object.freeze(['rawLevel','currentXp','nextLevelXp','gained']),
      /* rawLevel:int, currentXp:int, nextLevelXp:int, gained:int */
    }),

    'CORE:LEVEL_UP': Object.freeze({
      required: Object.freeze(['newLevel','unlockedScenes']),
      /* newLevel:int, unlockedScenes:[] */
    }),

    'ECONOMY:COINS_CHANGED': Object.freeze({
      required: Object.freeze(['currentBalance','delta','reason']),
      /* currentBalance:int, delta:int, reason:string */
    }),

    'QUEST:PROGRESS': Object.freeze({
      required: Object.freeze(['questId','progress','isCompleted']),
      /* questId:string, progress:string, isCompleted:boolean */
    }),

    'COMPANION:DROP': Object.freeze({
      required: Object.freeze(['dropId','value','x','y']),
      /* dropId:string, value:int, x:number, y:number */
    }),

    'COMPANION:MOOD': Object.freeze({
      required: Object.freeze(['mood']),
      /* mood:string (e.g. 'neutral','excited','worried','obsessed') */
    }),

    'COMPANION:SPEECH': Object.freeze({
      required: Object.freeze(['text']),
      /* text:string, duration?:int */
    }),

    'ACHIEVEMENT:UNLOCK': Object.freeze({
      required: Object.freeze(['badgeId','title','rewardCoins']),
      /* badgeId:string, title:string, rewardCoins:int */
    }),

    'LORE:FRAGMENT_UNLOCK': Object.freeze({
      required: Object.freeze(['fragmentId']),
      /* fragmentId:string */
    }),

    'WORLD:THEME_CHANGE': Object.freeze({
      required: Object.freeze(['theme']),
      /* theme:string */
    }),

    'WORLD:GLITCH_START': Object.freeze({ required: Object.freeze([]) }),
    'WORLD:GLITCH_END'  : Object.freeze({ required: Object.freeze([]) }),
    'LIFECYCLE:DESTROY' : Object.freeze({ required: Object.freeze([]) })

  });

  /* ── Schemas R21 ────────────────────────────────────────────── */
  /* Appended to existing ZAP_SCHEMAS — cannot freeze again (already frozen above).
     Using a mutable extension object instead. */
  window.ZAP_SCHEMAS_R21 = Object.freeze({

    'GAMEPLAY:SESSION_COMPLETE': Object.freeze({
      required: Object.freeze(['gameId','durationMs','isValid'])
    }),

    'PROFILE:SNAPSHOT_UPDATE': Object.freeze({
      required: Object.freeze(['level','xp','coins','gamesPlayed'])
    }),

    'MISSION:PROGRESS': Object.freeze({
      required: Object.freeze(['missionId','current','goal','isComplete'])
    }),

    'MISSION:COMPLETE': Object.freeze({
      required: Object.freeze(['missionId','title','xpReward'])
    }),

    'ACHIEVEMENT:PROGRESS': Object.freeze({
      required: Object.freeze(['achievementId','current','goal'])
    }),

    'COMPANION:FORM_CHANGE': Object.freeze({
      required: Object.freeze(['fromForm','toForm','trigger'])
    })

  });

  /* ── Lookup rápido: evento pertence ao registry? ──────────── */
  var _validSet = Object.freeze(
    Object.keys(window.ZAP_EVENTS).reduce(function (acc, k) {
      acc[window.ZAP_EVENTS[k]] = true;
      return acc;
    }, {})
  );

  window.ZAP_EVENT_VALID = function (type) {
    return _validSet[type] === true;
  };

}(window));
