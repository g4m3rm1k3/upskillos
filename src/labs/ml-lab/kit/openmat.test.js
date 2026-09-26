// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { saveOpenMatDocument } from './openmat.js'

const docs = () => JSON.parse(localStorage.getItem('openmat-documents'))
const active = () => JSON.parse(localStorage.getItem('openmat-active-document-id'))
afterEach(() => localStorage.clear())

describe('saving a prepared OpenMAT script', () => {
  it('adds the script and selects it, keeping the learner’s other scripts', () => {
    localStorage.setItem('openmat-documents', JSON.stringify([{ id: 'mine', name: 'work.m', code: 'x = 1' }]))
    expect(saveOpenMatDocument('ml.m', 'y = 2')).toMatchObject({ ok: true, message: 'Added ml.m to OpenMAT.' })
    expect(docs().map(d => [d.name, d.code])).toEqual([['work.m', 'x = 1'], ['ml.m', 'y = 2']])
    expect(active()).toBe(docs()[1].id)
  })
  it('opens the existing copy when it is unchanged, and never overwrites an edited one', () => {
    saveOpenMatDocument('ml.m', 'y = 2')
    expect(saveOpenMatDocument('ml.m', 'y = 2').message).toMatch(/already in OpenMAT/)
    expect(docs()).toHaveLength(1)
    const d = docs(); d[0].code = 'y = 2 % my notes'; localStorage.setItem('openmat-documents', JSON.stringify(d))
    expect(saveOpenMatDocument('ml.m', 'y = 2').message).toMatch(/kept and this copy is ml \(2\)\.m/)
    expect(docs().map(x => x.code)).toEqual(['y = 2 % my notes', 'y = 2'])
  })
  it('keeps OpenMAT’s older single-script storage as a document', () => {
    localStorage.setItem('openmat-code', JSON.stringify('z = 3'))
    saveOpenMatDocument('ml.m', 'y = 2')
    expect(docs().map(d => d.code)).toEqual(['z = 3', 'y = 2'])
  })
})
