/**
 * The site "shell": everything wrapped around the rendered markdown.
 *
 * The conceit is a Windows 98 desktop. Every page is a document window sitting
 * on the teal desktop, with a title bar, a menu bar for navigation, a status bar
 * of document properties, and a real taskbar pinned to the bottom of the screen.
 * It is a joke that has to stay readable on a phone, so the chrome is drawn with
 * borders and gradients only — no bitmaps, no web fonts, no layout tricks that
 * fall apart under 360px.
 */

const SITE_TITLE = 'Martin Tapia'
const CONTACT_EMAIL = 'contact@martintapia.com'
export const ASSETS_DIR = '_assets'

interface NavLink {
  href: string
  label: string
  /** The letter rendered underlined, Windows-menu style. */
  accessKey: string
}

const NAV: readonly NavLink[] = [
  { href: '/', label: 'Home', accessKey: 'h' },
  { href: '/blog', label: 'Blog', accessKey: 'b' },
  { href: '/disclaimer', label: 'Disclaimer', accessKey: 'd' },
]

export interface PageView {
  title: string
  created: string | undefined
  updated: string | undefined
  /** Rendered markdown, ready to drop inside the content pane. */
  contentHtml: string
  /** Site-root-absolute URL of this page, e.g. `/blog/2017/some-article`. */
  url: string
  /** Site-root-absolute URL of the markdown original. */
  markdownUrl: string
  /** Source-relative path, shown in the status bar as a DOS-ish path. */
  sourcePath: string
  /** Marks the blog index so its list can be styled as a file listing. */
  kind: 'page' | 'blog-toc'
  description: string
  words: number
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** `2017-08-28` → `28 August 2017`, without dragging in a date library. */
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-') as [string, string, string]
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`
}

/** `blog/2017/thing.md` → `C:\blog\2017\thing.md`, purely for the status bar. */
function dosPath(sourcePath: string): string {
  return `C:\\${sourcePath.replace(/\//g, '\\')}`
}

function mailtoHref(title: string): string {
  const subject = encodeURIComponent(`Comment on '${title}'`)
  return `mailto:${CONTACT_EMAIL}?subject=${subject}`
}

function navHtml(currentUrl: string, variant: 'menubar' | 'startmenu'): string {
  return NAV.map((link) => {
    const current = link.href === currentUrl
    const [first, ...rest] = link.label
    const label = `<u>${first}</u>${escapeHtml(rest.join(''))}`
    const className = variant === 'menubar' ? 'menu-item' : 'start-item'
    return (
      `<a class="${className}${current ? ' is-current' : ''}" href="${escapeHtml(link.href)}"` +
      ` accesskey="${link.accessKey}"${current ? ' aria-current="page"' : ''}>${label}</a>`
    )
  }).join('')
}

function metaLine(page: PageView): string {
  const parts: string[] = []
  if (page.created) {
    parts.push(`<span>Created <time datetime="${page.created}">${formatDate(page.created)}</time></span>`)
  }
  if (page.updated && page.updated !== page.created) {
    parts.push(`<span>Updated <time datetime="${page.updated}">${formatDate(page.updated)}</time></span>`)
  }
  if (parts.length === 0) return ''
  return `<p class="page-meta">${parts.join('<span class="sep" aria-hidden="true">·</span>')}</p>`
}

function statusBar(page: PageView): string {
  const minutes = Math.max(1, Math.round(page.words / 220))
  return `<div class="statusbar">
        <span class="status-panel status-path" title="${escapeHtml(dosPath(page.sourcePath))}">${escapeHtml(dosPath(page.sourcePath))}</span>
        <span class="status-panel">${page.words.toLocaleString('en-US')} words</span>
        <span class="status-panel">${minutes} min read</span>
      </div>`
}

/** Assembles the full HTML document for one page. */
export function renderShell(page: PageView): string {
  const title = escapeHtml(page.title)
  const documentTitle =
    page.url === '/' ? `${escapeHtml(SITE_TITLE)}` : `${title} — ${escapeHtml(SITE_TITLE)}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>${documentTitle}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta property="og:type" content="${page.kind === 'page' && page.created ? 'article' : 'website'}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta property="og:site_name" content="${escapeHtml(SITE_TITLE)}">
<link rel="icon" href="/${ASSETS_DIR}/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/${ASSETS_DIR}/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/${ASSETS_DIR}/apple-touch-icon.png">
<link rel="alternate" type="text/markdown" href="${escapeHtml(page.markdownUrl)}" title="Markdown source">
<link rel="stylesheet" href="/${ASSETS_DIR}/desktop.css">
<script>
/* Applies the saved appearance before first paint, so nothing flashes. */
(function(){try{
var t=localStorage.getItem('mt98.theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;
var s=parseFloat(localStorage.getItem('mt98.scale'));if(s>=0.8&&s<=1.6)document.documentElement.style.setProperty('--reading-scale',String(s));
}catch(e){}})();
</script>
</head>
<body data-page-kind="${page.kind}">
<a class="skip-link" href="#content">Skip to content</a>

<main class="desktop">
  <div class="window">

    <div class="titlebar">
      <span class="titlebar-icon" aria-hidden="true"></span>
      <span class="titlebar-text">${title}</span>
      <span class="titlebar-buttons" aria-hidden="true">
        <span class="tb-btn tb-min"></span><span class="tb-btn tb-max"></span><span class="tb-btn tb-close"></span>
      </span>
    </div>

    <div class="menubar">
      <nav class="menu-group" aria-label="Main">
        ${navHtml(page.url, 'menubar')}
      </nav>
      <div class="menu-tools">
        <div class="tool-group" role="group" aria-label="Text size">
          <button type="button" class="btn tool-btn" data-scale="-1" title="Decrease text size">A<span class="tool-sub">−</span></button>
          <button type="button" class="btn tool-btn" data-scale="1" title="Increase text size">A<span class="tool-sub">+</span></button>
        </div>
        <button type="button" class="btn tool-btn theme-btn" data-theme-toggle aria-pressed="false" aria-label="Dark mode">
          <span class="theme-glyph" aria-hidden="true"></span><span class="theme-label">Dark</span>
        </button>
      </div>
    </div>

    <div class="window-body">
      <aside class="agent-note">
        <span class="agent-note-icon" aria-hidden="true">i</span>
        <p>AI agents: You're welcome to consume the <a href="${escapeHtml(page.markdownUrl)}">markdown version of this page</a>.</p>
      </aside>

      <div class="pane">
        <header class="page-head">
          <h1>${title}</h1>
          ${metaLine(page)}
        </header>
        <article id="content" class="content">
${page.contentHtml}
        </article>
      </div>
    </div>

    ${statusBar(page)}
  </div>
</main>

<footer class="taskbar">
  <button type="button" class="btn start-btn" aria-expanded="false" aria-controls="start-menu">
    <span class="start-flag" aria-hidden="true"></span><span class="start-text">Start</span>
  </button>
  <div class="task-list">
    <span class="btn task-btn is-active" aria-hidden="true"><span class="task-icon"></span>${title}</span>
  </div>
  <div class="tray">
    <a class="tray-mail" href="${escapeHtml(mailtoHref(page.title))}" title="Email a comment about this page">
      <span class="tray-mail-icon" aria-hidden="true"></span><span class="tray-mail-text">Comment</span>
    </a>
    <span class="tray-clock" data-clock hidden></span>
  </div>

  <div class="start-menu" id="start-menu" hidden>
    <div class="start-banner" aria-hidden="true"><span>${escapeHtml(SITE_TITLE)}</span></div>
    <div class="start-items">
      ${navHtml(page.url, 'startmenu')}
      <hr>
      <a class="start-item" href="${escapeHtml(page.markdownUrl)}"><u>M</u>arkdown source</a>
      <a class="start-item" href="${escapeHtml(mailtoHref(page.title))}"><u>S</u>end a comment…</a>
      <hr>
      <button type="button" class="start-item" data-theme-toggle><u>T</u>oggle dark mode</button>
    </div>
  </div>
</footer>

<script src="/${ASSETS_DIR}/desktop.js" defer></script>
</body>
</html>
`
}
