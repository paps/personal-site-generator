# Personal site generator

This module is an ultra-minimal static site generator (SSG). It's used as a dependency in another private repository of mine, which contains the content I wish to publish for anyone to see.

`build.js` is the entirety of the generator, including «HTML templates» 🤭

## `src/` data format

`src/` is where the content resides. It is a regular folder containing a hierarchy of sub-folders and regular files. All files in this folder are meant for direct publication.

There is only one exception, for `.md` files. These are treated as Markdown with Front Matter and are meant to be transformed as needed for publishing (often to a website, but not necessarily). To help with that, the Front Matter contains useful information such as which type of content the file is. Other Front Matter fields are dates (which are always in ISO 8601 format) and booleans (which are always represented by the `true` or `false` strings).

It is expected that the Markdown format with Front Matter will not be too difficult to handle in 20+ years. (Read on.)

## Data longevity

This site generator is one basic implementation of a way of publishing the data from `src/`, which uses the format described above.

Content in `src/` is meant to be kept for more than 20 years, which means at least up to 2041 at the time of writing. Everything surrounding `src/` (i.e. this SSG) is just noise, or rather just one way (among thousands) of transforming the contents of `src/` into a readable publication (e.g. a website).

The fact that this is JavaScript code hosted on GitHub with so-and-so packages, outputting HTML files for Vercel to host, is basically an implementation detail 🙃

## Serving Markdown on the web

Markdown files are written with the following considerations:

- File names will be the URL, without any extension (e.g. `src/blog/foo.md` will be accessible at `/blog/foo`)
- `index.md` will be accessible at the URL represented by the name of its parent folder, without trailing slash (e.g. `src/blog/index.md` will be accessible at `/blog`)

These considerations are important because, among other things, it gives a standard way of linking articles together.
