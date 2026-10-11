const $ = (sel) => document.querySelector(sel)
let current = null

async function showTree(rel = '.') {
  const items = await window.desk.project.list(rel)
  const ul = $('#tree')
  ul.replaceChildren()
  if (rel !== '.') {
    const up = document.createElement('li')
    up.className = 'dir'
    up.textContent = '..'
    up.onclick = () => showTree(rel.split('/').slice(0, -1).join('/') || '.')
    ul.append(up)
  }
  for (const item of items) {
    const li = document.createElement('li')
    li.className = item.dir ? 'dir' : 'file'
    li.textContent = item.name
    const child = rel === '.' ? item.name : `${rel}/${item.name}`
    li.onclick = () => (item.dir ? showTree(child) : openFile(child))
    ul.append(li)
  }
}

async function openFile(rel) {
  $('#editor').value = await window.desk.project.read(rel)
  $('#editor').disabled = false
  $('#save').disabled = false
  current = rel
  $('#status').textContent = rel
}

async function save() {
  await window.desk.project.write(current, $('#editor').value)
  $('#status').textContent = `${current} saved`
}

async function startTerminal() {
  const term = new Terminal({ cols: 80, rows: 12 })
  term.open($('#terminal'))
  const res = await window.desk.terminal.start()
  if (!res.ok) { term.write(res.reason); return }
  window.desk.terminal.onData(({ id, data }) => { if (id === res.id) term.write(data) })
  term.onData((data) => window.desk.terminal.write(res.id, data))
  window.termId = res.id
}

async function openProject() {
  const root = await window.desk.project.open()
  if (!root) return
  await showTree()
  await startTerminal()
}

$('#open').onclick = openProject
$('#save').onclick = save
window.desk.info().then((i) => {
  $('#info').textContent = `Electron ${i.electron}${i.packaged ? ' (packaged)' : ''}`
  if (i.project) openProject()
})
