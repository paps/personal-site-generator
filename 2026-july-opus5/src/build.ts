import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderFaviconPng, renderFaviconSvg } from './favicon.js'
import { FrontMatterError, parseFrontMatter, type ParsedPage } from './frontmatter.js'
import { createConverter, renderMarkdown } from './markdown.js'
import { ASSETS_DIR, renderShell, type PageView } from './shell.js'
import { renderTableOfContents, type BlogEntry } from './toc.js'

export interface BuildOptions {
  srcDir: string
  destDir: string
  log: (message: string) => void
  warn: (message: string) => void
}

export interface BuildResult {
  copied: number
  rendered: number
  pruned: number
  warnings: number
}

const BLOG_DIR = 'blog'
const BLOG_INDEX = path.posix.join(BLOG_DIR, 'index.md')

/** Every markdown file we found, keyed by its destination-relative posix path. */
interface MarkdownFile {
  /** e.g. `blog/2017/thing.md` */
  relPath: string
  parsed: ParsedPage | null
}

export async function build(options: BuildOptions): Promise<BuildResult> {
  const { srcDir, destDir, log, warn } = options
  let warnings = 0
  const warnOnce = (message: string): void => {
    warnings++
    warn(message)
  }

  log(`Copying ${srcDir} → ${destDir}`)
  await fs.cp(srcDir, destDir, { recursive: true, dereference: true })
  const allFiles = await listFiles(destDir)
  log(`Copied ${allFiles.length} file${allFiles.length === 1 ? '' : 's'}`)

  const markdownPaths = allFiles.filter((rel) => rel.toLowerCase().endsWith('.md')).sort()
  const files: MarkdownFile[] = []
  const errors: FrontMatterError[] = []

  for (const relPath of markdownPaths) {
    const source = await fs.readFile(path.join(destDir, relPath), 'utf8')
    try {
      files.push({ relPath, parsed: parseFrontMatter(relPath, source) })
    } catch (error) {
      if (error instanceof FrontMatterError) errors.push(error)
      else throw error
    }
  }

  if (errors.length > 0) {
    throw new AggregateFrontMatterError(errors)
  }

  // Unpublished pages leave no trace: not rendered, and the markdown original is
  // removed from the destination too.
  let pruned = 0
  const prunedDirs = new Set<string>()
  const published: MarkdownFile[] = []

  for (const file of files) {
    if (file.parsed === null) {
      warnOnce(`${file.relPath} is empty — treating it as an unpublished draft and removing it`)
    }
    if (file.parsed?.frontMatter.published === true) {
      published.push(file)
      continue
    }
    await fs.rm(path.join(destDir, file.relPath))
    prunedDirs.add(path.posix.dirname(file.relPath))
    pruned++
  }
  log(`Pruned ${pruned} unpublished page${pruned === 1 ? '' : 's'}`)
  await removeEmptiedDirs(destDir, prunedDirs)

  // The blog index gets its table of contents *on disk*, before rendering, so the
  // markdown original and the HTML page tell the same story.
  const blogIndex = published.find((file) => file.relPath === BLOG_INDEX)
  if (blogIndex) {
    const entries: BlogEntry[] = published
      .filter((file) => file.relPath !== BLOG_INDEX && isInside(BLOG_DIR, file.relPath))
      .map((file) => ({ url: urlForPage(file.relPath), frontMatter: file.parsed!.frontMatter }))

    const destPath = path.join(destDir, BLOG_INDEX)
    const withToc = (await fs.readFile(destPath, 'utf8')).trimEnd() + renderTableOfContents(entries)
    await fs.writeFile(destPath, withToc, 'utf8')
    blogIndex.parsed = parseFrontMatter(BLOG_INDEX, withToc)
    log(`Generated blog table of contents (${entries.length} article${entries.length === 1 ? '' : 's'})`)
  } else {
    warnOnce(`No ${BLOG_INDEX} found in the source — the blog menu link will 404`)
  }

  const converter = createConverter()
  for (const file of published) {
    const parsed = file.parsed!
    const contentHtml = renderMarkdown(converter, parsed.body)
    const text = htmlToText(contentHtml)
    const page: PageView = {
      title: parsed.frontMatter.title,
      created: parsed.frontMatter.created,
      updated: parsed.frontMatter.updated,
      contentHtml,
      url: urlForPage(file.relPath),
      markdownUrl: `/${file.relPath}`,
      sourcePath: file.relPath,
      kind: file.relPath === BLOG_INDEX ? 'blog-toc' : 'page',
      description: summarise(text, parsed.frontMatter.title),
      words: countWords(text),
    }
    const htmlPath = path.join(destDir, file.relPath.replace(/\.md$/i, '.html'))
    await fs.writeFile(htmlPath, renderShell(page), 'utf8')
  }
  log(`Rendered ${published.length} page${published.length === 1 ? '' : 's'}`)

  await copyAssets(destDir)
  await writeFavicons(destDir)
  log(`Wrote shared assets and favicon to ${ASSETS_DIR}/`)

  return { copied: allFiles.length, rendered: published.length, pruned, warnings }
}

/** Raised with every bad page at once, so one run reports all the problems. */
export class AggregateFrontMatterError extends Error {
  constructor(readonly errors: readonly FrontMatterError[]) {
    super(
      `${errors.length} markdown file${errors.length === 1 ? ' has' : 's have'} invalid front matter:\n` +
        errors.map((error) => `  • ${error.message}`).join('\n'),
    )
    this.name = 'AggregateFrontMatterError'
  }
}

/** `blog/2017/thing.md` → `/blog/2017/thing`; `blog/index.md` → `/blog`. */
function urlForPage(relPath: string): string {
  const withoutExtension = relPath.replace(/\.md$/i, '')
  if (withoutExtension === 'index') return '/'
  if (withoutExtension.endsWith('/index')) return `/${withoutExtension.slice(0, -'/index'.length)}`
  return `/${withoutExtension}`
}

function isInside(dir: string, relPath: string): boolean {
  return relPath.startsWith(`${dir}/`)
}

/** All files under `root`, as posix paths relative to it. */
async function listFiles(root: string, prefix = ''): Promise<string[]> {
  const entries = await fs.readdir(path.join(root, prefix), { withFileTypes: true })
  const found: string[] = []
  for (const entry of entries) {
    const rel = prefix === '' ? entry.name : path.posix.join(prefix, entry.name)
    if (entry.isDirectory()) found.push(...(await listFiles(root, rel)))
    else found.push(rel)
  }
  return found
}

/**
 * Removes directories left empty by pruning, walking upwards. A directory that
 * still holds anything at all is kept untouched.
 */
async function removeEmptiedDirs(destDir: string, dirs: ReadonlySet<string>): Promise<void> {
  for (const start of dirs) {
    let current = start
    while (current !== '.' && current !== '' && current !== '/') {
      const absolute = path.join(destDir, current)
      let remaining: string[]
      try {
        remaining = await fs.readdir(absolute)
      } catch {
        break
      }
      if (remaining.length > 0) break
      await fs.rmdir(absolute)
      current = path.posix.dirname(current)
    }
  }
}

async function copyAssets(destDir: string): Promise<void> {
  const source = fileURLToPath(new URL('../assets/', import.meta.url))
  const target = path.join(destDir, ASSETS_DIR)
  await fs.mkdir(target, { recursive: true })
  for (const name of await fs.readdir(source)) {
    await fs.copyFile(path.join(source, name), path.join(target, name))
  }
}

/** The "MT" favicon is generated, not shipped: SVG first, PNG for the rest. */
async function writeFavicons(destDir: string): Promise<void> {
  const target = path.join(destDir, ASSETS_DIR)
  await fs.writeFile(path.join(target, 'favicon.svg'), renderFaviconSvg(), 'utf8')
  await fs.writeFile(path.join(target, 'favicon-32.png'), renderFaviconPng(2))
  await fs.writeFile(path.join(target, 'apple-touch-icon.png'), renderFaviconPng(12))
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function countWords(text: string): number {
  return text === '' ? 0 : text.split(' ').length
}

/** A ~160 character meta description, cut on a word boundary. */
function summarise(text: string, fallback: string): string {
  const source = text === '' ? fallback : text
  if (source.length <= 160) return source
  const cut = source.slice(0, 160)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}
