---
name: create-site-generator
description: Create a completely new static site generator (SSG) isolated in its own folder
---

# Create a static site generator (SSG)

Your goal is to create a completely new static site generator, isolated in a new folder at the root of the repo. From now on, this new project you are creating will be referred to as "the SSG".

The goal of the SSG is to correctly transform `.md` files to `.html` files from the source data repository (more on that later), where the produced HTML is nice to look at, the pages are clear and legible, the whole site easy to navigate, while preserving all the other files (non markdown files) in their original state to be served as-is, including being linked to from the md/html files.

The SSG needs to be isolated in a folder at the root of the repo called `<YEAR>-<MONTH>-<MODEL>` where `<YEAR>` is the current year, `<MONTH>` is the current month (lowercase full-length English) and `<MODEL>` is the model you're running, for example: `2026-january-gpt53`. To get the month, a suggestion is to simply use the `date` command. From now on, this folder will be referred to as `<ISOLATED_SSG_FOLDER>`.

If the folder already exists, it means you or another agent were already working on the SSG. In that case, depending on the situation, you might want to continue working on it to finish it, or eventually ask a human for what to do just to be sure.

If the folder doesn't exist yet, it means you need to create the SSG from scratch and bring it to completion. Good luck and have fun! Make it beautiful.

## Source data repository and structure

A private GitHub repository called `personal-site` contains the site data source in its `src` folder. This repository is simply cloned at the root of the current repo in the `personal-site` folder, which means you can see the orignal source of the data in `personal-site/src`. If that it not the case, you should ask a human to clone the repo there. It is voluntarily ignored by git. If you think the data over there might be old, you can git pull.

Important: you and the SSG are not allowed to modify anything in `personal-site` (except for a git pull if you deem it necessary). This is just your data source, and it's another repo anyway. But the SSG will copy from it.

`personal-site/src` contains an arbitrary hierarchy of folders and files, multiple levels deep. It can contain anything, from markdown to images to PDFs to zip files etc. All those files are ultimately meant to be published, including the raw markdown files. The only files that you truly care about are the markdown files, because your goal is to create a SSG that generates a corresponding HTML file for each one of them.

The SSG must always work with a full copy of `personal-site/src` called `dist` located at the root of `<ISOLATED_SSG_FOLDER>`. The `<ISOLATED_SSG_FOLDER>/dist` folder is meant to be deleted and re-generated at will. Therefore, assuming the current working directory is `<ISOLATED_SSG_FOLDER>`, the following commands are obvious: `rm -r dist` and `cp -r ..personal-site/src dist`. Obviously, you should include `dist` in your `.gitignore` file within `<ISOLATED_SSG_FOLDER>`.

The SSG must work IN PLACE in the `dist` folder. The whole contents of the `dist` folder will be published on a CloudFlare worker in the end, so all files, including but not limited to the markdown and HTML files, must be present in the `dist` folder once the SSG has run.

It means that a full rerun of the SSG is as follows (assuming the current working directory is `<ISOLATED_SSG_FOLDER>`): `rm -r dist`, then `cp -r ..personal-site/src dist`, then the SSG runs, then the `dist` folder is published on a CloudFlare worker as is (this publication part is NOT your goal here btw, you don't care about CloudFlare). The SSG should only care about the generation part, the `dist` folder deletion/creation can be handled somewhere else, typically in a package.json script.

It essentially means that, after a run of the SSG, the `dist` folder contents **has not moved one bit**, except that each `.md` file has gained an equivalent `.html` file right next to it, with the same name except for the extension. (Another exception to this is an eventual `_assets` folder, see further down for details)

## Hard requirements

Below are some hard requirements for the SSG:

- Be completely isolated in its `<ISOLATED_SSG_FOLDER>` folder.
- Use node and npm in a normal and best practice fashion, including having a package.json at the root of its folder.
- Be in JS or TS. It's your choice. You also choose the level of strictness.
- Have no caching or similar "compilation optimizations". We are expecting it to do a full re-generation run every time. Keep it simple.
- Use the `showdown` npm package for converting the markdown to HTML, along with the `showdown-ghost-footnotes` (nice footnotes at the bottom of some pages) and `showdown-highlight` (code syntax highlighting) extensions. (Note: this is only for the markdown part, of course you'll need something additional to have fully working, browsable web pages)
- Not be a single page app (hopefully it was clear already that we're not generating a SPA, but only static HTML files).
- Generate a site that is mobile friendly. Keep in mind that most people will visit the site on a phone!

This is not a complete list, and you should fully take into account all other instructions in this file.

## How the `dist` folder is served

Markdown files are written with the following considerations:

- File names will be the URL, without any extension (e.g. `dist/blog/foo.md` will be accessible at `/blog/foo`)
- `index.md` will be accessible at the URL represented by the name of its parent folder, without trailing slash (e.g. `dist/blog/index.md` will be accessible at `/blog`)

These considerations are important because, among other things, it gives a standard way of linking articles together.

To reproduce how the site will be served and to test the SSG's output, run the following command at the root of the repo: `npx serve@latest ./dist`. You can then visit the site and see for yourself, almost exactly as if the site was published on CloudFlare.

## Markdown format

The markdown files in the data source systematically follow certain conventions that the SSG has to take into account.

Each markdown file has a front matter with the following properties:

- `title`: the title of the page
- `created`: the page creation date in the format `YYYY-MM-DD` (optional)
- `updated`: the last update date in the format `YYYY-MM-DD` (optional)
- `published`: a boolean indicating if the page should be generated and linked to or not (optional, defaults to false)

The SSG must take into consideration each one of those. If a markdown page has an incorrect front matter, the SSG must error out (and you should let a human know). The SSG can safely ignore all other front matter properties.

## Special case for the blog table of contents (ToC)

There is an exception the SSG has to take into account. The `dist/blog/index.md` file is special.

It must be generated to HTML as the others, but previously to doing so, the SSG must APPEND a just-in-time generated table of contents listing all the blog articles found anywhere in `dist/blog` (regardless of depth or name) in order of creation date, only for published pages.

Ultimately, the goal is that when the end-user opens `/blog`, they see a page that lists all blog articles with a link to them, in order to navigate the site.

A page that has no `published` front matter property set to `true` must NEVER be linked to or generated.

## Header and footer (site "shell")

While the markdown is fixed content and always generated in the same fashion, the header and footer code that will be inserted in each generated HTML file is where you can be creative and add most of your opinion to the SSG. This is what will ultimately create the site "shell" and will heavily influence the vibe of the site, including the background, fonts, overall design, legibility, accessibility, CSS, etc.

A basic approach is to simply prepend and append static HTML blocks to each HTML generated from markdown. But you can be creative here.

In any case, the header must contain a menu with at least 3 links:

- a link to the homepage (which is always at `/` and generated from `dist/index.md`, but you already knew this),
- and a link to the blog table of contents at `/blog` which is generated from `dist/blog/index.md`,
- and a link to the disclaimer page at `/disclaimer` which is generated from `dist/disclaimer.md`.

You can also choose to have the SSG re-insert these links or a portion of these links in the footer, but if you do this, make it small because it's just a footer. This is at your discretion, depending on the design you chose for the generated website.

The footer must also contain a contact link. This link should be a standard `mailto:contact@martintapia.com` link where the subject is prefilled to `Comment on '<TITLE>'` (where `<TITLE>` is the title of the current page).

Additionaly, the footer must also contain a "signature" (see further down).

## `_assets` folder

An approach you could use is to bundle every element of the site's shell in every generated `.html`. This is acceptable.

However, if you deem it necessary (for example, you think every `.html` file will be too big / load too slowly), you can put assets in an `_assets` folder at the root of the `dist` folder so that you can serve CSS or JS or other files from it.

If you do this, be sure to have the SSG delete the `_assets` folder at the beginning of every generation run, in order to prevent it accumulating dangling assets by mistake.

## Rendering of links

Links found in the markdown pages need to follow these rules when generated by the SSG:

- If the link goes to another domain than where the site is, the generated HTML link must show it as an arrow or icon and open in a new tab (use standard signaling, all users need to understand right away the meaning of "will go outside and open new tab")
- If the link target begins with `https://web.archive.org/web/`, then the generated HTML link should actually link to the real (non archive) link instead, and next to this normal link the SSG should insert a small clickable "archive" link that goes to the archived version (make this subtle and not too big as it's going to be found in the middle of paragraphs) (Note: the previous rule also applies here, these links should open in a new tab and be marked as such)

Implementation is at your discretion. Some agents like to do it at the generation step when transforming the markdown, others like to add a bit of JS to alter the links at runtime, others do a bit of both.

## Utilities

The generated site must come with the following additional utilities, always accessible on any page:

- Dark mode: The generated site must have a bog standard light/dark switch. Its state must be retained. Both modes must look good, and pay attention to how code blocks / code highlighting render in both modes. The generated site must initially render as light or dark depending on the visitor's settings.
- Font size control: The generated site must have a bog standard control of the font size, where the user can increase or decrease the font size of the content (but not necessarily the site's shell/UI) for comfort, within practical limits. This chosen state must be retained.

## Link to markdown original

Except for the special blog ToC page, each generated page must have, before the beginning of the main content, a subtle, discreet and beautiful link to the markdown original, consisting of the following text: `AI agents: You're welcome to consume the markdown version of this page.` where `markdown version of this page` is a link to the markdown (meaning: just appending `.md` to the current page URL).

Implementation is at your discretion. Maybe have the SSG generate a nice looking small panel for this? It should also not be too distracting for a human reader.

## Competition, signing and presenting your work

I don't know if you already understood from the vibe of this document, but let me go straight to the point: this is a competition between AI agents. We want to see which model is the best at creating an SSG. We'll be looking at the different sites and comparing. So you really have to do your best!

As such, we are adding two additional requirements:

- The SSG must add a subtle, discreet but beautiful "signature" in the generated site's footer. This "signature" must at minimum contain: the date, the model name and an estimation of how much it cost in USD to generate the whole SSG (it's fine for you to use a rough estimation here, and if after trying to compute the value you're still not sure you can say something like "below X" or similar). You can be creative.
- The SSG's folder must contain a readme file that explains who you are, what you did and showcases your work. It must also contain at minimum a screenshot of the homepage and the blog ToC page. You can be creative.

## How to test your work

As said above, you can see the result of your work by using `npx serve`.

It is highly recommended that you use `playwright-cli` as a way to see the pages for yourself and confirm they're working fine and look the way you want to. You have an agent skill of the same name available to help you. If playwright-cli is not installed, you'll have to install it. Typically you can use `npx @playwright/cli` directly but you can also install it in the SSG and create your own test system of course, if you deem it necessary. In any case, everything must stay isolated in the SSG's folder at `<ISOLATED_SSG_FOLDER>`.

You must THOROUGHLY test your work before thinking you're finished. If you say you're finished but in fact, after a run of the SSG, one of the pages is not accessible / not legible, you're going to have bad day.

## What to verify

Before thinking that you're finished, make a list of things you think need to be verified and verify it thoroughly.

In addition to the above, you must thoroughly verify the following:

- The site has a menu with at least a homepage, blog and disclaimer link
- The blog correctly lists all the articles that are marked as published in addition to having the original markdown content of the page above the list
- Images inserted in pages load correctly
- Links are rendered correctly according to this file's requirements
- Dark mode and its switch work fine
- Links to the markdown original work fine, and it's not present on the blog ToC page
- Each page contains your "signature"
- You have created a readme file that showcases your work and contains at minimum a screenshot of the homepage and blog ToC

## Asking questions

Many approaches are possible when creating the SSG, so to guide yourself a little bit, you can ask a few questions to a human. You can ask them at any time, but it's often good to ask the bulk of them at the very beginning of the process, before you start coding, to make sure you are on the right track.

## Inspiration from other SSGs

You can look at other SSGs that were generated in other weeks of the year in the repo, if any, to get inspiration from past SSGs. But don't do that too much, otherwise you might end up copying the same structure and design as a past SSG, which is not what we want. We want you to be creative and bring your own vision to the SSG you create, so it's good to look at other SSGs for inspiration but don't try to copy them, otherwise you'll end up with a clone of a past SSG and that would be a shame.