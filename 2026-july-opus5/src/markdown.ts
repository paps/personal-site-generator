import showdown from 'showdown'
import footnotes from 'showdown-ghost-footnotes'
import highlight from 'showdown-highlight'

import { rewriteLinks } from './links.js'

/**
 * One converter is built per run and reused for every page. Showdown converters
 * are stateless between `makeHtml` calls, so this costs nothing and keeps the
 * options in a single place.
 */
export function createConverter(): showdown.Converter {
  return new showdown.Converter({
    extensions: [...highlight({ pre: true }), ...footnotes],
    // Content headings start at `#`, but the page title already owns the <h1>,
    // so everything is pushed down one level to keep the outline honest.
    headerLevelStart: 2,
    ghCompatibleHeaderId: true,
    parseImgDimensions: true,
    simplifiedAutoLink: true,
    excludeTrailingPunctuationFromURLs: true,
    literalMidWordUnderscores: true,
    strikethrough: true,
    tables: true,
    tasklists: true,
    disableForced4SpacesIndentedSublists: true,
  })
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

/**
 * `parseImgDimensions` emits `width="40%" height="auto"`, which browsers honour
 * but HTML does not allow. The same intent expressed as inline style is valid,
 * and lets the small-screen rules in the stylesheet override it.
 */
function normaliseImageSizes(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const styles: string[] = []
    const stripped = tag.replace(
      /\s(width|height)="([^"]*)"/gi,
      (whole: string, name: string, value: string) => {
        if (/^\d+$/.test(value)) return whole
        styles.push(`${name.toLowerCase()}:${value === '*' ? 'auto' : value}`)
        return ''
      },
    )
    if (styles.length === 0) return stripped
    return stripped.replace(/\s*\/?>$/, ` style="${styles.join(';')}" />`)
  })
}

/** Renders a markdown body to the HTML that goes inside the content window. */
export function renderMarkdown(converter: showdown.Converter, body: string): string {
  return framePictures(normaliseImageSizes(rewriteLinks(converter.makeHtml(body))))
}
