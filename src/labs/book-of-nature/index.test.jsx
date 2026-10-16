// @vitest-environment happy-dom
import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Lab from './index'
import { moments } from './registry'

afterEach(cleanup)

const answer = (label, value, button) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value: String(value) } })
  fireEvent.click(screen.getAllByText(button).at(-1))
}

const selectMoment = id => fireEvent.change(screen.getByLabelText('Moment'), { target: { value: id } })

describe('Book of Nature', () => {
  it('has unique moment ids', () => {
    const ids = moments.map(m => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('pairs sheep with pebbles and leaves one pebble over', () => {
    render(<Lab />)
    selectMoment('bon-shepherds-pebbles')
    fireEvent.click(screen.getByText("Let's find out"))
    for (let i = 1; i <= 9; i++) {
      fireEvent.click(screen.getByLabelText(`sheep ${i}`))
      fireEvent.click(screen.getByLabelText(`pebble ${i}`))
    }
    expect(screen.getByText(/one pebble is left with no sheep/)).toBeTruthy()
    fireEvent.click(screen.getByText('I see something'))
    fireEvent.click(screen.getByText("Can't tell without counting"))
    expect(screen.getByText(/You can tell, and you just saw why/)).toBeTruthy()
    for (let i = 0; i < 9; i++) fireEvent.click(screen.getByText('Say the next word'))
    expect(screen.getByText(/tied each sheep to a word/)).toBeTruthy()
    fireEvent.click(screen.getByText('Now you try'))
    answer('Your answer', 4, 'Check')
    expect(screen.getByText('Match things up')).toBeTruthy()
  })

  it('bundles marks and reads bundle counts as digits', () => {
    render(<Lab />)
    selectMoment('bon-notches-on-a-bone')
    fireEvent.click(screen.getByText("Let's find out"))
    fireEvent.click(screen.getByText('10'))
    expect(screen.getByTestId('bundle-readout').textContent).toBe('3 bundles of 10, and 7 loose.')
    fireEvent.click(screen.getByText('5'))
    fireEvent.click(screen.getByText('I see something'))
    answer('Your prediction', 12, 'Lock it in')
    expect(screen.getByText(/12 adds the counts/)).toBeTruthy()
    fireEvent.click(screen.getByText('Now you try'))
    answer('Your answer', 132, 'Check')
    expect(screen.getByText(/how it would read in tens/)).toBeTruthy()
    answer('Your answer', 42, 'Check')
    expect(screen.getByText('Group it')).toBeTruthy()
  })

  it('walks the odd-squares moment through all six beats', () => {
    render(<Lab />)
    selectMoment('bon-odd-squares')
    fireEvent.click(screen.getByText("Let's find out"))
    expect(screen.getByText('Add a few more rows first').disabled).toBe(true)
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByText(/Add the next odd number/))
    expect(screen.getAllByTestId('total').map(t => t.textContent)).toEqual(['1', '4', '9', '16'])

    fireEvent.click(screen.getByText('I see something'))
    answer('Your prediction', 19, 'Lock it in')
    expect(screen.getByText(/19 is the last number/)).toBeTruthy()

    fireEvent.click(screen.getByText('Rearrange the pebbles'))
    expect(screen.getByText(/turns the 3 × 3 square into a 4 × 4 square/)).toBeTruthy()

    fireEvent.click(screen.getByText('Now you try'))
    answer('Your answer', 9801, 'Check')
    expect(screen.getByText(/isn't the side of the square/)).toBeTruthy()
    answer('Your answer', 2500, 'Check')
    expect(screen.getByText(/Keep this/i)).toBeTruthy()
    expect(screen.getByText('Draw a picture')).toBeTruthy()
  })

  it('counts handshakes in small rooms, then by arrivals', () => {
    render(<Lab />)
    selectMoment('bon-handshakes')
    fireEvent.click(screen.getByText("Let's find out"))
    const shake = (x, y) => {
      fireEvent.click(screen.getByLabelText(`person ${x}`))
      fireEvent.click(screen.getByLabelText(`person ${y}`))
    }
    shake('A', 'B')
    fireEvent.click(screen.getByLabelText('3 people'))
    shake('A', 'B')
    shake('B', 'A')
    expect(screen.getByText('A and B have already shaken hands.')).toBeTruthy()
    shake('A', 'C')
    shake('B', 'C')
    fireEvent.click(screen.getByLabelText('4 people'))
    for (const [x, y] of [['A', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'C'], ['B', 'D'], ['C', 'D']]) shake(x, y)
    expect(screen.getAllByTestId('handshake-count').map(t => t.textContent)).toEqual(['1', '3', '6'])

    fireEvent.click(screen.getByText('I see something'))
    answer('Your prediction', 90, 'Lock it in')
    expect(screen.getByText(/90 counts every handshake twice/)).toBeTruthy()
    for (let i = 0; i < 9; i++) fireEvent.click(screen.getByText('Next person arrives'))
    expect(screen.getByTestId('arrivals-sum').textContent).toBe('0 + 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 = 45')

    fireEvent.click(screen.getByText('Now you try'))
    answer('Your answer', 6, 'Check')
    expect(screen.getByText(/counting the last one/)).toBeTruthy()
    answer('Your answer', 7, 'Check')
    expect(screen.getByText('Try a small case')).toBeTruthy()
  })

  it('pairs 1 to 10 into equal totals and doubles the staircase', () => {
    render(<Lab />)
    selectMoment('bon-adding-1-to-100')
    fireEvent.click(screen.getByText("Let's find out"))
    const pair = (x, y) => {
      fireEvent.click(screen.getByLabelText(`number ${x}`))
      fireEvent.click(screen.getByLabelText(`number ${y}`))
    }
    for (let i = 1; i <= 9; i += 2) pair(i, i + 1)
    expect(screen.getByText(/totals aren't all the same/)).toBeTruthy()
    expect(screen.getByText('Pair all ten so every pair has the same total').disabled).toBe(true)
    fireEvent.click(screen.getByText('Unpair them all'))
    for (let i = 1; i <= 5; i++) pair(i, 11 - i)
    expect(screen.getAllByTestId('pair-sum').map(t => t.textContent)).toEqual(['1 + 10 = 11', '2 + 9 = 11', '3 + 8 = 11', '4 + 7 = 11', '5 + 6 = 11'])

    fireEvent.click(screen.getByText('I see something'))
    answer('Your prediction', 10100, 'Lock it in')
    expect(screen.getByText(/50 pairs, not 100/)).toBeTruthy()
    fireEvent.click(screen.getByText('Add a flipped copy'))
    expect(screen.getByTestId('staircase-sum').textContent).toBe('1 + 2 + … + 10 = 10 × 11 ÷ 2 = 55')

    fireEvent.click(screen.getByText('Now you try'))
    answer('Your answer', 380, 'Check')
    expect(screen.getByText(/only half of it/)).toBeTruthy()
    answer('Your answer', 190, 'Check')
    expect(screen.getByText('Pair things off')).toBeTruthy()
  })

  it('shows two odd piles always make an even pile', () => {
    render(<Lab />)
    selectMoment('bon-odd-and-even-pebbles')
    fireEvent.click(screen.getByText("Let's find out"))
    const together = () => fireEvent.click(screen.getByText('Put them together'))
    together()
    fireEvent.click(screen.getByLabelText('more in Pile 1'))
    together()
    fireEvent.click(screen.getByLabelText('more in Pile 1'))
    together()
    expect(screen.getByText('Put three pairs of odd piles together').disabled).toBe(true)
    fireEvent.click(screen.getByLabelText('more in Pile 1'))
    together()
    expect(screen.getAllByTestId('together-parity').map(t => t.textContent)).toEqual([
      'odd + odd = even',
      'even + odd = odd',
      'odd + odd = even',
      'even + odd = odd',
    ])
    fireEvent.click(screen.getByLabelText('more in Pile 1'))
    together()

    fireEvent.click(screen.getByText('I see something'))
    fireEvent.click(screen.getByText("Can't know without checking them all"))
    expect(screen.getByText(/But you can know/)).toBeTruthy()
    fireEvent.click(screen.getByText('Push the piles together'))
    expect(screen.getByTestId('push-result').textContent).toMatch(/7 \+ 5 = 12 is even/)

    fireEvent.click(screen.getByText('Now you try'))
    answer('Your answer', 2, 'Check')
    expect(screen.getByText(/777 \+ 777 \+ 777/, { selector: 'p' })).toBeTruthy()
    answer('Your answer', 3, 'Check')
    expect(screen.getAllByText('Pair things off').length).toBeGreaterThan(0)
  })

  it('gets stuck on the broken board and finds the colour count', () => {
    render(<Lab />)
    selectMoment('bon-broken-chessboard')
    fireEvent.click(screen.getByText("Let's find out"))
    const lay = (a, b) => {
      fireEvent.click(screen.getByLabelText(`row ${a[0]}, column ${a[1]}`))
      fireEvent.click(screen.getByLabelText(`row ${b[0]}, column ${b[1]}`))
    }
    const rows = () => {
      for (const [a, b] of [[[1, 2], [1, 3]], [[2, 1], [2, 2]], [[2, 3], [2, 4]], [[3, 1], [3, 2]], [[3, 3], [3, 4]], [[4, 2], [4, 3]]]) lay(a, b)
    }
    lay([1, 2], [1, 4])
    expect(screen.getByText(/next to the highlighted one/)).toBeTruthy()
    fireEvent.click(screen.getByLabelText('row 1, column 4'))
    rows()
    expect(screen.getByTestId('domino-count').textContent).toBe('6')
    expect(screen.getByTestId('stuck').textContent).toMatch(/2 squares are left/)
    expect(screen.getByText('Try to cover the board at least twice').disabled).toBe(true)
    fireEvent.click(screen.getByText('Start again'))
    rows()

    fireEvent.click(screen.getByText('I see something'))
    fireEvent.click(screen.getByText('Yes: 62 squares, 31 dominoes'))
    expect(screen.getByText(/two light squares are always left over/)).toBeTruthy()
    fireEvent.click(screen.getByText('Paint it like a chessboard'))
    expect(screen.getByTestId('small-count').textContent).toMatch(/^6 dark squares, 8 light squares/)
    expect(screen.getByText(/still uncovered: 0 dark, 2 light/)).toBeTruthy()
    fireEvent.click(screen.getByText('Now the full chessboard'))
    expect(screen.getByTestId('big-count').textContent).toBe('30 dark squares, 32 light squares.')

    fireEvent.click(screen.getByText('Now you try'))
    answer('Your answer', 2, 'Check')
    expect(screen.getByText(/How many dark squares are missing here/)).toBeTruthy()
    answer('Your answer', 4, 'Check')
    expect(screen.getByText("Find what doesn't change")).toBeTruthy()
  })
  it('breaks the doubling pattern with six points on a circle', () => {
    render(<Lab />)
    selectMoment('bon-so-what-is-mathematics')
    fireEvent.click(screen.getByText("Let's find out"))
    fireEvent.click(screen.getByLabelText('piece 1'))
    fireEvent.click(screen.getByLabelText('piece 1'))
    expect(screen.queryAllByTestId('pieces-row')).toHaveLength(0)
    for (const [n, count] of [[2, 2], [3, 4], [4, 8], [5, 16]]) {
      fireEvent.click(screen.getByLabelText(`${n} points`))
      for (let i = 1; i <= count; i++) fireEvent.click(screen.getByLabelText(`piece ${i}`))
    }
    expect(screen.getAllByTestId('pieces-row').map(r => r.textContent)).toEqual(['2 points2 pieces', '3 points4 pieces', '4 points8 pieces', '5 points16 pieces'])

    fireEvent.click(screen.getByText('I see something'))
    answer('Your prediction', 32, 'Lock it in')
    expect(screen.getByText(/what the doubling says/)).toBeTruthy()
    fireEvent.click(screen.getByText('Draw the next chord'))
    expect(screen.getByTestId('pieces-total').textContent).toBe('2')
    fireEvent.click(screen.getByText('Draw them all'))
    expect(screen.getByTestId('pieces-total').textContent).toBe('31')
    expect(screen.getByText(/1 \+ 15 \+ 15 = 31/)).toBeTruthy()

    fireEvent.click(screen.getByText('Now you try'))
    answer('Your answer', 64, 'Check')
    expect(screen.getByText(/That is the doubling again/)).toBeTruthy()
    answer('Your answer', 57, 'Check')
    expect(screen.getByText(/Keep this/i)).toBeTruthy()
  })
})
