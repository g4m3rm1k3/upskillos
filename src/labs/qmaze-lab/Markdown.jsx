import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { displayMathOnOwnLines } from '../ml-lab/LessonText.jsx'

// Lesson text: Markdown with paragraphs, lists and tables, and LaTeX ($…$ inline, $$…$$ display).
// `inline` drops the paragraph wrapper, for short text inside a sentence-sized place.
export default function Markdown({ children, inline = false }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}
    components={inline ? { p: ({ children: c }) => <>{c}</> } : undefined}>{displayMathOnOwnLines(children)}</ReactMarkdown>
}
