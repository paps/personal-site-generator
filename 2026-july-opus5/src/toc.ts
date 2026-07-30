import type { FrontMatter } from './frontmatter.js'

export interface BlogEntry {
  url: string
  frontMatter: FrontMatter
}

const HEADING = '# Articles'

/**
 * Builds the markdown for the blog table of contents.
 *
 * It is markdown on purpose, not HTML: the generated block is written back into
 * `blog/index.md` in the destination, so the markdown original an agent fetches
 * stays as readable as the page a human sees. Links are site-root-absolute
 * because `/blog` has no trailing slash — a relative link from it would resolve
 * against `/`, not against `/blog/`.
 */
export function renderTableOfContents(entries: readonly BlogEntry[]): string {
  if (entries.length === 0) {
    return `\n\n${HEADING}\n\nNothing published yet.\n`
  }

  const sorted = [...entries].sort(compareNewestFirst)

  const lines: string[] = ['', '', HEADING, '']
  let currentGroup: string | null = null

  for (const entry of sorted) {
    const group = entry.frontMatter.created?.slice(0, 4) ?? 'Undated'
    if (group !== currentGroup) {
      if (currentGroup !== null) lines.push('')
      currentGroup = group
      lines.push(`## ${group}`, '')
    }
    const title = escapeMarkdown(entry.frontMatter.title)
    const date = entry.frontMatter.created
    // Two trailing spaces are a markdown hard break: the date sits on its own
    // line under the title instead of wrapping awkwardly beside it.
    lines.push(date ? `- [${title}](${entry.url})  \n  *${date}*` : `- [${title}](${entry.url})`)
  }

  lines.push('')
  return lines.join('\n')
}

/** Newest first, undated last, ties broken by title for a stable build. */
function compareNewestFirst(a: BlogEntry, b: BlogEntry): number {
  const dateA = a.frontMatter.created
  const dateB = b.frontMatter.created
  if (dateA && dateB && dateA !== dateB) return dateA < dateB ? 1 : -1
  if (dateA && !dateB) return -1
  if (!dateA && dateB) return 1
  return a.frontMatter.title.localeCompare(b.frontMatter.title)
}

/** Keeps titles containing `[`, `]` or `*` from breaking the list markup. */
function escapeMarkdown(value: string): string {
  return value.replace(/([[\]*_`])/g, '\\$1')
}
