export interface Scene {
  id: string;
  label: string;
  src: string; // any 16:10 image works: swap these for real photos
}

const svg = (body: string): string =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" preserveAspectRatio="none">${body}</svg>`
  );

const grad = (id: string, stops: [number, string][], x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join('')}</linearGradient>`;

// Scene 1: Sunset Vineyard & Chateau
const vineyardRows = Array.from({ length: 9 }, (_, i) => {
  const x = 60 + i * 85;
  return `<path d="M400 285 L${x - 160} 500 L${x - 115} 500 Z" fill="#1e4620" opacity="0.75"/>
          <path d="M400 285 L${x - 115} 500 L${x - 80} 500 Z" fill="#2d6a3e" opacity="0.65"/>`;
}).join('');

const cypresses = [120, 165, 610, 660, 700]
  .map(
    (x) =>
      `<path d="M${x} 195 Q${x - 16} 250 ${x - 12} 295 H${x + 12} Q${x + 16} 250 ${x} 195Z" fill="#16301b"/>
       <rect x="${x - 3}" y="295" width="6" height="15" fill="#3d2314"/>`
  )
  .join('');

const vineyard = svg(`
<defs>
  ${grad('sky', [[0, '#2b0918'], [0.45, '#7a1c38'], [0.8, '#d96b43'], [1, '#f6c667']])}
  ${grad('hill1', [[0, '#4a1528'], [1, '#2c0b17']])}
  ${grad('hill2', [[0, '#2a4d32'], [1, '#142919']])}
</defs>
<rect width="800" height="500" fill="url(#sky)"/>
<circle cx="400" cy="215" r="78" fill="#ffe699" opacity="0.92"/>
<circle cx="400" cy="215" r="105" fill="#f6c667" opacity="0.25"/>
<path d="M0 290 Q180 210 380 265 T800 245 V360 H0Z" fill="url(#hill1)"/>
<!-- Chateau on the hill -->
<rect x="330" y="210" width="140" height="65" fill="#3a121f"/>
<polygon points="322,212 400,170 478,212" fill="#5c1a2e"/>
<rect x="382" y="160" width="36" height="115" fill="#471625"/>
<polygon points="376,162 400,130 424,162" fill="#7a1c38"/>
<rect x="348" y="226" width="14" height="22" rx="7" fill="#ffd27a"/>
<rect x="393" y="226" width="14" height="22" rx="7" fill="#ffd27a"/>
<rect x="438" y="226" width="14" height="22" rx="7" fill="#ffd27a"/>
${cypresses}
<path d="M0 315 Q260 265 520 305 T800 295 V500 H0Z" fill="url(#hill2)"/>
${vineyardRows}
<!-- Hanging grape cluster silhouette in foreground corner -->
<g fill="#3b0918">
  <rect x="0" y="0" width="800" height="22"/>
  <circle cx="85" cy="42" r="14"/><circle cx="105" cy="40" r="14"/><circle cx="125" cy="44" r="13"/>
  <circle cx="95" cy="60" r="14"/><circle cx="115" cy="62" r="14"/>
  <circle cx="105" cy="80" r="13"/>
</g>`);

// Scene 2: Grand Oak Wine Cellar
const barrels = [95, 275, 455, 635]
  .map(
    (x) => `
    <g transform="translate(${x}, 270)">
      <ellipse cx="35" cy="55" rx="68" ry="52" fill="#6b3a20" stroke="#3b1d0e" stroke-width="4"/>
      <ellipse cx="35" cy="55" rx="54" ry="40" fill="#854a2a"/>
      <ellipse cx="35" cy="55" rx="48" ry="35" fill="none" stroke="#c89d54" stroke-width="4"/>
      <circle cx="35" cy="55" r="7" fill="#3b1d0e"/>
      <circle cx="35" cy="74" r="5" fill="#d4af37"/>
      <rect x="-15" y="102" width="18" height="28" fill="#3b1d0e"/>
      <rect x="67" y="102" width="18" height="28" fill="#3b1d0e"/>
    </g>`
  )
  .join('');

const cellar = svg(`
<defs>
  ${grad('stone', [[0, '#180c12'], [0.6, '#2d141f'], [1, '#12080d']])}
  ${grad('glow', [[0, '#ffcf70'], [1, '#7a1c38']])}
</defs>
<rect width="800" height="500" fill="url(#stone)"/>
<!-- Stone Arches -->
<path d="M40 500 V200 A160 140 0 0 1 360 200 V500" fill="#231019" stroke="#472331" stroke-width="10"/>
<path d="M440 500 V200 A160 140 0 0 1 760 200 V500" fill="#231019" stroke="#472331" stroke-width="10"/>
<!-- Warm Chandelier / Sconces -->
<circle cx="200" cy="150" r="42" fill="#ffb84d" opacity="0.22"/>
<circle cx="200" cy="150" r="14" fill="#ffe699"/>
<circle cx="600" cy="150" r="42" fill="#ffb84d" opacity="0.22"/>
<circle cx="600" cy="150" r="14" fill="#ffe699"/>
<circle cx="400" cy="110" r="55" fill="#ffb84d" opacity="0.25"/>
<path d="M400 0 V95 M360 95 H440" stroke="#d4af37" stroke-width="5"/>
<circle cx="365" cy="88" r="9" fill="#fff0b3"/><circle cx="400" cy="85" r="11" fill="#fff0b3"/><circle cx="435" cy="88" r="9" fill="#fff0b3"/>
<!-- Floor -->
<rect y="390" width="800" height="110" fill="#170b10"/>
<path d="M0 390 H800" stroke="#5c2c3d" stroke-width="4"/>
${barrels}`);

// Scene 3: Sommelier Tasting Table
const sommelier = svg(`
<defs>
  ${grad('bg', [[0, '#240b15'], [0.7, '#4a1427'], [1, '#6b1d36']])}
  ${grad('wine', [[0, '#9e1b34'], [1, '#420612']])}
  ${grad('gold', [[0, '#f9e29c'], [1, '#c59638']])}
</defs>
<rect width="800" height="500" fill="url(#bg)"/>
<circle cx="620" cy="130" r="90" fill="#f6c667" opacity="0.12"/>
<!-- Wood Tasting Table -->
<rect y="355" width="800" height="145" fill="#4a2518"/>
<rect y="355" width="800" height="12" fill="#6e3926"/>
<!-- Wine Bottle -->
<path d="M180 175 H215 V110 H235 V175 H270 Q285 175 285 195 V365 H165 V195 Q165 175 180 175Z" fill="#132a1c" stroke="#0b1a11" stroke-width="3"/>
<rect x="213" y="102" width="24" height="22" fill="#8f1d35"/>
<rect x="178" y="235" width="94" height="85" rx="4" fill="#f7eed7"/>
<rect x="190" y="252" width="70" height="8" fill="#7a1c38"/>
<rect x="200" y="270" width="50" height="5" fill="#c59638"/>
<circle cx="225" cy="296" r="12" fill="url(#gold)"/>
<!-- Crystal Wine Glass -->
<path d="M420 185 Q415 275 470 280 Q525 275 520 185 Z" fill="#ffffff1f" stroke="#f7eed7" stroke-width="3"/>
<path d="M424 225 Q425 273 470 277 Q515 273 516 225 Z" fill="url(#wine)"/>
<path d="M470 280 V360 M435 360 H505" stroke="#f7eed7" stroke-width="5" stroke-linecap="round"/>
<!-- Grapes & Cheese Platter -->
<ellipse cx="645" cy="362" rx="95" ry="16" fill="#d4af37"/>
<polygon points="580,356 645,310 665,356" fill="#f7c852"/>
<circle cx="625" cy="342" r="6" fill="#d99b26"/><circle cx="642" cy="332" r="5" fill="#d99b26"/>
<g fill="#5e1742">
  <circle cx="675" cy="340" r="13"/><circle cx="695" cy="338" r="13"/><circle cx="712" cy="344" r="13"/>
  <circle cx="685" cy="354" r="13"/><circle cx="705" cy="355" r="13"/>
</g>`);

// Scene 4: Starlight Terrace Toast
const bokeh = [
  [110, 90, 14], [220, 65, 18], [340, 105, 12], [480, 75, 20], [610, 95, 15], [710, 70, 16],
  [160, 160, 26], [550, 165, 28], [680, 190, 22]
]
  .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffe599" opacity="0.35"/><circle cx="${x}" cy="${y}" r="${r * 0.45}" fill="#fff7d6" opacity="0.8"/>`)
  .join('');

const toastScene = svg(`
<defs>
  ${grad('night', [[0, '#120714'], [0.55, '#2e0f25'], [1, '#591631']])}
  ${grad('rose', [[0, '#e04f67'], [1, '#80132b']])}
</defs>
<rect width="800" height="500" fill="url(#night)"/>
<!-- String lights curve -->
<path d="M0 55 Q200 120 400 70 T800 95" fill="none" stroke="#d4af37" stroke-width="2" opacity="0.6"/>
${bokeh}
<!-- Clinking Sparkle at Center -->
<path d="M400 155 L406 182 L433 188 L406 194 L400 221 L394 194 L367 188 L394 182 Z" fill="#ffe699"/>
<circle cx="400" cy="188" r="32" fill="#ffe699" opacity="0.25"/>
<!-- Left Tilted Glass -->
<g transform="translate(335, 255) rotate(14)">
  <path d="M-48 -75 Q-52 10 0 15 Q52 10 48 -75 Z" fill="#ffffff24" stroke="#ffffffcc" stroke-width="3"/>
  <path d="M-44 -30 Q-44 8 0 12 Q44 8 44 -30 Z" fill="url(#rose)"/>
  <path d="M0 15 V105 M-35 105 H35" stroke="#ffffffcc" stroke-width="5" stroke-linecap="round"/>
</g>
<!-- Right Tilted Glass -->
<g transform="translate(465, 255) rotate(-14)">
  <path d="M-48 -75 Q-52 10 0 15 Q52 10 48 -75 Z" fill="#ffffff24" stroke="#ffffffcc" stroke-width="3"/>
  <path d="M-44 -30 Q-44 8 0 12 Q44 8 44 -30 Z" fill="url(#rose)"/>
  <path d="M0 15 V105 M-35 105 H35" stroke="#ffffffcc" stroke-width="5" stroke-linecap="round"/>
</g>
<!-- Terrace Balustrade -->
<rect y="425" width="800" height="75" fill="#1c0913"/>
<rect y="415" width="800" height="14" fill="#3b1526"/>`);

export const SCENES: Scene[] = [
  { id: 'vineyard', label: 'Sunset Vineyard', src: vineyard },
  { id: 'cellar', label: 'Grand Wine Cellar', src: cellar },
  { id: 'sommelier', label: 'Sommelier Tasting', src: sommelier },
  { id: 'toast', label: 'Starlight Toast', src: toastScene },
];
