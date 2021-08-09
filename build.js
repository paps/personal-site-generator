#!/usr/bin/env node
const fs = require("fs")
const glob = require("glob")
const showdown = require("showdown")
const encodeHtmlEntities = require("html-entities").encode

/*
 * Ingest all pages into a global array, parsing and transforming markdown to HTML
 */
const pages = []
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
		pages.push(page)
	} else {
		console.log(`\t(skipped because it's not marked as published)`)
	}
}
console.log(`Ingested ${pages.length} pages 👍\n`)

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
			body{
				margin:1em auto;
				max-width:40em;
				padding:0 .62em;
				font:1.2em/1.62 sans-serif;
			}
			h1,h2,h3{
				line-height:1.2;
			}
			@media print{
				body{
					max-width:none
				}
			}
		</style>
		<center>
			<strong>Martin Tapia</strong>
			 &middot; 
			<a href="/">About</a>
			 &middot; 
			<a href="/blog">Blog</a>
		</center>
		<hr />
		<center>
			<h1>${encodeHtmlEntities(page.meta.title)}</h1>
			<em>Published ${(new Date(page.meta.created)).toDateString()}</em>
		</center>
	`
}

const renderHtmlBottom = (page) => {
	return `
		<hr />
		<center>
			<a href="mailto:contact@martintapia.com?subject=Comment on the '${encodeHtmlEntities(page.meta.title)}' page of your personal site">Contact</a>
 	 	 	 &middot; 
		</center>
	`
}

/*
 * Register a rendering function for each page type string
 */
const pageRenderers = {
	"article": (page) => {
		return `${renderHtmlTop(page)}${page.html}${renderHtmlBottom(page)}`
	},
	"blog toc": (page) => {
		let toc = ""
		for (const p of pages) {
			if (p.meta.type === "article" && p.location.startsWith("blog/")) {
				toc += `<li><a href="${p.location}">${p.meta.title}</li>`
			}
		}
		return `${renderHtmlTop(page)}${page.html}<ul>${toc}</ul>${renderHtmlBottom(page)}`
	},
}

/*
 * Call a rendering function for each page according to its type string
 */
for (const page of pages) {
	console.log(`⚙️ Rendering '${page.location}' of type '${page.meta.type}'`)
	fs.writeFileSync(`dist/${page.location}.html`, pageRenderers[page.meta.type](page))
}
console.log(`Rendered ${pages.length} pages 👍\n`)