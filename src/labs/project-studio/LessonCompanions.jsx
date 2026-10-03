// LessonCompanions.jsx
// Above a lesson's first step, for lessons that declare `concepts:` (the ml-* tracks): the same
// idea in the two other places this app teaches it, and how far the learner's demonstrated work
// has got with each concept. The links are ordinary in-app links (#/lab/...), which
// InAppLinks.jsx turns into router navigation, so the notebook or lab opens over the studio.
import { conceptMastery, lessonCompanions } from './mlCurriculum.js';

function Bar({ done, total, C }) {
  const share = total ? done / total : 0;
  return (
    <span aria-hidden="true" style={{ display: 'inline-block', width: 60, height: 5, borderRadius: 3, background: C.border, overflow: 'hidden', verticalAlign: 'middle' }}>
      <span style={{ display: 'block', width: `${share * 100}%`, height: '100%', background: C.teal }} />
    </span>
  );
}

export default function LessonCompanions({ lesson, seriesLessons = [], isStepDone, C }) {
  const { concepts, revisits, notebooks, labs } = lessonCompanions(lesson);
  if (!concepts.length && !notebooks.length && !labs.length) return null;
  const mastery = conceptMastery(seriesLessons, (step) => !!isStepDone?.(step));
  const label = { fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.muted, margin: '0 0 4px' };
  const link = { color: C.blue, textDecoration: 'underline' };

  return (
    <section aria-label="Concepts and companions" style={{ fontSize: 12, color: C.text, margin: '0 0 12px', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 6 }}>
      {concepts.length > 0 && (
        <>
          <p style={label}>Concepts you will demonstrate</p>
          <ul style={{ listStyle: 'none', margin: '0 0 8px', padding: 0 }}>
            {concepts.map(({ id, label: name }) => {
              const m = mastery[id] ?? { done: 0, total: 0 };
              return (
                <li key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
                  <span style={{ flex: 1 }}>{name}</span>
                  <Bar done={m.done} total={m.total} C={C} />
                  <span style={{ color: C.muted, minWidth: 34, textAlign: 'right' }} title="Checked steps passed, across every lesson that teaches this concept">{m.done}/{m.total}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {revisits.length > 0 && (
        <p style={{ margin: '0 0 8px', color: C.hint }}>Comes back: {revisits.map((r) => r.label).join(', ')}</p>
      )}
      {(notebooks.length > 0 || labs.length > 0) && (
        <>
          <p style={label}>Learn it three ways</p>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>Explanation and project: this lesson</li>
            {notebooks.map((n) => <li key={n.id}>Notebook: <a href={n.href} style={link}>{n.title}</a></li>)}
            {labs.map((l) => <li key={l.number}>Lab: <a href={l.href} style={link}>ML Lab {l.number} · {l.title}</a></li>)}
          </ul>
        </>
      )}
    </section>
  );
}
