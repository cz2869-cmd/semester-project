import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/lib/meme-prompts.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.CommonJS,
  },
})

const moduleExports = {}
new Function('exports', outputText)(moduleExports)
const { generateMemePrompt, MEME_PROMPT_COUNT, ROUND_SECONDS } = moduleExports

const openings = [
  'When ',
  'My face when ',
  'Trying to keep a straight face when ',
  'The group chat right after ',
  'How I react when ',
]

test('a round lasts 30 seconds and the prompt deck has many combinations', () => {
  assert.equal(ROUND_SECONDS, 30)
  assert.ok(MEME_PROMPT_COUNT >= 100)
})

test('generateMemePrompt returns a complete prompt and avoids the previous one', () => {
  const sequence = [0, 0, 0.5]
  let cursor = 0
  const random = () => sequence[cursor++] ?? 0.25
  const first = generateMemePrompt(undefined, random)
  const second = generateMemePrompt(first, random)

  assert.ok(openings.some((opening) => first.startsWith(opening)))
  assert.ok(openings.some((opening) => second.startsWith(opening)))
  assert.notEqual(first, second)
})
