import { toPlain, normalizeVector, isMatrix, realValue } from './math-utils.js'
import type { PlotState, ColormapName } from './types.js'

// ── Series colors (cycling palette) ──────────────────────────────────────────

export const SERIES_COLORS = ["teal", "blue", "amber", "purple", "red", "green"] as const

// ── PlotState factory ─────────────────────────────────────────────────────────

export function makePlotState(): PlotState {
  return {
    series: [],
    annotations: [],
    hold: false,
    title: "",
    xlabel: "",
    ylabel: "",
    zlabel: "",
    legend: [],
    grid: true,
    xlim: null,
    ylim: null,
    zlim: null,
    axisMode: "auto",
    view: "3",
    colormap: "parula" as ColormapName,
    colorbar: false,
  }
}

// ── 2D figure builder ─────────────────────────────────────────────────────────

export function buildFigureFromPlotState(plotState: PlotState): string | null {
  if (plotState.series.length === 0) return null
  const xs = plotState.series.flatMap(s => s.kind === "bar" ? (s.values ?? []).map((_, i) => i) : s.x)
  const ys = plotState.series.flatMap(s => s.kind === "bar" ? (s.values ?? []) : s.y)
  let xmin = Math.min(...xs), xmax = Math.max(...xs)
  let ymin = Math.min(...ys), ymax = Math.max(...ys)
  if (!Number.isFinite(xmin)) xmin = -1
  if (!Number.isFinite(xmax)) xmax = 1
  if (!Number.isFinite(ymin)) ymin = -1
  if (!Number.isFinite(ymax)) ymax = 1
  if (xmin === xmax) { xmin -= 1; xmax += 1 }
  if (ymin === ymax) { ymin -= 1; ymax += 1 }
  const isTight = plotState.axisMode === "tight"
  const padX = (xmax - xmin) * (isTight ? 0.02 : 0.08)
  const padY = (ymax - ymin) * (isTight ? 0.02 : 0.15)
  const xBounds = plotState.xlim?.length === 2 ? plotState.xlim : [xmin - padX, xmax + padX]
  const yBounds = plotState.ylim?.length === 2 ? plotState.ylim : [ymin - padY, ymax + padY]
  const elements: unknown[] = []
  if (plotState.grid)
    elements.push({ type: "grid", step: Math.max((xBounds[1] - xBounds[0]) / 8, 1e-6), color: "border" })
  elements.push({ type: "axes", labels: true, ticks: true })
  plotState.series.forEach((series, index) => {
    const color = series.color || SERIES_COLORS[index % SERIES_COLORS.length]
    if (series.kind === "plot") {
      elements.push({ type: "curve", xs: series.x, ys: series.y, color, width: series.width ?? 2.5, label: series.label || null })
    } else if (series.kind === "area") {
      elements.push({ type: "curve", xs: series.x, ys: series.y, color, width: 2.5, fill: true, fill_alpha: 0.18, label: series.label || null })
    } else if (series.kind === "scatter") {
      elements.push({ type: "scatter", xs: series.x, ys: series.y, color, radius: 4, labels: null, label: series.label || null })
    } else if (series.kind === "stem") {
      series.x.forEach((x, si) => {
        elements.push({ type: "line", start: [x, 0], end: [x, series.y[si]], color, width: 1.5 })
      })
      elements.push({ type: "scatter", xs: series.x, ys: series.y, color, radius: 4, labels: null })
    } else if (series.kind === "bar") {
      elements.push({ type: "bars", labels: series.labels, values: series.values, color, alpha: 0.8 })
    }
  })
  plotState.annotations.forEach(annotation => {
    elements.push({
      type: "text",
      pos: [annotation.x, annotation.y],
      content: annotation.text,
      color: annotation.color || "text",
      size: annotation.size ?? 12,
    })
  })
  if (plotState.xlabel)
    elements.push({ type: "text", pos: [(xmin + xmax) / 2, ymin - padY * 0.55], content: plotState.xlabel, color: "muted", size: 12, role: "xlabel" })
  if (plotState.ylabel)
    elements.push({ type: "text", pos: [xmin - padX * 0.35, (ymin + ymax) / 2], content: plotState.ylabel, color: "muted", size: 12, role: "ylabel" })
  return JSON.stringify({
    type: "opencalc_figure",
    title: plotState.title || "OpenMAT Plot",
    // Renderers that lay out their own margins read these and skip the text elements with a role.
    xlabel: plotState.xlabel || null,
    ylabel: plotState.ylabel || null,
    legend: plotState.legend.length ? plotState.legend : null,
    xmin: xBounds[0], xmax: xBounds[1],
    ymin: yBounds[0], ymax: yBounds[1],
    height: 340,
    axisMode: plotState.axisMode,
    elements,
  })
}

// ── 3D surface / curve config builders ───────────────────────────────────────

function normalizeSurfaceMatrices(x: unknown, y: unknown, z: unknown) {
  const Z = toPlain(z) as number[][]
  const rows = Array.isArray(Z) ? Z.length : 0
  const cols = rows ? Math.max(...Z.map(row => row.length), 0) : 0
  const defaultX = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => c - (cols - 1) / 2))
  const defaultY = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, () => r - (rows - 1) / 2))
  const expandGrid = (value: unknown, fallback: number[][]): number[][] => {
    const plain = toPlain(value)
    if (!Array.isArray(plain)) return fallback
    if (Array.isArray(plain[0])) return plain as number[][]
    if (plain.length === cols) return Array.from({ length: rows }, () => [...(plain as number[])])
    if (plain.length === rows) return (plain as number[]).map(entry => Array.from({ length: cols }, () => entry))
    return fallback
  }
  return {
    X: x == null ? defaultX : expandGrid(x, defaultX),
    Y: y == null ? defaultY : expandGrid(y, defaultY),
    Z,
  }
}

export function convertSurfaceTo3DConfig(kind: string, args: unknown[], plotState: PlotState): Record<string, unknown> {
  let X: unknown, Y: unknown, Z: unknown
  if (args.length === 1)       Z = args[0]
  else if (args.length >= 3) { [X, Y, Z] = args }
  else                         Z = args[args.length - 1]
  const surfaceData = normalizeSurfaceMatrices(X, Y, Z)
  const flatX = surfaceData.X.flat().filter(Number.isFinite)
  const flatY = surfaceData.Y.flat().filter(Number.isFinite)
  const flatZ = surfaceData.Z.flat().map(Number).filter(Number.isFinite)
  const autoXlim: [number, number] = flatX.length ? [Math.min(...flatX), Math.max(...flatX)] : [-6, 6]
  const autoYlim: [number, number] = flatY.length ? [Math.min(...flatY), Math.max(...flatY)] : [-6, 6]
  const autoZlim: [number, number] = flatZ.length ? [Math.min(...flatZ), Math.max(...flatZ)] : [0, 1]
  const zRange = flatZ.length ? autoZlim : [0, 1]
  const xlim = (Array.isArray(plotState.xlim) && plotState.xlim.length >= 2) ? plotState.xlim : autoXlim
  const ylim = (Array.isArray(plotState.ylim) && plotState.ylim.length >= 2) ? plotState.ylim : autoYlim
  const zlim = (Array.isArray(plotState.zlim) && plotState.zlim.length >= 2) ? plotState.zlim : autoZlim
  return {
    mode: "3d",
    title: plotState.title || `OpenMAT ${kind === "mesh" ? "Mesh" : "Surface"} Lab`,
    replace: true,
    functions: [{
      id: Date.now(), latex: kind === "mesh" ? "mesh data" : "surface data",
      color: "#6366f1", visible: true,
      plotType: kind === "mesh" ? "mesh" : "surf",
      wireframe: kind === "mesh", opacity: kind === "mesh" ? 1 : 0.9,
      surfaceData, colorMap: plotState.colormap || "parula", colorRange: zRange,
    }],
    settings: {
      range: Math.max(xlim[1] - xlim[0], ylim[1] - ylim[0], zlim[1] - zlim[0], 4),
      resolution: Math.min(128, Math.max(surfaceData.Z.length, surfaceData.Z[0]?.length || 32, 32)),
      xlim, ylim, zlim, view: plotState.view, colorbar: plotState.colorbar !== false,
      colormap: plotState.colormap || "parula",
      xlabel: plotState.xlabel || "X", ylabel: plotState.ylabel || "Y", zlabel: plotState.zlabel || "Z",
      title: plotState.title || "",
    },
  }
}

export function convertPointSeries3DConfig(kind: string, args: unknown[], plotState: PlotState): Record<string, unknown> {
  const xs = normalizeVector(args[0]).map(Number)
  const ys = normalizeVector(args[1]).map(Number)
  const zs = normalizeVector(args[2]).map(Number)
  const count = Math.min(xs.length, ys.length, zs.length)
  const extraArgs = args.slice(3)
  const numericExtras = extraArgs.filter(a => typeof a !== "string")
  const stringExtras = extraArgs.filter(a => typeof a === "string").map(a => String(a).toLowerCase())
  const filled = stringExtras.includes("filled")
  const matlabColors: Record<string, string> = {
    r: "#e84040", g: "#22c55e", b: "#4d7cff", k: "#111111", w: "#ffffff",
    m: "#d946ef", c: "#06b6d4", y: "#facc15",
  }
  const colorStringArg = stringExtras.find(s => matlabColors[s])
  const colorFromString = colorStringArg ? matlabColors[colorStringArg] : null
  const sizeArg = numericExtras.length >= 1 ? numericExtras[0] : null
  const colorArg = numericExtras.length >= 2 ? numericExtras[1] : null
  const sizeValues = sizeArg == null ? [] : normalizeVector(sizeArg).map(Number)
  const colorValues = colorArg == null ? [] : normalizeVector(colorArg).map(Number)
  const xSlice = xs.slice(0, count).filter(Number.isFinite)
  const ySlice = ys.slice(0, count).filter(Number.isFinite)
  const zSlice = zs.slice(0, count).filter(Number.isFinite)
  const pad = (v: number) => v * 0.05 + 0.5
  const autoXlim = xSlice.length ? [Math.min(...xSlice) - pad(Math.abs(Math.min(...xSlice))), Math.max(...xSlice) + pad(Math.abs(Math.max(...xSlice)))] : [-10, 10]
  const autoYlim = ySlice.length ? [Math.min(...ySlice) - pad(Math.abs(Math.min(...ySlice))), Math.max(...ySlice) + pad(Math.abs(Math.max(...ySlice)))] : [-10, 10]
  const autoZlim = zSlice.length ? [Math.min(...zSlice) - pad(Math.abs(Math.min(...zSlice))), Math.max(...zSlice) + pad(Math.abs(Math.max(...zSlice)))] : [-10, 10]
  const xlim = (Array.isArray(plotState.xlim) && plotState.xlim.length >= 2) ? plotState.xlim : autoXlim
  const ylim = (Array.isArray(plotState.ylim) && plotState.ylim.length >= 2) ? plotState.ylim : autoYlim
  const zlim = (Array.isArray(plotState.zlim) && plotState.zlim.length >= 2) ? plotState.zlim : autoZlim
  const colorFinite = colorValues.filter(v => Number.isFinite(v))
  return {
    mode: "3d",
    title: plotState.title || `OpenMAT ${kind === "scatter3" ? "3D Scatter" : "3D Curve"}`,
    replace: true,
    functions: [{
      id: Date.now(), latex: kind === "scatter3" ? "scatter3 data" : "plot3 data",
      color: colorFromString || (kind === "scatter3" ? "#f97316" : "#22c55e"),
      visible: true, opacity: kind === "scatter3" ? 0.95 : 1,
      plotType: kind === "scatter3" ? "scatter3" : "line3",
      xs: xs.slice(0, count), ys: ys.slice(0, count), zs: zs.slice(0, count),
      pointSize: kind === "scatter3" ? 0.14 : 0.1,
      pointSizes: kind === "scatter3" ? sizeValues.slice(0, count) : [],
      colorValues: kind === "scatter3" ? colorValues.slice(0, count) : [],
      colorMap: plotState.colormap || "parula",
      colorRange: colorFinite.length ? [Math.min(...colorFinite), Math.max(...colorFinite)] : null,
      filled,
    }],
    settings: {
      range: Math.max(xlim[1] - xlim[0], ylim[1] - ylim[0], zlim[1] - zlim[0], 4),
      resolution: 64, xlim, ylim, zlim, view: plotState.view,
      colorbar: plotState.colorbar && kind === "scatter3" && colorFinite.length > 0,
      colormap: plotState.colormap || "parula",
      xlabel: plotState.xlabel || "X", ylabel: plotState.ylabel || "Y", zlabel: plotState.zlabel || "Z",
      title: plotState.title || "",
    },
  }
}
