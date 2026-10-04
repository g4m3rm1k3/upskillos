// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Lab from './index'
import { lessons } from './registry'
const selectExperience = id => fireEvent.change(screen.getByLabelText('Experience'), {target:{value:String(lessons.findIndex(lesson => lesson.id === id))}})
afterEach(cleanup)
describe('adapted connected demo', () => {
  it('mounts all experiences with unique targets and four panels each', () => {
    const { container } = render(<Lab />)
    expect(container.querySelectorAll('section')).toHaveLength(lessons.length)
    const ids = [...container.querySelectorAll('[id]')].map(el => el.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const section of container.querySelectorAll('section')) expect(section.querySelectorAll('.wm-panel')).toHaveLength(4)
    fireEvent.click(screen.getByText('Add a rock'))
    expect(container.querySelector('#num').textContent).toBe('1')
    selectExperience('l5')
    for (let i=0;i<4;i++) fireEvent.click(screen.getByText('Ana pays Ben 1'))
    expect(container.querySelector('#l5msg').textContent).toContain('Ana owes Ben 1')
  })
  it('preserves triangle prediction, keyboard handshakes, and unique rule choices', () => {
    const { container } = render(<Lab />)
    expect([...container.querySelector('#ra').options].map(x=>x.value)).toContain('none')
    selectExperience('l3')
    fireEvent.change(container.querySelector('#g'), {target:{value:'66'}})
    fireEvent.click(container.querySelector('#gb'))
    expect(container.querySelector('#gr').textContent).toContain('Yes, 66')
    const people = container.querySelectorAll('#hs [role=button]')
    fireEvent.keyDown(people[0], {key:'Enter'})
    fireEvent.keyDown(people[1], {key:'Enter'})
    expect(container.querySelector('#hc').textContent).toContain('1 of 10')
  })
  it('stops animations when switching experiences and unmounting', () => {
    const cancel = vi.spyOn(window,'cancelAnimationFrame')
    const clear = vi.spyOn(window,'clearInterval')
    const { container, unmount } = render(<Lab />)
    selectExperience('l7')
    fireEvent.click(container.querySelector('#g1'))
    selectExperience('l13')
    expect(cancel).toHaveBeenCalled()
    fireEvent.click(container.querySelector('#tpl'))
    unmount()
    expect(clear).toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
