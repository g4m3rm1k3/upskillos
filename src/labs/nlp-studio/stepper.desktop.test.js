// Drives the real Python stepper (desktop/app/runtimes/aarcade_stepper.py, shared with A-Arcade
// Python) with this lab's programs, exactly as the Real Python tab sends them, and checks what
// comes back against the JavaScript engine. Uses the app's environment, or NLP_PYTHON if set;
// skipped when neither exists.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { SOURCES } from './source.js'
import { PROGRAMS } from './programs.js'
import * as T from './engine/text.js'
import * as P from './engine/parsing.js'
import { respond } from './engine/eliza.js'
import * as C from './engine/counting.js'
import { MESSAGES, INTENTS } from './engine/data.js'
import * as V from './engine/vectors.js'
import { SENTENCES } from './engine/corpus.js'

const root = path.resolve(import.meta.dirname, '../../..')
const appData = process.platform === 'win32' ? process.env.APPDATA ?? '' : process.platform === 'darwin' ? path.join(homedir(), 'Library', 'Application Support') : path.join(homedir(), '.config')
const python = process.env.NLP_PYTHON ?? path.join(appData, 'UpSkillOS', 'aarcade-python', 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')

function startStepper() {
  const proc = spawn(python, ['-u', path.join(root, 'desktop/app/runtimes/aarcade_stepper.py')], {
    env: { ...process.env, AARCADE_PROGRAM_DIR: mkdtempSync(path.join(tmpdir(), 'nlp-')), OMP_NUM_THREADS: '1', PYTHONIOENCODING: 'utf-8' },
  })
  const waiting = []
  readline.createInterface({ input: proc.stdout }).on('line', line => waiting.shift()?.(JSON.parse(line)))
  let stderr = ''; proc.stderr.on('data', d => { stderr += d })
  let id = 0
  const next = () => new Promise(resolve => waiting.push(resolve))
  return { ready: next(), send: msg => { const reply = next(); proc.stdin.write(JSON.stringify({ ...msg, id: ++id }) + '\n'); return reply }, stop: () => proc.kill(), stderr: () => stderr }
}
// The same message the tab sends.
const load = (s, id, input = PROGRAMS[id].input.value) => { const p = PROGRAMS[id]; return s.send({ cmd: 'load', files: SOURCES, entry: { module: p.module, function: p.function, kwargs: p.kwargs(input, P.parse) }, watch: p.watch, actions: [] }) }
const jump = (s, id) => s.send({ cmd: 'step', mode: 'lines', targets: PROGRAMS[id].jump.targets() })
const top = r => r.stack.at(-1)
const plain = v => (!v ? null : v.items ? (Array.isArray(v.items) ? v.items.map(plain) : Object.fromEntries(Object.entries(v.items).map(([k, x]) => [k, plain(x)]))) : v.v)

describe.skipIf(!existsSync(python))('the lab\'s programs in the real Python stepper', () => {
  let s
  beforeAll(async () => { s = startStepper(); expect((await s.ready).type).toBe('ready') }, 60000)
  afterAll(() => s?.stop())

  it('every program loads and pauses in its own function', async () => {
    for (const [id, p] of Object.entries(PROGRAMS)) {
      const r = await load(s, id)
      expect(r.type, `${id}: ${s.stderr()}`).toBe('pause')
      expect(top(r), id).toMatchObject({ file: p.file, function: p.function })
    }
  }, 60000)

  it('tokenize: "Next token" stops at each saved token, in the engine\'s order, then finishes with the engine\'s answer', async () => {
    const text = PROGRAMS.tokenize.input.value, expected = T.tokenize(text)
    let r = await load(s, 'tokenize')
    const seen = []
    for (let n = 0; n < 40; n++) {
      r = await jump(s, 'tokenize')
      if (r.type !== 'pause') break
      seen.push(plain(r.watch.tokens.value).length)
    }
    expect(r.type).toBe('finished')
    expect(plain(r.result)).toEqual(expected)
    expect(seen.length).toBe(expected.length)
  }, 60000)

  it('the chart parser: "Next cell" draws from the live table, and the final chart is the engine\'s', async () => {
    const words = P.wordsOf(PROGRAMS.cky.input.value)
    let r = await load(s, 'cky'), cells = 0, last = null
    for (let n = 0; n < 60; n++) {
      r = await jump(s, 'cky')
      if (r.type !== 'pause') break
      cells++; last = r
    }
    expect(cells).toBe(words.length * (words.length - 1) / 2)   // every cell longer than one word
    const table = plain(last.watch.table.value)
    const engine = P.cky(words)
    for (const [key, cell] of Object.entries(table)) expect(cell, key).toEqual(engine[key.replace(/[()\s]/g, '')])
    expect(r.type).toBe('finished')
  }, 60000)

  it('recursive descent: the stack of calls grows and the parse finds the engine\'s trees', async () => {
    let r = await load(s, 'parse'), deepest = 0
    for (let n = 0; n < 200 && r.type === 'pause'; n++) {
      r = await jump(s, 'parse')
      if (r.type === 'pause') deepest = Math.max(deepest, r.stack.filter(f => f.function.startsWith('parse_')).length)
    }
    expect(deepest).toBeGreaterThan(5)
    expect(r.type).toBe('finished')
    expect(r.result.len).toBe(P.parse(PROGRAMS.parse.input.value).length)
  }, 60000)

  it('Part 3: bigram counts, Naive Bayes evaluation and Bot 2 finish with the engine\'s answers', async () => {
    let r = await load(s, 'bigrams'), pairs = 0
    for (let n = 0; n < 30; n++) { r = await jump(s, 'bigrams'); if (r.type !== 'pause') break; pairs++ }
    expect(r.type, s.stderr()).toBe('finished')
    expect(plain(r.result)).toEqual(C.bigramModel(C.words(PROGRAMS.bigrams.input.value)))
    expect(pairs).toBe(C.words(PROGRAMS.bigrams.input.value).length - 1)

    r = await load(s, 'naive_bayes')
    r = await s.send({ cmd: 'step', mode: 'out' })
    expect(r.type, s.stderr()).toBe('finished')
    const got = plain(r.result), want = C.evaluate(MESSAGES.slice(0, 6), MESSAGES.slice(-10), 'spam')
    expect(got.confusion).toEqual(want.confusion)
    expect(got.f1).toBeCloseTo(want.f1, 12)

    r = await load(s, 'bot2')
    r = await jump(s, 'bot2')
    expect(r.type).toBe('pause')
    expect(r.watch.scores ?? r.stack.at(-1).locals.score, 'a score is visible while scoring').toBeTruthy()
    r = await s.send({ cmd: 'step', mode: 'out' })
    while (r.type === 'pause') r = await s.send({ cmd: 'step', mode: 'out' })
    expect(r.type, s.stderr()).toBe('finished')
    const reply = C.intentReply(C.trainIntents(INTENTS), INTENTS, PROGRAMS.bot2.input.value)
    expect(plain(r.result).intent).toBe(reply.intent)
    expect(plain(r.result).confidence).toBeCloseTo(reply.confidence, 12)
  }, 60000)

  it('Part 4: co-occurrence, one pass of word2vec and Bot 2 by meaning match the engine', async () => {
    const sents = SENTENCES.slice(0, 3).map(C.words)
    let r = await load(s, 'cooccurrence')
    r = await jump(s, 'cooccurrence')
    expect(r.type, s.stderr()).toBe('pause')
    expect(r.watch.word.value.t).toBe('str')
    r = await s.send({ cmd: 'step', mode: 'out' })
    expect(r.type).toBe('finished')
    expect(plain(r.result)).toEqual(V.cooccurrence(sents, 2))

    r = await load(s, 'word2vec')
    r = await jump(s, 'word2vec')
    expect(r.type, s.stderr()).toBe('pause')
    expect(r.watch.p.value.t).toBe('float')
    r = await s.send({ cmd: 'step', mode: 'out' })
    expect(r.type).toBe('finished')
    const [vocab, vectors, losses] = V.trainWord2vec(sents, { dim: 4, epochs: 1 })
    const [pv, pvec, ploss] = plain(r.result)
    expect(pv).toEqual(vocab)
    pvec.flat().forEach((x, i) => expect(x).toBeCloseTo(vectors.flat()[i], 12))
    expect(ploss[0]).toBeCloseTo(losses[0], 9)

    r = await load(s, 'meaning_bot')
    r = await s.send({ cmd: 'step', mode: 'out' })
    expect(r.type, s.stderr()).toBe('finished')
    const [bv, bvec] = V.trainBikeVectors(SENTENCES)
    const want = V.semanticReply(INTENTS, bv, bvec, PROGRAMS.meaning_bot.input.value)
    expect(plain(r.result).intent).toBe(want.intent)
    expect(plain(r.result).similarity).toBeCloseTo(want.similarity, 12)
  }, 120000)

  it('dependencies and Bot 1 finish with the engine\'s answers', async () => {
    let r = await load(s, 'dependencies')
    r = await s.send({ cmd: 'step', mode: 'out' })
    expect(r.type).toBe('finished')
    expect(plain(r.result)).toEqual(P.dependencies(P.parse(PROGRAMS.dependencies.input.value)[0]))
    r = await load(s, 'eliza')
    let rules = 0
    for (let n = 0; n < 20; n++) { r = await jump(s, 'eliza'); if (r.type !== 'pause') break; rules++ }
    expect(r.type).toBe('finished')
    expect(r.result.v).toBe(respond(PROGRAMS.eliza.input.value, 0))
    expect(rules).toBe(3)   // "i need", "i feel", then "i am / i'm" matches
  }, 60000)
})
