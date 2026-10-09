import styles from "./HtmlLab.module.css";
import PageSettingsControl from "./PageSettingsControl";
import type { LessonStep, ValidationResult } from "./lessons/lessonTypes";

// Lesson copy is written with backtick-quoted code terms (`<header>`,
// `count % 2`) the same way a markdown doc would be — this renders those
// spans as real inline code instead of showing the literal backtick
// characters as plain text.
function withInlineCode(text: string): React.ReactNode {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 1
      ? <code key={i} className={styles.inlineCode}>{part.slice(1, -1)}</code>
      : part,
  );
}

interface Props {
  lessonTitle: string;
  stepIndex: number;
  stepCount: number;
  step: LessonStep;
  previewMode: boolean;
  onTogglePreview: () => void;
  canAdvance: boolean;
  checking: boolean;
  checkResult: ValidationResult | null;
  showHint: boolean;
  onCheck: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onRestart: () => void;
  onShowHint: () => void;
  onSkipToSolution: () => void;
  onBack?: () => void;
  isPlaying: boolean;
  isPaused: boolean;
  playbackCaption?: string;
  onPausePlayback: () => void;
  onSkipPlayback: () => void;
  onReplay: () => void;
  pageTitle: string;
  faviconUrl: string;
  onChangePageMeta: (next: { pageTitle?: string; faviconUrl?: string }) => void;
}

export default function LessonToolbar({
  lessonTitle,
  stepIndex,
  stepCount,
  step,
  previewMode,
  onTogglePreview,
  canAdvance,
  checking,
  checkResult,
  showHint,
  onCheck,
  onNext,
  onPrevious,
  onRestart,
  onShowHint,
  onSkipToSolution,
  onBack,
  isPlaying,
  isPaused,
  playbackCaption,
  onPausePlayback,
  onSkipPlayback,
  onReplay,
  pageTitle,
  faviconUrl,
  onChangePageMeta,
}: Props) {
  const isLastStep = stepIndex === stepCount - 1;
  const isFirstStep = stepIndex === 0;

  return (
    <>
      <div className={styles.toolbar}>
        {onBack && (
          <button className={styles.backBtn} onClick={onBack} title="Back to the lesson list">
            ← Lessons
          </button>
        )}
        <button className={styles.tbBtn} onClick={onRestart} disabled={isPlaying} title="Start this lesson over from step 1">
          ⟲ Restart
        </button>
        <span className={styles.toolbarLogo}>{lessonTitle}</span>
        {isPlaying ? (
          <span className={styles.lessonProgress}>● Building…</span>
        ) : (
          <span className={styles.lessonProgress}>Step {stepIndex + 1} of {stepCount}</span>
        )}
        <div className={styles.toolbarSep} />

        {isPlaying ? (
          <>
            <button className={styles.tbBtn} onClick={onPausePlayback}>
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button className={styles.tbBtn} onClick={onSkipPlayback} title="Jump to the finished result">
              ⏭ Skip
            </button>
          </>
        ) : (
          <button className={styles.tbBtn} onClick={onReplay} title="Watch this step get built again">
            ↻ Replay build
          </button>
        )}

        <button
          className={`${styles.tbBtn} ${previewMode ? styles.tbBtnGoEdit : styles.tbBtnGoPreview}`}
          onClick={onTogglePreview}
          disabled={isPlaying}
          title={previewMode ? "Inspect elements" : "Interact with the live page"}
        >
          {previewMode ? "✎ Inspect" : "▶ Interact"}
        </button>

        <PageSettingsControl pageTitle={pageTitle} faviconUrl={faviconUrl} onChange={onChangePageMeta} />
      </div>

      <div className={styles.lessonBanner}>
        <div className={styles.lessonBannerText}>
          <div className={styles.lessonStepTitle}>📘 {step.title}</div>
          {isPlaying && playbackCaption && (
            <p className={styles.lessonPlaybackCaption}>● Right now: {playbackCaption}</p>
          )}
          <p className={styles.lessonInstructions}>{withInlineCode(step.instructions)}</p>

          {showHint && step.hint && (
            <div className={styles.lessonHint}>💡 {withInlineCode(step.hint)}</div>
          )}

          {checkResult && (
            <div className={checkResult.passed ? styles.lessonFeedbackPass : styles.lessonFeedbackFail}>
              {checkResult.passed ? "✓ " : "✗ "}
              {checkResult.passed ? "Correct!" : "Not quite:"}
              {!checkResult.passed && (
                <ul className={styles.lessonFeedbackList}>
                  {checkResult.feedback.map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className={styles.lessonActions}>
          {step.isChallenge && !checkResult?.passed && (
            <>
              <button className={styles.tbBtn} onClick={onShowHint} disabled={isPlaying || !step.hint || showHint}>
                💡 Hint
              </button>
              <button className={`${styles.tbBtn} ${styles.tbBtnDanger}`} onClick={onSkipToSolution} disabled={isPlaying}>
                Skip to solution
              </button>
              <button className={`${styles.tbBtn} ${styles.tbBtnGoPreview}`} onClick={onCheck} disabled={isPlaying || checking}>
                {checking ? "Checking…" : "Check"}
              </button>
            </>
          )}
          <button
            className={styles.tbBtn}
            onClick={onPrevious}
            disabled={isPlaying || isFirstStep}
            title={isFirstStep ? "This is the first step" : "Go back to the previous step"}
          >
            ← Previous
          </button>
          <button
            className={`${styles.tbBtn} ${styles.tbBtnGoEdit}`}
            onClick={onNext}
            disabled={!canAdvance || isLastStep}
            title={isLastStep ? "This is the last step" : undefined}
          >
            {isLastStep ? "Lesson complete" : "Next →"}
          </button>
        </div>
      </div>
    </>
  );
}
