#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

import { AggregateFrontMatterError, build } from './build.js'

const CODES = { red: '31', yellow: '33', green: '32', dim: '2' } as const

/** Colour only when someone is watching; CI logs stay clean. */
function paint(colour: keyof typeof CODES, text: string): string {
  if (process.env['NO_COLOR'] !== undefined || !process.stderr.isTTY) return text
  return `[${CODES[colour]}m${text}[0m`
}

const USAGE = `
  personal-site-generator — a Windows 98 flavoured static site generator

  Usage
    personal-site-generator --src <dir> --dest <dir>

  Options
    --src   <dir>   Source directory of markdown and assets. Must exist and not be empty.
    --dest  <dir>   Output directory. Created if missing; must be empty if it exists.
    -h, --help      Show this message.

  Both paths are resolved relative to the current working directory.
`

interface Args {
  src: string
  dest: string
}

class UsageError extends Error {}

function parseArgs(argv: readonly string[]): Args | 'help' {
  const values = new Map<string, string>()

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (arg === '-h' || arg === '--help') return 'help'

    const match = /^--(src|dest)(?:=(.*))?$/.exec(arg)
    if (!match) throw new UsageError(`unknown argument ${JSON.stringify(arg)}`)

    const name = match[1]!
    const inlineValue = match[2]
    const value = inlineValue ?? argv[++i]
    if (value === undefined || value === '') throw new UsageError(`--${name} needs a value`)
    if (values.has(name)) throw new UsageError(`--${name} was given twice`)
    values.set(name, value)
  }

  const src = values.get('src')
  const dest = values.get('dest')
  if (src === undefined) throw new UsageError('--src is required')
  if (dest === undefined) throw new UsageError('--dest is required')
  return { src, dest }
}

/** The source must exist, be a directory, and actually contain something. */
async function checkSource(srcDir: string): Promise<void> {
  let stats
  try {
    stats = await fs.stat(srcDir)
  } catch {
    throw new UsageError(`--src directory does not exist: ${srcDir}`)
  }
  if (!stats.isDirectory()) throw new UsageError(`--src is not a directory: ${srcDir}`)
  if ((await fs.readdir(srcDir)).length === 0) {
    throw new UsageError(`--src directory is empty: ${srcDir}`)
  }
}

/** The destination is created if missing, and refused if it holds anything. */
async function checkDestination(destDir: string): Promise<void> {
  let stats
  try {
    stats = await fs.stat(destDir)
  } catch {
    await fs.mkdir(destDir, { recursive: true })
    return
  }
  if (!stats.isDirectory()) throw new UsageError(`--dest is not a directory: ${destDir}`)
  const entries = await fs.readdir(destDir)
  if (entries.length > 0) {
    throw new UsageError(
      `--dest directory is not empty (${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}): ${destDir}\n` +
        '  Remove it first — this generator always does a full, cache-free rebuild.',
    )
  }
}

/** Rolls a failed run back to the empty directory we were handed. */
async function emptyDirectory(dir: string): Promise<void> {
  try {
    for (const entry of await fs.readdir(dir)) {
      await fs.rm(path.join(dir, entry), { recursive: true, force: true })
    }
  } catch {
    /* Nothing to roll back. */
  }
}

async function main(): Promise<number> {
  let args: Args | 'help'
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`${paint('red', 'error:')} ${(error as Error).message}\n${USAGE}`)
    return 2
  }

  if (args === 'help') {
    process.stdout.write(USAGE)
    return 0
  }

  const srcDir = path.resolve(process.cwd(), args.src)
  const destDir = path.resolve(process.cwd(), args.dest)

  if (destDir === srcDir || `${destDir}${path.sep}`.startsWith(`${srcDir}${path.sep}`)) {
    process.stderr.write(
      `${paint('red', 'error:')} --dest must not be inside --src (refusing to generate into the source)\n`,
    )
    return 2
  }

  try {
    await checkSource(srcDir)
    await checkDestination(destDir)
  } catch (error) {
    process.stderr.write(`${paint('red', 'error:')} ${(error as Error).message}\n`)
    return 2
  }

  const started = process.hrtime.bigint()
  try {
    const result = await build({
      srcDir,
      destDir,
      log: (message) => process.stdout.write(`${paint('dim', '·')} ${message}\n`),
      warn: (message) => process.stderr.write(`${paint('yellow', 'warning:')} ${message}\n`),
    })
    const ms = Number(process.hrtime.bigint() - started) / 1e6
    process.stdout.write(
      `${paint('green', '✓')} Built ${result.rendered} page${result.rendered === 1 ? '' : 's'} ` +
        `from ${result.copied} file${result.copied === 1 ? '' : 's'} ` +
        `in ${ms.toFixed(0)} ms${result.warnings > 0 ? ` ${paint('yellow', `(${result.warnings} warning${result.warnings === 1 ? '' : 's'})`)}` : ''}\n`,
    )
    return 0
  } catch (error) {
    // We only ever write into a directory we found empty, so undoing our own
    // copy is safe — and it means the next run is not blocked by the wreckage.
    await emptyDirectory(destDir)
    if (error instanceof AggregateFrontMatterError) {
      process.stderr.write(`${paint('red', 'error:')} ${error.message}\n`)
      process.stderr.write(
        paint(
          'dim',
          '  Front matter must open and close with `---` and carry a `title`;\n' +
            '  `created`/`updated` must be YYYY-MM-DD and `published` must be true or false.\n',
        ),
      )
      return 1
    }
    process.stderr.write(`${paint('red', 'error:')} ${(error as Error).stack ?? String(error)}\n`)
    return 1
  }
}

process.exitCode = await main()
