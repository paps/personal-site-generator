/**
 * Build entry point.
 *
 * Runs a full, cache-free regeneration over the `dist` folder (which is a fresh
 * copy of the source data). For every published markdown file it writes a
 * sibling `.html`; unpublished files are actively deleted; the blog index gains
 * a just-in-time table of contents. Everything else is left untouched so it can
 * be served as-is.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import showdown from "showdown"
import ghostFootnotes from "showdown-ghost-footnotes"
import showdownHighlight from "showdown-highlight"

import { FrontMatterError, parseFrontMatter, type FrontMatter } from "./frontmatter.js"
import { processContentHtml } from "./links.js"
import { renderPage } from "./shell.js"

const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..")
const DIST = path.join(ROOT, "dist")
const ASSETS_SRC = path.join(ROOT, "assets")
const ASSETS_DEST = path.join(DIST, "_assets")

interface SourcePage {
  absPath: string
  /** POSIX path relative to `dist`, e.g. `blog/2017/foo.md`. */
  relPath: string
  /** Public URL of the page, e.g. `/blog/2017/foo`, `/blog`, `/`. */
  urlPath: string
  /** Public URL of the markdown original, e.g. `/blog/2017/foo.md`. */
  mdUrl: string
  fm: FrontMatter
  body: string
}

function main(): void {
  if (!fs.existsSync(DIST)) {
    fail(
      `The 'dist' folder does not exist.\n` +
        `Run \`npm run build\` (which copies ../personal-site/src to dist first), ` +
        `not \`npm run generate\` on its own.`,
    )
  }

  console.log("→ Refreshing /_assets")
  fs.rmSync(ASSETS_DEST, { recursive: true, force: true })
  copyDir(ASSETS_SRC, ASSETS_DEST)

  console.log("→ Ingesting markdown")
  const { published, unpublishedFiles, emptyFiles } = ingest()

  for (const file of emptyFiles) {
    console.warn(`  ! ${rel(file)} is empty — treated as an unpublished draft and removed.`)
  }
  console.log(`  ${published.length} published, ${unpublishedFiles.length + emptyFiles.length} to remove`)

  console.log("→ Removing unpublished pages")
  for (const file of [...unpublishedFiles, ...emptyFiles]) {
    fs.rmSync(file, { force: true })
  }

  console.log("→ Building blog table of contents")
  appendBlogToc(published)

  console.log("→ Rendering HTML")
  const converter = makeConverter()
  for (const page of published) {
    const contentHtml = processContentHtml(converter.makeHtml(page.body))
    const html = renderPage({
      title: page.fm.title,
      contentHtml,
      mdUrl: page.mdUrl,
      urlPath: page.urlPath,
      created: page.fm.created,
      updated: page.fm.updated,
    })
    fs.writeFileSync(page.absPath.replace(/\.md$/, ".html"), html)
    console.log(`  ✓ ${page.urlPath}`)
  }

  console.log(`\nDone — generated ${published.length} pages. ✦`)
}

/** Read and parse every markdown file, partitioning by publication state. */
function ingest(): {
  published: SourcePage[]
  unpublishedFiles: string[]
  emptyFiles: string[]
} {
  const published: SourcePage[] = []
  const unpublishedFiles: string[] = []
  const emptyFiles: string[] = []

  for (const absPath of walkMarkdown(DIST)) {
    const relPath = toPosix(path.relative(DIST, absPath))
    const raw = fs.readFileSync(absPath, "utf8")

    let result
    try {
      result = parseFrontMatter(raw, relPath)
    } catch (err) {
      if (err instanceof FrontMatterError) {
        fail(
          `Invalid front matter — a human should look at this file.\n\n  ${err.message}\n\n` +
            `Aborting so nothing is published with bad metadata.`,
        )
      }
      throw err
    }

    if (result.kind === "empty") {
      emptyFiles.push(absPath)
      continue
    }
    if (!result.frontMatter.published) {
      unpublishedFiles.push(absPath)
      continue
    }

    published.push({
      absPath,
      relPath,
      urlPath: toUrlPath(relPath),
      mdUrl: "/" + relPath,
      fm: result.frontMatter,
      body: result.body,
    })
  }

  return { published, unpublishedFiles, emptyFiles }
}

/**
 * Append a just-in-time table of contents to `dist/blog/index.md`, listing every
 * published blog article (any depth) newest-first, grouped by year. The ToC is
 * written into the actual markdown file so the markdown original stays correct,
 * then rendered like any other page.
 */
function appendBlogToc(published: SourcePage[]): void {
  const blogIndex = published.find((p) => p.relPath === "blog/index.md")
  if (!blogIndex) {
    console.warn("  ! No published blog/index.md found — skipping table of contents.")
    return
  }

  const articles = published
    .filter((p) => p.relPath.startsWith("blog/") && p.relPath !== "blog/index.md")
    .sort((a, b) => (b.fm.created ?? "").localeCompare(a.fm.created ?? ""))

  const byYear = new Map<string, SourcePage[]>()
  for (const article of articles) {
    const year = article.fm.created?.slice(0, 4) ?? "Undated"
    const bucket = byYear.get(year) ?? []
    bucket.push(article)
    byYear.set(year, bucket)
  }

  let toc = "\n"
  for (const [year, list] of byYear) {
    toc += `\n# ${year}\n\n`
    for (const article of list) {
      const date = article.fm.created ? ` <span class="toc-date">· ${article.fm.created}</span>` : ""
      toc += `- [${escapeMd(article.fm.title)}](${article.urlPath})${date}\n`
    }
  }

  fs.appendFileSync(blogIndex.absPath, toc)
  blogIndex.body += toc
}

function makeConverter(): showdown.Converter {
  const converter = new showdown.Converter({
    tables: true,
    strikethrough: true,
    tasklists: true,
    parseImgDimensions: true,
    ghCompatibleHeaderId: true,
    headerLevelStart: 2, // page titles are already rendered as <h1> by the shell
    extensions: [ghostFootnotes, showdownHighlight({ pre: true })],
  })
  return converter
}

// ── path helpers ────────────────────────────────────────────────────────────

function toUrlPath(relPath: string): string {
  const parts = relPath.replace(/\.md$/, "").split("/")
  if (parts.at(-1) === "index") parts.pop()
  const url = "/" + parts.join("/")
  return url === "/" ? "/" : url.replace(/\/$/, "")
}

function walkMarkdown(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "_assets") continue
      out.push(...walkMarkdown(full))
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(full)
    }
  }
  return out
}

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name)
    const to = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(from, to)
    else fs.copyFileSync(from, to)
  }
}

function toPosix(p: string): string {
  return p.split(path.sep).join("/")
}

function rel(absPath: string): string {
  return toPosix(path.relative(DIST, absPath))
}

function escapeMd(text: string): string {
  return text.replace(/([\[\]])/g, "\\$1")
}

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

main()
