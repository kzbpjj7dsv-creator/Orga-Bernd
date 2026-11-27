// Bernd als SVG – mit Stimmungen
const BODY = "<defs>\n<radialGradient id=\"b__U__\" cx=\"38%\" cy=\"28%\" r=\"75%\"><stop offset=\"0\" stop-color=\"#5A4752\"/><stop offset=\"0.55\" stop-color=\"#2A1F25\"/><stop offset=\"1\" stop-color=\"#0E090C\"/></radialGradient>\n<radialGradient id=\"w__U__\" cx=\"45%\" cy=\"35%\" r=\"70%\"><stop offset=\"0\" stop-color=\"#FFFFFF\"/><stop offset=\"0.7\" stop-color=\"#F6EEF0\"/><stop offset=\"1\" stop-color=\"#D9CBD0\"/></radialGradient>\n<linearGradient id=\"k__U__\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#FFC06A\"/><stop offset=\"1\" stop-color=\"#E07B1F\"/></linearGradient>\n<linearGradient id=\"s__U__\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#F06A84\"/><stop offset=\"1\" stop-color=\"#B8323F\"/></linearGradient>\n<radialGradient id=\"e__U__\" cx=\"40%\" cy=\"35%\" r=\"65%\"><stop offset=\"0\" stop-color=\"#FFFFFF\"/><stop offset=\"1\" stop-color=\"#E4DCE0\"/></radialGradient>\n</defs>\n<ellipse cx=\"60\" cy=\"112\" rx=\"34\" ry=\"5\" fill=\"#3D1418\" opacity=\"0.18\"/>\n<ellipse cx=\"44\" cy=\"108\" rx=\"11\" ry=\"4.5\" fill=\"url(#k__U__)\"/><ellipse cx=\"76\" cy=\"108\" rx=\"11\" ry=\"4.5\" fill=\"url(#k__U__)\"/>\n<ellipse cx=\"22\" cy=\"72\" rx=\"9\" ry=\"22\" transform=\"rotate(18 22 72)\" fill=\"url(#b__U__)\"/><ellipse cx=\"98\" cy=\"72\" rx=\"9\" ry=\"22\" transform=\"rotate(-18 98 72)\" fill=\"url(#b__U__)\"/>\n<ellipse cx=\"60\" cy=\"64\" rx=\"38\" ry=\"44\" fill=\"url(#b__U__)\"/>\n<ellipse cx=\"60\" cy=\"74\" rx=\"25\" ry=\"31\" fill=\"url(#w__U__)\"/>\n<ellipse cx=\"46\" cy=\"30\" rx=\"14\" ry=\"7\" fill=\"#FFFFFF\" opacity=\"0.14\" transform=\"rotate(-25 46 30)\"/>\n__EYES__\n<path d=\"M52 54 Q60 50 68 54 Q61 64 60 64 Q59 64 52 54Z\" fill=\"url(#k__U__)\"/><path d=\"M55 54.5 Q60 52.5 64 54.5\" stroke=\"#FFE2B5\" stroke-width=\"1.4\" fill=\"none\" stroke-linecap=\"round\"/>\n<ellipse cx=\"40\" cy=\"57\" rx=\"5\" ry=\"3.2\" fill=\"#F48FA3\" opacity=\"0.75\"/><ellipse cx=\"80\" cy=\"57\" rx=\"5\" ry=\"3.2\" fill=\"#F48FA3\" opacity=\"0.75\"/>\n<path d=\"M30 76 Q60 90 90 76 L90 84 Q60 98 30 84Z\" fill=\"url(#s__U__)\"/><path d=\"M30 76 Q60 90 90 76\" stroke=\"#FF9FB2\" stroke-width=\"1.6\" fill=\"none\"/>\n<path d=\"M72 86 L80 104 L70 101 Z\" fill=\"url(#s__U__)\"/>\n";
const EYES = "<ellipse cx=\"48\" cy=\"44\" rx=\"7\" ry=\"7.5\" fill=\"url(#e__U__)\"/><ellipse cx=\"72\" cy=\"44\" rx=\"7\" ry=\"7.5\" fill=\"url(#e__U__)\"/>\n<circle cx=\"49.5\" cy=\"45.5\" r=\"3.6\" fill=\"#1A1014\"/><circle cx=\"73.5\" cy=\"45.5\" r=\"3.6\" fill=\"#1A1014\"/>\n<circle cx=\"51\" cy=\"44\" r=\"1.3\" fill=\"#FFFFFF\"/><circle cx=\"75\" cy=\"44\" r=\"1.3\" fill=\"#FFFFFF\"/>";

const EXTRA = {
  zufrieden: '',
  enttaeuscht: '<path d="M40 35 L54 32" stroke="#0E090C" stroke-width="3" stroke-linecap="round"/><path d="M66 32 L80 35" stroke="#0E090C" stroke-width="3" stroke-linecap="round"/><path d="M47 54 q4 0 4 4 q0 3 -2.5 3 q-2.5 0 -2.5 -3z" fill="#9FD3F2"/>',
  wuetend: '<path d="M39 33 L55 39" stroke="#0E090C" stroke-width="3.5" stroke-linecap="round"/><path d="M65 39 L81 33" stroke="#0E090C" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="60" cy="40" rx="30" ry="12" fill="#E0475B" opacity="0.18"/>',
};
const SLEEP = '<path d="M36 42 h22 v6 q0 9 -11 9 q-11 0 -11 -9z" fill="#1A1014"/><path d="M62 42 h22 v6 q0 9 -11 9 q-11 0 -11 -9z" fill="#1A1014"/><path d="M58 44 h4" stroke="#1A1014" stroke-width="2.5"/><path d="M40 46 l6 -2 M66 46 l6 -2" stroke="#FFFFFF" stroke-width="1.6" opacity="0.6" stroke-linecap="round"/>'
  + '<text x="92" y="22" font-family="Nunito, sans-serif" font-weight="900" font-size="14" fill="#8C1C2B">z</text><text x="101" y="12" font-family="Nunito, sans-serif" font-weight="900" font-size="18" fill="#8C1C2B">Z</text>';
const OUTFITS = {
  schal: '',
  muetze: '<path d="M32 36 q0 -28 28 -28 q28 0 28 28z" fill="#D9536A"/><rect x="30" y="31" width="60" height="9" rx="4.5" fill="#B8323F"/><circle cx="60" cy="7" r="6" fill="#FFFFFF"/>',
  kopfhoerer: '<path d="M26 50 q0 -40 34 -40 q34 0 34 40" stroke="#3D1418" stroke-width="5" fill="none"/><rect x="18" y="44" width="12" height="20" rx="5" fill="#B8323F"/><rect x="90" y="44" width="12" height="20" rx="5" fill="#B8323F"/>',
  hut: '<path d="M60 8 L92 20 L60 32 L28 20Z" fill="#2A1F25"/><path d="M42 24 v8 q18 8 36 0 v-8 L60 32Z" fill="#1A1216"/><path d="M60 20 L86 22 v14" stroke="#E0B44C" stroke-width="2" fill="none"/><circle cx="86" cy="37" r="3" fill="#E0B44C"/>',
};
let n = 0;
export function berndSVG(mood = 'zufrieden', size = 96, outfit = 'schal') {
  const u = 'b' + (n++);
  const sleeping = mood === 'urlaub' || mood === 'ruhe';
  let s = BODY.replace('__EYES__', sleeping ? '' : EYES).replaceAll('__U__', u);
  s += sleeping ? SLEEP : (EXTRA[mood] || '');
  s += OUTFITS[outfit] || '';
  return `<svg width="${size}" height="${size}" viewBox="0 -6 120 126" role="img" aria-label="Bernd, der Pinguin">${s}</svg>`;
}
