#!/usr/bin/env node
const fs = require("fs")
const glob = require("glob")
const showdown = require("showdown")

/*
 * Ingest all pages into the global PAGES array, parsing and transforming markdown to HTML
 * It's the most important global variable in this file, so I chose to uppercase it 🤷
 */
const PAGES = []
const mdConverter = new showdown.Converter({
	metadata: true,
	headerLevelStart: 2, // because we already render page titles with <h1>
	strikethrough: true,
	tables: true,
	tasklists: true,
	parseImgDimensions: true,
	extensions: [require("showdown-ghost-footnotes"), require("showdown-highlight")],
})
for (const mdFilePath of glob.sync("dist/**/*.md")) {
	console.log(`⚙️ Ingesting '${mdFilePath}'`)
	const md = fs.readFileSync(mdFilePath).toString()
	const page = {
		md,
		html: mdConverter.makeHtml(md),
		meta: mdConverter.getMetadata(),
		location: mdFilePath.replace(/^dist\//, "").replace(/\.md$/, ""),
	}
	if (page.meta.published === "true") {
		PAGES.push(page)
	} else {
		if (process.env.NODE_ENV === "development") {
			PAGES.push(page) // useful when running a local npm run watch
			console.log(`\t(not marked as published but kept anyway in development mode)`)
		} else {
			console.log(`\t(skipped because it's not marked as published)`)
		}
	}
}
console.log(`Ingested ${PAGES.length} pages 👍\n`)

/*
 * Utils and helpers for renderers
 */
const renderHtmlTop = (page) => {
	// Inject a script that monitors every 1s and reloads the page when changes are found, when in development (= watch) mode.
	// Tricky bit: directoryListing is set to false in serve.json so that the script doesn't reload the page while the site is being built (reload don't happen on 404s)
	let liveReloader = ""
	if (process.env.NODE_ENV === "development") {
		liveReloader = "<script type=\"text/javascript\" src=\"https://cdn.jsdelivr.net/gh/paps/LiveJS@master/livejs.js\"></script>"
	}

	return `
		<!DOCTYPE html>
		<html lang="en">
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>${page.meta.title} &middot; Martin Tapia</title>
		<link rel="icon" type="image/png" href="/favicon.png">
		${page.meta.canonical ? `<link rel="canonical" href="${page.meta.canonical}">` : ""}
		${liveReloader}

		<style>
			/* General appearance */
			body { background-color: #f9f6f3; color: #222; margin: 1em auto; max-width: 36em; padding: 1em; }
			@media print { body { max-width: none } }

			/* Use a big, standard, common readable serif font, with golden ratio line height. The goal is readability and sobriety */
			body { line-height: 161.8%; font-size: larger; font-family: TimesNewRoman,Times New Roman,Times,Baskerville,Georgia,serif; }

			/* A bit of style for some elements */
			hr { border: 0; border-top: 1px solid #ccc; }
			blockquote { border-left: 3px solid #ccc; padding-left: 1em; }
			.archive-link { display: inline-block; color: #555; background-color: #ddd; font-size: 70%; height: 1em; vertical-align: middle; line-height: 1em; font-variant: small-caps; text-decoration: none; }
			code { background-color: #fdf6e3; }

			/* Prevent footnote links from messing with the line height inside multi-line paragraphs */
			/* Taken from https://stackoverflow.com/questions/1530685/html-sup-tag-affecting-line-height-how-to-make-it-consistent */
			sup { line-height: 0; }

			/* Images are meant to be "figures", they're separated from the text */
			img { display: block; margin: auto; max-width: 95%; box-shadow: rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px; }

			/* Images and "linked images" can have captions (I predict this will break something at one point) */
			/* To caption an image in markdown, simply add italicized text right after it */
			p > img + em { display: block; text-align: center; }
			p > a + em { display: block; text-align: center; }

			/* Titles make use of space and are easy to differentiate */
			h1, h2, h3, h4 { padding-top: 1em; }
			h2 { text-decoration: underline; }

			/* Highlight in bright color any anchor that is reached/clicked on */
			:target { background-color: #ffa; }

			/* Code blocks syntax highlight, this is a copy-paste from https://highlightjs.org/static/demo/styles/base16/solarized-light.css */
			pre code.hljs{display:block;overflow-x:auto;padding:1em}code.hljs{padding:3px 5px}.hljs{color:#586e75;background:#fdf6e3}.hljs ::selection,.hljs::selection{background-color:#93a1a1;color:#586e75}.hljs-comment{color:#839496}.hljs-tag{color:#657b83}.hljs-operator,.hljs-punctuation,.hljs-subst{color:#586e75}.hljs-operator{opacity:.7}.hljs-bullet,.hljs-deletion,.hljs-name,.hljs-selector-tag,.hljs-template-variable,.hljs-variable{color:#dc322f}.hljs-attr,.hljs-link,.hljs-literal,.hljs-number,.hljs-symbol,.hljs-variable.constant_{color:#cb4b16}.hljs-class .hljs-title,.hljs-title,.hljs-title.class_{color:#b58900}.hljs-strong{font-weight:700;color:#b58900}.hljs-addition,.hljs-code,.hljs-string,.hljs-title.class_.inherited__{color:#859900}.hljs-built_in,.hljs-doctag,.hljs-keyword.hljs-atrule,.hljs-quote,.hljs-regexp{color:#2aa198}.hljs-attribute,.hljs-function .hljs-title,.hljs-section,.hljs-title.function_,.ruby .hljs-property{color:#268bd2}.diff .hljs-meta,.hljs-keyword,.hljs-template-tag,.hljs-type{color:#6c71c4}.hljs-emphasis{color:#6c71c4;font-style:italic}.hljs-meta,.hljs-meta .hljs-keyword,.hljs-meta .hljs-string{color:#d33682}.hljs-meta .hljs-keyword,.hljs-meta-keyword{font-weight:700}
			/* Accentuate the separation between text and code blocks */
			pre { line-height: 110%; margin: auto; max-width: 95%; box-shadow: rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px; }
		</style>

		<script>
			window.addEventListener("DOMContentLoaded", () => {

				// Links to other domains open in a new tab and have "↗" appended
				Array.from(document.links).forEach((link) => {
					if (link.hostname != window.location.hostname) {
						link.target = "_blank"
						link.innerHTML += "<b>&#x2197;</b>"
					}
				})

				// Transform links to archival websites into two separate links: the original and the archive
				Array.from(document.links).forEach((link) => {
					if (link.href.indexOf("https://web.archive.org/web/") === 0) {
						try {
							const originalLink = link.href.match(/\\/http.*/g)[0].slice(1)
							link.innerHTML += \` <a class="archive-link" href="\${link.href}" target="_blank" title="Open an archived version of this page, in case link rot has occured">archive&#x2197;</a>\`
							link.href = originalLink
						} catch (e) {
							console.log(e)
						}
					}
				})

			})
		</script>

		<center>
			<strong>Martin Tapia</strong>
			 &middot; 
			<a href="/">About</a>
			 &middot; 
			<a href="/blog">Blog</a>
		</center>
		<hr />
		<center>
			<h1>${page.meta.title}</h1>
			${page.meta.created ? `<b style="font-variant: small-caps;">published</b> ${(new Date(page.meta.created)).toDateString()}<br />` : ""}
			${page.meta.updated ? `<b style="font-variant: small-caps;">updated</b> ${(new Date(page.meta.updated)).toDateString()}<br />` : ""}
		</center>
	`
}

const renderHtmlBottom = (page) => {
	let html = `
		<br /><br /><hr />
		<center>
			<a href="mailto:contact@martintapia.com?subject=Comment on the '${page.location}' page">Contact 💌</a>
		</center>
		<br />
	`
	return html
}

/*
 * Register a rendering function for each page type string
 */
const pageRenderers = {

	"article": (page) => {
		return `${renderHtmlTop(page)}${page.html}${renderHtmlBottom(page)}`
	},

	"blog toc": (page) => {
		const allPages = [...PAGES] // Make a shallow copy before sorting because PAGES is being iterated through right now
		allPages.sort((page1, page2) => (new Date(page2.meta.created)).getTime() - (new Date(page1.meta.created)).getTime())
		let tocHtml = ""
		let prevYear
		for (const p of allPages) {
			if (p.meta.type === "article" && p.location.startsWith("blog/")) {
				const currentYear = (new Date(p.meta.created || 0)).getFullYear()
				if (prevYear !== currentYear) {
					tocHtml += `<p><b>${currentYear} ⯆</b></p>`
					prevYear = currentYear
				}
				tocHtml += `<li>${(new Intl.DateTimeFormat("en-US", { month: "long" })).format(new Date(p.meta.created || 0))} — <a href="${p.location}">${p.meta.title}</a></li>`
			}
		}
		return `${renderHtmlTop(page)}${page.html}<ul>${tocHtml}</ul>${renderHtmlBottom(page)}`
	},

}

/*
 * Call a rendering function for each page according to its type string
 */
for (const page of PAGES) {
	console.log(`⚙️ Rendering '${page.location}' of type '${page.meta.type}'`)
	fs.writeFileSync(`dist/${page.location}.html`, pageRenderers[page.meta.type](page))
}
console.log(`Rendered ${PAGES.length} pages 👍\n`)
