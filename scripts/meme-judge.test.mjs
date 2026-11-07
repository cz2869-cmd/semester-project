import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/lib/meme-judge.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.CommonJS,
  },
})

const moduleExports = {}
new Function('exports', outputText)(moduleExports)
const { judgeMemePick } = moduleExports

test('a described match is called a good pick', () => {
  const result = judgeMemePick({
    prompt: 'When I open the gradebook at 2 a.m.',
    description: 'A student checks grades on a laptop late at night.',
  })

  assert.equal(result.verdict, 'good')
  assert.match(result.comment, /WOW|WAIT|HELLO/)
  assert.match(result.comment, /school/)
  assert.match(result.comment, /\b(8|9|10)\/10\b/)
  assert.doesNotMatch(result.comment, /laptop|student checks/i)
})

test('an unrelated meme is scored as a miss for the prompt topic', () => {
  const result = judgeMemePick({
    prompt: 'When I open the gradebook at 2 a.m.',
    description: 'A golden retriever runs through a sprinkler in a sunny backyard.',
  })

  assert.equal(result.verdict, 'miss')
  assert.match(result.comment, /school/)
  assert.match(result.comment, /pet|do NOT see the vision|disappointed|NOT match/)
  assert.match(result.comment, /\b[1-4]\/10\b/)
  assert.doesNotMatch(result.comment, /retriever|sprinkler|backyard/i)
})

test('different pictures get different judgments for the same prompt', () => {
  const pet = judgeMemePick({
    prompt: 'When I check my bank account after a night out',
    description: 'A golden retriever runs through a sprinkler.',
  })
  const cash = judgeMemePick({
    prompt: 'When I check my bank account after a night out',
    description: 'Someone stares at a wallet full of cash at an ATM.',
  })

  assert.equal(pet.verdict, 'miss')
  assert.equal(cash.verdict, 'good')
  assert.notEqual(pet.comment, cash.comment)
})

test('a phone picture matches a left-on-read prompt without pasting metadata', () => {
  const result = judgeMemePick({
    prompt: 'When I get left on read',
    celebrity: JSON.stringify({
      content: [{
        name: 'Steve Carell as Michael Scott',
        type: 'celebrity',
        confidence: 95,
        description: 'Steve Carell plays Michael Scott looking at a phone.',
      }],
    }),
  })

  assert.equal(result.verdict, 'good')
  assert.match(result.comment, /texting/)
  assert.doesNotMatch(result.comment, /Steve Carell|confidence|\{/)
})

test('a missing description does not invent a visual match', () => {
  const result = judgeMemePick({
    prompt: 'When nobody laughs at the joke',
  })

  assert.match(result.comment, /4\/10/)
  assert.match(result.comment, /do NOT see the vision/)
})
