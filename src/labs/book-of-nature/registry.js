// Every file in moments/ is a moment. Ids are progress keys: never change one once published.
const modules = import.meta.glob('./moments/*.jsx', { eager: true })

const byOrder = (a, b) => {
  const [ae, am] = a.order.split('.').map(Number)
  const [be, bm] = b.order.split('.').map(Number)
  return ae - be || am - bm
}

export const moments = Object.values(modules).map(m => m.default).sort(byOrder)

// The moments grouped by episode, in order, for the picker.
export const episodes = moments.reduce((list, m) => {
  const last = list[list.length - 1]
  if (last?.number === m.episodeNumber) last.moments.push(m)
  else list.push({ number: m.episodeNumber, title: m.episode, moments: [m] })
  return list
}, [])
