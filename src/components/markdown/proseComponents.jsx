import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'

// Shared ReactMarkdown setup — extracted from the blog renderer so any surface
// that renders markdown prose (blog posts, HTML Lab lessons, ...) stays
// visually and behaviorally consistent instead of re-implementing this per-caller.
// Callers still supply their own `code`/`pre` overrides, since what a code
// block should DO (run via a language runner vs. render a live HTML preview)
// is caller-specific.
/** @type {import('unified').PluggableList} */
export const PROSE_REMARK_PLUGINS = [remarkGfm, remarkMath]
/** @type {import('unified').PluggableList} */
export const PROSE_REHYPE_PLUGINS = [rehypeRaw, [rehypeKatex, { throwOnError: false, errorColor: '#ef4444' }]]

// Post markdown references images by bare filename (e.g. `![alt](chart.png)`)
// because the image sits alongside the .md file under src/posts. That path
// isn't servable directly by the browser, so resolve it to the actual built
// asset URL instead. Keyed by lowercased basename since posts only ever
// reference their own co-located images, not each other's.
const POST_IMAGES = import.meta.glob('../../posts/**/*.{png,jpg,jpeg,gif,svg,webp}', {
  query: '?url',
  import: 'default',
  eager: true,
})
const POST_IMAGE_BY_NAME = new Map(
  Object.entries(POST_IMAGES).map(([path, url]) => [path.split('/').pop().toLowerCase(), url])
)

function resolveImageSrc(src) {
  if (!src || /^([a-z]+:)?\/\//i.test(src) || src.startsWith('/') || src.startsWith('data:')) return src
  return POST_IMAGE_BY_NAME.get(src.split('/').pop().toLowerCase()) || src
}

function Heading({ level, children }) {
  const tag = `h${level}`
  const text = typeof children === 'string' ? children : ''
  const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const sizeMap = {
    1: 'text-4xl font-extrabold tracking-tight mt-12 mb-8 leading-tight text-transparent bg-clip-text bg-gradient-to-br from-brand-400 via-sky-500 to-indigo-600',
    2: 'text-3xl font-bold tracking-tight mt-10 mb-6 leading-snug border-b border-slate-200/50 dark:border-slate-700/50 pb-4 text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-sky-500',
    3: 'text-2xl font-semibold mt-8 mb-4 text-sky-600 dark:text-sky-400',
    4: 'text-xl font-medium mt-6 mb-3 text-indigo-600 dark:text-indigo-400',
  }
  const Tag = tag
  return <Tag id={id} className={sizeMap[level] || 'text-base font-semibold mt-4 mb-2'}>{children}</Tag>
}

export function InlineCode({ children }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 text-[0.85em] font-mono">
      {children}
    </code>
  )
}

/** @type {import('react-markdown').Components} */
export const proseComponents = {
  h1: ({ children }) => <Heading level={1}>{children}</Heading>,
  h2: ({ children }) => <Heading level={2}>{children}</Heading>,
  h3: ({ children }) => <Heading level={3}>{children}</Heading>,
  h4: ({ children }) => <Heading level={4}>{children}</Heading>,

  p({ children }) {
    return (
      <p className="text-slate-700 dark:text-slate-300 mb-5">
        {children}
      </p>
    )
  },

  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
      >
        {children}
      </a>
    )
  },

  strong({ children }) {
    return <strong className="font-bold text-brand-600 dark:text-brand-400">{children}</strong>
  },

  em({ children }) {
    return <em className="italic text-slate-700 dark:text-slate-300">{children}</em>
  },

  img({ src, alt }) {
    return (
      <img
        src={resolveImageSrc(src)}
        alt={alt || ''}
        loading="lazy"
        className="max-w-full h-auto rounded-xl border border-slate-200 dark:border-slate-700 my-6 mx-auto shadow-sm"
        onError={(e) => { e.currentTarget.style.opacity = '0.3' }}
      />
    )
  },

  ul({ children }) {
    return (
      <ul className="list-none pl-0 mb-5 space-y-1.5">
        {children}
      </ul>
    )
  },

  ol({ children }) {
    return (
      <ol className="list-decimal list-inside mb-5 space-y-1.5 text-slate-700 dark:text-slate-300">
        {children}
      </ol>
    )
  },

  li({ children, checked }) {
    if (checked !== null && checked !== undefined) {
      return (
        <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 py-0.5">
          <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${
            checked
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'border-slate-300 dark:border-slate-600'
          }`}>
            {checked ? '✓' : ''}
          </span>
          <span className={checked ? 'text-slate-400 dark:text-slate-500 line-through' : ''}>{children}</span>
        </li>
      )
    }
    return (
      <li className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
        <span className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500" />
        <span>{children}</span>
      </li>
    )
  },

  blockquote({ children }) {
    return (
      <blockquote className="border-l-4 border-indigo-400 dark:border-indigo-500 pl-4 pr-2 py-1 my-5 bg-indigo-50 dark:bg-indigo-950/30 rounded-r-lg text-slate-600 dark:text-slate-400 italic">
        {children}
      </blockquote>
    )
  },

  hr() {
    return <hr className="my-10 border-slate-200 dark:border-slate-700" />
  },

  table({ children }) {
    return (
      <div className="overflow-x-auto my-5">
        <table className="w-full text-sm border-collapse border border-slate-200 dark:border-slate-700">
          {children}
        </table>
      </div>
    )
  },

  thead({ children }) {
    return <thead className="bg-slate-50 dark:bg-slate-800">{children}</thead>
  },

  th({ children }) {
    return (
      <th className="border border-slate-200 dark:border-slate-700 px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">
        {children}
      </th>
    )
  },

  td({ children }) {
    return (
      <td className="border border-slate-200 dark:border-slate-700 px-4 py-2 text-slate-700 dark:text-slate-300">
        {children}
      </td>
    )
  },
}
