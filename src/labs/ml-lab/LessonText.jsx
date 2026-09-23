import React from 'react'
import ReactMarkdown from 'react-markdown'

// Lessons author emphasis and code explicitly. No HTML injection or heuristic
// highlighting of ordinary words such as “a” or “input”.
export default function LessonText({ children }) {
  return <ReactMarkdown components={{ p: ({ children }) => <>{children}</> }}>{children}</ReactMarkdown>
}
