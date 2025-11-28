const fs = require('fs');
const { JSDOM } = require('jsdom');
const nanoid = () => Math.random().toString(36).slice(2, 10);

function parseNumber(value, fallback = 0) {
  if (!value) return fallback;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalNumber(value) {
  if (!value) return undefined;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseTransform(transform) {
  if (!transform) return undefined;
  const result = {};
  const translateMatch = transform.match(/translate\(([^)]+)\)/);
  if (translateMatch && translateMatch[1]) {
    const [x, y] = translateMatch[1].split(/[, ]+/).map(parseFloat);
    if (Number.isFinite(x)) result.x = x;
    if (Number.isFinite(y)) result.y = y;
  }
  const scaleMatch = transform.match(/scale\(([^)]+)\)/);
  if (scaleMatch && scaleMatch[1]) {
    const [sx, sy] = scaleMatch[1].split(/[, ]+/).map(parseFloat);
    if (Number.isFinite(sx)) result.scaleX = sx;
    if (Number.isFinite(sy)) result.scaleY = sy;
  }
  const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
  if (rotateMatch && rotateMatch[1]) {
    const parts = rotateMatch[1].split(/[\s,]+/).map(parseFloat);
    if (Number.isFinite(parts[0])) result.rotation = parts[0];
    if (Number.isFinite(parts[1])) result.rotationCx = parts[1];
    if (Number.isFinite(parts[2])) result.rotationCy = parts[2];
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function parseElement(node, inheritedTransform) {
  const nodeTransform = node.getAttribute('transform');
  const combinedTransform = [inheritedTransform, nodeTransform].filter(Boolean).join(' ').trim();
  const transform = parseTransform(combinedTransform || null);
  const tag = node.tagName.toLowerCase();
  switch (tag) {
    case 'rect':
      return {
        id: node.getAttribute('id') || nanoid(),
        type: 'rect',
        x: parseNumber(node.getAttribute('x')),
        y: parseNumber(node.getAttribute('y')),
        width: parseNumber(node.getAttribute('width')),
        height: parseNumber(node.getAttribute('height')),
        rx: parseOptionalNumber(node.getAttribute('rx')),
        ry: parseOptionalNumber(node.getAttribute('ry')),
        fill: node.getAttribute('fill') || undefined,
        stroke: node.getAttribute('stroke') || undefined,
        strokeWidth: parseOptionalNumber(node.getAttribute('stroke-width')),
        strokeDasharray: node.getAttribute('stroke-dasharray') || undefined,
        markerEnd: node.getAttribute('marker-end') || undefined,
        markerStart: node.getAttribute('marker-start') || undefined,
        opacity: parseOptionalNumber(node.getAttribute('opacity')),
        transform,
        visible: node.getAttribute('data-visible') !== 'false',
        locked: node.getAttribute('data-locked') === 'true',
      };
    case 'circle':
      return {
        id: node.getAttribute('id') || nanoid(),
        type: 'circle',
        cx: parseNumber(node.getAttribute('cx')),
        cy: parseNumber(node.getAttribute('cy')),
        r: parseNumber(node.getAttribute('r')),
        fill: node.getAttribute('fill') || undefined,
        stroke: node.getAttribute('stroke') || undefined,
        strokeWidth: parseOptionalNumber(node.getAttribute('stroke-width')),
        strokeDasharray: node.getAttribute('stroke-dasharray') || undefined,
        markerEnd: node.getAttribute('marker-end') || undefined,
        markerStart: node.getAttribute('marker-start') || undefined,
        opacity: parseOptionalNumber(node.getAttribute('opacity')),
        transform,
        visible: node.getAttribute('data-visible') !== 'false',
        locked: node.getAttribute('data-locked') === 'true',
      };
    case 'ellipse':
      return {
        id: node.getAttribute('id') || nanoid(),
        type: 'ellipse',
        cx: parseNumber(node.getAttribute('cx')),
        cy: parseNumber(node.getAttribute('cy')),
        rx: parseNumber(node.getAttribute('rx')),
        ry: parseNumber(node.getAttribute('ry')),
        fill: node.getAttribute('fill') || undefined,
        stroke: node.getAttribute('stroke') || undefined,
        strokeWidth: parseOptionalNumber(node.getAttribute('stroke-width')),
        strokeDasharray: node.getAttribute('stroke-dasharray') || undefined,
        markerEnd: node.getAttribute('marker-end') || undefined,
        markerStart: node.getAttribute('marker-start') || undefined,
        opacity: parseOptionalNumber(node.getAttribute('opacity')),
        transform,
        visible: node.getAttribute('data-visible') !== 'false',
        locked: node.getAttribute('data-locked') === 'true',
      };
    case 'line':
      return {
        id: node.getAttribute('id') || nanoid(),
        type: 'line',
        x1: parseNumber(node.getAttribute('x1')),
        y1: parseNumber(node.getAttribute('y1')),
        x2: parseNumber(node.getAttribute('x2')),
        y2: parseNumber(node.getAttribute('y2')),
        startRef: node.getAttribute('data-start-ref'),
        endRef: node.getAttribute('data-end-ref'),
        stroke: node.getAttribute('stroke') || undefined,
        strokeWidth: parseOptionalNumber(node.getAttribute('stroke-width')),
        strokeDasharray: node.getAttribute('stroke-dasharray') || undefined,
        markerEnd: node.getAttribute('marker-end') || undefined,
        markerStart: node.getAttribute('marker-start') || undefined,
        opacity: parseOptionalNumber(node.getAttribute('opacity')),
        transform,
        visible: node.getAttribute('data-visible') !== 'false',
        locked: node.getAttribute('data-locked') === 'true',
      };
    case 'path':
      return {
        id: node.getAttribute('id') || nanoid(),
        type: 'path',
        d: node.getAttribute('d') || '',
        fill: node.getAttribute('fill') || undefined,
        stroke: node.getAttribute('stroke') || undefined,
        strokeWidth: parseOptionalNumber(node.getAttribute('stroke-width')),
        strokeDasharray: node.getAttribute('stroke-dasharray') || undefined,
        markerEnd: node.getAttribute('marker-end') || undefined,
        markerStart: node.getAttribute('marker-start') || undefined,
        opacity: parseOptionalNumber(node.getAttribute('opacity')),
        transform,
        visible: node.getAttribute('data-visible') !== 'false',
        locked: node.getAttribute('data-locked') === 'true',
      };
    case 'text':
      return {
        id: node.getAttribute('id') || nanoid(),
        type: 'text',
        x: parseNumber(node.getAttribute('x')),
        y: parseNumber(node.getAttribute('y')),
        text: node.textContent || '',
        fontSize: parseOptionalNumber(node.getAttribute('font-size')),
        fontWeight: node.getAttribute('font-weight') || undefined,
        textAnchor: node.getAttribute('text-anchor') || undefined,
        dominantBaseline: node.getAttribute('dominant-baseline') || undefined,
        fill: node.getAttribute('fill') || undefined,
        stroke: node.getAttribute('stroke') || undefined,
        strokeWidth: parseOptionalNumber(node.getAttribute('stroke-width')),
        strokeDasharray: node.getAttribute('stroke-dasharray') || undefined,
        markerEnd: node.getAttribute('marker-end') || undefined,
        markerStart: node.getAttribute('marker-start') || undefined,
        opacity: parseOptionalNumber(node.getAttribute('opacity')),
        transform,
        visible: node.getAttribute('data-visible') !== 'false',
        locked: node.getAttribute('data-locked') === 'true',
      };
    default:
      return null;
  }
}

function parseSvgMarkup(svg) {
  const dom = new JSDOM();
  const parser = new dom.window.DOMParser();
  const parsed = parser.parseFromString(svg, 'image/svg+xml');
  const svgEl = parsed.querySelector('svg');
  if (!svgEl) {
    return { elements: [], valid: false };
  }
  const elements = [];
  const walk = (nodeList, inheritedTransform) => {
    for (const node of Array.from(nodeList)) {
      if (!(node instanceof dom.window.Element)) continue;
      const tagName = node.tagName.toLowerCase();
      if ([
        'defs', 'symbol', 'marker', 'pattern', 'mask', 'clippath', 'style', 'script',
        'title', 'desc', 'metadata'
      ].includes(tagName)) {
        continue;
      }
      const parsedElement = parseElement(node, inheritedTransform);
      if (parsedElement) {
        elements.push(parsedElement);
      }
      if (node.children && node.children.length > 0) {
        const nextTransform = [inheritedTransform, node.getAttribute('transform')]
          .filter(Boolean)
          .join(' ')
          .trim();
        walk(node.children, nextTransform || undefined);
      }
    }
  };
  walk(svgEl.children);
  return { elements, valid: true };
}

function main() {
  const svg = fs.readFileSync(process.argv[2], 'utf-8');
  const parsed = parseSvgMarkup(svg);
  console.log('valid:', parsed.valid, 'element count:', parsed.elements.length);
  parsed.elements.forEach((el, idx) => {
    console.log(idx, el.type, el);
  });
}

if (require.main === module) {
  main();
}
