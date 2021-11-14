#!/usr/bin/env node
const fs = require("fs")
const glob = require("glob")
const showdown = require("showdown")
const encodeHtmlEntities = require("html-entities").encode

/*
 * Ingest all pages into the global PAGES array, parsing and transforming markdown to HTML
 * It's the most important global variable in this file, so I chose to uppercase it 🤷
 */
const PAGES = []
const mdConverter = new showdown.Converter({
	metadata: true,
	headerLevelStart: 2,
	strikethrough: true,
	tables: true,
	tasklists: true,
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
		<title>${encodeHtmlEntities(page.meta.title)} &middot; Martin Tapia</title>
		<link rel="icon" type="image/png" href="/favicon.png">
		<style>
			body { margin: 1em auto; max-width: 40em; padding: 0 .62em; font: 1.2em/1.62 sans-serif; }
			img { display: block; margin: auto; max-width: 60%; box-shadow: rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px; }
			h1,h2,h3 { line-height: 1.2; }
			@media print { body { max-width: none } }
		</style>
		<script>
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
			<h1>${encodeHtmlEntities(page.meta.title)}</h1>
			${page.meta.created ? `<b style="font-variant: small-caps;">published</b> ${(new Date(page.meta.created)).toDateString()}<br />` : ""}
			${page.meta.updated ? `<b style="font-variant: small-caps;">updated</b> ${(new Date(page.meta.updated)).toDateString()}<br />` : ""}
		</center>
	`
}

const renderHtmlBottom = (page) => {
	let html = `
		<br /><br /><hr />
		<center>
			<a href="mailto:contact@martintapia.com?subject=Comment on the '${encodeHtmlEntities(page.meta.title)}' page of your personal site">Contact 💌</a>
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
				let currentMonth = "Unknown"
				try {
					currentMonth = (new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })).format(new Date(p.meta.created))
				} catch (e) {
					console.log(e)
				}
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
