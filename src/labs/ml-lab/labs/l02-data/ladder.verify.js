// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const head = 'import numpy as np\n\ndef prepare(x_train, x_new):\n'
export const verify = {
  fill: {
    pass: {
      agree: s => s.starter.replace('fill = np.nanmedian(np.concatenate([x_train, x_val]))', 'fill = np.nanmedian(x_train)'),
      fill: [s => s.starter.replace('___', 'np.nanmedian(x_train)'), s => s.starter.replace('___', 'np.median(x_train[~np.isnan(x_train)])')],
      repair: [s => s.starter.replace('fill = np.nanmedian(x_new)', 'fill = np.nanmedian(x_train)')],
      implement: [() => head + '    fill = np.nanmedian(x_train)\n    return np.column_stack([np.where(np.isnan(x_new), fill, x_new), np.isnan(x_new).astype(float)])\n'],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /use `x_train` only/ }],
      fill: [{ code: s => s.starter.replace('___', 'np.nanmean(x_train)'), hint: /That is the mean/ }],
      repair: [{ code: s => s.starter, hint: /median of the NEW rows/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => head + '    x_new[np.isnan(x_new)] = np.nanmedian(x_train)\n    return np.column_stack([x_new, np.zeros(len(x_new))])\n', text: /changed one of its input arrays|disagree/ },
        { code: () => head + '    return np.where(np.isnan(x_new), np.nanmedian(x_train), x_new)\n', hint: /One column only/ },
        { code: () => head + '    all_ = np.concatenate([x_train, x_new])\n    f = np.nanmedian(all_)\n    return np.column_stack([np.where(np.isnan(x_new), f, x_new), np.isnan(x_new).astype(float)])\n', hint: /together/ },
        { code: () => head + '    f = np.nanmedian(x_train)\n    return np.column_stack([np.where(np.isnan(x_new), f, x_new), (~np.isnan(x_new)).astype(float)])\n', hint: /inverted/ },
      ],
    },
  },
}
