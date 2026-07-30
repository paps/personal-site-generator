/**
 * A deliberately small, strict front matter reader.
 *
 * The source repository writes front matter by hand and always follows the same
 * shape, so a full YAML parser would buy us nothing but ambiguity. What we want
 * instead is to be *loud*: anything that does not look exactly like the agreed
 * format is a build failure, so bad metadata can never reach the published site.
 */

export interface FrontMatter {
  title: string
  created?: string
  updated?: string
  published: boolean
}

export interface ParsedPage {
  frontMatter: FrontMatter
  /** The markdown body, i.e. everything after the closing delimiter. */
  body: string
}

/** Thrown for any markdown file whose front matter we refuse to guess at. */
export class FrontMatterError extends Error {
  constructor(
    readonly file: string,
    readonly line: number | null,
    reason: string,
  ) {
    super(`${file}${line === null ? '' : `:${line}`} — ${reason}`)
    this.name = 'FrontMatterError'
  }
}

const DELIMITER = /^---\s*$/
const KEY_VALUE = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Strips one layer of matching single or double quotes. */
function unquote(value: string): string {
  const first = value[0]
  if ((first === '"' || first === "'") && value.length >= 2 && value.at(-1) === first) {
    return value.slice(1, -1)
  }
  return value
}

/** True only for a real calendar date written as YYYY-MM-DD. */
function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

/**
 * Parses a markdown file's front matter.
 *
 * Returns `null` for a completely empty file: an empty draft carries no claim of
 * being published, so the caller warns and prunes it rather than failing the
 * whole build over a file that says nothing at all.
 */
export function parseFrontMatter(file: string, source: string): ParsedPage | null {
  if (source.trim() === '') return null

  const lines = source.replace(/^﻿/, '').split(/\r?\n/)

  let start = 0
  while (start < lines.length && lines[start]!.trim() === '') start++
  if (!DELIMITER.test(lines[start] ?? '')) {
    throw new FrontMatterError(file, start + 1, 'missing opening `---` front matter delimiter')
  }

  let end = -1
  for (let i = start + 1; i < lines.length; i++) {
    if (DELIMITER.test(lines[i]!)) {
      end = i
      break
    }
  }
  if (end === -1) {
    throw new FrontMatterError(file, null, 'missing closing `---` front matter delimiter')
  }

  const fields = new Map<string, { value: string; line: number }>()
  for (let i = start + 1; i < end; i++) {
    const raw = lines[i]!
    if (raw.trim() === '') continue
    const match = KEY_VALUE.exec(raw)
    if (!match) {
      throw new FrontMatterError(file, i + 1, `expected \`key: value\`, got ${JSON.stringify(raw)}`)
    }
    const key = match[1]!.toLowerCase()
    if (fields.has(key)) {
      throw new FrontMatterError(file, i + 1, `duplicate front matter key \`${key}\``)
    }
    fields.set(key, { value: unquote(match[2]!.trim()), line: i + 1 })
  }

  const title = fields.get('title')
  if (!title || title.value === '') {
    throw new FrontMatterError(file, title?.line ?? start + 1, 'missing or empty `title`')
  }

  const frontMatter: FrontMatter = { title: title.value, published: false }

  for (const key of ['created', 'updated'] as const) {
    const field = fields.get(key)
    if (!field) continue
    if (field.value === '') continue
    if (!isValidIsoDate(field.value)) {
      throw new FrontMatterError(
        file,
        field.line,
        `\`${key}\` must be a valid YYYY-MM-DD date, got ${JSON.stringify(field.value)}`,
      )
    }
    frontMatter[key] = field.value
  }

  const published = fields.get('published')
  if (published) {
    const value = published.value.toLowerCase()
    if (value !== 'true' && value !== 'false') {
      throw new FrontMatterError(
        file,
        published.line,
        `\`published\` must be \`true\` or \`false\`, got ${JSON.stringify(published.value)}`,
      )
    }
    frontMatter.published = value === 'true'
  }

  return { frontMatter, body: lines.slice(end + 1).join('\n') }
}
