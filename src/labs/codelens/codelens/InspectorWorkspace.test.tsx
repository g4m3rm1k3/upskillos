// @vitest-environment happy-dom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import InspectorWorkspace from './InspectorWorkspace'
import { defaultWorkspace, INSPECTOR_IDS } from './inspectorLayoutState'

vi.mock('./ThemeContext', () => ({ useCodeLensTheme: () => ({ theme: { ui: {} } }) }))
afterEach(cleanup)
function Harness() {
  const [state, setState] = useState(defaultWorkspace)
  return <InspectorWorkspace state={state} onChange={setState} tabs={INSPECTOR_IDS.map(id => ({ id, label: id }))} render={id => <p>{id} content</p>} />
}
it('shows explain beside output and supports dragging to a new pane', () => {
  render(<Harness />)
  expect(screen.getByText('explain content')).toBeTruthy()
  expect(screen.getByText('output content')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Number of inspector panes'), { target: { value: '3' } })
  const data = new Map<string, string>()
  const dataTransfer = { setData: (k: string, v: string) => data.set(k, v), getData: (k: string) => data.get(k), types: ['application/x-codelens-inspector'] }
  fireEvent.dragStart(screen.getByRole('tab', { name: 'explain' }), { dataTransfer })
  const third = screen.getByRole('region', { name: 'Inspector pane 3' })
  fireEvent.dragOver(third, { dataTransfer })
  fireEvent.drop(third, { dataTransfer })
  expect(within(third).getByText('explain content')).toBeTruthy()
  expect(screen.getByRole('tab', { name: 'explain' }).getAttribute('aria-selected')).toBe('true')
  fireEvent.change(screen.getByLabelText('Show tab in pane 1'), { target: { value: 'output' } })
  expect(within(screen.getByRole('region', { name: 'Inspector pane 1' })).getByText('output content')).toBeTruthy()
  const divider = screen.getByRole('separator', { name: 'Resize panes 1 and 2' })
  fireEvent.keyDown(divider, { key: 'ArrowRight' })
  expect(divider.getAttribute('aria-valuenow')).toBe('55')
})
