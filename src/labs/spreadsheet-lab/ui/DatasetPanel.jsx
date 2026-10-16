// About the sample dataset on this sheet: what it is, where it comes from,
// what its columns mean, and things to try with it, each done with a click
// so the result (a chart, a formula, a model in Python) can be studied.
// lessonTries: the exercises of the lessons that use this dataset (Data Science
// Studio's, for the shop's orders), each with the lesson's answer.
function TryList({ tries, onTry }) {
  return (
    <ul className="space-y-2">
      {tries.map((t) => (
        <li key={t.id ?? t.label} className="rounded-md border border-slate-200 p-2 dark:border-slate-700">
          <div className="flex items-start gap-2">
            <span className="min-w-0 flex-1 font-semibold text-slate-800 dark:text-slate-100">{t.label}</span>
            <button type="button" onClick={() => onTry(t)} className="shrink-0 rounded bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-sky-500">Do it</button>
          </div>
          <p className="mt-1 text-slate-600 dark:text-slate-300">{t.learn}</p>
        </li>
      ))}
    </ul>
  )
}

export default function DatasetPanel({ dataset, onTry, lessonTries = null }) {
  if (!dataset) return null
  return (
    <div className="space-y-4 px-4 py-3 text-xs">
      <section>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{dataset.title}</h3>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{dataset.summary}</p>
        <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">{dataset.origin}</p>
      </section>
      <section>
        <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">The columns</h3>
        <dl className="space-y-1">
          {dataset.columns.map(([name, meaning]) => (
            <div key={name}><dt className="font-semibold text-slate-800 dark:text-slate-100">{name}</dt><dd className="text-slate-600 dark:text-slate-300">{meaning}</dd></div>
          ))}
        </dl>
      </section>
      <section>
        <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Things to try</h3>
        <TryList tries={dataset.tries} onTry={onTry} />
        <p className="mt-2 text-[11px] text-slate-400">Each one adds something beside the data. Undo (Ctrl+Z) takes it away again.</p>
      </section>
      {lessonTries?.length > 0 && (
        <section>
          <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">From the lessons</h3>
          <TryList tries={lessonTries} onTry={onTry} />
          <p className="mt-2 text-[11px] text-slate-400">The spreadsheet exercises in Data Science Studio, each with the lesson's answer. The lesson derives why it works.</p>
        </section>
      )}
    </div>
  )
}
