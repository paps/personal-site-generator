import MarkdownIt from 'markdown-it'
import attrs from 'markdown-it-attrs'
import footnotes from 'markdown-it-footnote'
import highlight from 'markdown-it-highlightjs'

import { rewriteLinks } from './links.js'

/** The site shell owns the page h1, so Markdown content begins one level lower. */
function shiftHeadingLevels(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'site_headings', (state) => {
    for (const token of state.tokens) {
      if (token.type !== 'heading_open' && token.type !== 'heading_close') continue
      token.tag = `h${Number(token.tag.slice(1)) + 1}`
    }
  })
}

/**
 * One converter is built per run and reused for every page. Markdown-it keeps
 * document state in each `render` call, so this remains safe and inexpensive.
 */
export function createConverter(): MarkdownIt {
  const converter = new MarkdownIt({
    // The source is trusted author content, and the old parser allowed its HTML.
    html: true,
    // Plain URLs in the authored Markdown should remain clickable.
    linkify: true,
  })

  // The plugins and markdown-it currently resolve opposite ESM/CJS faces of
  // the same DefinitelyTyped declaration. Bridge that packaging-only mismatch
  // here while keeping the converter itself and every local rule fully typed.
  const highlightPlugin = highlight as unknown as (
    md: MarkdownIt,
    options?: { auto?: boolean; code?: boolean },
  ) => void
  const attrsPlugin = attrs as unknown as (md: MarkdownIt) => void
  const footnotePlugin = footnotes as unknown as (md: MarkdownIt) => void

  converter.use(highlightPlugin)
  converter.use(footnotePlugin)
  converter.use(attrsPlugin)
  shiftHeadingLevels(converter)

  return converter
}

const PICTURE = String.raw`(?:<a\b[^>]*>\s*)?<img\b[^>]*>(?:\s*<\/a>)?`

/**
 * A paragraph that holds nothing but a picture — optionally followed by an
 * italic line, which is how this author writes captions — becomes a <figure> so
 * it can be framed like a Windows picture viewer.
 */
const PICTURE_PARAGRAPH = new RegExp(
  String.raw`<p>\s*(${PICTURE})\s*(?:<br\s*/?>)?\s*(<em>[\s\S]*?</em>)?\s*</p>`,
  'gi',
)

function framePictures(html: string): string {
  return html.replace(PICTURE_PARAGRAPH, (_match, picture: string, italic: string | undefined) => {
    const explicit = italic?.replace(/^<em>|<\/em>$/g, '').trim()
    const alt = /\balt\s*=\s*"([^"]*)"/i.exec(picture)?.[1]?.trim() ?? ''
    const caption = explicit || alt
    return `<figure class="picture">${picture}${caption === '' ? '' : `<figcaption>${caption}</figcaption>`}</figure>`
  })
}

/** Renders a markdown body to the HTML that goes inside the content window. */
export function renderMarkdown(converter: MarkdownIt, body: string): string {
  return framePictures(rewriteLinks(converter.render(body)))
}
