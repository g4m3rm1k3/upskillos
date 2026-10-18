// @vitest-environment happy-dom
// The puzzle board: every piece is on it, every idea link joins two real pieces, the "built on"
// graph comes from the code, and the board works in a lesson's Keep stage and as its own page.
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import PuzzleBoard, { IDEA_LINKS, pieceGraph } from './PuzzleBoard.jsx'
import { PIECES, PIECE_ORDER } from './python/pieces.js'
import { ALL } from './curriculum.js'
import { LESSONS } from './lessons/index.js'
import Lab from './index.jsx'
import { STORE } from './progress.js'

afterEach(() => { cleanup(); localStorage.clear() })

describe('the puzzle board', () => {
  it('every piece belongs to a built lesson, and every idea link joins two pieces', () => {
    for (const p of PIECE_ORDER) expect(ALL.find(l => l.id === PIECES[p].lesson)?.built, p).toBe(true)
    for (const [a, b, why] of IDEA_LINKS) { expect(PIECES[a], a).toBeTruthy(); expect(PIECES[b], b).toBeTruthy(); expect(why.length).toBeGreaterThan(20) }
  })
  it('"built on" comes from what each solution really calls', () => {
    const { uses, usedBy } = pieceGraph(LESSONS)
    expect(uses.build_table).toEqual(expect.arrayContaining(['legal_moves', 'move_chances']))
    expect(uses.build_table).not.toContain('parse_map')
    expect(usedBy.legal_moves).toEqual(expect.arrayContaining(['build_table', 'steps_to_goal']))
    expect(uses.train).toEqual(expect.arrayContaining(['choose', 'q_update', 'sample_outcome']))
    expect(uses.parse_map).toEqual([])
  })
  it('marks yours and this lesson\'s pieces, and explains a piece when clicked', () => {
    render(<PuzzleBoard lessons={LESSONS} mine={{ parse_map: 'def parse_map(t): ...' }} here="moves" doneLessons={['maps']} />)
    const board = screen.getByRole('region', { name: 'The puzzle board' })
    expect(within(board).getByRole('button', { name: /parse_map/ }).className).toContain('mine')
    expect(within(board).getAllByRole('button', { name: /^move_chances$/ })[0].className).toContain('here')
    fireEvent.click(within(board).getAllByRole('button', { name: /^legal_moves$/ })[0])
    expect(within(board).getByText(/def legal_moves\(maze, cell\)/)).toBeTruthy()
    expect(within(board).getAllByRole('button', { name: 'build_table' }).length).toBeGreaterThan(0)
    expect(board.querySelector('.mlf-board-head').textContent).toMatch(/1 of \d+ pieces written by you/)
    fireEvent.click(within(board).getAllByRole('button', { name: /^sweep_values$/ })[0])
    expect(within(board).getByText(/lends an idea to/)).toBeTruthy()
  })
  it('shows in a lesson\'s Keep stage and as its own page', () => {
    localStorage.setItem(STORE, JSON.stringify({ moves: { stages: { try: true }, checks: [], code: {} } }))
    render(<Lab />)
    fireEvent.click(screen.getAllByRole('button').find(b => b.className.includes('mlf-nav') && b.textContent.includes('What a move does')))
    fireEvent.click(screen.getAllByRole('button').find(b => b.className.includes('mlf-stage') && b.textContent.includes('Keep')))
    expect(screen.getByRole('region', { name: 'The puzzle board' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /The puzzle board: how every piece fits/ }))
    expect(screen.getByRole('heading', { name: 'The puzzle board' })).toBeTruthy()
    expect(screen.getByText(/Where the ideas meet/)).toBeTruthy()
  })
})
