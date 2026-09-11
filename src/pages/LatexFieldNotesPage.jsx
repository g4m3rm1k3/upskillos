import LatexFieldNotes from '../components/reference/LatexFieldNotes.jsx'
import { useGlobalTheme } from '../context/ThemeContext.jsx'

export default function LatexFieldNotesPage() {
  const { isDarkGlobal } = useGlobalTheme()

  return (
    <LatexFieldNotes
      isDark={isDarkGlobal}
      storageKeyPrefix="oc-lfn"
      title="LaTeX Field Notes"
    />
  )
}
