// The two showdown extensions we rely on ship no type declarations, and they
// disagree on shape: one exports the extension array directly, the other exports
// a factory. Both are CommonJS, reached through esModuleInterop.
declare module 'showdown-ghost-footnotes' {
  import type { ShowdownExtension } from 'showdown'
  const footnotes: ShowdownExtension[]
  export default footnotes
}

declare module 'showdown-highlight' {
  import type { ShowdownExtension } from 'showdown'
  const highlight: (options?: { pre?: boolean; auto_detection?: boolean }) => ShowdownExtension[]
  export default highlight
}
