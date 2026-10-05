// 16px-wide pixel templates for people. Spaces are only there to make columns
// easy to count (groups of 4) and are stripped before use.
//
// Palette letters:
//   s/S skin + shadow   h/H/j hair, shadow, highlight   e eye
//   c/C/k cloth, shadow, highlight   t/T trim   p/P trousers   b boots
//   a/A/l accent (bandana, helmet)   r glowing eyes   w bone/white   o outline colour

export type HeadStyle = 'spiky' | 'long' | 'bandana' | 'elder' | 'bun' | 'helm';
export type BodyStyle = 'tunic' | 'robe';

type Rows = string[];

export const HEADS: Record<HeadStyle, { down: Rows; side: Rows }> = {
  spiky: {
    down: [
      '.... .... .... ....',
      '.... .h.h h.h. ....',
      '.... hjjh hhhh ....',
      '...h jjhh hhhH H...',
      '...h jhhh hhhH H...',
      '...h hshh hshh H...',
      '...h ssss sssS H...',
      '...s sess sseS S...',
      '...s sess sseS S...',
      '.... ssss sssS ....',
      '.... .sss sSS. ....',
    ],
    side: [
      '.... .... .... ....',
      '.... ...h .h.h ....',
      '.... .hjh hhhh h...',
      '.... hjjh hhhh hh..',
      '...h jhhh hhhh hH..',
      '...h shsh hhhh HH..',
      '...s ssss hhhh HH..',
      '..ss esss Shhh H...',
      '...s esss Shhh H...',
      '.... ssss sHH. ....',
      '.... .sss S... ....',
    ],
  },
  long: {
    down: [
      '.... .... .... ....',
      '.... .hhh hhh. ....',
      '.... hjjh hhhh ....',
      '...h jjhh hhhh H...',
      '..hh jhhh hhhh HH..',
      '..hh jhhs shhh HH..',
      '..hh ssss sssS HH..',
      '..hh sess sseS HH..',
      '..hh sess sseS HH..',
      '..hj ssss sssS HH..',
      '..hh .sss sSS. HH..',
      '..hh .... .... HH..',
      '..hH .... .... HH..',
      '...H .... .... H...',
    ],
    side: [
      '.... .... .... ....',
      '.... ..hh hhh. ....',
      '.... .hjh hhhh h...',
      '.... hjjh hhhh hh..',
      '...h jhhh hhhh hH..',
      '...h hhhh hhhh hH..',
      '...s ssss hhhh hH..',
      '..ss esss hhhh HH..',
      '...s esss hhhh HH..',
      '.... ssss hhhh HH..',
      '.... .sss hhhh HH..',
      '.... .... hhhh H...',
      '.... .... hhhH H...',
      '.... .... .HHH ....',
    ],
  },
  bandana: {
    down: [
      '.... .... .... ....',
      '.... .hhh hhh. ....',
      '.... hjjh hhhh ....',
      '...h jhhh hhhH H...',
      '...a llaa aaaA A...',
      '...a aaaa aaaA Aa..',
      '...h ssss sssS H.a.',
      '...s sess sseS S...',
      '...s sess sseS S...',
      '.... ssss sssS ....',
      '.... .sss sSS. ....',
    ],
    side: [
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .hhh hhh. ....',
      '.... hjjh hhhh h...',
      '...a llaa aaaa aA..',
      '...a aaaa aaaa AAa.',
      '...s ssss hhhh hAa.',
      '..ss esss Shhh H.a.',
      '...s esss Shhh H...',
      '.... ssss sHH. ....',
      '.... .sss S... ....',
    ],
  },
  elder: {
    down: [
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .sss ss.. ....',
      '.... ssss sssS ....',
      '...h ssss sssS H...',
      '...h ssss sssS H...',
      '...h hhss shhS H...',
      '...s sess sseS S...',
      '...h hsss ssSH H...',
      '...h hhhh hhhH H...',
      '.... hhhh hhhH ....',
      '.... .hhh hhH. ....',
      '.... ..hh hH.. ....',
    ],
    side: [
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .sss ss.. ....',
      '.... ssss sssS ....',
      '...s ssss sshh H...',
      '...s ssss Shhh H...',
      '...h hsss Shhh H...',
      '..ss esss Shhh ....',
      '...h hsss SH.. ....',
      '..hh hhhh H... ....',
      '..hh hhhH .... ....',
      '...h hhH. .... ....',
      '.... hH.. .... ....',
    ],
  },
  bun: {
    down: [
      '.... ..hh hh.. ....',
      '.... .hjh hhH. ....',
      '.... hhhh hhhh ....',
      '...h jjhh hhhH H...',
      '...h jhhh hhhH H...',
      '...h hhhs hhhh H...',
      '...h ssss sssS H...',
      '...s sess sseS S...',
      '...h sess sseS H...',
      '.... ssss sssS ....',
      '.... .sss sSS. ....',
    ],
    side: [
      '.... .... .hhh ....',
      '.... .... hjhH ....',
      '.... .hhh hhhH ....',
      '.... hjjh hhhh h...',
      '...h jhhh hhhh hH..',
      '...h shhh hhhh HH..',
      '...s ssss hhhh HH..',
      '..ss esss Shhh H...',
      '...s esss Shhh H...',
      '.... ssss sHH. ....',
      '.... .sss S... ....',
    ],
  },
  helm: {
    down: [
      '.... ...t t... ....',
      '..w. .alt tlA. .w..',
      '...w alll aaaA w...',
      '...a llaa aaaA A...',
      '...a laaa aaaA A...',
      '...a aaaa aaaA A...',
      '...a oooo oooo A...',
      '...a oroo ooro A...',
      '...a aaaa aaaA A...',
      '.... aaaa aaaA ....',
      '.... .AAA AAA. ....',
    ],
    side: [
      '.... ..tt tt.. ....',
      '.... .all aaaw ....',
      '.... alll aaaa w...',
      '...a llaa aaaa A...',
      '...a laaa aaaa A...',
      '...a aaaa aaaa A...',
      '...o oooo aaaa A...',
      '...o rooo aaaa A...',
      '...a aaaa aaaA A...',
      '.... aaaa aaAA ....',
      '.... .AAA AA.. ....',
    ],
  },
};

/** Torso rows 11-16. */
export const TORSO: { down: Rows; side: Rows } = {
  down: [
    '.... .ttt ttt. ....',
    '...c kccc cccC C...',
    '...c kccc cccC C...',
    '...c kccc cccC C...',
    '...c kccc cccC C...',
    '...s tttt tttT S...',
  ],
  side: [
    '.... .ttt t... ....',
    '.... .kcc cCC. ....',
    '.... .ckk CCC. ....',
    '.... .ckk CCC. ....',
    '.... .ckk CCC. ....',
    '.... .tts sTT. ....',
  ],
};

/** Leg rows 17-21: [stand, stepA, stepB]. */
export const LEGS: Record<BodyStyle, { down: Rows[]; side: Rows[] }> = {
  tunic: {
    down: [
      ['.... kccc cccC ....', '.... .pp. .pP. ....', '.... .pp. .pP. ....', '.... .bb. .bb. ....', '.... bbb. .bbb ....'],
      ['.... kccc cccC ....', '.... .pp. .pP. ....', '.... .pp. .bb. ....', '.... .bb. .bb. ....', '.... bbb. .... ....'],
      ['.... kccc cccC ....', '.... .pp. .pP. ....', '.... .bb. .pP. ....', '.... .bb. .bb. ....', '.... .... .bbb ....'],
    ],
    side: [
      ['.... .kcc cC.. ....', '.... ..pp P... ....', '.... ..pp P... ....', '.... ..bb b... ....', '.... .bbb b... ....'],
      ['.... .kcc cC.. ....', '.... .pp. PP.. ....', '.... pp.. .PP. ....', '.... bb.. ..b. ....', '...b bb.. ..bb ....'],
      ['.... .kcc cC.. ....', '.... .PP. pp.. ....', '.... PP.. .pp. ....', '.... bb.. ..b. ....', '...b bb.. ..bb ....'],
    ],
  },
  robe: {
    down: [
      ['.... kccc cccC ....', '...k cccc cccC C...', '...k cccc cccC C...', '...t tttt tttT T...', '.... .bb. .bb. ....'],
      ['.... kccc cccC ....', '...k cccc cccC C...', '...k cccc cccC C...', '...t tttt tttT T...', '.... bbb. .... ....'],
      ['.... kccc cccC ....', '...k cccc cccC C...', '...k cccc cccC C...', '...t tttt tttT T...', '.... .... .bbb ....'],
    ],
    side: [
      ['.... .kcc cC.. ....', '.... kccc cCC. ....', '...k cccc cCC. ....', '...t tttt tTT. ....', '.... bbb. .... ....'],
      ['.... .kcc cC.. ....', '.... kccc cCC. ....', '...k cccc cCC. ....', '...t tttt tTT. ....', '...b b... .bb. ....'],
      ['.... .kcc cC.. ....', '.... kccc cCC. ....', '...k cccc cCC. ....', '...t tttt tTT. ....', '.... .bb. b... ....'],
    ],
  },
};

/** Kneeling legs (rows 20-22) for wounded party members in battle; head/torso drop 3px. */
export const KNEEL_LEGS: Rows = ['.... .kcc cC.. ....', '...p ppPP .... ....', '..bb bPP. .... ....'];

export function clean(rows: Rows): Rows {
  return rows.map((r) => r.replace(/ /g, ''));
}
