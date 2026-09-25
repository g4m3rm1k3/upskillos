// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const head = 'import numpy as np\n\ndef overlap(train_groups, test_groups):\n'
export const verify = {
  split: {
    pass: {
      agree: s => s.starter.replace("top = SelectKBest(f_classif, k=10).fit(X, y).get_support()      # chosen using ALL rows' labels\naccuracy = cross_val_score(LogisticRegression(), X[:, top], y, cv=folds).mean()", 'accuracy = cross_val_score(make_pipeline(SelectKBest(f_classif, k=10), LogisticRegression()), X, y, cv=folds).mean()'),
      fill: [s => s.starter.replace('___', 'np.isin(groups, test_groups)'), s => s.starter.replace('___', 'np.array([g in test_groups for g in groups])')],
      repair: [s => s.starter.replace("    both = np.concatenate([train, test])\n    return (test - both.mean()) / both.std()", '    return (test - train.mean()) / train.std()')],
      implement: [() => head + '    return np.mean(np.isin(test_groups, train_groups))\n'],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /inside the pipeline/ }],
      fill: [{ code: s => s.starter.replace('___', 'np.isin(np.arange(len(groups)), test_groups)'), hint: /by their position/ }, { code: s => s.starter.replace('___', '~np.isin(groups, test_groups)'), hint: /training mask/ }],
      repair: [{ code: s => s.starter, hint: /included the test rows/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => head + '    return float(np.sum(np.isin(test_groups, train_groups)))\n', hint: /That is a count/ },
        { code: () => head + '    u = np.unique(test_groups)\n    return np.mean(np.isin(u, train_groups))\n', hint: /distinct groups/ },
      ],
    },
  },
}
