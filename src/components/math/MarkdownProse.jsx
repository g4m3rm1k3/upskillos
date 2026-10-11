/**
 * MarkdownProse — renders lesson prose strings with full Markdown + LaTeX support.
 *
 * Uses the same pipeline as StickyNote:
 *   ReactMarkdown  →  remark-gfm (GFM: tables, strikethrough, etc.)
 *                  →  remark-math ($…$ inline, $$…$$ block)
 *                  →  rehype-katex (KaTeX rendering)
 *
 * Preprocessing converts the lesson-content notation to remark-math notation:
 *   \[…\]  →  $$…$$   (display / block math)
 *   \(…\)  →  $…$     (inline math)
 *   {{algebra:id|text}}  →  **text**  (bold label; preserves readability)
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { preprocess } from "./latexPreprocess.js";
import { CodeBlockPre, CodeBlockCode } from "./CodeBlock.jsx";

// ─── Tailwind class maps for ReactMarkdown elements ───────────────────────────

const PROSE_COMPONENTS = {
  // Headings
  h1: ({ children }) => (
    <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900 dark:text-slate-200 mt-10 mb-6 max-w-[70ch]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-slate-800 dark:text-slate-300 mt-10 mb-4 max-w-[70ch]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl sm:text-2xl font-serif font-semibold text-slate-800 dark:text-slate-300 mt-8 mb-3 max-w-[70ch]">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[13px] font-sans font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 mt-6 mb-2 max-w-[70ch]">
      {children}
    </h4>
  ),
  // Paragraphs
  p: ({ children }) => (
    <p className="mb-6 last:mb-0 text-[18px] sm:text-[20px] leading-[1.8] text-slate-800 dark:text-slate-300 font-serif tracking-[0.01em] max-w-[75ch]">
      {children}
    </p>
  ),
  // Bold
  strong: ({ children }) => (
    <strong className="font-bold text-rose-700 dark:text-rose-400">
      {children}
    </strong>
  ),
  // Italic
  em: ({ children }) => (
    <em className="italic text-teal-700 dark:text-teal-300">{children}</em>
  ),
  // Fenced code blocks get the shared pre wrapper + Prism highlighting;
  // inline code (single backtick) keeps its own pill styling.
  pre: CodeBlockPre,
  code: ({ className, children }) => (
    <CodeBlockCode
      className={className}
      inlineClassName="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[0.85em] text-brand-700 dark:text-brand-300 border border-slate-200 dark:border-slate-700/50"
    >
      {children}
    </CodeBlockCode>
  ),
  // Unordered list
  ul: ({ children }) => (
    <ul className="list-disc pl-8 space-y-3 mb-6 text-[18px] sm:text-[20px] leading-[1.8] text-slate-800 dark:text-slate-300 font-serif tracking-[0.01em] max-w-[75ch] marker:text-amber-600 dark:marker:text-amber-400 marker:font-bold">
      {children}
    </ul>
  ),
  // Ordered list
  ol: ({ children }) => (
    <ol className="list-decimal pl-8 space-y-3 mb-6 text-[18px] sm:text-[20px] leading-[1.8] text-slate-800 dark:text-slate-300 font-serif tracking-[0.01em] max-w-[75ch] marker:text-amber-600 dark:marker:text-amber-400 marker:font-bold">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-2">{children}</li>,
  // Block quote
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-brand-300 dark:border-brand-600 pl-6 py-1 my-8 italic text-slate-700 dark:text-slate-300 font-serif text-[19px] sm:text-[21px] leading-[1.8] bg-slate-50 dark:bg-slate-900/50 rounded-r-2xl shadow-sm tracking-[0.01em] max-w-[70ch]">
      {children}
    </blockquote>
  ),
  // Horizontal rule
  hr: () => <hr className="my-10 border-t border-slate-200 dark:border-slate-800 max-w-[70ch]" />,
  // Tables
  table: ({ children }) => (
    <div className="overflow-x-auto my-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <table className="w-full text-[16px] border-collapse font-sans">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-50 dark:bg-slate-900/80">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-slate-200 dark:border-slate-700">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
      {children}
    </td>
  ),
  // Links. An in-app link (#/lab/..., #/chapter/...) stays in this tab, where
  // the HashRouter follows it; anything else opens in a new tab.
  a: ({ href, children }) => (
    <a
      href={href}
      {...(href?.startsWith("#/") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      className="text-brand-600 dark:text-brand-400 underline hover:text-brand-700 dark:hover:text-brand-300"
    >
      {children}
    </a>
  ),
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Render a single prose string (one item from lesson.intuition.prose etc.)
 * as a block with full markdown + math support. `components` adds or replaces element
 * renderers (Project Studio uses it for its key hints).
 */
export default function MarkdownProse({ text, className = "", components }) {
  if (!text) return null;
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={components ? { ...PROSE_COMPONENTS, ...components } : PROSE_COMPONENTS}
      >
        {preprocess(text)}
      </ReactMarkdown>
    </div>
  );
}
