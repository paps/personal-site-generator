/**
 * Build-time rewriting of the links the Markdown renderer produced.
 *
 * Doing this here rather than with runtime JavaScript means the rules hold for
 * readers without JS, for text-mode browsers, and for the agents that fetch the
 * HTML directly.
 */

const ANCHOR_OPEN = /<a\b([^>]*)>/gi
const HREF = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i
const WAYBACK = /^https?:\/\/web\.archive\.org\/web\/[0-9]+(?:[a-z_]+)?\/(.+)$/i

/** The "leaves the site" affordance appended inside an external link. */
const EXTERNAL_MARK =
  '<span class="lnk-ext" aria-hidden="true">↗</span><span class="sr-only"> (external link, opens in a new tab)</span>'

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag)
  if (!match) return null
  return match[1] ?? match[2] ?? ''
}

function escapeAttribute(value: string): string {
  // Renderers give us already-escaped hrefs. Preserve those entities when an
  // anchor is rebuilt, otherwise `&amp;` becomes `&amp;amp;` and changes query
  // parameters in the browser.
  return value
    .replace(/&(?!(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]+);)/gi, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

/** Absolute http(s) URLs are the only thing we can be sure points off-site. */
function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href)
}

/** The Wayback Machine sometimes drops the scheme from the wrapped URL. */
function normaliseWaybackTarget(target: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) return target
  if (target.startsWith('//')) return `https:${target}`
  return `https://${target}`
}

/** Sets or replaces an attribute on an anchor's attribute string. */
function withAttribute(attributes: string, name: string, value: string): string {
  const pattern = new RegExp(`\\s*\\b${name}\\s*=\\s*(?:"[^"]*"|'[^']*')`, 'i')
  const cleaned = attributes.replace(pattern, '')
  return `${cleaned} ${name}="${escapeAttribute(value)}"`
}

/**
 * Applies the site's two link rules to a rendered HTML fragment:
 *
 * 1. Off-site links open in a new tab and say so, visually and to screen readers.
 * 2. `web.archive.org` links become the *original* link, trailed by a small
 *    "archive" link pointing at the snapshot. Both are off-site, so rule 1
 *    applies to both.
 */
export function rewriteLinks(html: string): string {
  let result = ''
  let cursor = 0

  ANCHOR_OPEN.lastIndex = 0
  for (let match = ANCHOR_OPEN.exec(html); match !== null; match = ANCHOR_OPEN.exec(html)) {
    const [openTag, rawAttributes = ''] = match
    const start = match.index
    const contentStart = start + openTag.length

    const hrefMatch = HREF.exec(rawAttributes)
    const href = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? '') : null

    // Footnote back-references and anchors without an href are left untouched.
    if (href === null || href === '' || attribute(rawAttributes, 'class')?.includes('footnote')) {
      continue
    }

    const closeIndex = html.indexOf('</a>', contentStart)
    if (closeIndex === -1) continue

    const inner = html.slice(contentStart, closeIndex)
    const contentEnd = closeIndex + '</a>'.length

    const wayback = WAYBACK.exec(href)
    const realHref = wayback ? normaliseWaybackTarget(wayback[1]!) : href

    if (!isExternal(realHref)) continue

    let attributes = withAttribute(rawAttributes, 'href', realHref)
    attributes = withAttribute(attributes, 'target', '_blank')
    attributes = withAttribute(attributes, 'rel', 'noopener noreferrer')

    // An image link gets the new-tab behaviour but not a text arrow glued to it.
    const mark = /<img\b/i.test(inner) ? '' : EXTERNAL_MARK
    let replacement = `<a${attributes}>${inner}${mark}</a>`

    if (wayback) {
      replacement +=
        `<a class="lnk-archive" href="${escapeAttribute(href)}" target="_blank"` +
        ` rel="noopener noreferrer" title="Archived snapshot on the Wayback Machine">` +
        `archive<span class="sr-only"> (archived copy, external link, opens in a new tab)</span></a>`
    }

    result += html.slice(cursor, start) + replacement
    cursor = contentEnd
    ANCHOR_OPEN.lastIndex = contentEnd
  }

  return result + html.slice(cursor)
}
