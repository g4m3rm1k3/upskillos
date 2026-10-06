// LessonPanel.jsx
// The current step: prose, the diffed target code, the explanation, and the step's checks.
// Prose/explanation go through MarkdownProse (the same renderer the
// courses use), so bold/inline-code/lists all behave as they do elsewhere.
import MarkdownProse from '../../components/math/MarkdownProse.jsx';
import DiffBlock from './DiffBlock.jsx';
import './LessonPanel.css';
import PredictionBox from './PredictionBox.jsx';
import LessonCompanions from './LessonCompanions.jsx';
import HintLadder from './HintLadder.jsx';
import FigureBlock from './FigureBlock.jsx';
import { BLOCK_SPLIT } from './hints.js';
import { checkEvidence, checksPassed } from './checkEvidence.js';

// MarkdownProse defaults to article typography — large serif body text with
// generous leading, which is right for a full-width lesson page and far too
// big for a ~420px side panel next to an editor (a single paragraph filled
// half the panel). Same override technique Callout.jsx uses.
const COMPACT_PROSE =
  '[&_p]:text-[13px] [&_p]:leading-[1.65] [&_p]:font-sans [&_p]:my-2 ' +
  '[&_li]:text-[13px] [&_li]:leading-[1.6] [&_li]:font-sans ' +
  '[&_ul]:my-2 [&_ol]:my-2 [&_code]:text-[12px] ' +
  '[&_h3]:text-[13px] [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-sans ' +
  '[&_strong]:font-semibold [&_table]:text-[12px] ' +
  // Terminal transcripts are wide; at article size they overflow a side panel.
  '[&_pre]:text-[11.5px] [&_pre_code]:text-[11.5px] [&_pre]:my-3 [&_pre]:p-3 [&_pre]:leading-[1.45]';

export default function LessonPanel({
  lesson, lessons, stepIndex, step, currentContent,
  onPrev, onNext, onSelectLesson, C,
  checkState, onCheck, canCheck, isStepDone, isLessonDone,
  onCreateProvided, providedError,
  continuationLabel, onContinue, seriesNote, seriesLessons,
  onSelectStep, onDefer, challengeStatus, isCovered, onCover,
}) {
  const atFirst = stepIndex === 0;
  const atLast = stepIndex >= lesson.steps.length - 1;
  const hasChecks = step.checks?.length > 0;

  const challenges = lessons.flatMap(l => l.steps.flatMap((s, index) => s.optional ? [{ lesson: l, step: s, index }] : []));
  const checkableChallenges = challenges.filter(({ step: s }) => s.checks?.length);
  const teaching = lessons.flatMap(l => l.steps.filter(s => !s.optional));

  return (
    <div className="project-studio-lesson" style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, overflow: 'hidden', background: C.surface }}>
      <div style={{ padding: '6px 10px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 6, alignItems: 'center' }}>
        <select
          aria-label="Lesson"
          value={lesson.id}
          onChange={(e) => onSelectLesson(e.target.value)}
          style={{
            flex: 1, minWidth: 0, fontSize: 11, padding: '3px 6px', borderRadius: 5,
            background: C.surface2, color: C.text, border: `1px solid ${C.border}`,
          }}
        >
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>{isLessonDone?.(l) ? '✓ ' : ''}{l.title}</option>
          ))}
        </select>
      </div>

      {lesson.meta?.pedagogy === 'typed' && (
        <div style={{ padding: '8px 12px', fontSize: 12, borderBottom: `1px solid ${C.border}` }}>
          <p style={{ margin: '0 0 6px' }}>Material covered: {teaching.filter(s => isCovered?.(s.id)).length}/{teaching.length} steps.
            {' '}Challenge checks passed: {checkableChallenges.filter(({ step: s }) => challengeStatus?.(s.id) === 'passed').length}/{checkableChallenges.length}.</p>
          <details><summary>Practice to revisit · optional challenges</summary>
            {challenges.map(({ lesson: l, step: s, index }) => (
              <button key={s.id} onClick={() => onSelectStep?.(l.id, index)}
                style={{ display: 'block', margin: '5px 0', color: C.text, background: C.surface2, border: `1px solid ${C.border}`, textAlign: 'left' }}>
                {l.title}: {s.title} — {challengeStatus?.(s.id) || 'not attempted'}
              </button>
            ))}
          </details>
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {atFirst && <LessonCompanions lesson={lesson} seriesLessons={seriesLessons} isStepDone={isStepDone} C={C} />}
        {atFirst && lesson.intro && (
          <div style={{ color: C.text, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
            <MarkdownProse text={lesson.intro} className={COMPACT_PROSE} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {lesson.steps.map((s, i) => (
            <span
              key={s.id}
              title={s.title}
              style={{
                width: 18, height: 4, borderRadius: 2,
                background: isStepDone?.(s) ? C.teal : i === stepIndex ? C.blue : C.border,
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.blue, marginBottom: 4 }}>
          Step {stepIndex + 1} of {lesson.steps.length}
        </div>
        <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.35 }}>
          {step.title}
        </h3>

        {step.optional && <div style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 6 }}>
          <strong>Optional challenge · {challengeStatus?.(step.id) || 'not attempted'}</strong>
          <p>Continue whenever you choose. Deferring does not mark this challenge as passed; return through Practice to revisit.</p>
          <button onClick={onDefer} style={navBtn(C, false)}>Defer and continue →</button>
        </div>}
        {step.edit && <p style={{ fontSize: 12, color: C.hint }}>Type in <code>{step.file}</code>. {step.edit.mode === 'append' ? 'Add the fragment at the end of the file.' : 'Replace the file contents with this small revision.'} Your editor is never filled for you.</p>}
        {lesson.meta?.reference === 'optional' && step.file && (
          <div style={{ padding: '6px 8px', marginBottom: 8, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.text }}>
            {step.provided ? `Create and read the supplied ${step.file}; no code edits in this step.` : `Edit ${step.file}; change only the lines described below.`}
          </div>
        )}

        {step.provided && (
          <div style={{ margin: '8px 0', fontSize: 12 }}>
            <button onClick={onCreateProvided} disabled={!canCheck}
              style={navBtn(C, !canCheck, true)}>
              {lesson.meta?.starterLabel || `Create provided ${step.file}`}
            </button>
            {providedError && <p role="alert">{providedError}</p>}
          </div>
        )}


        {step.prose && (
          <div style={{ color: C.text }}>
            <StepText text={step.prose} step={step} C={C} />
          </div>
        )}

        {step.target != null && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.muted, marginTop: 12 }}>
              {step.file}
            </div>
            {lesson.meta?.reference === 'optional' ? (
              <details style={{ margin: '8px 0', fontSize: 12 }}>
                <summary style={{ cursor: 'pointer', color: C.hint }}>Full reference file (optional)</summary>
                <DiffBlock current={currentContent} target={step.target} C={C} />
              </details>
            ) : <DiffBlock current={currentContent} target={step.target} C={C} />}
          </>
        )}

        {step.explain && (
          <div style={{ marginTop: 8, color: C.text }}>
            <StepText text={step.explain} step={step} C={C} />
          </div>
        )}

        {hasChecks && (
          <ChecksBox step={step} state={checkState} onCheck={onCheck} canCheck={canCheck} C={C} />
        )}
        {lesson.meta?.pedagogy === 'typed' && !step.optional && <button onClick={onCover} style={navBtn(C, false)}>{isCovered?.(step.id) ? 'Material covered' : 'Mark material covered'}</button>}
        {atLast && seriesNote && <p style={{ fontSize: 12, color: C.hint }}>{seriesNote}</p>}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '8px 10px', borderTop: `1px solid ${C.border}` }}>
        <button onClick={onPrev} disabled={atFirst} style={navBtn(C, atFirst)}>← Back</button>
        {atLast && continuationLabel
          ? <button onClick={onContinue} style={navBtn(C, false, true)}>{continuationLabel} →</button>
          : <button onClick={onNext} disabled={atLast} style={navBtn(C, atLast, true)}>Next step →</button>}
      </div>
    </div>
  );
}

// Step prose with its prediction checkpoints (```predict fences), hint ladders (```hints
// fences) and interactive figures (```figure fences) in the places they were written.
function StepText({ text, step, C }) {
  const parts = text.split(BLOCK_SPLIT);
  const out = [];
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i].trim()) out.push(<MarkdownProse key={i} text={parts[i]} className={COMPACT_PROSE} />);
    if (i + 2 >= parts.length) break;
    const kind = parts[i + 1];
    const index = Number(parts[i + 2]);
    const id = `${step.id}-${kind}-${index}`;
    if (kind === 'predict' && step.predictions?.[index]) {
      out.push(<PredictionBox key={id} id={id} prediction={step.predictions[index]} C={C} proseClass={COMPACT_PROSE} />);
    } else if (kind === 'hints' && step.hints?.[index]) {
      out.push(<HintLadder key={id} id={id} hints={step.hints[index]} C={C} proseClass={COMPACT_PROSE} />);
    } else if (kind === 'figure' && step.figures?.[index]) {
      out.push(<FigureBlock key={id} figure={step.figures[index]} proseClass={COMPACT_PROSE} />);
    }
  }
  return out;
}

function ChecksBox({ step, state, onCheck, canCheck, C }) {
  const running = state?.running;
  const results = state?.results;
  const allPass = checksPassed(step.checks, results);

  return (
    <div style={{ marginTop: 14, border: `1px solid ${allPass ? C.teal : C.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: allPass ? C.teal : C.muted }}>
          {allPass ? '✓ Listed checks passed' : 'When you have done this step'}
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={onCheck}
          disabled={running || !canCheck}
          title={canCheck ? 'Look at your project folder and check this step' : 'Checks run in the desktop app'}
          style={{
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 5, border: 'none',
            background: C.teal, color: '#fff', cursor: running || !canCheck ? 'default' : 'pointer', opacity: running || !canCheck ? 0.5 : 1,
          }}
        >
          {running ? 'Checking…' : 'Check my work'}
        </button>
      </div>
      <details style={{ padding: '6px 10px', fontSize: 12 }}>
        <summary>What these checks establish</summary>
        {checkEvidence(step.checks).map(text => <p key={text}>{text}</p>)}
      </details>
      <ul style={{ listStyle: 'none', margin: 0, padding: '6px 10px' }}>
        {step.checks.map((check, i) => {
          const r = results?.[i];
          const mark = !r || r.skipped ? '○' : r.pass ? '✓' : '✗';
          const color = !r || r.skipped ? C.hint : r.pass ? C.teal : C.red ?? '#ef4444';
          return (
            <li key={i} style={{ fontSize: 12, lineHeight: 1.5, padding: '3px 0', color: C.text }}>
              <span style={{ color, fontWeight: 700, display: 'inline-block', width: 16 }}>{mark}</span>
              <MarkdownInline text={check.label} />
              {r?.skipped && <span style={{ color: C.hint }}> (not checked on this computer)</span>}
              {r && !r.pass && r.detail && (
                <pre style={{ margin: '4px 0 2px 16px', padding: '6px 8px', fontSize: 11, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: C.surface2, borderRadius: 5, color: C.text }}>
                  {r.detail}
                </pre>
              )}
              {r && !r.pass && check.hint && (
                <div style={{ margin: '2px 0 0 16px', fontSize: 12, color: C.hint }}>{check.hint}</div>
              )}
            </li>
          );
        })}
      </ul>
      {state?.error && <div style={{ padding: '0 10px 8px', fontSize: 12, color: C.amber }}>{state.error}</div>}
    </div>
  );
}

// Check labels use `backticks` for commands; render just that, without a full Markdown pass.
function MarkdownInline({ text }) {
  const parts = String(text).split(/(`[^`]+`)/g);
  return (
    <span>
      {parts.map((p, i) => (p.startsWith('`') && p.endsWith('`') && p.length > 1
        ? <code key={i} style={{ fontSize: 11 }}>{p.slice(1, -1)}</code>
        : <span key={i}>{p}</span>))}
    </span>
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
