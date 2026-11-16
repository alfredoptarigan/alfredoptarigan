// Generates the static Memphis assets (header, divider, section titles).
// Run: node scripts/build-static.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  C, block, canvas, circle, dots, float, halfCircle, plus, ring, spin, squiggle, svgDocument, triangle,
} from './memphis.mjs';

const ASSETS_DIR = fileURLToPath(new URL('../assets/', import.meta.url));

const header = () => {
  const width = 1000;
  const height = 320;
  const frame = canvas(width, height);
  const body = [
    frame.back,
    dots(28, 28, 6, 3, 18, C.pink),
    dots(560, 270, 4, 2, 18, C.blue),
    // right-hand composition
    float(1, circle(800, 150, 92, C.teal)),
    float(2, triangle(885, 200, 140, C.yellow, 14)),
    float(3, ring(715, 252, 32, C.pink)),
    float(2, halfCircle(905, 86, 48, C.purple, 20)),
    float(1, squiggle(625, 62, 190, C.blue, { amp: 9, step: 16, strokeWidth: 6 })),
    spin(plus(655, 150, 16, C.orange)),
    spin(plus(950, 255, 13, C.pink)),
    float(3, circle(955, 160, 12, C.orange)),
    float(2, circle(640, 232, 9, C.yellow)),
    // title block
    `<text x="54" y="156" font-size="104" fill="${C.pink}" textLength="470" lengthAdjust="spacingAndGlyphs">ALFREDO</text>`,
    `<text x="48" y="150" font-size="104" fill="${C.ink}" textLength="470" lengthAdjust="spacingAndGlyphs">ALFREDO</text>`,
    block(48, 176, 520, 58, C.yellow, { offset: 6 }),
    `<text x="64" y="218" font-size="38" fill="${C.ink}" textLength="488" lengthAdjust="spacingAndGlyphs">PATRICIUS TARIGAN</text>`,
    block(48, 254, 430, 40, C.teal, { rx: 20, offset: 5, strokeWidth: 3 }),
    `<text x="72" y="280" font-size="18" fill="${C.ink}" textLength="382" lengthAdjust="spacingAndGlyphs">FULLSTACK DEVELOPER &#8226; MEDAN, ID</text>`,
    frame.front,
  ].join('');
  return svgDocument({ width, height, title: 'Alfredo Patricius Tarigan, Fullstack Developer from Medan, Indonesia', body });
};

const divider = () => {
  const width = 1000;
  const height = 36;
  const colors = [C.pink, C.teal, C.yellow, C.purple, C.blue];
  const segment = 196;
  const body = colors
    .map((color, i) => squiggle(6 + i * (segment + 4), 20, segment - 22, color, { amp: 7, step: 14, strokeWidth: 6 }) +
      (i < colors.length - 1 ? circle(6 + i * (segment + 4) + segment - 6, 18, 6, C.cream) : ''))
    .join('');
  return svgDocument({ width, height, title: 'divider', body });
};

const TITLE_SHAPES = [
  () => [float(1, triangle(900, 38, 46, C.yellow, 10)), float(2, circle(955, 30, 13, C.teal))],
  () => [float(2, halfCircle(905, 52, 28, C.purple, 15)), float(1, ring(960, 34, 13, C.pink, 5))],
  () => [spin(plus(905, 38, 14, C.orange)), float(3, triangle(958, 40, 40, C.blue, -12))],
  () => [float(1, circle(905, 38, 16, C.pink)), float(2, squiggle(930, 40, 54, C.teal, { amp: 6, step: 12 }))],
  () => [float(2, triangle(905, 38, 44, C.teal, -8)), spin(plus(960, 36, 13, C.pink))],
];

const sectionTitle = (text, color, shapeIndex) => {
  const width = 1000;
  const height = 76;
  const frame = canvas(width, height);
  const label = text.toUpperCase();
  const textWidth = label.length * 20;
  const pillWidth = textWidth + 48;
  const body = [
    frame.back,
    block(24, 12, pillWidth, 46, color, { rx: 23, offset: 5, strokeWidth: 3 }),
    `<text x="48" y="45" font-size="27" fill="${C.ink}" textLength="${textWidth}" lengthAdjust="spacingAndGlyphs">${label}</text>`,
    squiggle(24 + pillWidth + 30, 38, 620 - pillWidth, C.ink, { amp: 6, step: 14, strokeWidth: 4 }),
    TITLE_SHAPES[shapeIndex % TITLE_SHAPES.length]().join(''),
    frame.front,
  ].join('');
  return svgDocument({ width, height, title: text, body });
};

const SECTIONS = [
  ['about', 'About me', C.pink],
  ['stack', 'Tech stack', C.yellow],
  ['stats', 'GitHub stats', C.teal],
  ['projects', 'Featured projects', C.purple],
  ['connect', "Let's connect", C.orange],
];

await mkdir(ASSETS_DIR, { recursive: true });
const files = [
  ['header.svg', header()],
  ['divider.svg', divider()],
  ...SECTIONS.map(([name, text, color], i) => [`title-${name}.svg`, sectionTitle(text, color, i)]),
];
await Promise.all(files.map(([name, content]) => writeFile(`${ASSETS_DIR}${name}`, content)));
console.log(`wrote ${files.length} static assets`);
