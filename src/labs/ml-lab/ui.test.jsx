// @vitest-environment happy-dom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import MLLab from './index.jsx'
import { ThemeProvider, useGlobalTheme } from '../../context/ThemeContext.jsx'
import { STUDIO_THEMES } from '../../utils/studioThemes.js'

// Exercise the controlled-editor contract without downloading Monaco in unit
// tests. The real editor is checked in the browser as part of visual QA.
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, options, theme }) => <textarea
    aria-label={options.ariaLabel} data-editor-theme={theme}
    value={value} onChange={event => onChange(event.target.value)} />,
}))

function ThemeControls() {
  const { setStudioTheme } = useGlobalTheme()
  return <><button onClick={() => setStudioTheme('dracula')}>Test dark theme</button><button onClick={() => setStudioTheme('paperTextbook')}>Test light theme</button></>
}

afterEach(()=>{cleanup();localStorage.clear();document.documentElement.classList.remove('dark')})
describe('learning workspace interactions',()=>{
  it('does not count a wrong answer, and persists a correct numeric checkpoint',()=>{
    render(<MLLab />)
    fireEvent.change(screen.getByLabelText('Checkpoint answer'),{target:{value:'8'}})
    fireEvent.click(screen.getByText('Check answer',{selector:'button'}))
    expect(screen.getByRole('status').textContent).toContain('Not quite')
    expect(screen.getByText('0/8 numeric checkpoints')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Checkpoint answer'),{target:{value:'23'}})
    fireEvent.click(screen.getByText('Check answer',{selector:'button'}))
    expect(JSON.parse(localStorage.getItem('upskillos.ml-lab.v1')).progress.arrays.passed).toBe(true)
    cleanup();render(<MLLab />)
    expect(screen.getByText('1/8 numeric checkpoints')).toBeTruthy()
  })
  it('resets training on a dataset change and retains imported data on reseeding',()=>{
    render(<MLLab />)
    fireEvent.click(screen.getByText('100 steps',{selector:'button'}))
    expect(screen.getByText(/Step 100 ·/)).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox',{name:'Relationship'}),{target:{value:'curved'}})
    expect(screen.getByText(/Step 0 ·/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('CSV observations'),{target:{value:'x,y\n2,1\n2,2\n2,3\n2,4\n2,5'}})
    fireEvent.click(screen.getByText('Load CSV',{selector:'button'}))
    fireEvent.change(screen.getByRole('spinbutton',{name:'Seed'}),{target:{value:'99'}})
    expect(screen.getByText('Your CSV')).toBeTruthy()
    expect(screen.getByText(/slope is not identifiable/)).toBeTruthy()
    fireEvent.click(screen.getByText('Use least-squares reference',{selector:'button'}))
    expect(screen.getByRole('spinbutton',{name:'Weight w'}).value).toBe('0')
  })
  it('keeps edited code and explanations when switching workspaces',()=>{
    render(<MLLab />)
    fireEvent.change(screen.getByPlaceholderText('Explain it in your own words. Saved on this device.'),{target:{value:'Each row is one measurement.'}})
    fireEvent.click(screen.getByText('Implement in Python',{selector:'button'}))
    fireEvent.change(screen.getByLabelText('Editable Python / NumPy'),{target:{value:'print(23)'}})
    fireEvent.click(screen.getByText('Learn & experiment',{selector:'button'}))
    expect(screen.getByPlaceholderText('Explain it in your own words. Saved on this device.').value).toBe('Each row is one measurement.')
    fireEvent.click(screen.getByText('Implement in Python',{selector:'button'}))
    expect(screen.getByLabelText('Editable Python / NumPy').value).toBe('print(23)')
  })
  it('keeps later modules explicitly planned',()=>{
    render(<MLLab />)
    fireEvent.click(screen.getByText('Your learning path',{selector:'button'}))
    expect(within(screen.getByRole('main')).getAllByText('Planned')).toHaveLength(37)
    expect(screen.getByText('Available now')).toBeTruthy()
  })
  it('remembers the current lesson and resumes it from the ordered path',()=>{
    render(<MLLab />)
    fireEvent.click(screen.getByRole('button',{name:'03 · Derive the direction'}))
    cleanup(); render(<MLLab />)
    fireEvent.click(screen.getByText('Your learning path',{selector:'button'}))
    expect(within(screen.getByRole('region',{name:'Your current position'})).getByText(/03 · Derive the direction/)).toBeTruthy()
    fireEvent.click(screen.getByText('Continue current lesson',{selector:'button'}))
    expect(screen.getByRole('heading',{name:'Derive the direction'})).toBeTruthy()
  })
  it('updates lesson and editor themes without discarding code',()=>{
    const { container } = render(<ThemeProvider><ThemeControls /><MLLab /></ThemeProvider>)
    fireEvent.click(screen.getByText('Test dark theme'))
    const lab = container.querySelector('.ml-lab')
    expect(lab.style.getPropertyValue('--ml-heading-2')).toBe(STUDIO_THEMES.dracula.mdDark.h2)
    fireEvent.click(screen.getByText('Implement in Python',{selector:'button'}))
    const editor = screen.getByLabelText('Editable Python / NumPy')
    expect(editor.dataset.editorTheme).toBe('dracula')
    fireEvent.change(editor,{target:{value:'print("keep my work")'}})
    fireEvent.click(screen.getByText('Test light theme'))
    expect(lab.style.getPropertyValue('--ml-heading-2')).toBe(STUDIO_THEMES.paperTextbook.mdDark.h2)
    expect(screen.getByLabelText('Editable Python / NumPy').dataset.editorTheme).toBe(STUDIO_THEMES.paperTextbook.monacoLight)
    expect(screen.getByLabelText('Editable Python / NumPy').value).toBe('print("keep my work")')
  })
})
