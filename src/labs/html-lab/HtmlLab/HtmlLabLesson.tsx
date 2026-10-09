import { useState, useReducer, useCallback, useRef, useMemo, useEffect } from "react";
import LessonToolbar from "./LessonToolbar";
import LivePreview from "./LivePreview";
import { transpileBundle, hasJsx } from "./jsxTranspile";
import { buildJsBundle } from "./labReducer";
import { resolveCdnTags, reactCdnTags } from "./cdnLibraries";
import CodePanel from "./CodePanel";
import PropertiesPanel from "./PropertiesPanel";
import ConfirmDialog, { shouldSkip } from "./ConfirmDialog";
import TableBuilderModal from "./TableBuilderModal";
import { labReducer, initialState, mainJsCode } from "./labReducer";
import { detectComponents, buildThemeUpdates } from "./componentLibrary";
import {
  applyCssToElements,
  elementsToCss,
  elementsToHtml,
  htmlToElements,
  generateExportHtml,
} from "./htmlSync";
import { computeStateAtStep, computeSolvedStateAtStep, computeSolvedFoldAtStep, validateStructure, validateBehavior, validatePageMeta, type Fold } from "./lessons/lessonEngine";
import { buildPlaybackFrames, type PlaybackFrame } from "./lessons/stepPlayer";
import { lessonProgressKey } from "./lessons/lessonHelpers";
import type { Lesson, LessonPatch, ValidationResult } from "./lessons/lessonTypes";
import styles from "./HtmlLab.module.css";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — JS hooks file, no type declarations
import { useThemeColors } from "../../../hooks/useThemeColors.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — JS hooks file, no type declarations
import { useProgress } from "../../../hooks/useProgress.js";
import type { LabElement } from "./types";

interface Props {
  lesson: Lesson;
  onBack?: () => void;
}

interface ConfirmState {
  storageKey: string;
  message: string;
  resolve: (value: boolean) => void;
}

function appendJavascriptSnippet(current: string, snippet: string): string {
  const trimmed = current.trimEnd();
  if (trimmed.includes(snippet.trim())) return current;
  return `${trimmed}${trimmed ? "\n\n" : ""}${snippet}`;
}

// How long each revealed frame stays on screen before the next one plays —
// same pace whether it's one new element or one more line of typed code, so
// the whole "watch it build" sequence stays predictable regardless of how a
// step's patch happens to be shaped. Long enough to actually read the live
// caption next to each change, short enough not to drag.
const PLAYBACK_TICK_MS = 650;

interface PlaybackState {
  baseline: Fold;
  frames: PlaybackFrame[];
  index: number;
  paused: boolean;
}

function makePlayback(baseline: Fold, patch: LessonPatch): PlaybackState {
  return { baseline, frames: buildPlaybackFrames(baseline, patch), index: 0, paused: false };
}

function emptyFold(): Fold {
  return { state: { ...initialState }, blocks: new Map(), cssBlocks: new Map() };
}

function stepBaseline(lesson: Lesson, stepIndex: number): Fold {
  return stepIndex > 0 ? computeSolvedFoldAtStep(lesson, stepIndex - 1) : emptyFold();
}

export default function HtmlLabLesson({ lesson, onBack }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C: any = useThemeColors();
  const hlVars: Record<string, string> = {
    "--hl-bg":            C.bg,
    "--hl-surface":       C.surface,
    "--hl-surface2":      C.surface2,
    "--hl-border":        C.border,
    "--hl-text":          C.text,
    "--hl-muted":         C.muted,
    "--hl-hint":          C.hint,
    "--hl-accent":        C.blue,
    "--hl-accent-strong": C.blue,
    "--hl-accent-bg":     C.blueBg,
    "--hl-keyword":       C.teal,
    "--hl-string":        C.amber,
    "--hl-string-bg":     C.amberBg,
    "--hl-accent2":       C.purple,
    "--hl-accent2-bg":    C.purpleBg,
    "--hl-positive":      C.green,
    "--hl-positive-bg":   C.greenBg,
    "--hl-danger":        C.red,
    "--hl-danger-bg":     C.redBg,
    "--hl-canvas":        C.isDark ? C.canvasSurface : "#fafafa",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { progress, markCheckpoint, resetLessonProgress }: any = useProgress();
  const progressKey = lessonProgressKey(lesson.id);

  // Resume just past the furthest checkpoint reached in a prior visit —
  // computed once on mount, not reactive to later checkpoint updates (this
  // component drives its own stepIndex from there on).
  const initialStepIndex = useMemo(() => {
    const completed: string[] = progress?.[progressKey]?.completedCheckpoints ?? [];
    let idx = 0;
    for (let i = 0; i < lesson.steps.length; i++) {
      if (completed.includes(lesson.steps[i].id)) idx = Math.min(i + 1, lesson.steps.length - 1);
    }
    return idx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [stepIndex, setStepIndex] = useState<number>(initialStepIndex);

  // If the destination step was never completed in a prior visit, the very
  // first paint should start mid-build (frame 0) with playback already
  // queued up, rather than flashing the finished step and then "rewinding"
  // into an animation. A step already checkpointed before (the resume case)
  // gets today's behavior: land straight on the finished state, no replay.
  const initialPlayback = useMemo<PlaybackState | null>(() => {
    const completed: string[] = progress?.[progressKey]?.completedCheckpoints ?? [];
    if (completed.includes(lesson.steps[initialStepIndex].id)) return null;
    return makePlayback(stepBaseline(lesson, initialStepIndex), lesson.steps[initialStepIndex].patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [state, dispatch] = useReducer(labReducer, undefined, () => ({
    ...initialState,
    ...(initialPlayback ? initialPlayback.frames[0].state : computeStateAtStep(lesson, initialStepIndex)),
  }));
  const [playback, setPlayback] = useState<PlaybackState | null>(initialPlayback);
  const transpiledJs = useMemo(() => transpileBundle(buildJsBundle(state.jsFiles), state.jsFiles), [state.jsFiles]);
  const previewCdnTags = useMemo(() => [...resolveCdnTags(state.cdnLinks), ...(hasJsx(state.jsFiles) ? reactCdnTags() : [])], [state.jsFiles, state.cdnLinks]);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  // See HtmlLab.tsx's identical field for why this starts undefined, not 0.
  const [jsJumpToken, setJsJumpToken] = useState<number | undefined>(undefined);
  const bumpJsJumpToken = (): void => setJsJumpToken((token) => (token ?? 0) + 1);
  const [codePanelWidth, setCodePanelWidth]   = useState<number>(360);
  const [propsPanelWidth, setPropsPanelWidth] = useState<number>(280);
  const [showTableBuilder, setShowTableBuilder] = useState<boolean>(false);
  const [confirmDialog, setConfirmDialog]     = useState<ConfirmState | null>(null);
  const [checkResult, setCheckResult]         = useState<ValidationResult | null>(null);
  const [checking, setChecking]               = useState<boolean>(false);
  const [showHint, setShowHint]               = useState<boolean>(false);

  const step = lesson.steps[stepIndex];
  const isPlaying = playback !== null;
  const canAdvance = !isPlaying && (!step.isChallenge || checkResult?.passed === true);
  const revealedIds = playback ? playback.frames[playback.index]?.revealedIds ?? [] : [];
  const playbackCaption = playback ? playback.frames[playback.index]?.caption : undefined;
  const focusTab = useMemo((): "html" | "css" | "javascript" | undefined => {
    // Between the tick that advances `index` past the last frame and the
    // effect that notices and clears playback, one render sees an
    // out-of-bounds index — bail out rather than indexing into `frames`.
    if (!playback || playback.index >= playback.frames.length) return undefined;
    const prevJs = mainJsCode(playback.index === 0 ? playback.baseline.state.jsFiles : playback.frames[playback.index - 1].state.jsFiles);
    const prevCss = playback.index === 0 ? playback.baseline.state.customCss : playback.frames[playback.index - 1].state.customCss;
    const cur = playback.frames[playback.index].state;
    if (mainJsCode(cur.jsFiles) !== prevJs) return "javascript";
    if (cur.customCss !== prevCss) return "css";
    return "html";
  }, [playback]);

  const dividerDragging      = useRef<boolean>(false);
  const dividerStartX        = useRef<number>(0);
  const dividerStartW        = useRef<number>(0);
  const propsDividerDragging = useRef<boolean>(false);
  const propsDividerStartX   = useRef<number>(0);
  const propsDividerStartW   = useRef<number>(0);

  const askConfirm = useCallback((storageKey: string, message: string): Promise<boolean> => {
    if (shouldSkip(storageKey)) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({ storageKey, message, resolve });
    });
  }, []);

  // Reset happens ONLY here — moving to a step always replaces state wholesale
  // with that step's fully-defined content, regardless of what the student
  // built during free-play Edit time on the step they're leaving. Preview/
  // Edit toggling never touches state. A step reached for the first time
  // plays it into place frame by frame; a step the student has already
  // completed before (revisited via Next or the catalog) jumps straight to
  // its finished state, same as before this feature existed.
  const goToStep = useCallback((index: number): void => {
    const clamped = Math.max(0, Math.min(index, lesson.steps.length - 1));
    const baseline = stepBaseline(lesson, clamped);
    const targetStep = lesson.steps[clamped];
    const alreadySeen: string[] = progress?.[progressKey]?.completedCheckpoints ?? [];

    setStepIndex(clamped);
    setCheckResult(null);
    setShowHint(false);
    setMultiSelectedIds([]);

    if (alreadySeen.includes(targetStep.id)) {
      // Already completed before (including, for a challenge, already
      // passed) — show it SOLVED, not the raw/blank scaffold `.patch` would
      // give a challenge step arriving fresh.
      const next = computeSolvedFoldAtStep(lesson, clamped).state;
      dispatch({ type: "LOAD_EXAMPLE", payload: { elements: next.elements, bodyStyles: next.bodyStyles, jsFiles: next.jsFiles, customCss: next.customCss, pageTitle: next.pageTitle, faviconUrl: next.faviconUrl } });
      setPlayback(null);
    } else {
      setPlayback(makePlayback(baseline, targetStep.patch));
    }
  }, [lesson, progress, progressKey]);

  const handleNext = useCallback((): void => {
    markCheckpoint(progressKey, step.id);
    goToStep(stepIndex + 1);
  }, [markCheckpoint, progressKey, step, stepIndex, goToStep]);

  const handlePrevious = useCallback((): void => {
    goToStep(stepIndex - 1);
  }, [stepIndex, goToStep]);

  // Clears every checkpoint for this lesson and forces step 1 to replay from
  // scratch — deliberately bypasses goToStep's "already seen" check so
  // confirming Restart is never a silent no-op jump straight to the end of
  // step 1's build.
  const handleRestart = useCallback(async (): Promise<void> => {
    const ok = await askConfirm("restart_lesson", "Restart this lesson from step 1? Your progress on it will be cleared.");
    if (!ok) return;
    resetLessonProgress(progressKey);
    setStepIndex(0);
    setCheckResult(null);
    setShowHint(false);
    setMultiSelectedIds([]);
    setPlayback(makePlayback(stepBaseline(lesson, 0), lesson.steps[0].patch));
  }, [askConfirm, resetLessonProgress, progressKey, lesson]);

  const togglePausePlayback = useCallback((): void => {
    setPlayback((p) => (p ? { ...p, paused: !p.paused } : p));
  }, []);

  const skipPlayback = useCallback((): void => {
    setPlayback((p) => {
      if (!p) return p;
      const last = p.frames[p.frames.length - 1].state;
      dispatch({ type: "LOAD_EXAMPLE", payload: { elements: last.elements, bodyStyles: last.bodyStyles, jsFiles: last.jsFiles, customCss: last.customCss, pageTitle: last.pageTitle, faviconUrl: last.faviconUrl } });
      return null;
    });
  }, []);

  const replayCurrentStep = useCallback((): void => {
    setPlayback(makePlayback(stepBaseline(lesson, stepIndex), step.patch));
  }, [lesson, stepIndex, step]);

  // Drives the queued frames one at a time. Re-runs whenever `playback`
  // changes identity (a new index, or paused toggled) — each run dispatches
  // whatever frame is current (idempotent if nothing changed) and, unless
  // paused or finished, schedules the next tick.
  useEffect(() => {
    if (!playback) return;
    if (playback.index >= playback.frames.length) { setPlayback(null); return; }
    const frame = playback.frames[playback.index].state;
    dispatch({ type: "LOAD_EXAMPLE", payload: { elements: frame.elements, bodyStyles: frame.bodyStyles, jsFiles: frame.jsFiles, customCss: frame.customCss, pageTitle: frame.pageTitle, faviconUrl: frame.faviconUrl } });
    if (playback.paused) return;
    const timer = setTimeout(() => {
      setPlayback((p) => (p ? { ...p, index: p.index + 1 } : p));
    }, PLAYBACK_TICK_MS);
    return () => clearTimeout(timer);
  }, [playback]);

  const handleCheck = useCallback(async (): Promise<void> => {
    if (!step.isChallenge) return;
    setChecking(true);
    let result: ValidationResult;
    if (step.behavior) {
      result = await validateBehavior(state.elements, state.bodyStyles, state.customCss, mainJsCode(state.jsFiles), step.behavior);
    } else if (step.expected) {
      result = validateStructure(state.elements, step.expected);
    } else if (step.expectedPageTitle !== undefined || step.expectedFaviconUrl !== undefined) {
      result = validatePageMeta(state, step);
    } else {
      result = { passed: true, feedback: [] };
    }
    setChecking(false);
    setCheckResult(result);
    if (result.passed) markCheckpoint(progressKey, step.id);
  }, [step, state, progressKey, markCheckpoint]);

  const handleSkipToSolution = useCallback((): void => {
    const solved = computeSolvedStateAtStep(lesson, stepIndex);
    dispatch({ type: "LOAD_EXAMPLE", payload: { elements: solved.elements, bodyStyles: solved.bodyStyles, jsFiles: solved.jsFiles, customCss: solved.customCss, pageTitle: solved.pageTitle, faviconUrl: solved.faviconUrl } });
    markCheckpoint(progressKey, step.id);
    setCheckResult({ passed: true, feedback: ["Solution applied — take a look at how it's built, then continue."] });
  }, [lesson, stepIndex, step, progressKey, markCheckpoint]);

  const bodyIsDark = useMemo(() => {
    const bg = state.bodyStyles.backgroundColor || "";
    if (bg.startsWith("#") && bg.length === 7) {
      const r = parseInt(bg.slice(1, 3), 16);
      const g = parseInt(bg.slice(3, 5), 16);
      const b = parseInt(bg.slice(5, 7), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.35;
    }
    return false;
  }, [state.bodyStyles]);

  const matchedComponents = useMemo(() => {
    if (!state.selectedId) return [];
    return detectComponents(state.selectedId, state.elements);
  }, [state.selectedId, state.elements]);

  const multiElement = useMemo((): LabElement | null => {
    if (multiSelectedIds.length < 2) return null;
    const els = multiSelectedIds
      .map((id) => state.elements.find((e) => e.id === id))
      .filter((e): e is LabElement => e !== undefined);
    const allProps = [...new Set(els.flatMap((e) => Object.keys(e.styles || {})))];
    const sharedStyles: Record<string, string> = {};
    allProps.forEach((prop) => {
      const vals = els.map((e) => e.styles?.[prop]);
      if (vals.every((v) => v === vals[0] && v !== undefined)) sharedStyles[prop] = vals[0]!;
    });
    return { id: "__multi__", tag: "div", styles: sharedStyles, attrs: {}, content: "", parentId: null, mediaQueries: [] };
  }, [multiSelectedIds, state.elements]);

  const generatedCode = elementsToHtml(state.elements);
  const generatedCss  = elementsToCss(state.elements, state.customCss, state.bodyStyles);

  const selectedElement: LabElement = state.selectedId
    ? state.elements.find((e) => e.id === state.selectedId) ?? {
        id: "__body__", tag: "body", styles: state.bodyStyles, content: "",
        attrs: {}, mediaQueries: [], parentId: null,
      }
    : { id: "__body__", tag: "body", styles: state.bodyStyles, content: "",
        attrs: {}, mediaQueries: [], parentId: null };

  const handleCodeChange = useCallback((newCode: string): void => {
    const parsed = htmlToElements(newCode, state.elements, mainJsCode(state.jsFiles));
    if (parsed) dispatch({ type: "SET_FROM_CODE", payload: parsed });
  }, [state.elements, state.jsFiles]);

  const handleCssChange = useCallback((newCss: string): void => {
    const parsed = applyCssToElements(newCss, state.elements, mainJsCode(state.jsFiles));
    dispatch({ type: "SET_FROM_CSS", payload: parsed });
  }, [state.elements, state.jsFiles]);

  const handleDividerMouseDown = (e: React.MouseEvent): void => {
    dividerDragging.current = true;
    dividerStartX.current   = e.clientX;
    dividerStartW.current   = codePanelWidth;
    e.preventDefault();
    const onMouseMove = (ev: MouseEvent): void => {
      if (!dividerDragging.current) return;
      const delta = ev.clientX - dividerStartX.current;
      setCodePanelWidth(Math.max(200, Math.min(640, dividerStartW.current + delta)));
    };
    const onUp = (): void => {
      dividerDragging.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
  };

  const handlePropsDividerMouseDown = (e: React.MouseEvent): void => {
    propsDividerDragging.current = true;
    propsDividerStartX.current   = e.clientX;
    propsDividerStartW.current   = propsPanelWidth;
    e.preventDefault();
    const onMouseMove = (ev: MouseEvent): void => {
      if (!propsDividerDragging.current) return;
      const delta = propsDividerStartX.current - ev.clientX;
      setPropsPanelWidth(Math.max(200, Math.min(560, propsDividerStartW.current + delta)));
    };
    const onUp = (): void => {
      propsDividerDragging.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div className={styles.app} style={hlVars as React.CSSProperties}>
      {confirmDialog && (
        <ConfirmDialog
          storageKey={confirmDialog.storageKey}
          message={confirmDialog.message}
          onConfirm={() => { confirmDialog.resolve(true); setConfirmDialog(null); }}
          onCancel={() => { confirmDialog.resolve(false); setConfirmDialog(null); }}
        />
      )}
      {showTableBuilder && (
        <TableBuilderModal
          onInsert={(template) => {
            dispatch({ type: "INSERT_TEMPLATE", payload: { template } });
            setShowTableBuilder(false);
          }}
          onClose={() => setShowTableBuilder(false)}
        />
      )}

      <LessonToolbar
        lessonTitle={lesson.title}
        stepIndex={stepIndex}
        stepCount={lesson.steps.length}
        step={step}
        previewMode={previewMode}
        onTogglePreview={() => setPreviewMode((v) => !v)}
        canAdvance={canAdvance}
        checking={checking}
        checkResult={checkResult}
        showHint={showHint}
        onCheck={handleCheck}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onRestart={handleRestart}
        onShowHint={() => setShowHint(true)}
        onSkipToSolution={async () => {
          const ok = await askConfirm("skip_to_solution", "Reveal the solution for this step? You can still look at how it's built.");
          if (ok) handleSkipToSolution();
        }}
        onBack={onBack}
        isPlaying={isPlaying}
        isPaused={playback?.paused ?? false}
        playbackCaption={playbackCaption}
        onPausePlayback={togglePausePlayback}
        onSkipPlayback={skipPlayback}
        onReplay={replayCurrentStep}
        pageTitle={state.pageTitle}
        faviconUrl={state.faviconUrl}
        onChangePageMeta={(next) => dispatch({ type: "SET_PAGE_META", payload: next })}
      />

      <div className={styles.main}>
        <CodePanel
          html={generatedCode}
          css={generatedCss}
          jsFiles={state.jsFiles}
          activeJsFileId={state.activeJsFileId}
          width={codePanelWidth}
          selectedId={state.selectedId}
          elements={state.elements}
          multiSelectedIds={multiSelectedIds}
          focusTab={focusTab}
          jsJumpToken={jsJumpToken}
          forceSync={isPlaying}
          onHtmlChange={handleCodeChange}
          onCssChange={handleCssChange}
          onSetActiveJsFile={(id) => dispatch({ type: "SET_ACTIVE_JS_FILE", payload: id })}
          onJsFileCodeChange={(id, code) => dispatch({ type: "UPDATE_JS_FILE_CODE", payload: { id, code } })}
          onAddJsFile={(file) => dispatch({ type: "ADD_JS_FILES", payload: [file] })}
          onRenameJsFile={(id, name) => dispatch({ type: "RENAME_JS_FILE", payload: { id, name } })}
          onDeleteJsFile={(id) => dispatch({ type: "DELETE_JS_FILE", payload: id })}
          onSelectElement={(id) => {
            dispatch({ type: "SELECT", payload: id });
            setMultiSelectedIds([]);
          }}
          onToggleMultiSelect={(id) =>
            setMultiSelectedIds((prev) => {
              const s = new Set(prev);
              if (s.has(id)) s.delete(id); else s.add(id);
              return [...s];
            })
          }
          onSelectRange={(ids) => setMultiSelectedIds(ids)}
          onDeleteElement={(id) => dispatch({ type: "DELETE_ELEMENT", payload: id })}
          onAddElement={(tag) => dispatch({ type: "ADD_ELEMENT", payload: tag })}
          bodyIsDark={bodyIsDark}
          onInsertTemplate={(template, autoTheme) =>
            dispatch({ type: "INSERT_TEMPLATE", payload: { template, autoTheme } })
          }
          onInsertJsPreset={(template, code) => {
            dispatch({ type: "INSERT_TEMPLATE", payload: { template } });
            dispatch({ type: "APPEND_MAIN_JS", payload: appendJavascriptSnippet(mainJsCode(state.jsFiles), code) });
            bumpJsJumpToken();
          }}
          onOpenTableBuilder={() => setShowTableBuilder(true)}
          cdnLinks={[]}
          onToggleCdn={() => {}}
          onReorderElement={(id, parentId, order) =>
            dispatch({ type: "REORDER_ELEMENT", payload: { id, parentId, order } })
          }
          onNestElement={(childId, parentId, order) =>
            dispatch({ type: "NEST_ELEMENT", payload: { childId, parentId, order } })
          }
          onMoveElementToRoot={(id, order) =>
            dispatch({ type: "MOVE_TO_ROOT", payload: { id, order } })
          }
          onDuplicateElement={(id, parentId, order) =>
            dispatch({ type: "DUPLICATE_ELEMENT", payload: { id, parentId, order } })
          }
        />

        <div className={styles.divider} onMouseDown={handleDividerMouseDown} />

        <LivePreview
          elements={state.elements} bodyStyles={state.bodyStyles} customCss={state.customCss}
          javascript={transpiledJs.code} error={transpiledJs.error} cdnTags={previewCdnTags}
          pageTitle={state.pageTitle} faviconUrl={state.faviconUrl}
          inspect={!previewMode} selectedId={state.selectedId}
          showLabels={state.showLabels} showOverlay={state.showOverlay}
          onSelect={(id) => { dispatch({ type: "SELECT", payload: id }); setMultiSelectedIds([]); }}
        />
        {!previewMode && (<>
            <div className={styles.propsDivider} onMouseDown={handlePropsDividerMouseDown} />
            <PropertiesPanel
              style={{ width: propsPanelWidth, flexShrink: 0 }}
              element={selectedElement}
              allElements={state.elements}
              multiSelectedIds={multiSelectedIds}
              multiElement={multiElement}
              matchedComponents={matchedComponents}
              bodyTheme={!state.selectedId ? state.bodyTheme : null}
              onDelete={(id) => dispatch({ type: "DELETE_ELEMENT", payload: id })}
              onApplyComponentTheme={(theme) => {
                const updates = buildThemeUpdates(state.selectedId ?? "", state.elements, theme);
                dispatch({ type: "APPLY_COMPONENT_THEME", payload: { updates } });
              }}
              onSetColorMode={(mode) => dispatch({ type: "SET_COLOR_MODE", payload: mode })}
              onToggleGlass={() => dispatch({ type: "TOGGLE_GLASS" })}
              onToggleCentered={() => dispatch({ type: "TOGGLE_CENTERED" })}
              onResetBodyTheme={() => dispatch({ type: "RESET_BODY_THEME" })}
              onChange={(prop, value) =>
                state.selectedId
                  ? dispatch({ type: "UPDATE_STYLE", payload: { prop, value } })
                  : dispatch({ type: "UPDATE_BODY_STYLE", payload: { prop, value } })
              }
              onMultiStyleChange={(prop, value) =>
                dispatch({ type: "UPDATE_MULTI_STYLE", payload: { ids: multiSelectedIds, prop, value } })
              }
              onContentChange={(value) => dispatch({ type: "UPDATE_CONTENT", payload: value })}
              onTagChange={(tag) => dispatch({ type: "UPDATE_TAG", payload: tag })}
              onAttrChange={(prop, value) =>
                dispatch({ type: "UPDATE_ATTR", payload: { prop, value } })
              }
              javascript={mainJsCode(state.jsFiles)}
              onInsertJavascript={(snippet: string) => {
                dispatch({ type: "APPEND_MAIN_JS", payload: appendJavascriptSnippet(mainJsCode(state.jsFiles), snippet) });
                bumpJsJumpToken();
              }}
              onInsertJsPreset={(template, code) => {
                dispatch({ type: "INSERT_TEMPLATE", payload: { template } });
                dispatch({ type: "APPEND_MAIN_JS", payload: appendJavascriptSnippet(mainJsCode(state.jsFiles), code) });
                bumpJsJumpToken();
              }}
              onApplyPreset={(presetStyles) =>
                dispatch({ type: "APPLY_PRESET", payload: presetStyles })
              }
              onAddMediaQuery={(mq) => dispatch({ type: "ADD_MEDIA_QUERY", payload: mq })}
              onRemoveMediaQuery={(index) => dispatch({ type: "REMOVE_MEDIA_QUERY", payload: index })}
            />
          </>
        )}
      </div>
    </div>
  );
}
