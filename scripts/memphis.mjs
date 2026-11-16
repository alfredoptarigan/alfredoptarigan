// Tiny Memphis-style SVG toolkit: bold flat colors, thick ink outlines,
// hard offset shadows, squiggles, triangles, dots and plus signs.

export const C = {
  ink: '#111111',
  cream: '#FFF6E5',
  pink: '#FF5CA8',
  yellow: '#FFD23F',
  teal: '#14D9C5',
  purple: '#8B5CF6',
  blue: '#3A86FF',
  orange: '#FF8A3D',
};

export const PALETTE = [C.pink, C.yellow, C.teal, C.purple, C.blue, C.orange];

const FONT = "'Trebuchet MS','Verdana','Helvetica Neue',Arial,sans-serif";
const STROKE = 3;

export const esc = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]);

export const triangle = (cx, cy, size, fill, rotation = 0) => {
  const height = size * 0.866;
  const points = [
    [cx, cy - (height * 2) / 3],
    [cx + size / 2, cy + height / 3],
    [cx - size / 2, cy + height / 3],
  ]
    .map((point) => point.join(','))
    .join(' ');
  return `<polygon points="${points}" fill="${fill}" stroke="${C.ink}" stroke-width="${STROKE}" stroke-linejoin="round" transform="rotate(${rotation} ${cx} ${cy})"/>`;
};

export const circle = (cx, cy, r, fill) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${C.ink}" stroke-width="${STROKE}"/>`;

export const ring = (cx, cy, r, color, width = 6) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${width}"/>`;

export const halfCircle = (cx, cy, r, fill, rotation = 0) =>
  `<path d="M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z" fill="${fill}" stroke="${C.ink}" stroke-width="${STROKE}" stroke-linejoin="round" transform="rotate(${rotation} ${cx} ${cy})"/>`;

export const plus = (cx, cy, size, color) =>
  `<path d="M${cx - size} ${cy}H${cx + size}M${cx} ${cy - size}V${cy + size}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>`;

export const squiggle = (x, y, width, color, { amp = 7, step = 14, strokeWidth = 5 } = {}) => {
  const count = Math.max(1, Math.round(width / step));
  const tail = Array(count - 1).fill(`t${step} 0`).join(' ');
  return `<path d="M${x} ${y} q${step / 2} ${-amp * 2} ${step} 0 ${tail}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
};

export const zigzag = (x, y, width, color, { amp = 8, step = 14, strokeWidth = 5 } = {}) => {
  const points = [];
  for (let i = 0, px = x; px <= x + width; i += 1, px += step) {
    points.push(`${px},${i % 2 === 0 ? y : y - amp}`);
  }
  return `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
};

export const dots = (x, y, cols, rows, gap, color, r = 3) => {
  const items = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      items.push(`<circle cx="${x + col * gap}" cy="${y + row * gap}" r="${r}" fill="${color}"/>`);
    }
  }
  return items.join('');
};

/** Rectangle with a thick ink outline and a hard offset shadow. */
export const block = (x, y, width, height, fill, { rx = 0, offset = 6, strokeWidth = 4 } = {}) =>
  `<rect x="${x + offset}" y="${y + offset}" width="${width}" height="${height}" rx="${rx}" fill="${C.ink}"/>` +
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" stroke="${C.ink}" stroke-width="${strokeWidth}"/>`;

/** Wraps a shape in a gently floating group. `variant` picks speed and delay. */
export const float = (variant, inner) => `<g class="float f${variant}">${inner}</g>`;
export const spin = (inner) => `<g class="spin">${inner}</g>`;

const BASE_CSS = `
text{font-family:${FONT};font-weight:800}
.float{animation:float 5s ease-in-out infinite}
.f2{animation-duration:6.5s;animation-delay:-1.5s}
.f3{animation-duration:4s;animation-delay:-2.5s}
.spin{transform-box:fill-box;transform-origin:center;animation:spin 18s linear infinite}
@keyframes float{50%{transform:translateY(-8px)}}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.float,.spin{animation:none}}
`;

export const svgDocument = ({ width, height, title, body }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(title)}">` +
  `<title>${esc(title)}</title><style>${BASE_CSS}</style>${body}</svg>\n`;

/** Cream canvas with the signature thick border, drawn behind and in front of content. */
export const canvas = (width, height) => ({
  back: `<rect width="${width}" height="${height}" fill="${C.cream}"/>`,
  front: `<rect x="2" y="2" width="${width - 4}" height="${height - 4}" fill="none" stroke="${C.ink}" stroke-width="4"/>`,
});
