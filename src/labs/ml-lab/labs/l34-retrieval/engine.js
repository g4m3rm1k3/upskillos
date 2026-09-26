// Retrieval for a small runbook assistant: TF-IDF and BM25 ranking, chunking,
// retrieval metrics, permission filtering and an extractive grounded answer.
import { mean, range } from '../../kit/math.js'

export const DOCS = [
  { id: 'ci-cache', title: 'CI cache misses', restricted: false, text: 'Builds are slow when the dependency cache misses. Check the cache key in the pipeline file. A changed lockfile always invalidates the cache. Warm the cache by running the main branch build first.' },
  { id: 'ci-runner', title: 'Shared versus dedicated runners', restricted: false, text: 'Shared runners are cheaper but slower during office hours. Dedicated runners are reserved for release branches. Request a dedicated runner through the platform portal. Long builds should move to dedicated runners.' },
  { id: 'db-replica', title: 'Database replica lag', restricted: false, text: 'Replica lag grows when the primary database receives heavy write traffic. Reads from a lagging replica return stale data. Pause batch jobs to let the replica catch up. Alert when lag exceeds thirty seconds.' },
  { id: 'db-failover', title: 'Database failover procedure', restricted: true, text: 'To fail over the primary database, promote the healthiest replica. Update the connection secret in the vault. Only the on-call database engineer may run the failover script. Record the incident timeline.' },
  { id: 'cert-renew', title: 'Renewing TLS certificates', restricted: false, text: 'Certificates are renewed automatically thirty days before expiry. If renewal fails, the login service returns handshake errors. Run the renewal job manually and restart the gateway. Check the expiry date with the certificate tool.' },
  { id: 'deploy-rollback', title: 'Rolling back a deployment', restricted: false, text: 'Roll back a bad deployment by redeploying the previous release tag. The pipeline keeps the last five release artifacts. Rollback takes about four minutes. Notify the release channel after a rollback.' },
  { id: 'queue-backlog', title: 'Message queue backlog', restricted: false, text: 'A growing queue backlog means consumers cannot keep up. Scale the consumer deployment horizontally. Check for a poison message that repeatedly fails. Messages older than a day move to the dead letter queue.' },
  { id: 'oom', title: 'Out of memory errors', restricted: false, text: 'Pods restart with out of memory errors when their memory limit is too low. Compare the limit with peak usage on the dashboard. Memory leaks show steadily rising usage between restarts. Raise the limit only after ruling out a leak.' },
  { id: 'dns', title: 'DNS resolution failures', restricted: false, text: 'Services become unreachable when DNS resolution fails. Check the resolver configuration and the upstream DNS provider status. Cached records can hide the failure for several minutes. Use the network diagnostic tool to test resolution.' },
  { id: 'payments-errors', title: 'Payment service errors', restricted: true, text: 'Payment errors above one percent page the payments team. Check the payment provider status page and the gateway error codes. Never retry card charges automatically. Escalate to the payments lead for refunds.' },
  { id: 'disk-full', title: 'Disk full on build agents', restricted: false, text: 'Build agents fail when the disk is full. Old docker images consume most of the space. Run the cleanup job to prune images older than a week. Disk usage alerts fire at ninety percent.' },
  { id: 'latency-spike', title: 'API latency spikes', restricted: false, text: 'Latency spikes often follow a deployment or a traffic surge. Compare the p95 latency before and after the last release. Check slow database queries and cache hit rates. Roll back if the spike started with a deployment.' },
]
export const QUERIES = [
  { q: 'why are my builds slow after changing the lockfile', relevant: ['ci-cache'] },
  { q: 'how do I get a dedicated runner for long builds', relevant: ['ci-runner'] },
  { q: 'reads return stale data from the replica', relevant: ['db-replica'] },
  { q: 'login fails with handshake errors', relevant: ['cert-renew'] },
  { q: 'undo a bad release', relevant: ['deploy-rollback'] },
  { q: 'consumers cannot keep up with messages', relevant: ['queue-backlog'] },
  { q: 'pod keeps restarting because memory runs out', relevant: ['oom'] },
  { q: 'service unreachable name resolution', relevant: ['dns'] },
  { q: 'agent failed no space left', relevant: ['disk-full'] },
  { q: 'p95 latency went up after deploy', relevant: ['latency-spike', 'deploy-rollback'] },
  { q: 'promote a replica to primary', relevant: ['db-failover'] },
  { q: 'pipeline sluggish since dependencies were bumped', relevant: ['ci-cache'] },
  { q: 'workers crash from insufficient RAM', relevant: ['oom'] },
  { q: 'jobs piling up unprocessed', relevant: ['queue-backlog'] },
  { q: 'storage exhausted on the CI machine', relevant: ['disk-full'] },
  { q: 'users cannot sign in, certificate expired', relevant: ['cert-renew'] },
  { q: 'revert the latest version', relevant: ['deploy-rollback'] },
]

// A toy stand-in for learned embeddings: words that mean the same thing map to
// one shared concept. Real systems learn this from data (dense embeddings).
const CONCEPTS = { memory: ['memory', 'ram', 'oom', 'insufficient'], storage: ['disk', 'space', 'storage', 'exhausted', 'full'], backlog: ['backlog', 'pil', 'unprocessed', 'keep', 'queue'], slow: ['slow', 'sluggish', 'latency', 'spike'], login: ['login', 'sign', 'handshake'], dependency: ['dependency', 'dependenci', 'lockfile', 'bump', 'bumped'], rollback: ['rollback', 'roll', 'revert', 'undo', 'previou'], release: ['release', 'deployment', 'deploy', 'version', 'latest'], agent: ['agent', 'machine', 'runner', 'ci'], crash: ['crash', 'restart', 'fail'], certificate: ['certificate', 'cert', 'tls', 'expired', 'expiry'] }
const CONCEPT_OF = new Map(Object.entries(CONCEPTS).flatMap(([c, ws]) => ws.map(w => [w, `§${c}`])))
export const conceptTokens = ts => ts.map(w => CONCEPT_OF.get(w) ?? w)

const STOP = new Set('a an the is are to of and or in on for with when by my i do how why after before from be it its only than that this what can not'.split(' '))
export const tokenize = t => (t.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(w => !STOP.has(w)).map(w => w.replace(/(ing|es|s)$/, ''))

export function chunk(docs, size) {
  return docs.flatMap(d => { const sents = d.text.split(/(?<=\.)\s+/); return size >= sents.length ? [{ ...d, chunkId: `${d.id}#0`, text: d.text }] : range(Math.ceil(sents.length / size)).map(i => ({ ...d, chunkId: `${d.id}#${i}`, text: sents.slice(i * size, (i + 1) * size).join(' ') })) })
}

export function buildIndex(chunks) {
  const toks = chunks.map(c => tokenize(`${c.title} ${c.text}`)), ctoks = toks.map(conceptTokens), N = chunks.length, df = new Map()
  toks.forEach(ts => new Set(ts).forEach(w => df.set(w, (df.get(w) ?? 0) + 1)))
  const idf = w => Math.log((N + 1) / ((df.get(w) ?? 0) + 1)) + 1
  const avgLen = mean(toks.map(t => t.length))
  const tfidf = ts => { const v = new Map(); ts.forEach(w => v.set(w, (v.get(w) ?? 0) + 1)); v.forEach((c, w) => v.set(w, c * idf(w))); const n = Math.hypot(...v.values()) || 1; v.forEach((x, w) => v.set(w, x / n)); return v }
  const vecs = toks.map(tfidf)
  const cdf = new Map(); ctoks.forEach(ts => new Set(ts).forEach(w => cdf.set(w, (cdf.get(w) ?? 0) + 1)))
  const cidf = w => Math.log((N + 1) / ((cdf.get(w) ?? 0) + 1)) + 1
  const ctfidf = ts => { const v = new Map(); ts.forEach(w => v.set(w, (v.get(w) ?? 0) + 1)); v.forEach((c, w) => v.set(w, c * cidf(w))); const n = Math.hypot(...v.values()) || 1; v.forEach((x, w) => v.set(w, x / n)); return v }
  return { chunks, toks, idf, df, N, avgLen, vecs, tfidf, cvecs: ctoks.map(ctfidf), ctfidf }
}
export function score(index, query, method) {
  const q = tokenize(query)
  return index.chunks.map((c, i) => {
    const ts = index.toks[i]
    if (method === 'keyword') return new Set(q).size ? [...new Set(q)].filter(w => ts.includes(w)).length : 0
    if (method === 'bm25') { const k1 = 1.2, b = 0.75; return q.reduce((s, w) => { const f = ts.filter(x => x === w).length; if (!f) return s; const idf = Math.log(1 + (index.N - (index.df.get(w) ?? 0) + 0.5) / ((index.df.get(w) ?? 0) + 0.5)); return s + idf * f * (k1 + 1) / (f + k1 * (1 - b + b * ts.length / index.avgLen)) }, 0) }
    if (method === 'semantic') { const qv = index.ctfidf(conceptTokens(q)); let s = 0; qv.forEach((x, w) => { s += x * (index.cvecs[i].get(w) ?? 0) }); return s }
    const qv = index.tfidf(q); let s = 0; qv.forEach((x, w) => { s += x * (index.vecs[i].get(w) ?? 0) }); return s
  })
}
// Rank documents (best chunk per document), after applying permissions.
export function retrieve(index, query, { method = 'bm25', k = 3, canSeeRestricted = false } = {}) {
  const s = score(index, query, method), best = new Map()
  index.chunks.forEach((c, i) => { if (c.restricted && !canSeeRestricted) return; if (!best.has(c.id) || s[i] > best.get(c.id).score) best.set(c.id, { ...c, score: s[i] }) })
  return [...best.values()].filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, k)
}
export function evaluate(index, { method, k, canSeeRestricted = true }) {
  const rows = QUERIES.map(({ q, relevant }) => {
    const got = retrieve(index, q, { method, k: 10, canSeeRestricted }).map(d => d.id), first = got.findIndex(id => relevant.includes(id))
    return { q, relevant, top: got.slice(0, k), recall: relevant.filter(r => got.slice(0, k).includes(r)).length / relevant.length, rr: first < 0 ? 0 : 1 / (first + 1) }
  })
  return { rows, recall: mean(rows.map(r => r.recall)), mrr: mean(rows.map(r => r.rr)) }
}
// Extractive answer: the retrieved sentence with the most query-term overlap, cited. With the semantic method the
// overlap is counted in the same concept space the retriever used; otherwise a paraphrase can be retrieved and then
// "not found" because no literal word matches.
export function answer(results, query, { semantic = false } = {}) {
  const toks = t => (semantic ? conceptTokens(tokenize(t)) : tokenize(t))
  const q = new Set(toks(query)), cands = results.flatMap(d => d.text.split(/(?<=\.)\s+/).map(s => ({ s, id: d.id, title: d.title, overlap: toks(s).filter(w => q.has(w)).length })))
  const best = cands.sort((a, b) => b.overlap - a.overlap)[0]
  return best && best.overlap > 0 ? best : null
}
