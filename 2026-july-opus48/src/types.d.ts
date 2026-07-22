// These two showdown extensions ship without type declarations, so we declare
// just enough for strict TypeScript to accept them.

declare module "showdown-ghost-footnotes" {
  import type { ShowdownExtension } from "showdown"
  const extension: ShowdownExtension | ShowdownExtension[]
  export default extension
}

declare module "showdown-highlight" {
  import type { ShowdownExtension } from "showdown"
  interface Options {
    pre?: boolean
    auto_detection?: boolean
  }
  export default function showdownHighlight(options?: Options): ShowdownExtension[]
}
