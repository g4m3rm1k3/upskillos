import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// Lessons author emphasis and code explicitly. No HTML injection or heuristic
// highlighting of ordinary words such as “a” or “input”. Math is written in
// LaTeX between $…$ (inline) or $$…$$ (display); a literal dollar sign is \$.
export default function LessonText({ children }) {
  return <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={{ p: ({ children }) => <>{children}</> }}>{children}</ReactMarkdown>
}
