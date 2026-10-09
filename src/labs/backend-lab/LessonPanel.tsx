import { createContext, useContext, memo } from "react";
import ReactMarkdown from "react-markdown";
import {
  PROSE_REMARK_PLUGINS,
  PROSE_REHYPE_PLUGINS,
  proseComponents,
  InlineCode,
} from "../../components/markdown/proseComponents.jsx";
import StaticCodeBlock from "../../components/markdown/StaticCodeBlock.jsx";
import type { UiTheme } from "./types";

interface LessonPanelProps {
  title: string;
  content: string;
  checklist: string[];
  checked: string[];
  onToggleCheck: (item: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  ui: UiTheme;
  accentHex: string;
  onPrevLesson?: () => void;
  onNextLesson?: () => void;
  hasPrevLesson?: boolean;
  hasNextLesson?: boolean;
}

// Same inline-vs-block distinction BlogPost.jsx uses: react-markdown v9+
// dropped the `inline` prop from its `code` component, so a context flag
// set by the `pre` handler is the only way left to tell them apart.
const InPreContext = createContext(false);

function CodeRenderer({ className, children }: any) {
  const isBlock = useContext(InPreContext);
  const lang = (className || "").replace("language-", "");
  const codeStr = String(children).replace(/\n$/, "");
  if (!isBlock) return <InlineCode>{codeStr}</InlineCode>;
  return <StaticCodeBlock language={lang} code={codeStr} />;
}

function PreRenderer({ children }: any) {
  return <InPreContext.Provider value={true}>{children}</InPreContext.Provider>;
}

// The lesson Markdown ends with a "## Definition of Done" task list, and the
// panel shows the same items as interactive checkboxes below it. Rendering both
// listed every item twice, the first time as disabled checkboxes. Drop the
// Markdown copy, up to the next rule or heading.
function withoutChecklistSection(markdown: string): string {
  return markdown.replace(/^## Definition of Done[ \t]*\n[\s\S]*?(?=^---|^#{1,2} |(?![\s\S]))/m, '')
}

function LessonPanel({
  title,
  content,
  checklist,
  checked,
  onToggleCheck,
  collapsed,
  onToggleCollapsed,
  ui,
  accentHex,
  onPrevLesson,
  onNextLesson,
  hasPrevLesson,
  hasNextLesson,
}: LessonPanelProps) {

  if (collapsed) {
    return (
      <div className={`w-9 shrink-0 border-r ${ui.border} ${ui.bg1} flex justify-center pt-2.5`}>
        <button onClick={onToggleCollapsed} title="Show lesson" className={`bg-transparent border-none cursor-pointer text-base ${ui.txt2}`}>
          »
        </button>
      </div>
    );
  }

  return (
    <div className={`w-full h-full border-r ${ui.border} ${ui.bg1} flex flex-col overflow-hidden`}>
      <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${ui.border} shrink-0`}>
        <strong className={`text-[13px] ${ui.txt1}`}>{title}</strong>
        <button onClick={onToggleCollapsed} title="Collapse" className={`bg-transparent border-none cursor-pointer text-sm ${ui.txt2}`}>
          «
        </button>
      </div>
      <div className="prose-blog flex-1 overflow-auto px-4">
        <ReactMarkdown
          remarkPlugins={PROSE_REMARK_PLUGINS}
          rehypePlugins={PROSE_REHYPE_PLUGINS}
          components={{ ...proseComponents, code: CodeRenderer, pre: PreRenderer }}
        >
          {withoutChecklistSection(content)}
        </ReactMarkdown>

        <div className="my-4">
          <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${ui.txt2}`}>Definition of Done</div>
          {checklist.map((item, i) => (
            <label key={i} className={`flex gap-2 items-start mb-2 text-[13px] cursor-pointer ${ui.txt1}`}>
              <input
                type="checkbox"
                checked={checked.includes(item)}
                onChange={() => onToggleCheck(item)}
                className="mt-0.5"
                style={{ accentColor: accentHex }}
              />
              <span className={checked.includes(item) ? `line-through ${ui.txt2}` : ui.txt1}>{item}</span>
            </label>
          ))}
        </div>

        {(onPrevLesson || onNextLesson) && (
          <div className={`flex justify-between gap-2 my-4 pt-3 border-t ${ui.border}`}>
            <button
              onClick={onPrevLesson}
              disabled={!hasPrevLesson}
              className={`px-3 py-1.5 rounded-md border ${ui.btnBorder} text-[13px] ${
                hasPrevLesson ? `${ui.txt1} ${ui.hoverBg}` : `${ui.txt2} opacity-40 cursor-not-allowed`
              }`}
            >
              ← Previous
            </button>
            <button
              onClick={onNextLesson}
              disabled={!hasNextLesson}
              className={`px-3 py-1.5 rounded-md text-white text-[13px] font-semibold ${
                hasNextLesson ? "" : "opacity-40 cursor-not-allowed"
              }`}
              style={{ background: accentHex }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(LessonPanel);
