// Every file in moments/ is a moment. Ids are progress keys: never change one once published.
const modules = import.meta.glob('./moments/*.jsx', { eager: true })

const byOrder = (a, b) => {
  const [ae, am] = a.order.split('.').map(Number)
  const [be, bm] = b.order.split('.').map(Number)
  return ae - be || am - bm
}

export const moments = Object.values(modules).map(m => m.default).sort(byOrder)
