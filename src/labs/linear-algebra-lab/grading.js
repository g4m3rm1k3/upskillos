// Grade computed workspace values, preserving shape and rejecting nonfinite answers.
export function matchesNumeric(actual, expected, tolerance = 1e-6, kind) {
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && actual.length === expected.length &&
      expected.every((value, i) => matchesNumeric(actual[i], value, tolerance, kind))
  }
  if (typeof actual !== 'number' || !Number.isFinite(actual)) return false
  const value = kind === 'abs' ? Math.abs(actual) : actual
  return Math.abs(value - expected) <= tolerance * Math.max(1, Math.abs(expected))
}

export function gradeWorkspace(workspace, checks) {
  const values = new Map(workspace.map(entry => [entry.name, entry.value]))
  return checks.map(check => ({
    name: check.name,
    pass: values.has(check.name) && matchesNumeric(values.get(check.name), check.expected, check.tolerance, check.kind),
    message: values.has(check.name) ? check.message : `Create a variable named ${check.name}. ${check.message}`,
  }))
}
