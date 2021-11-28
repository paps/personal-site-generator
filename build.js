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
		console.log(`\t(skipped because it's not marked as published)`)
	}
}
console.log(`Ingested ${PAGES.length} pages 👍\n`)

/*
 * Utils and helpers for renderers
 */
const renderHtmlTop = (page) => {
	return `
		<!DOCTYPE html>
		<html lang="en">
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>${page.meta.title} &middot; Martin Tapia</title>
		<link rel="icon" type="image/png" href="/favicon.png">

		<style>
			body { margin: 1em auto; max-width: 40em; padding: 0 .62em; font: 1.2em/1.62 sans-serif; }

			/* Images are meant to be "figures", they're separated from the text */
			img { display: block; margin: auto; max-width: 90%; box-shadow: rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px; }

			/* Images, "linked images" and code blocks and can have captions (I predict this will break something at one point) */
			p > img + em { display: block; text-align: center; }
			p > a + em { display: block; text-align: center; }
			p > a + em { display: block; text-align: center; }

			/* Titles make use of space and are easy to differentiate */
			h1, h2, h3, h4 { line-height: 1.2; }
			h2 { text-decoration: underline; }

			/* Highlight in bright color any anchor that is reached/clicked on */
			:target { background-color: #ffa; }

			/* Code blocks syntax highlight, this is a copy-paste from https://highlightjs.org/static/demo/styles/base16/solarized-light.css */
			pre code.hljs{display:block;overflow-x:auto;padding:1em}code.hljs{padding:3px 5px}.hljs{color:#586e75;background:#fdf6e3}.hljs ::selection,.hljs::selection{background-color:#93a1a1;color:#586e75}.hljs-comment{color:#839496}.hljs-tag{color:#657b83}.hljs-operator,.hljs-punctuation,.hljs-subst{color:#586e75}.hljs-operator{opacity:.7}.hljs-bullet,.hljs-deletion,.hljs-name,.hljs-selector-tag,.hljs-template-variable,.hljs-variable{color:#dc322f}.hljs-attr,.hljs-link,.hljs-literal,.hljs-number,.hljs-symbol,.hljs-variable.constant_{color:#cb4b16}.hljs-class .hljs-title,.hljs-title,.hljs-title.class_{color:#b58900}.hljs-strong{font-weight:700;color:#b58900}.hljs-addition,.hljs-code,.hljs-string,.hljs-title.class_.inherited__{color:#859900}.hljs-built_in,.hljs-doctag,.hljs-keyword.hljs-atrule,.hljs-quote,.hljs-regexp{color:#2aa198}.hljs-attribute,.hljs-function .hljs-title,.hljs-section,.hljs-title.function_,.ruby .hljs-property{color:#268bd2}.diff .hljs-meta,.hljs-keyword,.hljs-template-tag,.hljs-type{color:#6c71c4}.hljs-emphasis{color:#6c71c4;font-style:italic}.hljs-meta,.hljs-meta .hljs-keyword,.hljs-meta .hljs-string{color:#d33682}.hljs-meta .hljs-keyword,.hljs-meta-keyword{font-weight:700}
			/* Accentuate the separation between text and code blocks */
			pre { margin: auto; max-width: 90%; box-shadow: rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px; }

			@media print { body { max-width: none } }
		</style>

		<script>
			// All link to other domains open in a new tab and have "↗" appended
			window.addEventListener("DOMContentLoaded", () => {
				Array.from(document.links).forEach((link) => {
					if (link.hostname != window.location.hostname) {
						link.target = "_blank"
						link.innerHTML += "<b>&#x2197;</b>"
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
		<hr /><br />
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
			<a href="mailto:contact@martintapia.com?subject=Comment on your '${page.location}' page">Contact 💌</a>
		</center>
	`
	if (page.meta.comments === "true") {
		html += `
			<br /><br />
			<div id="disqus_thread"></div>
			<script>
				(function() {
					var d = document, s = d.createElement('script');
					s.src = 'https://martintapia.disqus.com/embed.js';
					s.setAttribute('data-timestamp', +new Date());
					(d.head || d.body).appendChild(s);
				})();
			</script>
		`
	}
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
		PAGES.sort((page1, page2) => (new Date(page2.meta.created)).getTime() - (new Date(page1.meta.created)).getTime())
		let tocHtml = ""
		let prevMonth = ""
		for (const p of PAGES) {
			if (p.meta.type === "article" && p.location.startsWith("blog/")) {
				const currentMonth = (new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })).format(new Date(p.meta.created || 0))
				if (prevMonth !== currentMonth) {
					tocHtml += `<p>${currentMonth}</p>`
					prevMonth = currentMonth
				}
				tocHtml += `<li><a href="${p.location}">${p.meta.title}</a></li>`
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
