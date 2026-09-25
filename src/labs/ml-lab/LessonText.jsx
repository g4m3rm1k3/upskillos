import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// Lessons author emphasis and code explicitly. No HTML injection or heuristic
// highlighting of ordinary words such as “a” or “input”. Math is written in
// LaTeX between $…$ (inline) or $$…$$ (display); a literal dollar sign is \$.
// remark-math treats $$…$$ as display math only when the fences stand on lines of their own;
// lessons write it inside sentences ("… the equation: $$V(s) = …$$ It is …"), which would render
// as small inline math. Move each one onto its own lines. An escaped \$ is left alone.
export const displayMathOnOwnLines = text => typeof text === 'string'
  ? text.replace(/(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$/g, (_, tex) => `\n\n$$\n${tex.trim()}\n$$\n\n`)
  : text

export default function LessonText({ children }) {
  return <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={{ p: ({ children }) => <>{children}</> }}>{displayMathOnOwnLines(children)}</ReactMarkdown>
}
