// What a learner does at each step of "NLP — Maintenance Work Orders" (ml-nlp), for the
// walkthrough test (mlProduction.desktop.test.js). The entry format is described in
// ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 14.1 ─────────────────────────────────────────────────────────────────
  '14-01-tf-idf#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '14-01-tf-idf#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '14-01-tf-idf#Rare words carry more information': {
    wrong: [
      { name: 'counted every occurrence, not every note', edit: [['self.document_frequency_ = (counts > 0).sum(axis=0)', 'self.document_frequency_ = counts.sum(axis=0)']], fails: [0] },
      { name: 'no smoothing', edit: [['np.log((1 + len(texts)) / (1 + self.document_frequency_)) + 1', 'np.log(len(texts) / self.document_frequency_) + 1']], fails: [0] },
    ],
  },
  '14-01-tf-idf#Weight and normalise': {
    wrong: [{ name: 'did not scale rows to length 1', edit: [['        return weighted / np.where(lengths == 0, 1, lengths)', '        return weighted']], fails: [0] }],
  },

  // ── 14.2 ─────────────────────────────────────────────────────────────────
  '14-02-similar-work-orders#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '14-02-similar-work-orders#Similar notes point the same way': {
    wrong: [{ name: 'compared raw counts', edit: [['        self.vectors = self.vectorizer.transform(notes).toarray()', '        self.vectors = (self.vectorizer.transform(notes).toarray() > 0) * 1.0']], fails: [0] }],
  },
  '14-02-similar-work-orders#The closest few': {
    wrong: [
      { name: 'least similar first', edit: [['best = np.argsort(-scores, kind="stable")[:k]', 'best = np.argsort(scores, kind="stable")[:k]']], fails: [0] },
      { name: 'kept notes with no words in common', edit: [['for i in best if scores[i] > 0]', 'for i in best]']], fails: [0] },
    ],
  },

  // ── 14.3 ─────────────────────────────────────────────────────────────────
  '14-03-embeddings#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '14-03-embeddings#Directions of co-occurrence': {
    wrong: [{ name: 'did not scale to length 1', edit: [['        return unit(self.vectorizer.transform(texts).toarray() @ self.directions_.T)', '        return self.vectorizer.transform(texts).toarray() @ self.directions_.T']], fails: [0] }],
  },
  '14-03-embeddings#Neighbours and search': {
    wrong: [{ name: 'the word counted as its own neighbour', edit: [['np.argsort(-scores, kind="stable")[1:k + 1]', 'np.argsort(-scores, kind="stable")[:k]']], fails: [0] }],
  },
};
