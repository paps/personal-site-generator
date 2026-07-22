/**
 * Post-processing of links (and images) inside the generated HTML.
 *
 * Two rules from the site spec are implemented here, at build time, so that
 * they work even with JavaScript disabled:
 *
 *  1. Links to another domain open in a new tab and carry a visible "outbound"
 *     marker (a ↗ arrow) so the intent is obvious to everyone.
 *  2. Links to `https://web.archive.org/web/…` are rewritten to point at the
 *     *original* URL, with a small, subtle "archived" link inserted next to
 *     them that still points at the snapshot (for when link rot strikes).
 */

import { parse } from "node-html-parser"

const ARCHIVE_PREFIX = "https://web.archive.org/web/"
const EXTERNAL_RE = /^https?:\/\//i

/** A visible outbound arrow, hidden from assistive tech (the title carries meaning). */
const ARROW = '<span class="u-outbound" aria-hidden="true">↗</span>'

export function processContentHtml(html: string): string {
  const root = parse(html)

  for (const anchor of root.querySelectorAll("a")) {
    const href = anchor.getAttribute("href")
    if (!href) continue

    if (href.startsWith(ARCHIVE_PREFIX)) {
      rewriteArchiveLink(anchor, href)
    } else if (EXTERNAL_RE.test(href)) {
      markExternal(anchor)
    }
  }

  // Native lazy-loading + async decoding keeps image-heavy articles snappy.
  for (const img of root.querySelectorAll("img")) {
    if (!img.getAttribute("loading")) img.setAttribute("loading", "lazy")
    if (!img.getAttribute("decoding")) img.setAttribute("decoding", "async")
  }

  return root.toString()
}

function markExternal(anchor: import("node-html-parser").HTMLElement): void {
  anchor.setAttribute("target", "_blank")
  anchor.setAttribute("rel", "noopener noreferrer")
  anchor.setAttribute("title", "Opens in a new tab")
  anchor.insertAdjacentHTML("beforeend", ARROW)
}

function rewriteArchiveLink(anchor: import("node-html-parser").HTMLElement, href: string): void {
  // Strip the `https://web.archive.org/web/<timestamp>/` prefix to recover the
  // original URL. If for some reason we can't, fall back to a plain external link.
  const original = href.replace(/^https?:\/\/web\.archive\.org\/web\/[^/]+\//i, "")
  if (!EXTERNAL_RE.test(original)) {
    markExternal(anchor)
    return
  }

  anchor.setAttribute("href", original)
  markExternal(anchor)

  const archived =
    `<a class="archive-link" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer" ` +
    `title="View an archived snapshot, in case the original has rotted away">archived${ARROW}</a>`
  anchor.insertAdjacentHTML("afterend", `<span class="archive-wrap"> ${archived}</span>`)
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
}
