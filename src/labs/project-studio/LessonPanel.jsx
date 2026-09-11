// LessonPanel.jsx
// The current step: prose, the diffed target code, and the explanation.
// Prose/explanation go through MarkdownProse (the same renderer the
// courses use), so bold/inline-code/lists all behave as they do elsewhere.
import MarkdownProse from '../../components/math/MarkdownProse.jsx';
import DiffBlock from './DiffBlock.jsx';

// MarkdownProse defaults to article typography — large serif body text with
// generous leading, which is right for a full-width lesson page and far too
// big for a ~420px side panel next to an editor (a single paragraph filled
// half the panel). Same override technique Callout.jsx uses.
const COMPACT_PROSE =
  '[&_p]:text-[13px] [&_p]:leading-[1.65] [&_p]:font-sans [&_p]:my-2 ' +
  '[&_li]:text-[13px] [&_li]:leading-[1.6] [&_li]:font-sans ' +
  '[&_ul]:my-2 [&_ol]:my-2 [&_code]:text-[12px] ' +
  '[&_h3]:text-[13px] [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-sans ' +
  '[&_strong]:font-semibold';

export default function LessonPanel({
  lesson, lessons, stepIndex, step, currentContent,
  onPrev, onNext, onSelectLesson, C,
}) {
  const atFirst = stepIndex === 0;
  const atLast = stepIndex >= lesson.steps.length - 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, overflow: 'hidden', background: C.surface }}>
      <div style={{ padding: '6px 10px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 6, alignItems: 'center' }}>
        <select
          value={lesson.id}
          onChange={(e) => onSelectLesson(e.target.value)}
          style={{
            flex: 1, minWidth: 0, fontSize: 11, padding: '3px 6px', borderRadius: 5,
            background: C.surface2, color: C.text, border: `1px solid ${C.border}`,
          }}
        >
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>{l.title}</option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.blue, marginBottom: 4 }}>
          Step {stepIndex + 1} of {lesson.steps.length}
        </div>
        <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.35 }}>
          {step.title}
        </h3>

        {step.prose && (
          <div style={{ color: C.text }}>
            <MarkdownProse text={step.prose} className={COMPACT_PROSE} />
          </div>
        )}

        {step.target != null && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.muted, marginTop: 12 }}>
              {step.file}
            </div>
            <DiffBlock current={currentContent} target={step.target} C={C} />
          </>
        )}

        {step.explain && (
          <div style={{ marginTop: 8, color: C.text }}>
            <MarkdownProse text={step.explain} className={COMPACT_PROSE} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '8px 10px', borderTop: `1px solid ${C.border}` }}>
        <button onClick={onPrev} disabled={atFirst} style={navBtn(C, atFirst)}>← Back</button>
        <button onClick={onNext} disabled={atLast} style={navBtn(C, atLast, true)}>Next step →</button>
      </div>
    </div>
  );
}

function navBtn(C, disabled, primary) {
  return {
    flex: 1,
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 10px',
    borderRadius: 6,
    cursor: disabled ? 'default' : 'pointer',
    border: primary ? 'none' : `1px solid ${C.border}`,
    background: primary ? C.teal : 'transparent',
    color: primary ? '#fff' : C.text,
    opacity: disabled ? 0.35 : 1,
  };
}
