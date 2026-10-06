// Convert between .ipynb (Jupyter) format and our internal cell format

export function toIpynb(notebook) {
  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3.x' },
      oc_notebook_id: notebook.id,
    },
    cells: notebook.cells.map(cell => {
      const source = (cell.code ?? '').split('\n').map((l, i, a) => i < a.length - 1 ? l + '\n' : l)
      const mdLines = [
        cell.cellTitle ? `# ${cell.cellTitle}\n` : null,
        Array.isArray(cell.prose) ? cell.prose.join('\n\n') : (cell.prose ?? null),
      ].filter(Boolean)

      if (mdLines.length && !cell.code?.trim()) {
        return {
          cell_type: 'markdown',
          id: cell.id,
          metadata: {},
          source: mdLines.flatMap(t => t.split('\n').map((l, i, a) => i < a.length - 1 ? l + '\n' : l)),
        }
      }

      return {
        cell_type: 'code',
        execution_count: null,
        id: cell.id,
        metadata: { oc_title: cell.cellTitle ?? '', oc_prose: Array.isArray(cell.prose) ? cell.prose.join('\n\n') : (cell.prose ?? '') },
        outputs: cell.output
          ? [{ output_type: 'stream', name: 'stdout', text: [cell.output] }]
          : [],
        source,
      }
    }),
  }
}

export function fromIpynb(ipynb, name = 'Imported Notebook') {
  const cells = (ipynb.cells ?? []).map((cell, i) => {
    const source = Array.isArray(cell.source) ? cell.source.join('') : (cell.source ?? '')
    if (cell.cell_type === 'markdown') {
      const titleMatch = source.match(/^#{1,3}\s+(.+)/m)
      return {
        id: cell.id ?? `cell-${i + 1}`,
        cellTitle: titleMatch?.[1] ?? '',
        prose: source.replace(/^#{1,3}\s+.+\n?/m, '').trim(),
        instructions: '',
        code: '',
        output: '',
        status: 'idle',
        figureJson: null,
      }
    }
    const output = (cell.outputs ?? [])
      .map(o => Array.isArray(o.text) ? o.text.join('') : (o.text ?? o.evalue ?? ''))
      .join('\n')

    return {
      id: cell.id ?? `cell-${i + 1}`,
      cellTitle: cell.metadata?.oc_title ?? `Cell ${i + 1}`,
      prose: cell.metadata?.oc_prose ?? '',
      instructions: '',
      code: source,
      output: output.trim(),
      status: 'idle',
      figureJson: null,
    }
  })

  return {
    id: `nb-${Date.now()}`,
    name,
    cells,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function downloadIpynb(notebook) {
  const ipynb = toIpynb(notebook)
  const blob = new Blob([JSON.stringify(ipynb, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `${notebook.name.replace(/[^a-z0-9]/gi, '_')}.ipynb`,
  })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function fetchColabNotebook(url) {
  // Colab share URLs: https://colab.research.google.com/drive/<fileId>
  // GitHub .ipynb URLs: https://github.com/user/repo/blob/main/file.ipynb
  // Raw GitHub: https://raw.githubusercontent.com/...
  let fetchUrl = url.trim()

  if (fetchUrl.includes('github.com') && !fetchUrl.includes('raw.githubusercontent')) {
    fetchUrl = fetchUrl
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/')
  }

  if (fetchUrl.includes('colab.research.google.com')) {
    throw new Error('Direct Colab import requires sign-in. Download the .ipynb from Colab (File → Download → Download .ipynb) and upload it here.')
  }

  const res = await fetch(fetchUrl)
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`)
  return res.json()
}
