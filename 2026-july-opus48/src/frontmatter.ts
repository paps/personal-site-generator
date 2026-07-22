/**
 * Front matter parsing and strict validation.
 *
 * Every markdown page in the source begins with a YAML-ish front matter block
 * delimited by `---` lines. We parse it ourselves (rather than leaning on
 * showdown's metadata support) so that we can validate it strictly and fail
 * loudly on malformed input — as required by the site spec.
 */

export interface FrontMatter {
  title: string
  created?: string
  updated?: string
  published: boolean
}

export type ParseResult =
  /** A well-formed front matter block was found and validated. */
  | { kind: "ok"; frontMatter: FrontMatter; body: string }
  /**
   * The file is empty (or only whitespace). These are treated as unpublished
   * drafts: not an error, but the file must be actively removed from the output.
   */
  | { kind: "empty" }

/** Thrown when a non-empty file has a missing or invalid front matter block. */
export class FrontMatterError extends Error {}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
// Matches an opening `---` line, the block body, a closing `---` line, and the
// remaining page content. Tolerates a leading BOM, CRLF line endings and
// trailing spaces on the delimiter lines.
const BLOCK_RE = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/

export function parseFrontMatter(raw: string, filePath: string): ParseResult {
  if (raw.trim() === "") {
    return { kind: "empty" }
  }

  const match = raw.match(BLOCK_RE)
  if (!match) {
    throw new FrontMatterError(
      `${filePath}: missing or malformed front matter block ` +
        `(expected the file to start with a '---' delimited front matter).`,
    )
  }

  const [, block = "", body = ""] = match
  const fields = parseFields(block, filePath)

  const title = fields.get("title")
  if (title === undefined || title === "") {
    throw new FrontMatterError(`${filePath}: front matter is missing a non-empty 'title'.`)
  }

  for (const key of ["created", "updated"] as const) {
    const value = fields.get(key)
    if (value !== undefined && !DATE_RE.test(value)) {
      throw new FrontMatterError(
        `${filePath}: front matter '${key}' must be in YYYY-MM-DD format (got '${value}').`,
      )
    }
  }

  const publishedRaw = fields.get("published")
  if (publishedRaw !== undefined && publishedRaw !== "true" && publishedRaw !== "false") {
    throw new FrontMatterError(
      `${filePath}: front matter 'published' must be 'true' or 'false' (got '${publishedRaw}').`,
    )
  }

  return {
    kind: "ok",
    frontMatter: {
      title,
      created: fields.get("created"),
      updated: fields.get("updated"),
      published: publishedRaw === "true",
    },
    body,
  }
}

/** Parse the `key: value` lines of a front matter block into a map. */
function parseFields(block: string, filePath: string): Map<string, string> {
  const fields = new Map<string, string>()
  for (const line of block.split(/\r?\n/)) {
    if (line.trim() === "") continue
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/)
    if (!m) {
      throw new FrontMatterError(`${filePath}: cannot parse front matter line: '${line}'.`)
    }
    const [, key = "", value = ""] = m
    fields.set(key, stripQuotes(value.trim()))
  }
  return fields
}

function stripQuotes(value: string): string {
  if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
    return value.slice(1, -1)
  }
  return value
}
