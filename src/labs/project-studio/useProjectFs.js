// useProjectFs.js
// Thin hook over the project:* IPC surface (desktop/app/project-fs.cjs).
// Everything here is desktop-only; `available` is false in a browser tab,
// which the lab uses to render an explanation instead of crashing.
import { useCallback, useEffect, useState } from 'react';

const api = () => (typeof window !== 'undefined' ? window.openCalcDesktop?.project : null);

export const isDesktop = () => !!api();

export function useProjectFs() {
  const [root, setRoot] = useState(null);
  const [missing, setMissing] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    const fs = api();
    if (!fs) { setLoading(false); return; }
    const res = await fs.tree();
    if (res.ok) {
      setRoot(res.root);
      setEntries(res.entries);
      setError(null);
    } else {
      setEntries([]);
      // "No project folder is open" is the normal first-run state, not an
      // error worth shouting about.
      setError(res.reason === 'No project folder is open' ? null : res.reason);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const fs = api();
    if (!fs) { setLoading(false); return; }
    let cancelled = false;
    fs.get().then((res) => {
      if (cancelled) return;
      setRoot(res.root);
      setMissing(res.missing ?? null);
      if (res.root) refresh();
      else setLoading(false);
    });
    return () => { cancelled = true; };
  }, [refresh]);

  const pick = useCallback(async () => {
    const fs = api();
    if (!fs) return;
    const res = await fs.pick();
    if (res.ok) {
      setRoot(res.root);
      setMissing(null);
      await refresh();
    }
  }, [refresh]);

  const readFile = useCallback(async (rel) => {
    const fs = api();
    if (!fs) return '';
    const res = await fs.read(rel);
    return res.ok ? res.content : '';
  }, []);

  const writeFile = useCallback(async (rel, content) => {
    const fs = api();
    if (!fs) return { ok: false };
    return fs.write(rel, content);
  }, []);

  const mkdir = useCallback(async (rel) => {
    const fs = api();
    if (!fs) return { ok: false };
    const res = await fs.mkdir(rel);
    await refresh();
    return res;
  }, [refresh]);

  const remove = useCallback(async (rel) => {
    const fs = api();
    if (!fs) return { ok: false };
    const res = await fs.remove(rel);
    await refresh();
    return res;
  }, [refresh]);

  const run = useCallback(async (runtime, rel) => {
    const fs = api();
    if (!fs) return { ok: false, reason: 'Desktop app required' };
    return fs.run(runtime, rel);
  }, []);

  return { available: !!api(), root, missing, entries, loading, error, pick, refresh, readFile, writeFile, mkdir, remove, run };
}
