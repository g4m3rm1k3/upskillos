// Where a ```figure fence's name is found (see ../figures.js). Modules load only when a step
// that shows one of their figures is opened.
//
//   aml/<Export>                     this folder's aml.jsx (Applied Machine Learning series)
//   ml-lab/<lab folder>/<Export>     a Machine Learning Lab figure, e.g. ml-lab/l01-foundations/WeightedSum
const OWN = {
  aml: () => import('./aml.jsx'),
  dice: () => import('./dice.jsx'),
  'dice-start': () => import('./dicePreview.jsx'),
};
const ML_LAB = import.meta.glob('../../ml-lab/labs/*/figures.jsx');

// name → { load, exportName }, or null when the name points nowhere.
export function resolveFigure(name) {
  const parts = String(name).split('/');
  if (parts[0] === 'ml-lab' && parts.length === 3) {
    const load = ML_LAB[`../../ml-lab/labs/${parts[1]}/figures.jsx`];
    return load ? { load, exportName: parts[2] } : null;
  }
  if (parts.length === 2 && OWN[parts[0]]) return { load: OWN[parts[0]], exportName: parts[1] };
  return null;
}
