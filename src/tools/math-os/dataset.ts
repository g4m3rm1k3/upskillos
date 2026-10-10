export interface Dataset { name: string; columns: string[]; rows: string[][] }
export const DATA_LIMITS = { characters: 2_000_000, rows: 10_000, columns: 32 }

export function isDataset(value: unknown): value is Dataset {
  const d = value as Dataset | null
  return !!d && typeof d.name === 'string' && Array.isArray(d.columns)
    && d.columns.length > 0 && d.columns.length <= DATA_LIMITS.columns
    && d.columns.every(c => typeof c === 'string' && c.trim().length > 0)
    && new Set(d.columns).size === d.columns.length && Array.isArray(d.rows)
    && d.rows.length <= DATA_LIMITS.rows
    && d.rows.every(row => Array.isArray(row) && row.length === d.columns.length && row.every(v => typeof v === 'string'))
    && JSON.stringify(d).length <= 5_000_000
}

function detectDelimiter(source: string): string {
  const counts: Record<string, number> = { ',': 0, '\t': 0, ';': 0 }
  let quoted = false
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    if (c === '"') { if (quoted && source[i + 1] === '"') i++; else quoted = !quoted }
    else if (!quoted && (c === '\n' || c === '\r')) break
    else if (!quoted && c in counts) counts[c]++
  }
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]
}

export function parseDataset(source: string, options: { delimiter?: string; header?: boolean; name?: string } = {}): Dataset {
  if (source.length > DATA_LIMITS.characters) throw new Error('Data exceeds the 2 MB text limit.')
  source = source.replace(/^\uFEFF/, '')
  const delimiter = options.delimiter || detectDelimiter(source)
  if (![',', '\t', ';'].includes(delimiter)) throw new Error('Choose comma, tab or semicolon.')
  const records: string[][] = []
  let row: string[] = [], cell = '', quoted = false, closed = false
  const finishCell = () => {
    row.push(cell); cell = ''; closed = false
    if (row.length > DATA_LIMITS.columns) throw new Error('Use at most 32 columns.')
  }
  const finishRow = () => {
    const explicitEmpty = closed
    finishCell()
    if (row.length > 1 || row[0].trim() !== '' || explicitEmpty) records.push(row)
    row = []
    if (records.length > DATA_LIMITS.rows + 1) throw new Error('Use at most 10,000 data rows.')
  }
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    if (quoted) {
      if (c === '"') {
        if (source[i + 1] === '"') { cell += '"'; i++ }
        else { quoted = false; closed = true }
      } else cell += c
    } else if (c === delimiter) finishCell()
    else if (c === '\r' || c === '\n') { finishRow(); if (c === '\r' && source[i + 1] === '\n') i++ }
    else if (c === '"' && cell === '' && !closed) quoted = true
    else {
      if (closed || c === '"') throw new Error('Unexpected text or quote after a field. Check CSV quoting.')
      cell += c
    }
  }
  if (quoted) throw new Error('A quoted field is missing its closing quote.')
  if (cell !== '' || closed || row.length) finishRow()
  if (!records.length) throw new Error('Paste or import a nonempty table.')
  const width = records[0].length
  const mismatch = records.findIndex(record => record.length !== width)
  if (mismatch >= 0) throw new Error(`Record ${mismatch + 1} has ${records[mismatch].length} fields; expected ${width}. Check the delimiter.`)
  const headers = options.header === false ? records[0].map((_, i) => `Column ${i + 1}`) : records.shift()!
  const used = new Set<string>()
  const columns = headers.map((header, i) => {
    const base = header.trim() || `Column ${i + 1}`
    let name = base, suffix = 2
    while (used.has(name)) name = `${base} (${suffix++})`
    used.add(name); return name
  })
  if (records.length > DATA_LIMITS.rows) throw new Error('Use at most 10,000 data rows.')
  return { name: options.name || 'Imported data', columns, rows: records }
}

export function numericCell(raw: string): number | null {
  const text = raw.trim()
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

export function columnSummary(dataset: Dataset, column: number) {
  const values: number[] = []
  let missing = 0, nonnumeric = 0, mean = 0, m2 = 0
  for (const row of dataset.rows) {
    const raw = row[column]
    if (!raw.trim()) { missing++; continue }
    const n = numericCell(raw)
    if (n === null) { nonnumeric++; continue }
    values.push(n)
    const delta = n - mean
    mean += delta / values.length
    m2 += delta * (n - mean)
  }
  if (!Number.isFinite(mean) || !Number.isFinite(m2)) throw new Error('Values are too large for stable statistics. Rescale the column.')
  const sorted = [...values].sort((a, b) => a - b), count = values.length
  const median = !count ? null : count % 2 ? sorted[(count - 1) / 2] : sorted[count / 2 - 1] / 2 + sorted[count / 2] / 2
  return { count, missing, nonnumeric, mean: count ? mean : null, median,
    min: count ? sorted[0] : null, max: count ? sorted[count - 1] : null,
    sampleSD: count > 1 ? Math.sqrt(Math.max(0, m2 / (count - 1))) : null, values }
}

export function numericPairs(dataset: Dataset, x: number, y: number) {
  return dataset.rows.flatMap((row, index) => {
    const xv = numericCell(row[x]), yv = numericCell(row[y])
    return xv === null || yv === null ? [] : [{ x: xv, y: yv, row: index }]
  })
}

export function fitLinearModel(dataset: Dataset, xColumn: number, yColumn: number) {
  if (xColumn === yColumn) throw new Error('Choose different feature and target columns.')
  const pairs = numericPairs(dataset, xColumn, yColumn)
  if (pairs.length < 5) throw new Error('Linear regression needs at least five complete numeric rows.')
  const trainCount = Math.floor(pairs.length * 0.8)
  const train = pairs.slice(0, trainCount), test = pairs.slice(trainCount)
  const xm = train.reduce((sum, point) => sum + point.x / train.length, 0)
  const ym = train.reduce((sum, point) => sum + point.y / train.length, 0)
  const xx = train.reduce((sum, p) => sum + (p.x - xm) ** 2, 0)
  if (xx === 0) throw new Error('Training feature values are constant. Choose a varying column.')
  const slope = train.reduce((sum, p) => sum + (p.x - xm) * (p.y - ym), 0) / xx
  const intercept = ym - slope * xm
  const predict = (x: number) => slope * x + intercept
  const rmse = Math.sqrt(test.reduce((sum, p) => sum + (predict(p.x) - p.y) ** 2 / test.length, 0))
  const baselineRMSE = Math.sqrt(test.reduce((sum, p) => sum + (ym - p.y) ** 2 / test.length, 0))
  if (![slope, intercept, rmse, baselineRMSE].every(Number.isFinite)) throw new Error('Values exceed numerical limits. Rescale your columns before fitting.')
  return { slope, intercept, rmse, baselineRMSE, trainCount, testCount: test.length,
    excluded: dataset.rows.length - pairs.length, xColumn, yColumn,
    predictions: pairs.map((p, i) => ({ ...p, prediction: predict(p.x), residual: p.y - predict(p.x), split: i < trainCount ? 'train' : 'test' })) }
}

// Quoting alone does not stop a spreadsheet from executing formula-like text.
// Keep numeric negatives numeric; prefix dangerous text in spreadsheet-safe mode.
export function tableCSV(columns: string[], rows: string[][], spreadsheetSafe = true): string {
  const cell = (value: string) => {
    const safe = spreadsheetSafe && numericCell(value) === null && /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  return [columns, ...rows].map(row => row.map(cell).join(',')).join('\r\n')
}
