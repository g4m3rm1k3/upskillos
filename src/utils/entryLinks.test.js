// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { setEntryLink, takeEntryLink } from './entryLinks.js'

describe('entry links', () => {
  it('hand a query to the lab once, and announce it to an open one', () => {
    const heard = []
    const on = (e) => heard.push(e.detail)
    window.addEventListener('entry-link', on)
    setEntryLink('mesh-lab', '?project=walk-cycle')
    window.removeEventListener('entry-link', on)
    expect(heard).toEqual([{ key: 'mesh-lab', search: '?project=walk-cycle' }])
    expect(takeEntryLink('mesh-lab')).toBe('?project=walk-cycle')
    expect(takeEntryLink('mesh-lab')).toBeNull()
  })
})

describe('useEntryLink', () => {
  it('takes a pending link on mount, then hears later ones', async () => {
    const React = await import('react')
    const { act } = React
    const { createRoot } = await import('react-dom/client')
    const { useEntryLink } = await import('./entryLinks.js')
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    const heard = []
    function Lab() {
      useEntryLink('ml-lab', (search) => heard.push(search))
      return null
    }
    setEntryLink('ml-lab', '?lab=3')
    const host = document.createElement('div')
    const root = createRoot(host)
    await act(async () => root.render(React.createElement(Lab)))
    expect(heard).toEqual(['?lab=3'])
    await act(async () => setEntryLink('ml-lab', '?lab=8'))
    await act(async () => setEntryLink('notebook-lab', '?lesson=ml-vectors'))
    expect(heard).toEqual(['?lab=3', '?lab=8'])
    expect(takeEntryLink('ml-lab')).toBeNull()
    await act(async () => root.unmount())
    delete globalThis.IS_REACT_ACT_ENVIRONMENT
  })
})
