import OpenMatStudio from "./OpenMatStudio.jsx";
import { useOpenLab } from '../../components/desktop/useOpenLab.js';

export default function OpenMatPage() {
  const openLab = useOpenLab();
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-slate-950">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
        <span>Learn the math behind data science, machine learning, and planning.</span>
        <button type="button" onClick={() => openLab('linear-algebra-lab')} className="rounded-md bg-teal-700 px-3 py-1.5 font-semibold text-white hover:bg-teal-800">Open linear algebra series →</button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <OpenMatStudio />
      </div>
    </div>
  );
}
