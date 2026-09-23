import React, { useMemo, useState } from 'react'
import { splitCorpus, fit, explain, accuracy, tokenize } from './engine.js'
import { Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Controls, Metrics, Caption, Insight, Table, Actions } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

const EXAMPLES = ['database timeout error on checkout', 'deployed version 2.5 to staging', 'backup completed with disk error', 'error error error error error', 'scheduled maintenance for payment service']

export default function Playground() {
  const [text, setText] = useState(EXAMPLES[0]), [alpha, setAlpha] = useState(1), [seed, setSeed] = useState(1)
  const data = useMemo(() => splitCorpus(seed), [seed])
  const model = useMemo(() => fit(data.train, alpha), [data, alpha])
  const ex = explain(model, text)
  const trainAcc = accuracy(model, data.train), valAcc = accuracy(model, data.validation)
  const top = useMemo(() => [...model.vocab].map(w => ({ label: w, value: model.logLik(1, w) - model.logLik(0, w) })).sort((a, b) => b.value - a.value), [model])
  return <>
    <PanelHeading title="Every word casts a weighted vote." pill={`P(incident) = ${pct(ex.p)}`} />
    <Caption>{`${data.train.length} labeled operations messages train the model (incident vs routine); ${data.validation.length} are held out. The vocabulary — ${model.V} words — is learned from training messages only.`}</Caption>
    <label className="ml-reflection">Type a message to classify<textarea aria-label="Message to classify" value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 60 }} /></label>
    <Actions>{EXAMPLES.map(e => <button key={e} onClick={() => setText(e)}>{e}</button>)}</Actions>
    <Controls>
      <Slider label="Laplace smoothing α" value={alpha} min={0.01} max={5} step={0.01} onChange={setAlpha} format={v => v.toFixed(2)} />
      <label>Split seed<input type="number" min="0" max="99999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(99999, Math.trunc(+e.target.value))))} /></label>
    </Controls>
    <Bars label="Log-likelihood ratio contributed by each token" format={v => (v >= 0 ? '+' : '') + v.toFixed(2)} items={[{ label: 'prior log-odds', value: ex.prior, color: 'var(--muted)' }, ...ex.rows.map(r => ({ label: r.known ? r.word : `${r.word} (unseen)`, value: r.contribution }))]} />
    <Metrics items={[['Total log-odds', fmt(ex.logOdds, 3)], ['P(incident | words)', pct(ex.p)], ['Validation accuracy', pct(valAcc)], ['Training accuracy', pct(trainAcc)]]} />
    <Table head={['token', 'count in incidents', 'count in routine', 'log P(w|inc) − log P(w|rout)']} rows={ex.rows.map(r => [r.word, r.known ? r.c1 : '—', r.known ? r.c0 : '—', r.known ? fmt(r.contribution, 3) : 'not in training vocabulary: ignored'])} caption={`Incident messages contain ${model.totals[1]} training tokens, routine ${model.totals[0]}. Each probability is (count + α) / (class total + α·${model.V}).`} />
    <Insight title="Try this">
      <ul>
        <li>Type “error error error error error”. Each repetition adds the same evidence again, as if five independent witnesses agreed. Naive Bayes assumes words are independent given the class — and becomes wildly overconfident when they are not.</li>
        <li>Set α near 0.01: words seen in only one class now carry enormous weight (their probability in the other class is almost zero). Raise α and the extremes shrink.</li>
        <li>“backup completed with disk error” mixes routine and incident words. Read the bars to see which side wins and by how much.</li>
      </ul>
    </Insight>
    <details><summary>Most indicative words in the training vocabulary</summary>
      <div className="ml-grid-2">
        <Bars label="Most incident-like words" format={v => v.toFixed(2)} items={top.slice(0, 10)} width={420} />
        <Bars label="Most routine-like words" format={v => v.toFixed(2)} items={top.slice(-10).reverse()} width={420} />
      </div>
    </details>
    <p className="ml-caption">Tokens: {tokenize(text).join(' · ') || '(none)'}</p>
  </>
}
