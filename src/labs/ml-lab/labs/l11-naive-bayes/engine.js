// Multinomial Naive Bayes on short operations messages, fully in log space.
import { random, shuffle } from '../../kit/math.js'

// label 1 = incident (needs a human now), 0 = routine.
export const CORPUS = [
  [1, 'database connection timeout on primary replica'], [1, 'disk full error on build agent 7'], [1, 'payment service returning 500 errors'],
  [1, 'checkout latency spike above threshold'], [1, 'error rate critical on api gateway'], [1, 'memory leak crashed worker pod'],
  [1, 'certificate expired login failing for users'], [1, 'queue backlog growing consumers down'], [1, 'failed deploy rolled back errors in logs'],
  [1, 'cpu at 100 percent on search cluster'], [1, 'users report timeout on upload'], [1, 'dns failure service unreachable'],
  [1, 'replica lag critical database writes blocked'], [1, 'out of memory error on image service'], [1, 'intermittent 502 errors from load balancer'],
  [1, 'backup job failed disk error'], [1, 'authentication service down login error'], [1, 'packet loss between regions timeout'],
  [1, 'crash loop on scheduler after deploy'], [1, 'error budget exhausted for checkout'], [1, 'storage latency critical writes failing'],
  [1, 'api returning errors after config change'], [1, 'worker nodes unreachable network failure'], [1, 'alert critical error rate on payments'],
  [1, 'timeout connecting to cache cluster'], [1, 'service down users cannot login'], [1, 'failed health checks pod restarting'],
  [1, 'disk latency spike database timeout'], [1, 'data pipeline failed missing partition error'], [1, 'ssl handshake failure clients error'],
  [0, 'deployed version 2.3 to staging'], [0, 'weekly backup completed successfully'], [0, 'rotated api keys as scheduled'],
  [0, 'added dashboard for checkout latency'], [0, 'scaled search cluster for holiday traffic'], [0, 'updated dependencies in build agent image'],
  [0, 'renewed certificate ahead of expiry'], [0, 'migrated cache cluster to new region'], [0, 'reviewed error budget for next quarter'],
  [0, 'nightly data pipeline completed on time'], [0, 'scheduled maintenance window for database'], [0, 'deployed config change to api gateway'],
  [0, 'added alert for queue backlog'], [0, 'cleaned up old logs on storage'], [0, 'load test passed for payments service'],
  [0, 'upgraded kubernetes version on staging'], [0, 'documented login flow for new users'], [0, 'health checks added for scheduler'],
  [0, 'backup restore drill completed successfully'], [0, 'released version 2.4 to production'], [0, 'tuned cpu requests for worker pods'],
  [0, 'created runbook for dns changes'], [0, 'monthly report on uptime published'], [0, 'enabled compression on image service'],
  [0, 'ssl configuration reviewed no action needed'], [0, 'added replica for read traffic'], [0, 'network change approved for friday'],
  [0, 'storage quota increased for analytics team'], [0, 'deploy pipeline now caches dependencies'], [0, 'onboarded new team to monitoring'],
]

export const tokenize = text => text.toLowerCase().match(/[a-z0-9]+/g) ?? []

export function splitCorpus(seed = 1, fraction = 0.75) {
  const s = shuffle(CORPUS.map(([label, text]) => ({ label, text })), random(seed)), k = Math.floor(s.length * fraction)
  return { train: s.slice(0, k), validation: s.slice(k) }
}

export function fit(train, alpha = 1) {
  const vocab = [...new Set(train.flatMap(d => tokenize(d.text)))].sort()
  const counts = [new Map(), new Map()], totals = [0, 0], docs = [0, 0]
  for (const d of train) {
    docs[d.label]++
    for (const w of tokenize(d.text)) { counts[d.label].set(w, (counts[d.label].get(w) ?? 0) + 1); totals[d.label]++ }
  }
  const V = vocab.length, logPrior = docs.map(c => Math.log(c / train.length))
  const logLik = (c, w) => Math.log(((counts[c].get(w) ?? 0) + alpha) / (totals[c] + alpha * V))
  return { vocab: new Set(vocab), counts, totals, docs, alpha, V, logPrior, logLik }
}

// Log-odds = prior log-odds + Σ over known tokens of log P(w|1)/P(w|0).
export function explain(model, text) {
  const tokens = tokenize(text), rows = tokens.map(w => model.vocab.has(w)
    ? { word: w, known: true, c1: model.counts[1].get(w) ?? 0, c0: model.counts[0].get(w) ?? 0, contribution: model.logLik(1, w) - model.logLik(0, w) }
    : { word: w, known: false, c1: 0, c0: 0, contribution: 0 })
  const prior = model.logPrior[1] - model.logPrior[0]
  const logOdds = prior + rows.reduce((t, r) => t + r.contribution, 0)
  return { rows, prior, logOdds, p: 1 / (1 + Math.exp(-logOdds)) }
}
export const accuracy = (model, docs) => docs.filter(d => (explain(model, d.text).p >= 0.5 ? 1 : 0) === d.label).length / docs.length
