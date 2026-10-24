export type GameSearchSignal = { searchScore: number; platformFeatured: boolean };

// Snapshot from Google Autocomplete in Brazil (2026-10-24), not search volume or play counts.
// Retro Bowl is separately flagged because Poki Brasil currently lists it among its popular originals.
export const gameSearchSignals: Record<string, GameSearchSignal> = {
  "retro-bowl": {
    "searchScore": 1,
    "platformFeatured": true
  },
  "supersmashflash_swf": {
    "searchScore": 20,
    "platformFeatured": false
  },
  "bubble-shooter_": {
    "searchScore": 19,
    "platformFeatured": false
  },
  "flash_age_of_war": {
    "searchScore": 18,
    "platformFeatured": false
  },
  "2048": {
    "searchScore": 17,
    "platformFeatured": false
  },
  "wordle": {
    "searchScore": 15,
    "platformFeatured": false
  },
  "minesweeper": {
    "searchScore": 15,
    "platformFeatured": false
  },
  "BTD1_flash": {
    "searchScore": 14,
    "platformFeatured": false
  },
  "tetris": {
    "searchScore": 13,
    "platformFeatured": false
  },
  "super-smash-flash-2_202304": {
    "searchScore": 13,
    "platformFeatured": false
  },
  "run": {
    "searchScore": 13,
    "platformFeatured": false
  },
  "jacksmith_v2": {
    "searchScore": 13,
    "platformFeatured": false
  },
  "breakout": {
    "searchScore": 12,
    "platformFeatured": false
  },
  "pong": {
    "searchScore": 11,
    "platformFeatured": false
  },
  "kingdom-rush-12141": {
    "searchScore": 11,
    "platformFeatured": false
  },
  "stick-war": {
    "searchScore": 9,
    "platformFeatured": false
  },
  "snake": {
    "searchScore": 9,
    "platformFeatured": false
  },
  "strike-force-heroes-2": {
    "searchScore": 7,
    "platformFeatured": false
  },
  "run-2": {
    "searchScore": 7,
    "platformFeatured": false
  },
  "papasburgeria": {
    "searchScore": 6,
    "platformFeatured": false
  },
  "Gunblood-3780": {
    "searchScore": 6,
    "platformFeatured": false
  },
  "ben-10_202312": {
    "searchScore": 6,
    "platformFeatured": false
  },
  "warfare-1944-4071": {
    "searchScore": 4,
    "platformFeatured": false
  },
  "raft-wars-990": {
    "searchScore": 4,
    "platformFeatured": false
  },
  "mutilate-a-doll-2": {
    "searchScore": 4,
    "platformFeatured": false
  },
  "Ben_10_Savage_Pursuit": {
    "searchScore": 4,
    "platformFeatured": false
  },
  "warfare-1917-2267": {
    "searchScore": 3,
    "platformFeatured": false
  },
  "sierra-7-10194": {
    "searchScore": 3,
    "platformFeatured": false
  },
  "raze-2-12275": {
    "searchScore": 3,
    "platformFeatured": false
  },
  "give-up-13662": {
    "searchScore": 3,
    "platformFeatured": false
  },
  "bloons-td-5": {
    "searchScore": 3,
    "platformFeatured": false
  },
  "ageofwar2_202401": {
    "searchScore": 3,
    "platformFeatured": false
  },
  "fancy-pants-adventur-301": {
    "searchScore": 2,
    "platformFeatured": false
  },
  "the-worlds-hardest-g-1043": {
    "searchScore": 1,
    "platformFeatured": false
  },
  "swordssouls-17817": {
    "searchScore": 1,
    "platformFeatured": false
  },
  "papaspastaria": {
    "searchScore": 1,
    "platformFeatured": false
  },
  "kingdom-rush-frontiers": {
    "searchScore": 1,
    "platformFeatured": false
  },
  "clicker-heroes-16083": {
    "searchScore": 1,
    "platformFeatured": false
  },
  "bubble_shooter": {
    "searchScore": 1,
    "platformFeatured": false
  },
  "ultimate-flash-sonic-widescreen": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "ultimate-flash-sonic-revised": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "the-worlds-hardest-g-1982": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "the-last-stand-2-1443": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "the-kings-league-odyssey": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "theimpossiblequiz2": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "impossible_quiz1": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "the-enchanted-cave-2": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "the-binding-of-isaac": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "the-batman-cobblebot-caper": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "teen-titans-battle-blitz-game": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "ssf2-2007_20210626": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "ssf2_20201202_1701": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "stealing-the-diamond": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "spider-man-3-the-battle-within": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "spider-man-3-spider-launch-www-boysplaygame-com": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "web-of-words-spiderman": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "sonic-speedway": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "sonic-rush-adventure-flash-game-wave-cyclone-gameplay": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "sonic-girls-dress-up": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "sonic_boom_sticks_the_badger_dress-up": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "sonic-and-the-black-knight-in-training": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "shellshock-live-2-14053": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "run-3_202403": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "road-of-the-dead-2-15688": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "raze-3-15979": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "portal-the-flash-ver-107": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "launcher_202503": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "learn-to-fly-3": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "learn-to-fly-2-11967": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "interactivebuddy": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "infectonator-2-13150": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "1100_hulk": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "friday-night-flash": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "fleeing-the-complex": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "flappy-bird": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "fireboy_and_watergirl-in-the-forest-temple": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "fireboy-and-watergirl-in-the-forest-temple": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "escaping-the-prison": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "epic-battle-fantasy-4": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "doodle_jump_2_flash": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "dino-dash": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "cartoon-network-snowbrawl-fight": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "bit-heroes": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "ben-10-omnitrix-unleashed-swf": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "swarm-smash": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "age-of-war-3": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "age-of-rivals": {
    "searchScore": 0,
    "platformFeatured": false
  },
  "achievement-unlocked-13196": {
    "searchScore": 0,
    "platformFeatured": false
  }
};
