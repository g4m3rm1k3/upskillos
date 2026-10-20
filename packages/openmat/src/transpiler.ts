import type { ParsedNode, IfBranch, SwitchCase } from './types.js'

// ── MATLAB → JS transpiler ─────────────────────────────────────────────────────
// Pure string transforms — no imports from other openmat modules.

// ── Comment stripper ──────────────────────────────────────────────────────────
// A % inside 'a string' must NOT be treated as a comment.

export function stripMatlabComment(line: string): string {
  let inStr = false
  let i = 0
  while (i < line.length) {
    const c = line[i]
    if (inStr) {
      if (c === "'") {
        if (line[i + 1] === "'") { i += 2; continue } // '' escaped quote
        inStr = false
      }
      i++; continue
    }
    if (c === "%") return line.slice(0, i)
    if (c === "'") {
      // Transpose when preceded by ), ], or a word char; otherwise string opener.
      const prev = line.slice(0, i).trimEnd()
      const lastCh = prev.slice(-1)
      if (/[)\]\w]/.test(lastCh)) { i++; continue }
      inStr = true
    }
    i++
  }
  return line
}

// ── Block-parser internal helpers ─────────────────────────────────────────────

function findTopLevelComma(str: string): number {
  let depth = 0, inStr = false, strCh: string | null = null
  for (let i = 0; i < str.length; i++) {
    const c = str[i]
    if (inStr) {
      if (c === strCh) {
        if (c === "'" && str[i + 1] === "'") { i++; continue }
        inStr = false
      }
      continue
    }
    if (c === "'") {
      const prev = str.slice(0, i).trimEnd().slice(-1)
      if (/[)\]\w]/.test(prev)) continue
      inStr = true; strCh = c; continue
    }
    if (c === '"') { inStr = true; strCh = c; continue }
    if ("([{".includes(c)) depth++
    else if (")]}".includes(c)) depth = Math.max(0, depth - 1)
    else if (c === "," && depth === 0) return i
  }
  return -1
}

function splitTopLevelSemicolons(str: string): string[] {
  const parts: string[] = []
  let cur = "", depth = 0, inStr = false, strCh: string | null = null
  for (let i = 0; i < str.length; i++) {
    const c = str[i]
    if (inStr) {
      cur += c
      if (c === strCh) {
        if (str[i + 1] === strCh) { cur += str[++i]; continue }
        inStr = false
      }
      continue
    }
    if (c === "'" || c === '"') { inStr = true; strCh = c; cur += c; continue }
    if ("([{".includes(c)) depth++
    else if (")]}".includes(c)) depth = Math.max(0, depth - 1)
    if (c === ";" && depth === 0) { parts.push(cur.trim()); cur = "" }
    else cur += c
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts.filter(Boolean)
}

// ── Block parser ──────────────────────────────────────────────────────────────
// Converts a flat line array into a tree of ParsedNode objects.

type StackNode = {
  type: string
  // function nodes
  name?: string
  ins?: string[]
  outs?: string[]
  // for nodes
  varName?: string
  iterExpr?: string
  // while nodes
  condExpr?: string
  // switch nodes
  expr?: string
  // shared
  body?: ParsedNode[]
  branches?: IfBranch[]
  elseBody?: ParsedNode[] | null
  tryBody?: ParsedNode[]
  catchBody?: ParsedNode[] | null
  catchVar?: string | null
  cases?: SwitchCase[]
  otherwise?: ParsedNode[] | null
  // Internal parse-time state
  _state?: string
  _lastCase?: SwitchCase | null
}

export function parseBlocks(lines: string[]): ParsedNode[] {
  const stack: StackNode[] = [{ type: "root", body: [] }]
  const top = () => stack[stack.length - 1]

  const getTargetBody = (node: StackNode): ParsedNode[] => {
    if (node.type === "if") return node.elseBody !== null && node.elseBody !== undefined ? node.elseBody : node.branches![node.branches!.length - 1].body
    if (node.type === "try") return node._state === "catch" ? (node.catchBody ?? node.tryBody!) : node.tryBody!
    if (node.type === "switch") {
      if (node.otherwise !== null && node.otherwise !== undefined) return node.otherwise
      if (node._lastCase) return node._lastCase.body
      return []
    }
    return node.body!
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const lineNo = i + 1
    const stripped = stripMatlabComment(raw).trim()
    if (!stripped) continue
    const lower = stripped.toLowerCase()

    // ── function ──────────────────────────────────────────────────────────────
    const fnMatch = stripped.match(/^function\s+(?:\[([^\]]*)\]\s*=\s*|([A-Za-z_]\w*)\s*=\s*)?([A-Za-z_]\w*)\s*\(([^)]*)\)/i)
    if (fnMatch) {
      const outMulti = fnMatch[1] ? fnMatch[1].split(",").map(s => s.trim()).filter(Boolean) : null
      const outSingle = fnMatch[2] ? [fnMatch[2].trim()] : null
      const outs = outMulti ?? outSingle ?? []
      const node: StackNode = { type: "function", name: fnMatch[3], ins: fnMatch[4].split(",").map(s => s.trim()).filter(Boolean), outs, body: [] }
      top().body!.push(node as unknown as ParsedNode)
      stack.push(node)
      continue
    }

    // ── for ───────────────────────────────────────────────────────────────────
    const forMatch = stripped.match(/^for\s+([A-Za-z_]\w*)\s*=\s*(.+)$/i)
    if (forMatch) {
      let iterExpr = forMatch[2].replace(/;\s*$/, "").trim()
      const commaIdx = findTopLevelComma(iterExpr)
      let inlineStmts: string | null = null
      if (commaIdx !== -1) { inlineStmts = iterExpr.slice(commaIdx + 1).trim(); iterExpr = iterExpr.slice(0, commaIdx).trim() }
      const node: StackNode = { type: "for", varName: forMatch[1], iterExpr, body: [] }
      top().body!.push(node as unknown as ParsedNode)
      stack.push(node)
      if (inlineStmts) {
        splitTopLevelSemicolons(inlineStmts).forEach(s => {
          const sl = s.toLowerCase()
          if (sl === "end") { if (stack.length > 1) stack.pop() }
          else if (s) getTargetBody(top()).push({ type: "line", raw: s, lineNo } as ParsedNode)
        })
      }
      continue
    }

    // ── while ─────────────────────────────────────────────────────────────────
    const whileMatch = stripped.match(/^while\s+(.+)$/i)
    if (whileMatch) {
      let condExpr = whileMatch[1].replace(/;\s*$/, "").trim()
      const commaIdx = findTopLevelComma(condExpr)
      let inlineStmts: string | null = null
      if (commaIdx !== -1) { inlineStmts = condExpr.slice(commaIdx + 1).trim(); condExpr = condExpr.slice(0, commaIdx).trim() }
      const node: StackNode = { type: "while", condExpr, body: [] }
      top().body!.push(node as unknown as ParsedNode)
      stack.push(node)
      if (inlineStmts) {
        splitTopLevelSemicolons(inlineStmts).forEach(s => {
          const sl = s.toLowerCase()
          if (sl === "end") { if (stack.length > 1) stack.pop() }
          else if (s) getTargetBody(top()).push({ type: "line", raw: s, lineNo } as ParsedNode)
        })
      }
      continue
    }

    // ── if ────────────────────────────────────────────────────────────────────
    const ifMatch = stripped.match(/^if\s+(.+)$/i)
    if (ifMatch) {
      let cond = ifMatch[1].replace(/;\s*$/, "").trim()
      const commaIdx = findTopLevelComma(cond)
      let inlineStmts: string | null = null
      if (commaIdx !== -1) { inlineStmts = cond.slice(commaIdx + 1).trim(); cond = cond.slice(0, commaIdx).trim() }
      const node: StackNode = { type: "if", branches: [{ cond, body: [] }], elseBody: null }
      top().body!.push(node as unknown as ParsedNode)
      stack.push(node)
      if (inlineStmts) {
        splitTopLevelSemicolons(inlineStmts).forEach(s => {
          const sl = s.toLowerCase()
          if (sl === "end") { if (stack.length > 1) stack.pop() }
          else if (sl === "else") { if (top().type === "if") top().elseBody = [] }
          else if (s) getTargetBody(top()).push({ type: "line", raw: s, lineNo } as ParsedNode)
        })
      }
      continue
    }

    // ── elseif ────────────────────────────────────────────────────────────────
    const elseifMatch = stripped.match(/^elseif\s+(.+)$/i)
    if (elseifMatch) {
      let cond = elseifMatch[1].replace(/;\s*$/, "").trim()
      const commaIdx = findTopLevelComma(cond)
      let inlineStmts: string | null = null
      if (commaIdx !== -1) { inlineStmts = cond.slice(commaIdx + 1).trim(); cond = cond.slice(0, commaIdx).trim() }
      const ifNode = top()
      if (ifNode.type === "if") {
        ifNode.branches!.push({ cond, body: [] })
        if (inlineStmts) {
          splitTopLevelSemicolons(inlineStmts).forEach(s => {
            if (s && s.toLowerCase() !== "end") getTargetBody(top()).push({ type: "line", raw: s, lineNo } as ParsedNode)
          })
        }
      }
      continue
    }

    // ── else ──────────────────────────────────────────────────────────────────
    if (lower === "else") { const ifNode = top(); if (ifNode.type === "if") ifNode.elseBody = []; continue }

    // ── try ───────────────────────────────────────────────────────────────────
    if (lower === "try") {
      const node: StackNode = { type: "try", tryBody: [], catchVar: null, catchBody: null, _state: "try" }
      top().body!.push(node as unknown as ParsedNode)
      stack.push(node)
      continue
    }

    // ── catch [errvar] ────────────────────────────────────────────────────────
    const catchMatch = stripped.match(/^catch(?:\s+([A-Za-z_]\w*))?$/i)
    if (catchMatch) {
      const tryNode = top()
      if (tryNode.type === "try") {
        tryNode.catchVar = catchMatch[1] || null
        tryNode.catchBody = []
        tryNode._state = "catch"
      }
      continue
    }

    // ── switch ────────────────────────────────────────────────────────────────
    const switchMatch = stripped.match(/^switch\s+(.+)$/i)
    if (switchMatch) {
      const node: StackNode = { type: "switch", expr: switchMatch[1], cases: [], otherwise: null, _lastCase: null }
      top().body!.push(node as unknown as ParsedNode)
      stack.push(node)
      continue
    }

    // ── case val ──────────────────────────────────────────────────────────────
    const caseMatch = stripped.match(/^case\s+(.+)$/i)
    if (caseMatch) {
      const swNode = top()
      if (swNode.type === "switch") {
        const newCase: SwitchCase = { val: caseMatch[1], body: [] }
        swNode.cases!.push(newCase)
        swNode._lastCase = newCase
      }
      continue
    }

    // ── otherwise ─────────────────────────────────────────────────────────────
    if (lower === "otherwise") {
      const swNode = top()
      if (swNode.type === "switch") { swNode.otherwise = []; swNode._lastCase = null }
      continue
    }

    if (lower === "end")      { if (stack.length > 1) stack.pop(); continue }
    if (lower === "break")    { getTargetBody(top()).push({ type: "break" } as ParsedNode); continue }
    if (lower === "continue") { getTargetBody(top()).push({ type: "continue" } as ParsedNode); continue }
    if (lower === "return")   { getTargetBody(top()).push({ type: "return" } as ParsedNode); continue }

    getTargetBody(top()).push({ type: "line", raw: stripped, lineNo } as ParsedNode)
  }
  return stack[0].body! as ParsedNode[]
}

// ── Line preprocessor ─────────────────────────────────────────────────────────

function splitTopLevel(text: string, separators: string): string[] {
  const rows: string[] = []
  let current = "", depthParen = 0, depthBracket = 0, depthBrace = 0, quote: string | null = null
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (quote) { current += char; if (char === quote) quote = null; continue }
    if (char === "'" || char === '"') { quote = char; current += char; continue }
    if (char === "(") depthParen++
    else if (char === ")") depthParen = Math.max(0, depthParen - 1)
    else if (char === "[") depthBracket++
    else if (char === "]") depthBracket = Math.max(0, depthBracket - 1)
    else if (char === "{") depthBrace++
    else if (char === "}") depthBrace = Math.max(0, depthBrace - 1)
    const topLevel = depthParen === 0 && depthBracket === 0 && depthBrace === 0
    if (topLevel && separators.includes(char)) { rows.push(current.trim()); current = ""; continue }
    current += char
  }
  rows.push(current.trim())
  return rows.filter(Boolean)
}

function splitTopLevelCells(row: string): string[] {
  const cells: string[] = []
  let current = "", depthParen = 0, depthBracket = 0, depthBrace = 0, quote: string | null = null
  const pushCell = () => { const trimmed = current.trim(); if (trimmed) cells.push(trimmed); current = "" }
  for (let index = 0; index < row.length; index++) {
    const char = row[index]
    if (quote) { current += char; if (char === quote) quote = null; continue }
    if (char === "'" || char === '"') { quote = char; current += char; continue }
    if (char === "(") depthParen++
    else if (char === ")") depthParen = Math.max(0, depthParen - 1)
    else if (char === "[") depthBracket++
    else if (char === "]") depthBracket = Math.max(0, depthBracket - 1)
    else if (char === "{") depthBrace++
    else if (char === "}") depthBrace = Math.max(0, depthBrace - 1)
    const topLevel = depthParen === 0 && depthBracket === 0 && depthBrace === 0
    if (topLevel && char === ",") { pushCell(); continue }
    if (topLevel && /\s/.test(char)) {
      const next = row.slice(index).match(/^\s+/)?.[0] ?? ""
      const nextChar = row[index + next.length]
      if (current.trim() && nextChar && nextChar !== "," && nextChar !== ";") {
        const signTarget = row[index + next.length + 1]
        const nextIsSignedOperand = /[+-]/.test(nextChar) && signTarget && /[A-Za-z0-9.(\[{]/.test(signTarget)
        const nextIsOperandStart = /[A-Za-z0-9(\[{]/.test(nextChar) || nextIsSignedOperand
        const lastCurChar = current.trimEnd().slice(-1)
        const curEndsWithOperand = /[A-Za-z0-9\])'"]/.test(lastCurChar)
        const prevIsOperator = /[+\-*/^:<>=~&,([]/.test(current.trimEnd().slice(-1))
        if (nextIsOperandStart && curEndsWithOperand && !prevIsOperator) pushCell()
      }
      index += next.length - 1
      continue
    }
    current += char
  }
  pushCell()
  return cells
}

function normalizeMatrixSyntax(line: string): string {
  const strings: string[] = []
  const masked = line.replace(/'(?:[^']|'')*'/g, m => { strings.push(m); return `\x00S${strings.length - 1}\x00` })
  const normalized = masked.replace(/\[([^\[\]]+)\]/g, (match, inner, offset, str: string) => {
    const after = str.slice(offset + match.length).trimStart()
    if (after.startsWith("=") && !after.startsWith("==")) return match
    const rows = splitTopLevel(inner, ";").map(r => splitTopLevelCells(r))
    const hasNonScalar = rows.some(row =>
      row.some(cell => {
        const t = cell.trim()
        return t !== ""
          && !/^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(t)
          && !/^[+-]?(\d+(\.\d+)?)?i$/.test(t)
      })
    )
    if (!hasNonScalar) return `[${rows.map(r => r.join(", ")).join("; ")}]`
    const rowExprs = rows.map(row => {
      const cells = row.map(c => c.trim()).filter(Boolean)
      return cells.length === 1 ? cells[0] : `horzcat(${cells.join(", ")})`
    })
    return rowExprs.length === 1 ? rowExprs[0] : `vertcat(${rowExprs.join(", ")})`
  })
  return normalized.replace(/\x00S(\d+)\x00/g, (_, i) => strings[parseInt(i)])
}

function normalizeElementwiseOperators(line: string): string {
  return line
    .replace(/([A-Za-z0-9_\]\)])\s*\.\s*\^\s*/g, "$1.^")
    .replace(/([A-Za-z0-9_\]\)])\s*\.\s*\*\s*/g, "$1.*")
    .replace(/([A-Za-z0-9_\]\)])\s*\.\s*\/\s*/g, "$1./")
}

// MATLAB's element-wise operators become function calls mathjs understands:
// a .* b → dotMultiply(a, b). Each operand is scanned out of the text: a
// number (2.5, .5, 1e-3), a name with any call or index after it, or a
// bracketed group, plus any ^ powers attached to it, because ^ binds tighter
// than .* in MATLAB (2 .* 3^2 is 18). .^ is converted before .* and ./ for
// the same reason. Scanning digits only used to split 2.5 in two.
const NUMBER_AT_END = /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/
const NUMBER_AT_START = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/

function scanOperandLeft(text: string, from: number): { start: number, end: number } | null {
  let index = from
  while (index >= 0 && /\s/.test(text[index])) index--
  if (index < 0) return null
  const end = index + 1
  let start: number
  if (text[index] === ")" || text[index] === "]") {
    const close = text[index], open = close === ")" ? "(" : "["
    let depth = 1; index--
    while (index >= 0 && depth > 0) {
      if (text[index] === close) depth++
      else if (text[index] === open) depth--
      index--
    }
    start = index + 1
    while (start > 0 && /\w/.test(text[start - 1])) start--
  } else {
    const before = text.slice(0, end)
    const num = NUMBER_AT_END.exec(before)
    if (num && !/[A-Za-z_]/.test(before[num.index - 1] ?? "")) start = num.index
    else {
      while (index >= 0 && /\w/.test(text[index])) index--
      start = index + 1
    }
  }
  if (start >= end) return null
  // A base raised to this operand: in "3^2 .* x" the left operand is 3^2.
  let k = start - 1
  while (k >= 0 && /\s/.test(text[k])) k--
  if (k >= 0 && text[k] === "^" && text[k - 1] !== ".") {
    const base = scanOperandLeft(text, k - 1)
    if (base) return { start: base.start, end }
  }
  return { start, end }
}

function scanOperandRight(text: string, from: number): { start: number, end: number } | null {
  let index = from
  while (index < text.length && /\s/.test(text[index])) index++
  if (index >= text.length) return null
  const start = index
  if (text[index] === "-" || text[index] === "+") {
    index++
    while (index < text.length && /\s/.test(text[index])) index++
  }
  const bodyStart = index
  if (/[A-Za-z_]/.test(text[index] ?? "")) {
    while (index < text.length && /\w/.test(text[index])) index++
    while (text[index] === "(" || text[index] === "[") {
      const open = text[index], close = open === "(" ? ")" : "]"
      let depth = 1; index++
      while (index < text.length && depth > 0) {
        if (text[index] === open) depth++
        else if (text[index] === close) depth--
        index++
      }
    }
  } else if (text[index] === "(" || text[index] === "[") {
    const open = text[index], close = open === "(" ? ")" : "]"
    let depth = 1; index++
    while (index < text.length && depth > 0) {
      if (text[index] === open) depth++
      else if (text[index] === close) depth--
      index++
    }
  } else {
    const num = NUMBER_AT_START.exec(text.slice(index))
    if (num) index += num[0].length
  }
  if (index === bodyStart) return null
  // Powers attached to this operand: in "x .* 3^2" the right operand is 3^2.
  let k = index
  while (k < text.length && /\s/.test(text[k])) k++
  if (text[k] === "^") {
    const power = scanOperandRight(text, k + 1)
    if (power) return { start, end: power.end }
  }
  return { start, end: index }
}

function replaceElementwiseBinaryOperators(line: string): string {
  const operatorMap: Record<string, string> = { ".^": "dotPow", ".*": "dotMultiply", "./": "dotDivide" }
  let output = line
  for (;;) {
    // .^ first (it binds tighter), then the leftmost .* or ./
    let hitIndex = output.indexOf(".^"), hitToken = ".^"
    if (hitIndex === -1) {
      for (const token of [".*", "./"]) {
        const idx = output.indexOf(token)
        if (idx !== -1 && (hitIndex === -1 || idx < hitIndex)) { hitIndex = idx; hitToken = token }
      }
    }
    if (hitIndex === -1) break
    const left = scanOperandLeft(output, hitIndex - 1)
    const right = scanOperandRight(output, hitIndex + hitToken.length)
    if (!left || !right) break
    const leftExpr = output.slice(left.start, left.end).trim()
    const rightExpr = output.slice(right.start, right.end).trim()
    output = output.slice(0, left.start) + `${operatorMap[hitToken]}(${leftExpr}, ${rightExpr})` + output.slice(right.end)
  }
  return output
}

/**
 * Join MATLAB continuation markers. Courseware and rich-text copy/paste can
 * collapse the newline after `...`, so remove an out-of-string marker even
 * when the next expression has landed on the same physical line.
 */
export function joinContinuationLines(source: string): string {
  const input = String(source ?? "")
  let output = ""
  let quote: "'" | '"' | null = null

  for (let i = 0; i < input.length;) {
    const char = input[i]
    if (quote) {
      output += char
      if (char === quote) {
        if (input[i + 1] === quote) { output += input[i + 1]; i += 2; continue }
        quote = null
      }
      i++
      continue
    }

    if (char === "'" || char === '"') {
      // A quote after a value is MATLAB transpose, not a string delimiter.
      const previous = output.trimEnd().slice(-1)
      if (char === "'" && /[)\]\w]/.test(previous)) { output += char; i++; continue }
      quote = char
      output += char
      i++
      continue
    }

    if (input.slice(i, i + 3) === "...") {
      let next = i + 3
      while (input[next] === " " || input[next] === "\t") next++
      if (input[next] === "%") {
        while (next < input.length && input[next] !== "\n" && input[next] !== "\r") next++
      }
      if (input[next] === "\r") next++
      if (input[next] === "\n") next++
      while (input[next] === " " || input[next] === "\t") next++
      output += " "
      i = next
      continue
    }

    output += char
    i++
  }

  return output
}

// Rewrites var(...) as var[...] for known variables, matching brackets so that an index may hold
// another index or a call: u(springs(s,2)), u(abs(k)) and u((k+1)) all work. Inner indexes are
// rewritten first, so `end` inside them already refers to their own variable.
function convertIndexing(text: string, variables: Set<string>, functionNames: Set<string>): string {
  let out = ""
  for (let i = 0; i < text.length;) {
    const word = i > 0 && /\w/.test(text[i - 1]) ? null : /^[A-Za-z_]\w*/.exec(text.slice(i))?.[0]
    if (!word) { out += text[i++]; continue }
    let open = i + word.length
    while (open < text.length && /\s/.test(text[open])) open++
    let close = -1
    if (text[open] === "(" && variables.has(word) && !functionNames.has(word)) {
      for (let k = open, depth = 0; k < text.length; k++) {
        if (text[k] === "(") depth++
        else if (text[k] === ")" && --depth === 0) { close = k; break }
      }
    }
    const inside = close > 0 ? text.slice(open + 1, close) : ""
    if (!inside.trim()) { out += word; i += word.length; continue }
    out += `${word}[${convertIndexing(inside, variables, functionNames).replace(/\bend\b/g, `length(${word})`)}]`
    i = close + 1
  }
  return out
}

function replaceIndexing(line: string, variables: Set<string>, functionNames = new Set<string>()): string {
  if (variables.size === 0) return line
  const strings: string[] = []
  const masked = line.replace(/'(?:[^']|'')*'/g, m => { strings.push(m); return `\x00S${strings.length - 1}\x00` })
  // A(:) is every element of A, column by column: a helper, because the
  // generic A[:] below only works for a vector.
  // On the left of an assignment (A(:) = 0) it stays an index, handled by the engine.
  let result = masked.replace(/\b([A-Za-z_]\w*)\s*\(\s*:\s*\)/g, (match, name, offset, whole) => {
    const isTarget = !whole.slice(0, offset).trim() && /^\s*=(?!=)/.test(whole.slice(offset + match.length))
    return variables.has(name) && !functionNames.has(name) && !isTarget ? `colonall(${name})` : match
  })
  // MATLAB () indexing for known variables: var(i) → var[i]
  result = convertIndexing(result, variables, functionNames)
  // MATLAB {} cell-array indexing: fields{i} → fields[i]
  result = result.replace(/\b([A-Za-z_]\w*)\s*\{([^{}]+)\}/g, (match, name, inner) => {
    const expandedInner = inner.replace(/\bend\b/g, `length(${name})`)
    return `${name}[${expandedInner}]`
  })
  return result.replace(/\x00S(\d+)\x00/g, (_, i) => strings[parseInt(i)])
}

/**
 * Transforms a single expression `A \ b` into `mldivide(A, b)`.
 * Only handles the single-backslash case (not full script; see engine's replaceBackslashDiv).
 */
export function replaceBackslash(expr: string): string {
  let hasTopLevelEquals = false, depth = 0, inStr = false, strCh: string | null = null
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i]
    if (inStr) {
      if (char === strCh) {
        if (expr[i + 1] === strCh) { i++; continue }
        inStr = false; strCh = null
      }
      continue
    }
    if (char === "'" || char === '"') { inStr = true; strCh = char; continue }
    if (char === "[" || char === "(" || char === "{") depth++
    if (char === "]" || char === ")" || char === "}") depth--
    if (char === "=" && depth === 0) hasTopLevelEquals = true
    if (char === "\\" && depth === 0) {
      if (hasTopLevelEquals) return expr
      const left = expr.slice(0, i).trim()
      const right = expr.slice(i + 1).trim()
      return `mldivide(${left}, ${right})`
    }
  }
  return expr
}

function convertMatlabStringEscapes(line: string): string {
  return line.replace(/'(?:[^']|'')*'|"(?:[^"]|"")*"/g, match => {
    // MATLAB character vectors do not interpret backslashes while they are
    // being parsed. They are used heavily by TeX labels (\alpha, \surd, ...)
    // and are interpreted later by functions such as fprintf. mathjs parses
    // strings like JavaScript and rejects unknown escapes, so protect every
    // backslash for the parser and preserve the original value.
    const quote = match[0]
    const doubledQuote = quote + quote
    const escapedQuote = "\\" + quote
    const content = match.slice(1, -1)
      .replace(/\\/g, "\\\\")
      .split(doubledQuote).join(escapedQuote)
    return `${quote}${content}${quote}`
  })
}

/**
 * Normalizes a MATLAB source line to a form mathjs can evaluate:
 * strips comments, rewrites element-wise operators, fixes matrix syntax,
 * replaces `var(i)` indexing with `var[i]`, handles string escapes.
 */
export function preprocessLine(line: string, variables: Set<string>, functionNames = new Set<string>()): string {
  let output = stripMatlabComment(line).trim()
  if (!output) return ""
  if (/^pkg\s+/i.test(output)) return ""
  output = output.replace(/\bnull\s*\(/g, "nullspace(")
  // mathjs reserves text() internally; route MATLAB's plot annotation helper
  // to a non-conflicting runtime name.
  output = output.replace(/\btext\s*\(/gi, "plottext(")
  output = output.replace(/^hold\s+on$/i, "hold('on')")
  output = output.replace(/^hold\s+off$/i, "hold('off')")
  output = output.replace(/^grid\s+on$/i, "grid('on')")
  output = output.replace(/^grid\s+off$/i, "grid('off')")
  output = output.replace(/^axis\s+tight$/i, "axis('tight')")
  output = output.replace(/^axis\s+equal$/i, "axis('equal')")
  output = output.replace(/^axis\s+auto$/i, "axis('auto')")
  output = normalizeElementwiseOperators(output)
  output = replaceElementwiseBinaryOperators(output)
  output = normalizeMatrixSyntax(output)
  output = replaceIndexing(output, variables, functionNames)
  output = convertMatlabStringEscapes(output)
  return output
}

/** Alias for backwards compatibility. */
export { preprocessLine as normalizeLine }
