import { deflateSync } from 'node:zlib'

/**
 * The site's favicon: "MT" as a raised Windows 98 tile.
 *
 * It is drawn once as a 16×16 pixel grid — the size a browser tab actually shows
 * — and then emitted twice from that single model: as SVG for anything modern
 * (crisp at every size, and it follows the visitor's colour scheme), and as PNG
 * for everything else. The letters are bitmap glyphs rather than text so they
 * never depend on a font being available.
 */

const SIZE = 16

type Ink = 'field' | 'light' | 'shadow' | 'glyph'

/**
 * Light scheme, matching the site's classic title-bar navy. The highlight is a
 * pale blue rather than white so that at 16px — where the bevel is a single
 * pixel — it reads as depth instead of competing with the white letters.
 */
const COLOURS: Record<Ink, string> = {
  field: '#000080',
  light: '#5a8ede',
  shadow: '#00001f',
  glyph: '#ffffff',
}

/** The one colour that changes for a visitor in dark mode: the "Eggplant" plum. */
const FIELD_DARK = '#6a4fa3'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/*
 * "MT" drawn pixel by pixel across columns 1–14 and rows 4–11, filling as much
 * of the tile as the one-pixel bevel allows. The M's diagonals meet in the
 * middle so the letter still reads as an M at tab size.
 *
 *   col 0123456789...45
 *    y4  .X.....X..XXXXX.
 *    y5  .XX...XX....X...
 *    y6  .X.X.X.X....X...
 *    y7  .X..X..X....X...
 *    y8  .X.....X....X...
 *    y9  .X.....X....X...
 *   y10  .X.....X....X...
 *   y11  .X.....X....X...
 */
const GLYPH_RECTS: readonly Rect[] = [
  { x: 1, y: 4, w: 1, h: 8 }, // M, left stem
  { x: 7, y: 4, w: 1, h: 8 }, // M, right stem
  { x: 2, y: 5, w: 1, h: 1 }, // M, diagonals descending to the centre
  { x: 6, y: 5, w: 1, h: 1 },
  { x: 3, y: 6, w: 1, h: 1 },
  { x: 5, y: 6, w: 1, h: 1 },
  { x: 4, y: 7, w: 1, h: 1 },
  { x: 10, y: 4, w: 5, h: 1 }, // T, crossbar
  { x: 12, y: 5, w: 1, h: 7 }, // T, stem
]

/** The whole icon as a grid of ink names, the single source both formats read. */
function buildGrid(): Ink[][] {
  const grid: Ink[][] = Array.from({ length: SIZE }, () => Array.from<Ink>({ length: SIZE }).fill('field'))
  const set = (x: number, y: number, ink: Ink): void => {
    grid[y]![x] = ink
  }

  // A raised bevel: highlight along the top and left, shadow along the bottom
  // and right. The shadow is applied second so it owns the two mixed corners.
  for (let i = 0; i < SIZE; i++) {
    set(i, 0, 'light')
    set(0, i, 'light')
  }
  for (let i = 0; i < SIZE; i++) {
    set(i, SIZE - 1, 'shadow')
    set(SIZE - 1, i, 'shadow')
  }
  for (const rect of GLYPH_RECTS) {
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) set(x, y, 'glyph')
    }
  }
  return grid
}

/**
 * Collapses the cells of one ink into as few rectangles as possible: horizontal
 * runs first, then vertically stacking runs that line up. Sixteen rows of border
 * become one rectangle, and the whole SVG stays under a kilobyte.
 */
function runsFor(grid: readonly Ink[][], ink: Ink): Rect[] {
  const runs: Rect[] = []
  for (let y = 0; y < SIZE; y++) {
    let start = -1
    for (let x = 0; x <= SIZE; x++) {
      const matches = x < SIZE && grid[y]![x] === ink
      if (matches && start === -1) start = x
      if (!matches && start !== -1) {
        const above = runs.find((r) => r.x === start && r.w === x - start && r.y + r.h === y)
        if (above) above.h++
        else runs.push({ x: start, y, w: x - start, h: 1 })
        start = -1
      }
    }
  }
  return runs
}

export function renderFaviconSvg(): string {
  const grid = buildGrid()
  const layer = (ink: Ink, attributes: string): string => {
    const rects = runsFor(grid, ink)
      .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>`)
      .join('')
    return `<g ${attributes}>${rects}</g>`
  }

  // The field is one flat rectangle behind everything; the later layers cover
  // whatever they need to, so it never has to be described cell by cell.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="crispEdges" role="img" aria-label="MT">
<style>.field{fill:${COLOURS.field}}@media(prefers-color-scheme:dark){.field{fill:${FIELD_DARK}}}</style>
<rect class="field" width="${SIZE}" height="${SIZE}"/>
${layer('light', `fill="${COLOURS.light}"`)}
${layer('shadow', `fill="${COLOURS.shadow}"`)}
${layer('glyph', `fill="${COLOURS.glyph}"`)}
</svg>
`
}

/* --------------------------------------------------------------- PNG output */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, body: Uint8Array): Buffer {
  const payload = Buffer.concat([Buffer.from(type, 'latin1'), body])
  const out = Buffer.alloc(payload.length + 8)
  out.writeUInt32BE(body.length, 0)
  payload.copy(out, 4)
  out.writeUInt32BE(crc32(payload), payload.length + 4)
  return out
}

function parseHex(colour: string): [number, number, number] {
  return [
    Number.parseInt(colour.slice(1, 3), 16),
    Number.parseInt(colour.slice(3, 5), 16),
    Number.parseInt(colour.slice(5, 7), 16),
  ]
}

/**
 * Writes a truecolour PNG of the icon at `scale`× nearest-neighbour, which is
 * exact because every output size we ask for is a whole multiple of 16.
 */
export function renderFaviconPng(scale: number): Buffer {
  const grid = buildGrid()
  const rgb = new Map<Ink, [number, number, number]>(
    (Object.keys(COLOURS) as Ink[]).map((ink) => [ink, parseHex(COLOURS[ink])]),
  )

  const size = SIZE * scale
  const stride = size * 3 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) {
    let offset = y * stride
    raw[offset++] = 0 // filter type: none
    const row = grid[Math.floor(y / scale)]!
    for (let x = 0; x < size; x++) {
      const [r, g, b] = rgb.get(row[Math.floor(x / scale)]!)!
      raw[offset++] = r
      raw[offset++] = g
      raw[offset++] = b
    }
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 2 // colour type: truecolour
  header[10] = 0 // deflate
  header[11] = 0 // adaptive filtering
  header[12] = 0 // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}
