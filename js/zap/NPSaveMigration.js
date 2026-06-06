/* NeonPlay R15 — Save Version & Migration
 * Embedded in neonplay-init.js boot section (not a standalone module).
 *
 * Migrators run once on load, guarded by np_save_version key.
 * Version history:
 *   undefined → 'r13': legacy save (zap_prog_v1 present)
 *   'r13'     → 'r14': added zap_wallet_v1 + zap_store_v1
 *   'r14'     → 'r15': added zap_personality_r15, zap_affinity_r15,
 *                       zap_memory_graph_r15, np_last_seen_ts
 */
function _runSaveMigration() {
  try {
    var ver = localStorage.getItem('np_save_version') || '';

    if (!ver) {
      /* Detect legacy R13 save (has zap_prog_v1 but no version key) */
      if (localStorage.getItem('zap_prog_v1')) {
        /* migrateR13toR14: nothing structural to change — R14 reads the same keys */
        ver = 'r13';
      }
    }

    if (ver === 'r13') {
      /* migrateR13toR14: wallet/store defaults already created by ZapEconomy/ZapStore.init() */
      ver = 'r14';
    }

    if (ver === 'r14' || ver === '') {
      /* migrateR14toR15: seed last-seen timestamp from prog data if missing */
      if (!localStorage.getItem('np_last_seen_ts')) {
        var prog = JSON.parse(localStorage.getItem('zap_prog_v1') || 'null');
        if (prog && prog.xp > 0) {
          /* Returning user — set last-seen to 'a day ago' so absence logic is gentle */
          localStorage.setItem('np_last_seen_ts', String(Date.now() - 86400000));
        }
      }
      ver = 'r15';
    }

    localStorage.setItem('np_save_version', ver || 'r15');
  } catch(e) {}
}