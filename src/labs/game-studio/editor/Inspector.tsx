// The Inspector: the selected node's real properties, with the right control for
// each type (the specification's §12–13), generated from the registry. Every change
// is a command. While the game runs, each property also shows its live value from
// the game, marked as not saved (ADR 9). The Code section shows the call that would
// make this node as it is now.

import React, { useEffect } from 'react';
import type { Store } from './store';
import { Btn, C, NumberField, Row, Section, TextField, selectStyle, useStore } from './kit';
import { lineage, nodeType, propValue, type PropDef } from '../core/registry';
import { findNode, pathOf, parentOf, walk } from '../core/project';
import { expandSceneRoot } from '../core/instances';
import { trackPath } from '../core/animation';
import { lit } from '../core/doc';
import type { NodeData, PropValue, SpriteAnimation, Vec2 } from '../core/types';
import { SpriteFramesEditor } from './SpriteFramesEditor';

const DEG = 180 / Math.PI;
const SECTION: Record<string, string> = { Node2D: 'Transform', Sprite2D: 'Sprite', AnimatedSprite2D: 'Animated sprite', CharacterBody2D: 'Body', StaticBody2D: 'Body', RigidBody2D: 'Body', Area2D: 'Area', CollisionShape2D: 'Shape' };

function liveText(v: unknown, def: PropDef): string | undefined {
  if (v === undefined) return undefined;
  if (def.type === 'vec2') { const q = v as Vec2; return `${+q.x.toFixed(1)}, ${+q.y.toFixed(1)}`; }
  if (def.type === 'angle') return `${+((v as number) * DEG).toFixed(1)}°`;
  return String(v);
}

export function Inspector({ store }: { store: Store }) {
  useStore(store);
  const s = store.scene, n = store.selected, p = store.project;
  // While running, ask the game for live values a few times a second.
  const running = !!store.running;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => store.refreshLive(), 250);
    return () => clearInterval(t);
  }, [running, store]);
  if (!p) return null;
  if (!s || !n) return <div style={{ padding: 12, color: C.faint, fontSize: 12 }}>Select a node in the scene tree or the viewport.</div>;

  // While the Animation panel previews, values are shown as they are at the playhead, and an
  // animated property's edit sets its key there (store.setNodeProp).
  const set = (name: string, v: PropValue) => store.setNodeProp(n.id, name, v, `Set ${n.name}.${name}`);
  const shown = (store.animClip && store.viewScene ? findNode(store.viewScene, n.id) : undefined) ?? n;
  const clip = store.animClip, player = store.animPlayer;
  const keyPath = clip && player && n.id !== player.id ? trackPath(s, player.id, n.id) : null;
  const keyed = (def: PropDef, row: React.ReactNode) => {
    if (keyPath === null || def.type === 'spriteFrames' || def.type === 'animations') return row;
    const animated = store.isAnimated(n.id, def.name);
    return (
      <div key={def.name} style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>{row}</div>
        <button type="button" data-testid={`key-${def.name}`} onClick={() => store.setKeyAt(n.id, def.name, propValue(n.type, shown.props, def.name))}
          title={animated ? `Animated by "${clip!.name}": editing sets the key at ${store.anim.time.toFixed(2)} s. Click to key the value shown.` : `Add a key for ${def.name} at ${store.anim.time.toFixed(2)} s in "${clip!.name}"`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: animated ? C.warn : C.faint, fontSize: 12, padding: '0 6px 0 0' }}>◆</button>
      </div>
    );
  };
  const live = store.running?.live ?? null;

  const control = (def: PropDef) => {
    const v = propValue(n.type, shown.props, def.name);
    const lv = live ? liveText(live[def.name], def) : undefined;
    const help = def.help;
    switch (def.type) {
      case 'vec2': {
        const q = v as Vec2;
        return <Row key={def.name} label={def.name} help={help} live={lv}>
          <NumberField testid={`prop-${def.name}-x`} label="x" color={C.x} value={q.x} step={def.step ?? 1} digits={3} onCommit={(x) => set(def.name, { x, y: q.y })} />
          <NumberField testid={`prop-${def.name}-y`} label="y" color={C.y} value={q.y} step={def.step ?? 1} digits={3} onCommit={(y) => set(def.name, { x: q.x, y })} />
        </Row>;
      }
      case 'angle':
        return <Row key={def.name} label={def.name} help={`${help} Type degrees here.`} live={lv}>
          <NumberField testid={`prop-${def.name}`} value={(v as number) * DEG} step={1} digits={2} onCommit={(d) => set(def.name, d / DEG)} /><span style={{ color: C.faint }}>°</span>
        </Row>;
      case 'number':
        return <Row key={def.name} label={def.name} help={help} live={lv}>
          <NumberField testid={`prop-${def.name}`} value={v as number} step={def.step ?? 1} onCommit={(x) => set(def.name, Math.min(def.max ?? Infinity, Math.max(def.min ?? -Infinity, x)))} />
          {def.min !== undefined && def.max !== undefined && <input type="range" min={def.min} max={def.max} step={def.step ?? 0.01} value={v as number} onChange={(e) => set(def.name, Number(e.target.value))} style={{ flex: 1, minWidth: 40 }} />}
        </Row>;
      case 'bool':
        return <Row key={def.name} label={def.name} help={help} live={lv}><input data-testid={`prop-${def.name}`} type="checkbox" checked={v as boolean} onChange={(e) => set(def.name, e.target.checked)} /></Row>;
      case 'texture': {
        const img = store.imageFor(v as string | null);
        return <Row key={def.name} label={def.name} help={help}>
          <select data-testid={`prop-${def.name}`} value={(v as string) ?? ''} onChange={(e) => set(def.name, e.target.value || null)} style={{ ...selectStyle, flex: 1 }}>
            <option value="">(none)</option>
            {p.assets.map((a) => <option key={a.id} value={a.path}>{a.path.replace(/^assets\//, '')}</option>)}
          </select>
          {img && <img src={img.src} alt="" style={{ width: 22, height: 22, objectFit: 'contain', imageRendering: 'pixelated', background: C.bg }} />}
        </Row>;
      }
      case 'enum':
        return <Row key={def.name} label={def.name} help={help} live={lv}>
          <select data-testid={`prop-${def.name}`} value={v as string} onChange={(e) => set(def.name, e.target.value)} style={{ ...selectStyle, flex: 1 }}>
            {def.options!.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Row>;
      case 'layers': {
        // Layers 1–16 as toggles (layer n is bit n − 1), in two rows of eight.
        const bits = v as number;
        return <Row key={def.name} label={def.name} help={`${help} Click a number to turn that layer on or off.`} live={lv}>
          <span style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 20px)', gap: 2 }}>
            {Array.from({ length: 16 }, (_, i) => {
              const on = (bits & (1 << i)) !== 0;
              return <button key={i} type="button" data-testid={`prop-${def.name}-${i + 1}`} onClick={() => set(def.name, bits ^ (1 << i))}
                style={{ width: 20, height: 18, fontSize: 10, padding: 0, borderRadius: 2, cursor: 'pointer', border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accent : C.bg, color: on ? '#0b1320' : C.faint }}>{i + 1}</button>;
            })}
          </span>
        </Row>;
      }
      case 'color':
        return <Row key={def.name} label={def.name} help={help}><input type="color" value={v as string} onChange={(e) => set(def.name, e.target.value)} /></Row>;
      case 'spriteFrames':
        return <div key={def.name} title={help}>
          <SpriteFramesEditor store={store} frames={v as SpriteAnimation[]} current={propValue(n.type, n.props, 'animation') as string}
            onChange={(frames, animation) => store.act((d) => d.setProps(s.id, n.id, animation === undefined ? { frames } : { frames, animation }, `Edit ${n.name}'s animations`))} />
        </div>;
      case 'string':
        // An AnimatedSprite2D's animation is one of its animations' names.
        if (n.type === 'AnimatedSprite2D' && def.name === 'animation') {
          const names = (propValue(n.type, n.props, 'frames') as SpriteAnimation[]).map((a) => a.name);
          return <Row key={def.name} label={def.name} help={help} live={lv}>
            <select data-testid={`prop-${def.name}`} value={v as string} onChange={(e) => set(def.name, e.target.value)} style={{ ...selectStyle, flex: 1 }}>
              {!names.includes(v as string) && <option value={v as string}>{v as string} (no such animation: nothing shows)</option>}
              {names.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Row>;
        }
        return <Row key={def.name} label={def.name} help={help} live={lv}><TextField testid={`prop-${def.name}`} value={v as string} onCommit={(x) => set(def.name, x)} /></Row>;
    }
  };

  // ── instances: which scene this comes from, and what is changed here ──
  const model = findNode(s, n.id);                                   // undefined for a node inside an instance
  const owner = n.inherited ? findNode(s, n.inherited.instance) : model?.instance ? model : undefined;
  const source = owner?.instance ?? null;
  /** The properties this scene changes on the node (an instance's own, or overrides inside one). */
  const changedHere = n.inherited ? owner?.overrides?.[n.inherited.path] ?? {} : model?.instance ? model.props : null;
  /** The value from the source scene, which ↺ puts back. */
  const sourceValue = (name: string): PropValue | undefined => {
    if (!source || !p) return undefined;
    let src = expandSceneRoot(p, source);
    if (n.inherited) for (const part of n.inherited.path.split('/')) src = src.children.find((c) => c.name === part) ?? src;
    return propValue(src.type, src.props, name);
  };
  const openSource = () => { const sc = source && p.scenes.find((x) => x.path === source); if (sc) store.openScene(sc.id); };
  const marked = (def: PropDef, row: React.ReactNode) => {
    if (!changedHere || !(def.name in changedHere)) return row;
    return (
      <div key={def.name} data-testid={`override-${def.name}`} style={{ display: 'flex', alignItems: 'center', borderLeft: `2px solid ${C.warm}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>{row}</div>
        <button type="button" data-testid={`reset-${def.name}`} title={`Changed for this instance. Click to use ${source}'s value again.`} onClick={() => set(def.name, sourceValue(def.name) as PropValue)}
          style={{ background: 'none', border: 'none', color: C.warm, cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>↺</button>
      </div>
    );
  };

  const isRoot = n.id === s.root.id;
  let code: string;
  if (n.inherited) {
    const at = pathOf(store.expanded!, n.id);
    const lines = Object.entries(changedHere ?? {}).map(([k, v]) => `scene.get(${lit(at)}).${k} = ${lit(v)}`);
    code = `// Part of ${owner?.name}, an instance of ${source}.\n${lines.length ? lines.join('\n') : '// Nothing changed here for this instance.'}`;
  } else if (isRoot) code = `scene = project.createScene(${lit(s.path)}, ${lit(n.type)}, ${lit(n.name)})`;
  else {
    const parentPath = pathOf(s, parentOf(s, n.id)!.id);
    const where = { name: n.name, ...(parentPath !== '.' ? { parent: parentPath } : {}) };
    code = model?.instance
      ? `scene.instance(${lit(model.instance)}, ${lit({ ...where, ...model.props })})`
      : `scene.add(${lit(n.type)}, ${lit({ ...where, ...n.props, ...(n.script ? { script: n.script } : {}) })})`;
  }

  return (
    <div data-testid="inspector" style={{ fontSize: 12 }}>
      <div style={{ padding: '8px 8px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 15 }}>{nodeType(n.type).icon}</span>
        <div style={{ flex: 1 }}><TextField testid="node-name" value={n.name} onCommit={(v) => store.act((d) => d.rename(s.id, n.id, v))} /></div>
      </div>
      <div title={nodeType(n.type).help} style={{ padding: '0 8px 6px', color: C.faint, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {lineage(n.type).map((t, i) => (
          <React.Fragment key={t.type}>
            {i > 0 && <span>›</span>}
            <span role="link" data-testid={`inspector-ref-${t.type}`} title={`${t.type} in the API reference`} onClick={() => store.showReference(t.type)} style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}>{t.type}</span>
          </React.Fragment>
        ))}
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => store.showReference(n.type)} title="What a script can do with this node: the API reference" style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 9, color: C.dim, cursor: 'pointer', fontSize: 11, padding: '0 6px' }}>?</button>
      </div>
      {source && (
        <div data-testid="instance-note" style={{ margin: '0 8px 6px', padding: '4px 6px', border: `1px solid ${C.border}`, borderRadius: 3, color: C.dim, fontSize: 11, lineHeight: 1.45 }}>
          {n.inherited ? <>Part of <b>{owner?.name}</b>, an instance of </> : <>⧉ An instance of </>}
          <span role="link" onClick={openSource} style={{ color: C.accent, cursor: 'pointer', fontFamily: C.mono }}>{source}</span>.{' '}
          Changes here are for this instance only (marked <span style={{ color: C.warm }}>▌</span>, ↺ puts back the scene&apos;s value); change the scene itself to change every instance.
        </div>
      )}
      {running && <div style={{ margin: '0 8px 6px', color: C.live, fontSize: 11 }}>Purple values are the running game&apos;s. They are not saved: stopping the game puts the editor&apos;s values back in charge.</div>}
      {lineage(n.type).filter((t) => t.props.length).map((t) => (
        <Section key={t.type} title={SECTION[t.type] ?? t.type}>{t.props.map((def) => keyed(def, marked(def, control(def))))}</Section>
      ))}
      <Section title="Groups">
        <Groups store={store} node={n} editable={!n.inherited} />
      </Section>
      <Section title="Signals">
        <Signals store={store} node={n} editable={!n.inherited} />
      </Section>
      <Section title="Script">
        {n.inherited ? (
          n.script ? <Row label="file"><span role="link" onClick={() => store.openScript(n.script!)} style={{ fontFamily: C.mono, color: C.warn, cursor: 'pointer' }}>{n.script}</span></Row>
            : <span style={{ color: C.faint }}>None. Scripts of nodes inside an instance are set in {source}.</span>
        ) : n.script ? (
          <>
            <Row label="file"><span style={{ fontFamily: C.mono, color: C.warn }}>{n.script}</span></Row>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <Btn small testid="open-script" onClick={() => store.openScript(n.script!)}>Open</Btn>
              <Btn small testid="detach-script" onClick={() => store.act((d) => d.setScript(s.id, n.id, null))}>Detach</Btn>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <Btn small testid="new-script" onClick={() => store.newScriptFor(n.id)} title="A new JavaScript file for this node, from a template">New script</Btn>
            {p.scripts.length > 0 && (
              <select data-testid="attach-script" value="" onChange={(e) => e.target.value && store.act((d) => d.setScript(s.id, n.id, e.target.value))} style={selectStyle}>
                <option value="">Attach existing…</option>
                {p.scripts.map((x) => <option key={x.path} value={x.path}>{x.path}</option>)}
              </select>
            )}
          </div>
        )}
      </Section>
      <Section title="Code">
        <div style={{ color: C.faint, marginBottom: 4 }}>The Scene API call that makes this node as it is now:</div>
        <pre data-testid="node-code" style={{ margin: 0, padding: 6, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, fontFamily: C.mono, fontSize: 11, color: C.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{code}</pre>
      </Section>
    </div>
  );
}

/** The groups a node is in: names scripts use to find nodes (scene.getNodesInGroup("enemies")). */
function Groups({ store, node, editable }: { store: Store; node: NodeData; editable: boolean }) {
  const s = store.scene!, groups = node.groups ?? [];
  const [text, setText] = React.useState('');
  const set = (next: string[]) => store.act((d) => d.setGroups(s.id, node.id, next));
  return (
    <div data-testid="groups" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {groups.map((g) => (
        <span key={g} style={{ fontFamily: C.mono, fontSize: 11, background: C.raised, border: `1px solid ${C.border}`, borderRadius: 3, padding: '0 5px' }}>
          {g}{editable && <span data-testid={`group-remove-${g}`} onClick={() => set(groups.filter((x) => x !== g))} title="Take it out of this group" style={{ marginLeft: 4, color: C.faint, cursor: 'pointer' }}>×</span>}
        </span>
      ))}
      {groups.length === 0 && <span style={{ color: C.faint }}>None.</span>}
      {editable && <input data-testid="group-add" value={text} placeholder="add a group…" spellCheck={false} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter' && text.trim()) { set([...groups, text.trim()]); setText(''); } }}
        style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 3, fontSize: 11, padding: '1px 4px', width: 110 }} />}
    </div>
  );
}

/** The engine's own signals for a node type (its callbacks, also emitted as signals). */
const BUILTIN_SIGNALS: Record<string, string[]> = { Area2D: ['bodyEntered', 'bodyExited'], RigidBody2D: ['onCollision'], AnimatedSprite2D: ['animationFinished'], AnimationPlayer: ['animationFinished'] };

/** Signal connections: when this node emits a signal, a method of another node runs. Saved in the scene. */
function Signals({ store, node, editable }: { store: Store; node: NodeData; editable: boolean }) {
  const s = store.scene!, view = store.expanded!;
  const [signal, setSignal] = React.useState(BUILTIN_SIGNALS[node.type]?.[0] ?? '');
  const [target, setTarget] = React.useState('');
  const [method, setMethod] = React.useState('');
  const nodes = [...walk(view.root)].filter((x) => x.id !== node.id);
  const nameOf = (id: string) => { const t = findNode(view, id); return t ? pathOf(view, t.id) : '(gone)'; };
  const list = node.connections ?? [];
  return (
    <div data-testid="signals" style={{ display: 'grid', gap: 4 }}>
      {list.map((c, i) => (
        <div key={i} data-testid={`connection-${i}`} style={{ fontFamily: C.mono, fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ color: C.warm }}>{c.signal}</span><span style={{ color: C.faint }}>→</span><span style={{ flex: 1 }}>{nameOf(c.target)}.{c.method}()</span>
          {editable && <span onClick={() => store.act((d) => d.disconnect(s.id, node.id, c.signal, c.target, c.method))} title="Disconnect" style={{ color: C.faint, cursor: 'pointer' }}>×</span>}
        </div>
      ))}
      {list.length === 0 && <span style={{ color: C.faint }}>No connections.{editable ? ' Connect a signal to another node\u2019s method:' : ''}</span>}
      {editable && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          <input data-testid="signal-name" list="gs-signals" value={signal} onChange={(e) => setSignal(e.target.value)} placeholder="signal" spellCheck={false} onKeyDown={(e) => e.stopPropagation()}
            title="The engine's signals for this node are suggested; a script can emit any name with this.emit(name)" style={{ ...selectStyle, width: 100 }} />
          <datalist id="gs-signals">{(BUILTIN_SIGNALS[node.type] ?? []).map((x) => <option key={x} value={x} />)}</datalist>
          <span style={{ color: C.faint }}>→</span>
          <select data-testid="signal-target" value={target} onChange={(e) => setTarget(e.target.value)} style={{ ...selectStyle, maxWidth: 110 }}>
            <option value="">node…</option>
            {nodes.map((x) => <option key={x.id} value={x.id}>{pathOf(view, x.id)}</option>)}
          </select>
          <input data-testid="signal-method" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="method" spellCheck={false} onKeyDown={(e) => e.stopPropagation()} style={{ ...selectStyle, width: 80 }} />
          <Btn small testid="signal-connect" disabled={!signal || !target || !method} onClick={() => { store.act((d) => d.connect(s.id, node.id, signal, target, method)); setMethod(''); }}>Connect</Btn>
        </div>
      )}
    </div>
  );
}
