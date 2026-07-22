/**
 * The site "shell": the header, footer and surrounding chrome wrapped around
 * every generated page. This is where the site's personality lives — the CSS
 * and interactive JS are served from `/_assets` to keep each HTML file small.
 */

/** When this generator was invented, and by whom — used for the signature. */
export const SIGNATURE = {
  model: "Claude Opus 4.8",
  date: "July 2026",
}

const NAV = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/disclaimer", label: "Disclaimer" },
]

export interface PageView {
  title: string
  contentHtml: string
  /** Absolute URL of the markdown original, e.g. `/blog/2017/foo.md`. */
  mdUrl: string
  /** Absolute URL of this page, e.g. `/blog/2017/foo` — used to mark active nav. */
  urlPath: string
  created?: string
  updated?: string
}

export function renderPage(view: PageView): string {
  const { title } = view
  const pageTitle = `${escapeHtml(title)} · Martin Tapia`

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="stylesheet" href="/_assets/styles.css">
<script>${PREPAINT}</script>
<script src="/_assets/app.js" defer></script>
</head>
<body>
${renderHeader(view.urlPath)}
<main class="page">
${renderMdBanner(view.mdUrl)}
<article class="article">
<header class="article__head">
<h1 class="article__title">${escapeHtml(title)}</h1>
${renderMeta(view.created, view.updated)}
</header>
<div class="prose">
${view.contentHtml}
</div>
</article>
</main>
${renderFooter(view.urlPath, title)}
</body>
</html>
`
}

function renderHeader(urlPath: string): string {
  const links = NAV.map((item) => {
    const active = isActive(item.href, urlPath)
    return `<a class="nav__link${active ? " is-active" : ""}"${active ? ' aria-current="page"' : ""} href="${item.href}">${item.label}</a>`
  }).join("")

  return `<header class="site-head">
<div class="site-head__inner">
<a class="brand" href="/">
<span class="brand__mark" aria-hidden="true">MT</span>
<span class="brand__name">Martin Tapia</span>
</a>
<nav class="nav" aria-label="Primary">${links}</nav>
<div class="controls">
<div class="fontsize" role="group" aria-label="Font size">
<button type="button" class="ctrl ctrl--font" data-font="dec" aria-label="Decrease text size">A<span class="ctrl__sub">−</span></button>
<button type="button" class="ctrl ctrl--font" data-font="inc" aria-label="Increase text size">A<span class="ctrl__sup">+</span></button>
</div>
<button type="button" class="ctrl ctrl--theme" data-theme-toggle aria-label="Switch between light and dark mode">
<svg class="icon icon--sun" viewBox="0 0 24 24" aria-hidden="true" width="18" height="18"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5.2" y1="5.2" x2="7" y2="7"/><line x1="17" y1="17" x2="18.8" y2="18.8"/><line x1="5.2" y1="18.8" x2="7" y2="17"/><line x1="17" y1="7" x2="18.8" y2="5.2"/></g></svg>
<svg class="icon icon--moon" viewBox="0 0 24 24" aria-hidden="true" width="18" height="18"><path fill="currentColor" d="M20 14.5A8 8 0 0 1 9.5 4a0.5 0.5 0 0 0-0.7-0.6A9 9 0 1 0 20.6 15.2a0.5 0.5 0 0 0-0.6-0.7Z"/></svg>
</button>
</div>
</div>
</header>`
}

function renderMdBanner(mdUrl: string): string {
  return `<aside class="md-banner">
<span class="md-banner__glyph" aria-hidden="true">&lt;/&gt;</span>
<span class="md-banner__text">AI agents: You're welcome to consume the <a href="${escapeHtml(mdUrl)}">markdown version of this page</a>.</span>
</aside>`
}

function renderMeta(created?: string, updated?: string): string {
  const parts: string[] = []
  if (created) parts.push(`<span class="meta__item">Written <time datetime="${created}">${created}</time></span>`)
  if (updated && updated !== created)
    parts.push(`<span class="meta__item">Updated <time datetime="${updated}">${updated}</time></span>`)
  if (parts.length === 0) return ""
  return `<p class="article__meta">${parts.join('<span class="meta__sep" aria-hidden="true">·</span>')}</p>`
}

function renderFooter(urlPath: string, title: string): string {
  const subject = encodeURIComponent(`Comment on '${title}'`)
  const mailto = `mailto:contact@martintapia.com?subject=${subject}`
  const links = NAV.map(
    (item) => `<a class="foot-nav__link${isActive(item.href, urlPath) ? " is-active" : ""}" href="${item.href}">${item.label}</a>`,
  ).join("")

  return `<footer class="site-foot">
<div class="site-foot__inner">
<nav class="foot-nav" aria-label="Footer">${links}</nav>
<a class="foot-contact" href="${mailto}">Send a comment</a>
<p class="signature">
<span class="signature__spark" aria-hidden="true">✦</span>
Crafted by <strong>${SIGNATURE.model}</strong> <span class="signature__dot" aria-hidden="true">·</span> ${SIGNATURE.date}
</p>
</div>
</footer>`
}

function isActive(href: string, urlPath: string): boolean {
  if (href === "/") return urlPath === "/"
  return urlPath === href
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Applied inline in <head> before first paint so the correct theme and font
 * size are set immediately — no flash of the wrong theme.
 */
const PREPAINT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('mt-theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}d.setAttribute('data-theme',t);var s=parseFloat(localStorage.getItem('mt-font-scale'));if(s>0){d.style.setProperty('--content-scale',String(s));}}catch(e){}})();`
