# Personal site generator

## Philosophy

This is a module meant to be used as a dependency in another private repository of mine.

A private repository of mine contains the content I wish to publish on the web for anyone to see.

The data it stores is meant to be kept for more than 20 years, which means at least up to 2041 at the time of writing. Everything surrounding `src/` is just noise, or rather one way among thousands to transform the contents of `src/` into a published website.

The current implementation at the time of writing is an extremely basic hand-written static site generator which outputs HTML files for Vercel to host. The fact that this is a Node project hosted on GitHub with so-and-so packages is not relevant. All that counts is the original data source, `src/`.

## `src/` data format

`src/` is a regular folder containing a hierarchy of sub-folders and regular files. All files in this folder are meant for direct publication.

An exception is for `.md` files, which are treated as Markdown with Front Matter. These files are meant to be transformed as needed for publishing (most probably to a website, but not necessarily). To help with that, the Front Matter contains useful information such as which "type" of written content the file is. When the Front Matter has dates, they're in the ISO 8601 format.

It is expected that the Markdown format with Front Matter will not be too difficult to handle in 20 years or more.

## Serving Markdown on the web

Markdown files are written with the following considerations:
- File names will be the URL, without any extension (e.g. `src/blog/foo.md` will be accessible at `/blog/foo`)
- `index.md` will be accessible at the URL represented by the name of its parent folder, without trailing slash (e.g. `src/blog/index.md` will be accessible at `/blog`)
