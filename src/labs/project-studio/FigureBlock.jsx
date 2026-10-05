// FigureBlock.jsx
// An interactive figure placed in a lesson step by a ```figure fence (figures.js). The figure's
// module (figures/index.js) loads when the step is first shown.
import React, { useEffect, useState } from 'react';
import MarkdownProse from '../../components/math/MarkdownProse.jsx';
import { resolveFigure } from './figures/index.js';
import '../ml-lab/ml.css';
import './figures/figure.css';

class FigureBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return <p role="alert">This figure failed to draw: {String(this.state.error.message ?? this.state.error)}</p>;
    return this.props.children;
  }
}

export default function FigureBlock({ figure, proseClass }) {
  const [state, setState] = useState({ Component: null, error: null });

  useEffect(() => {
    let live = true;
    const found = resolveFigure(figure.name);
    if (!found) {
      setState({ Component: null, error: `No figure called ${figure.name}` });
      return undefined;
    }
    found.load().then(
      (mod) => {
        if (!live) return;
        const Component = mod[found.exportName];
        setState(Component ? { Component, error: null } : { Component: null, error: `No figure called ${figure.name}` });
      },
      (e) => { if (live) setState({ Component: null, error: String(e?.message ?? e) }); },
    );
    return () => { live = false; };
  }, [figure.name]);

  const { Component, error } = state;
  return (
    <figure className="ml-inline-figure ps-figure" data-figure={figure.name}>
      {error ? <p role="alert">{error}</p>
        : Component ? <FigureBoundary><Component {...figure.props} /></FigureBoundary>
          : <p className="ml-caption">Loading figure…</p>}
      {figure.caption && <figcaption><MarkdownProse text={figure.caption} className={proseClass} /></figcaption>}
    </figure>
  );
}
