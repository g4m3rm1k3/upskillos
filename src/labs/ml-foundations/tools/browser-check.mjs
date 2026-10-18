// The ML Foundations lab in a real browser: reuse this every session. It starts its own dev server
// (and always stops it), then for every built lesson: does Try it (or skips it), steps through every
// stepper and answers its first prediction wrongly then by "Show me", screenshots each stage, writes
// every piece in real Python with Run (checking the printed value) and Run & check, checks the ✓
// shows, opens CodeLens once and comes back, trains lesson 0's learner, and checks a narrow window.
// Any page error, console error or sideways scroll is reported.
//
//   node src/labs/ml-foundations/tools/browser-check.mjs [out-folder] [--only finish,maps,...]
import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { PIECES } from '../python/pieces.js'

const args = process.argv.slice(2)
const onlyArg = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const out = args.find(a => !a.startsWith('--') && a !== onlyArg) ?? path.join(process.env.TEMP ?? '/tmp', 'mlf-check')
mkdirSync(out, { recursive: true })
const PORT = 5199, URL = `http://127.0.0.1:${PORT}/#/lab/ml-foundations`
const root = path.resolve(import.meta.dirname, '../../../..')
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: root, shell: true, stdio: 'ignore' })
const stopServer = () => { try { process.platform === 'win32' ? spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']) : server.kill() } catch { /* gone */ } }
process.on('exit', stopServer)

const LESSONS = [
  { id: 'finish', title: 'The finish line', pieces: [] },
  { id: 'maps', title: 'Maps from text', pieces: ['parse_map', 'legal_moves'], run: ['legal_moves(parse_map(TINY), (0, 0))', "{'right': (0, 1)}"],
    fix: ['Bug hunt: the mouse that walks through the edge', 'if nr < len(rows) and nc < len(rows[0])', 'if 0 <= nr < len(rows) and 0 <= nc < len(rows[0])'] },
  { id: 'moves', title: 'What a move does', pieces: ['move_chances', 'build_table'], run: ['move_chances("right", 0.2)', "'right': 0.8500000000000001"],
    fix: ["Bug hunt: the chances that don't add up", 'merged[(nxt, reward)] = p', 'merged[(nxt, reward)] = merged.get((nxt, reward), 0.0) + p'] },
  { id: 'episodes', title: 'Playing one game', pieces: ['sample_outcome', 'play_episode'],
    fix: ["Bug hunt: the game that won't end", 'while len(path) <= cap:', 'while table[state] and len(path) <= cap:'] },
  { id: 'averages', title: 'Weighted averages', pieces: ['expected_value', 'option_values'],
    fix: ['Bug hunt: the best of nothing', 'best_action, best_value = None, 0.0', 'best_action, best_value = None, None', 'if value > best_value:', 'if best_value is None or value > best_value:'] },
  { id: 'backfill', title: 'Backfilling from the goal', pieces: ['steps_to_goal', 'sweep_values'],
    fix: ['Bug hunt: the long way round', 'queue.pop()', 'queue.pop(0)'] },
  { id: 'discount', title: 'Later counts for less', pieces: ['discounted_total', 'horizon'],
    fix: ['Bug hunt: the first reward that was discounted', 'g ** (t + 1) * r', 'g ** t * r'] },
  { id: 'plans', title: 'Plans from values', pieces: ['greedy_plan', 'evaluate_plan'],
    fix: ['Bug hunt: the plan that was ignored', 'new = max(sum(p * (r + g * values[n]) for p, n, r in outcomes) for outcomes in table[s].values())', 'new = sum(p * (r + g * values[n]) for p, n, r in table[s][action])'] },
  { id: 'value-iteration', title: 'Assembly: your own planner', pieces: ['plan_maze', 'policy_iteration'], noStepper: true,
    fix: ['Bug hunt: the planner that forgot the ice', 'table = build_table(maze)', 'table = build_table(maze, slip)'] },
  { id: 'sampling', title: 'Sampling', pieces: ['estimate', 'estimate_outcomes'],
    fix: ['Bug hunt: chances that add up to 20', 'return [(c, nxt, reward)', 'return [(c / n, nxt, reward)'] },
  { id: 'running', title: 'Running averages', pieces: ['update_mean', 'running_means'],
    fix: ['Bug hunt: the first sample that broke it', 'enumerate(xs)', 'enumerate(xs, 1)'] },
  { id: 'bootstrap', title: 'Estimates from estimates', pieces: ['best', 'q_update'],
    fix: ['Bug hunt: the crash at the cheese', 'return max(row.values())', 'return max(row.values(), default=0.0)'] },
  { id: 'explore', title: 'Trying vs repeating', pieces: ['choose', 'run_bandit'],
    fix: ['Bug hunt: the mouse that always goes left', 'return max(row, key=row.get)', 'top = best(row)\n    return rng.choice([a for a in ACTIONS if row[a] == top])'] },
  { id: 'formulas', title: 'Tables vs formulas', pieces: ['one_hot', 'predict', 'nudge'],
    fix: ['Bug hunt: the table that changed every square', 'wi + alpha * error for', 'wi + alpha * error * fi for'] },
  { id: 'slopes', title: 'Slopes and descent', pieces: ['slope', 'descend', 'fit_step'],
    fix: ['Bug hunt: the walk that went uphill', 'x = x + lr * slope(f, x)', 'x = x - lr * slope(f, x)'] },
  { id: 'layers', title: 'Layers and backprop', pieces: ['forward', 'gradients'],
    fix: ['Bug hunt: the slope that forgot the bend', 'dz = [dy * v for v, h in', 'dz = [dy * v * (1 - h * h) for v, h in'] },
  { id: 'batches', title: 'Batches and memory', pieces: ['Replay', 'batch_nudge'],
    fix: ['Bug hunt: the memory that forgot the present', 'self.items.pop()', 'self.items.pop(0)'] },
  { id: 'deep-q', title: 'Assembly: Q-learning with a formula', pieces: ['train_formula'], noStepper: true,
    fix: ['Bug hunt: the target that looked backwards', 'best(q_row(s))', 'best(q_row(n))'] },
  { id: 'q-learning', title: 'Assembly: your own Q-learner', pieces: ['train'],
    fix: ['Bug hunt: the learner that stopped after one game', '    state = maze["start"]\n    for episode in range(episodes):', '    for episode in range(episodes):\n        state = maze["start"]'] },
].filter(l => !onlyArg || onlyArg.split(',').includes(l.id))
const problems = []
let page

const sideways = async where => {
  if (await page.evaluate(() => { const m = document.querySelector('.mlf-main'); return m && m.scrollWidth > m.clientWidth + 2 })) problems.push(`${where}: the lesson scrolls sideways`)
}
const stage = name => page.locator('.mlf-stage', { hasText: name }).click()
const shot = async (name, locator = page.locator('.mlf-main')) => {
  // Full height of the scrolling lesson, not just the window.
  await locator.screenshot({ path: path.join(out, `${name}.png`) }).catch(e => problems.push(`${name}: screenshot failed (${e.message.slice(0, 80)})`))
}

// The app's tour and "What's new" popups can stack; close whatever is open, in any order.
async function dismissPopups() {
  for (let round = 0; round < 3; round++) {
    for (const name of ['Skip', 'Got it', 'Close']) {
      const b = page.getByRole('button', { name, exact: true }).first()
      if (await b.isVisible({ timeout: 800 }).catch(() => false)) await b.click({ force: true, timeout: 3000 }).catch(() => {})
    }
    await page.keyboard.press('Escape').catch(() => {})
  }
}

const browser = await chromium.launch()
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('pageerror', e => problems.push(`page error: ${e}`))
  page.on('console', m => { if (m.type() === 'error' && !/WebSocket|chorus|favicon|Firebase|firestore/i.test(m.text())) problems.push(`console: ${m.text().slice(0, 200)}`) })
  await page.addInitScript(() => { try { localStorage.setItem('oc-tour-seen', '1') } catch { /* */ } })
  for (let i = 0; i < 90; i++) { try { await page.goto(URL, { timeout: 60000 }); break } catch { await new Promise(r => setTimeout(r, 2000)) } }
  await page.getByRole('heading', { name: 'ML Foundations' }).first().waitFor({ timeout: 180000 })
  await dismissPopups()

  let codelensDone = false
  for (const lesson of LESSONS) {
    await page.locator('.mlf-nav', { hasText: lesson.title }).click()
    await page.getByRole('heading', { name: lesson.title, exact: true }).waitFor({ timeout: 10000 })
    await stage('Try it')
    await shot(`${lesson.id}-1-try`)
    await stage('Understand')
    const skip = page.getByRole('button', { name: /Skip: I've done this before/ })
    if (await skip.isVisible().catch(() => false)) await skip.click()
    await stage('Watch it run')
    const steppers = page.locator('.mlf-stepper')
    const count = await steppers.count()
    if (!count && !lesson.noStepper) problems.push(`${lesson.id}: no step-through`)
    for (let k = 0; k < count; k++) {
      const st = steppers.nth(k)
      await st.scrollIntoViewIfNeeded()
      let asked = false
      for (let i = 0; i < 160 && !asked; i++) {
        await st.getByRole('button', { name: 'Step forward' }).click()
        asked = await st.locator('.mlf-ask').isVisible().catch(() => false)
      }
      if (asked) {
        const input = st.getByLabel('Your prediction')
        if (await input.isVisible().catch(() => false)) {
          await input.fill('-12345')
          await st.getByRole('button', { name: 'Check', exact: true }).click()
          if (!(await st.locator('.mlf-ask .mlf-feedback.bad').isVisible().catch(() => false))) problems.push(`${lesson.id} stepper ${k}: a wrong prediction got no feedback`)
        }
        await st.screenshot({ path: path.join(out, `${lesson.id}-2-watch-${k}-ask.png`) })
        await st.getByRole('button', { name: /show me/i }).click()
      } else problems.push(`${lesson.id} stepper ${k}: never asked for a prediction`)
      for (let i = 0; i < 4; i++) {
        // Another question may come straight after: reveal it and carry on.
        if (await st.locator('.mlf-ask').isVisible().catch(() => false)) await st.getByRole('button', { name: /show me/i }).click()
        else await st.getByRole('button', { name: 'Step forward' }).click()
      }
      await st.screenshot({ path: path.join(out, `${lesson.id}-2-watch-${k}.png`) })
    }
    if (lesson.id === 'finish') {
      const tr = page.locator('.mlf-trainer')
      await tr.getByRole('button', { name: '⏩ 100 games' }).click()
      await tr.getByRole('button', { name: '⏩ 100 games' }).click()
      const text = await tr.textContent()
      if (!/games played: 200/.test(text)) problems.push(`finish: training did not count 200 games (${text.slice(0, 80)})`)
      if (!/Following the arrows reaches the cheese/.test(text)) problems.push('finish: after 200 games the arrows still do not reach the cheese')
      await tr.screenshot({ path: path.join(out, 'finish-trainer.png') })
      await tr.getByRole('button', { name: '▶ Watch one game' }).click()
      await page.waitForTimeout(1200)
      await tr.screenshot({ path: path.join(out, 'finish-trainer-playing.png') })
    }
    await sideways(`${lesson.id} watch`)
    await stage('Understand')
    await shot(`${lesson.id}-3-understand`)
    await sideways(`${lesson.id} understand`)
    if (lesson.pieces.length) {
      await stage('Write it')
      for (const piece of lesson.pieces) {
        const panel = page.getByRole('region', { name: `Write ${piece}`, exact: true })
        await panel.scrollIntoViewIfNeeded()
        await panel.getByLabel(`Your Python for Write ${piece}`, { exact: true }).fill(`${PIECES[piece].code}\nprint("written by the browser check")\n`)
        await panel.getByRole('button', { name: '▶ Run' }).click()
        const output = panel.getByRole('region', { name: 'Run output' })
        await output.waitFor({ timeout: 180000 }).catch(() => problems.push(`${piece}: Run showed nothing`))
        const text = (await output.textContent().catch(() => '')) ?? ''
        if (!text.includes('written by the browser check')) problems.push(`${piece}: Run did not show the print (${text.slice(0, 160)})`)
        if (lesson.run && piece === lesson.pieces[0] && piece !== 'parse_map' && !text.includes(lesson.run[1])) problems.push(`${piece}: Run value was ${text.slice(0, 200)}`)
        await panel.getByRole('button', { name: '✓ Run & check' }).click()
        await panel.getByText(/All \d+ checks passed/).waitFor({ timeout: 60000 }).catch(() => problems.push(`${piece}: Run & check did not pass the lab's own solution`))
        await panel.screenshot({ path: path.join(out, `${lesson.id}-4-write-${piece}.png`) })
      }
      if (lesson.fix) {
        // The bug hunt: run the broken code first (it must fail the checks), then change the one line.
        // lesson.fix = [title, broken, fixed, broken2, fixed2, ...]: the lines a learner would change.
        const [title, ...pairs] = lesson.fix
        const panel = page.getByRole('region', { name: title })
        await panel.scrollIntoViewIfNeeded()
        await panel.getByRole('button', { name: '✓ Run & check' }).click()
        await panel.getByText('Not yet.').waitFor({ timeout: 60000 }).catch(() => problems.push(`${lesson.id}: the bug hunt's starter passed its checks`))
        const editor = panel.getByLabel(`Your Python for ${title}`)
        let code = await editor.inputValue()
        for (let i = 0; i < pairs.length; i += 2) {
          if (!code.includes(pairs[i])) problems.push(`${lesson.id}: the bug hunt has no line ${pairs[i]}`)
          code = code.replace(pairs[i], pairs[i + 1])
        }
        await editor.fill(code)
        await panel.getByRole('button', { name: '✓ Run & check' }).click()
        await panel.getByText(/All \d+ checks passed/).waitFor({ timeout: 60000 }).catch(() => problems.push(`${lesson.id}: the fixed bug hunt did not pass`))
        await panel.screenshot({ path: path.join(out, `${lesson.id}-4-fix.png`) })
      }
      if (!codelensDone) {
        codelensDone = true
        const panel = page.getByRole('region', { name: `Write ${lesson.pieces[0]}`, exact: true })
        await panel.getByRole('button', { name: '🔍 Open in CodeLens' }).click()
        await page.waitForURL(/#\/codelens/, { timeout: 20000 }).catch(() => problems.push('CodeLens did not open'))
        await page.waitForTimeout(4000)
        await page.screenshot({ path: path.join(out, 'codelens.png') })
        const back = page.getByRole('button', { name: /Back to the ML Foundations lab/ })
        if (await back.isVisible({ timeout: 10000 }).catch(() => false)) {
          await back.click()
          await page.getByRole('heading', { name: lesson.title, exact: true }).waitFor({ timeout: 30000 }).catch(() => problems.push('Back from CodeLens did not reopen the lesson'))
          await page.locator('.mlf-stage', { hasText: 'Write it' }).waitFor({ timeout: 10000 })
        } else problems.push('CodeLens shows no way back to the lab')
      }
    }
    await stage('Keep')
    await shot(`${lesson.id}-5-keep`)
    const finish = page.getByRole('button', { name: '✓ Finish this lesson' })
    if (await finish.isVisible().catch(() => false)) await finish.click()
    if (lesson.pieces.length && !(await page.locator('.mlf-nav', { hasText: lesson.title }).locator('.mlf-nav-n', { hasText: '✓' }).isVisible().catch(() => false))) problems.push(`${lesson.id}: no ✓ in the sidebar after passing every challenge`)
    console.log(`${lesson.id}: done`)
  }
  await page.locator('.mlf-header').screenshot({ path: path.join(out, 'header.png') })
  await page.locator('.mlf-sidebar').screenshot({ path: path.join(out, 'sidebar.png') })

  // A narrow window: everything stacks, nothing scrolls sideways.
  await page.setViewportSize({ width: 420, height: 900 })
  await page.goto(URL); await page.reload()
  await dismissPopups()
  await page.getByRole('heading', { name: 'ML Foundations' }).first().waitFor({ timeout: 60000 })
  await page.locator('.mlf-nav', { hasText: 'Maps from text' }).click()
  await stage('Watch it run')
  const skipNarrow = page.getByRole('button', { name: /Skip: I've done this before/ })
  if (await skipNarrow.isVisible().catch(() => false)) await skipNarrow.click()
  await page.locator('.mlf-stepper').first().screenshot({ path: path.join(out, 'narrow-stepper.png') })
  await sideways('narrow')
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)) problems.push('narrow: the page scrolls sideways')
} finally {
  await browser.close()
  stopServer()
}
console.log(problems.length ? `\n${problems.length} problem(s):\n${problems.join('\n')}` : '\nNo problems.')
console.log(`Screenshots: ${out}`)
process.exit(problems.length ? 1 : 0)
