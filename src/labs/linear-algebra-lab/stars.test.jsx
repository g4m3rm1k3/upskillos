import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import MarkdownProse from '../../components/math/MarkdownProse.jsx'
import { starsAsTimes } from './stars.js'

const html = text => renderToStaticMarkup(<MarkdownProse text={starsAsTimes(text)} />)

describe('stars in prose', () => {
  it('shows multiplication stars instead of turning them into italics', () => {
    const out = html('Fit X*beta to y, then compute y - X*beta and D\' *D.')
    expect(out).not.toContain('<em')
    expect(out).toContain('X*beta to y')
    expect(out).toContain('D&#x27; *D')
  })
  it('keeps bold, underscore italics, code spans and maths', () => {
    expect(html('A **basis** and a _unit_ vector')).toMatch(/<strong[^>]*>basis<\/strong>.*<em[^>]*>unit<\/em>/)
    expect(starsAsTimes('Run `Q*R` or $a*b*c$ or \\(x*y*z\\)')).toBe('Run `Q*R` or $a*b*c$ or \\(x*y*z\\)')
    expect(starsAsTimes('2*3 and 4*5')).toBe('2\\*3 and 4\\*5')
    expect(starsAsTimes(undefined)).toBe(undefined)
  })
})
