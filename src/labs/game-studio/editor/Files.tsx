// The project's files (the specification's §18): scenes, scripts and images. Click a
// scene or script to open it; drag an image into the viewport to make a Sprite2D.

import React, { useRef, useState } from 'react';
import type { Store } from './store';
import { Btn, C, selectStyle, useStore } from './kit';
import { nodeTypes } from '../core/registry';
import { ASSET_DRAG } from './Viewport';

function Group({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '5px 8px 2px', color: C.faint, fontSize: 11, fontWeight: 700, letterSpacing: 0.4 }}>
        <span style={{ flex: 1 }}>{title}</span>{action}
      </div>
      {children}
    </div>
  );
}

// Long names shorten with "…" so the buttons at the end of a row (★, ⧉) stay in view.
const item = (active: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px 2px 14px', fontSize: 12, cursor: 'pointer', background: active ? '#2b4a6e' : 'transparent', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 });

export function Files({ store }: { store: Store }) {
  useStore(store);
  const p = store.project;
  const file = useRef<HTMLInputElement>(null);
  const [naming, setNaming] = useState<'scene' | 'script' | 'svg' | 'sound' | null>(null);
  const [rootType, setRootType] = useState('Node2D');
  if (!p) return null;

  const create = (kind: 'scene' | 'script' | 'svg' | 'sound', raw: string) => {
    setNaming(null);
    if (kind === 'svg') { store.newSvg(raw); return; }
    if (kind === 'sound') { store.newSound(raw); return; }
    const stem = raw.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
    if (!stem) return;
    if (kind === 'scene') store.createScene(`scenes/${stem}.scene`, rootType);
    else { store.act((d) => d.writeScript(`scripts/${stem}.js`, `// ${stem}.js\n`, `New script scripts/${stem}.js`)); store.openScript(`scripts/${stem}.js`); }
  };
  // A new scene's root can be any node type, as in Godot: a coin scene's root is an Area2D, a player's a CharacterBody2D.
  const namer = (kind: 'scene' | 'script' | 'svg' | 'sound') => naming === kind && (
    <div style={{ display: 'flex', gap: 4, margin: '2px 8px 4px 14px' }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) create(kind, (e.currentTarget.querySelector('input') as HTMLInputElement).value); }}>
      {kind === 'scene' && (
        <select data-testid="new-scene-root" value={rootType} onChange={(e) => setRootType(e.target.value)} title="The scene's root node" style={{ ...selectStyle, width: 96 }}>
          {nodeTypes().filter((t) => t.addable).map((t) => <option key={t.type} value={t.type}>{t.type}</option>)}
        </select>
      )}
      <input autoFocus data-testid={`new-${kind}-name`} placeholder={kind === 'scene' ? 'level_1' : kind === 'svg' ? 'card' : 'utils'}
        onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') create(kind, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setNaming(null); }}
        style={{ flex: 1, minWidth: 0, background: C.bg, color: C.text, border: `1px solid ${C.accent}`, fontSize: 12, padding: '1px 4px' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        <Group title="scenes/" action={<Btn small testid="new-scene" onClick={() => { setRootType('Node2D'); setNaming('scene'); }} title="New scene">+</Btn>}>
          {p.scenes.map((s) => (
            <div key={s.id} data-testid={`file-${s.path}`} onClick={() => store.openScene(s.id)} style={item(store.sceneId === s.id && store.tab.kind === 'scene')}>
              <span>🎬</span><span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.path.replace(/^scenes\//, '')}</span>
              {p.settings.mainScene === s.path
                ? <span title="The main scene: Run Project starts here" style={{ color: C.warn }}>★</span>
                : <span data-testid={`main-scene-${s.path}`} title="Make this the main scene" onClick={(e) => { e.stopPropagation(); store.act((d) => d.setMainScene(s.path)); }} style={{ color: C.faint }}>☆</span>}
              {store.sceneId && store.sceneId !== s.id && (
                <span data-testid={`instance-${s.path}`} title={`Put an instance of ${s.path} into the scene you are editing (under the selected node). Changing ${s.path} later changes every instance.`}
                  onClick={(e) => { e.stopPropagation(); store.addInstance(s.path); }} style={{ color: C.accent, cursor: 'pointer', marginLeft: 4 }}>⧉</span>
              )}
            </div>
          ))}
          {namer('scene')}
        </Group>
        <Group title="scripts/" action={<Btn small testid="new-script-file" onClick={() => setNaming('script')} title="New script file">+</Btn>}>
          {p.scripts.map((x) => (
            <div key={x.path} data-testid={`file-${x.path}`} onClick={() => store.openScript(x.path)} style={item(store.tab.kind === 'script' && store.tab.path === x.path)}>
              <span style={{ color: C.warn, fontSize: 10 }}>JS</span><span>{x.path.replace(/^scripts\//, '')}{store.isScriptDirty(x.path) ? ' ●' : ''}</span>
            </div>
          ))}
          {namer('script')}
        </Group>
        {(p.tilesets ?? []).length > 0 && (
          <Group title="tilesets/">
            {(p.tilesets ?? []).map((t) => (
              <div key={t.path} data-testid={`file-${t.path}`} title={`${t.image}, tiles ${t.tileWidth} × ${t.tileHeight}, ${t.solid.length} solid. Edit it in the TileMap panel with a TileMapLayer that uses it selected.`} style={item(false)}>
                <span style={{ color: C.accent, fontSize: 10 }}>▦</span><span>{t.path.replace(/^tilesets\//, '')}</span>
              </div>
            ))}
          </Group>
        )}
        <Group title="assets/" action={<>
          <Btn small testid="new-svg" onClick={() => setNaming('svg')} title="A new SVG image: a picture written as text (shapes, paths and words), edited beside a live preview">New SVG…</Btn>
          <Btn small testid="new-sound" onClick={() => setNaming('sound')} title="A new sound effect, made from a few numbers (a wave, a pitch slide, a length) and edited beside its waveform. Play it with an AudioStreamPlayer.">New sound…</Btn>
          <Btn small testid="new-sprite" onClick={() => store.newSprite()} title="Draw a new sprite in Sprite Forge. Send it back from there (Send to Game Studio) and it is added here and put in the scene.">New sprite…</Btn>
          <Btn small testid="import-image" onClick={() => file.current?.click()} title="Import images (PNG, JPEG, WebP, GIF), or a Tiled map (.tmx or .tmj) with its tileset files (.tsx, .tsj): choose them together">Import…</Btn>
        </>}>
          <input ref={file} data-testid="import-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,.tmx,.tmj,.tsx,.tsj" multiple style={{ display: 'none' }}
            onChange={async (e) => { await store.importFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
          {p.assets.map((a) => {
            const img = store.images.get(a.id);
            if (a.sound) return (
              <div key={a.id} data-testid={`asset-${a.path}`} onClick={() => store.openScript(a.path)}
                title={`${a.path} · a ${a.sound.wave} wave, ${a.sound.length} s. Click to edit its recipe; ▶ to hear it. Play it with an AudioStreamPlayer.`} style={item(store.tab.kind === 'script' && store.tab.path === a.path)}>
                <span>🔊</span>
                <span style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.path.replace(/^assets\//, '')}{store.isScriptDirty(a.path) ? ' ●' : ''}</span>
                <button type="button" data-testid={`hear-${a.path}`} onClick={(e) => { e.stopPropagation(); store.previewSound(a.path); }} title="Hear it"
                  style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: '0 2px', fontSize: 11 }}>▶</button>
              </div>
            );
            return (
              <div key={a.id} data-testid={`asset-${a.path}`} draggable onDragStart={(e) => { e.dataTransfer.setData(ASSET_DRAG, a.path); e.dataTransfer.effectAllowed = 'copy'; }}
                onClick={a.svg !== undefined ? () => store.openScript(a.path) : undefined}
                title={`${a.path} · ${a.width} × ${a.height}. Drag into the viewport to make a Sprite2D.${a.svg !== undefined ? ' Click to edit its SVG.' : ''}`} style={item(store.tab.kind === 'script' && store.tab.path === a.path)}>
                {img ? <img src={img.src} alt="" style={{ width: 18, height: 18, objectFit: 'contain', imageRendering: 'pixelated' }} /> : <span>🖼</span>}
                <span style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.path.replace(/^assets\//, '')}{store.isScriptDirty(a.path) ? ' ●' : ''}</span>
                {a.svg === undefined && a.width <= 128 && a.height <= 128 && (
                  <button type="button" data-testid={`edit-sprite-${a.path}`} onClick={(e) => { e.stopPropagation(); store.editInSpriteForge(a.path); }}
                    title={`Edit in Sprite Forge. Send it back from there and this picture is updated everywhere it is used (Ctrl+Z puts the old one back).${a.origin?.startsWith('sprite-forge:') ? ' It was made there, so the original opens, frames and all.' : ''}`}
                    style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: '0 2px', fontSize: 12 }}>✎</button>
                )}
              </div>
            );
          })}
          {namer('svg')}
          {namer('sound')}
          {!p.assets.length && <div style={{ padding: '2px 14px', color: C.faint, fontSize: 11 }}>No images or sounds yet.</div>}
        </Group>
      </div>
    </div>
  );
}
