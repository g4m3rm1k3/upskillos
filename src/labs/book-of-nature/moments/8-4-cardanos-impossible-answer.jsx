import React from 'react'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'

const sign = n => (n < 0 ? `(${n})`.replace('-', '−') : String(n))

function Play({ state, setState }) {
  const { d, tried } = state
  const set = v => setState({ d: v, tried: tried.includes(v) ? tried : [...tried, v] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Cardano&apos;s problem: split 10 into two parts that multiply to 40. As in 8.2, call the parts 5 + something
        and 5 − something. Their product is 25 − something × something. Search for a something that makes 40. Try
        debts too.
      </p>
      <Stepper label="something" value={d} min={-5} max={5} onChange={set} />
      <p className="mt-3 rounded-lg bg-slate-950 p-3 text-lg" data-testid="cardano-search">
        {sign(d)} × {sign(d)} = {d * d}, so the product is 25 − {d * d} = <strong className="text-amber-300">{25 - d * d}</strong>
      </p>
    </div>
  )
}

const Piece = ({ children, colour }) => (
  <td className="border border-slate-700 px-3 py-2 text-center" style={{ color: colour }}>
    {children}
  </td>
)

function Reveal() {
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        For 40, something × something would have to be −15, and 8.3 says no number does that. Cardano wrote the
        parts down anyway. Call the impossible something √−15, &quot;the number whose square is −15&quot;:
      </p>
      <p className="mb-3 text-center text-xl font-semibold text-amber-300">5 + √−15 and 5 − √−15</p>
      <p className="mb-2 text-lg">They add to 10: the √−15 and the −√−15 cancel. Now multiply them by parts.</p>
      <table className="mx-auto font-mono text-lg" data-testid="cardano-parts">
        <thead>
          <tr className="text-slate-400">
            <th className="px-3">×</th>
            <th className="px-3">5</th>
            <th className="px-3">−√−15</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th className="px-3 text-slate-400">5</th>
            <Piece colour={AMBER}>25</Piece>
            <Piece colour={SKY}>−5√−15</Piece>
          </tr>
          <tr>
            <th className="px-3 text-slate-400">√−15</th>
            <Piece colour={SKY}>+5√−15</Piece>
            <Piece colour={AMBER}>−(−15) = +15</Piece>
          </tr>
        </tbody>
      </table>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          The two blue pieces cancel. What is left is 25 + 15 = <strong>40</strong>. The impossible parts add to 10
          and multiply to 40, just as the problem asked.
        </p>
        <p className="text-slate-300">
          Cardano called this &quot;mental torture&quot;, and said the result was &quot;as subtle as it is
          useless&quot;. He set it aside. But he had followed the rules, and the rules had worked.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-cardanos-impossible-answer',
  order: '8.4',
  episodeNumber: 8,
  episode: 'Duels over the cubic',
  title: "Cardano's impossible answer",
  threads: ['Number'],
  rigor: 2,
  move: 'work-backwards',
  hook: (
    <p>
      In 1545 Gerolamo Cardano, a doctor and gambler in Milan, published the great algebra book of his age. In it he
      asked: split 10 into two parts that multiply to 40. You know from 8.2 that 25 is the most. What could he do?
    </p>
  ),
  initialState: { d: 0, tried: [0] },
  Play,
  playReady: state => state.tried.length >= 4 && state.tried.some(v => v < 0),
  playNotReady: 'Try four somethings, at least one a debt',
  predict: {
    question: (
      <p>
        Cardano wrote the parts as 5 + √−15 and 5 − √−15, where √−15 stands for a number whose square is −15. Using
        the rules anyway, what do the two parts multiply to?
      </p>
    ),
    response: guess => {
      if (guess === 40) return 'Yes, 40, exactly what was asked. Here are the four pieces.'
      if (guess === 10) return '10 is what they add to, and what 25 − 15 gives. But √−15 × √−15 is −15, so the product is 25 − (−15), and taking away a debt adds.'
      if (guess === 25) return 'Here 25 − (√−15 × √−15) is 25 − (−15), and taking away a debt adds (7.3). The answer is 40.'
      return `Not ${guess}. The product is 25 − (√−15 × √−15), and √−15 × √−15 is −15.`
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        Split 12 into two parts that multiply to 45. Cardano&apos;s way gives the parts 6 + √−? and 6 − √−?. What
        number goes after the minus sign?
      </p>
    ),
    answer: 9,
    praise: '6 × 6 = 36, and 36 − something × something = 45 means something × something = −9. The parts are 6 + √−9 and 6 − √−9.',
    hint: v =>
      v === 81
        ? 'That adds 45 and 36. The product is 36 − something × something; what makes it 45?'
        : v === 3
          ? 'Close: 3 × 3 = 9. The question asks for the number under the root, the square itself.'
          : 'Half of 12 is 6, and 6 × 6 = 36. The product is 36 − something × something. For 45, what must something × something be?',
    solution: 'The parts are 6 + something and 6 − something, and they multiply to 36 − something × something. For 45, something × something = 36 − 45 = −9. So the parts are 6 + √−9 and 6 − √−9.',
  },
  keep: 'Sometimes the rules lead to a number no one has seen, like √−15, whose square is a debt. Followed carefully, it still gives the right answers.',
  symbols: <p>(5 + √−15) × (5 − √−15) = 25 − (−15) = 40</p>,
  story: (
    <>
      <p>
        Cardano&apos;s book, the <em>Ars Magna</em>, was famous for something else: the first printed method for
        solving a <em>cubic</em>, a problem with three copies of an unknown multiplied together. Its history was a feud.
        Around 1515 Scipione del Ferro, in Bologna, found a method for one kind of cubic and kept it secret, telling only
        a student, Antonio Fior.
      </p>
      <p className="mt-2">
        In 1535 Fior challenged Niccolò Tartaglia to a public contest, 30 problems each. Tartaglia found the method
        himself just in time and solved all of Fior&apos;s problems; Fior solved few or none of his. In 1539 Cardano persuaded
        Tartaglia to tell him the method, Tartaglia says after swearing to keep it secret. After seeing del Ferro&apos;s
        notes, Cardano published it, crediting both men. Tartaglia was furious. In 1548 he faced Cardano&apos;s student Lodovico Ferrari in a public
        debate in Milan, and left the city after the first day.
      </p>
    </>
  ),
}
