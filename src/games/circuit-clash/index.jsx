import { useEffect, useRef, useState } from 'react';
import { useOpenLab } from '../../components/desktop/useOpenLab.js';
import { createScene } from './scene.js';
import { createRace, stepRace, drive, rank, STEP, LAPS, UPGRADES, readGarage, purchase, SAVE_KEY, observe, legalActions } from './simulation.js';
import initialPolicy from './policy.json';
import './style.css';

export const meta = { key: 'circuit-clash', label: 'Circuit Clash', emoji: '🏎️', width: 1240, height: 820 };
const keysUsed = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyR', 'Digit1', 'Digit2', 'Escape'];
const seconds = n => n == null ? '—' : `${Math.floor(n / 60)}:${(n % 60).toFixed(2).padStart(5, '0')}`;
const freshGarage = () => { try { return readGarage(window.localStorage); } catch { return readGarage({ getItem: () => null }); } };

export default function CircuitClash() {
  const root = useRef(null), host = useRef(null), keys = useRef(new Set()), queue = useRef([]), worker = useRef(null);
  const race = useRef(null), screenRef = useRef('menu'), awarded = useRef(false), weaponRef = useRef('rocket');
  const watching = useRef(false);
  const [garage, setGarage] = useState(freshGarage);
  const [policy, setPolicy] = useState(initialPolicy);
  const [screen, setScreen] = useState('menu');
  const [weapon, setWeapon] = useState('rocket');
  const [mode, setMode] = useState('learned');
  const [view, setView] = useState(null);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [training, setTraining] = useState(null);
  const openLab = useOpenLab();
  if (!race.current) race.current = createRace({ upgrade: garage.selected, policy: policy.policy });
  function go(next) { screenRef.current = next; setScreen(next); keys.current.clear(); queue.current = []; }
  function pause() {
    if (screenRef.current !== 'racing') return;
    race.current.phase = 'paused';
    setView(v => v ? { ...v, time: race.current.time, player: { ...race.current.racers[0] } } : v);
    go('paused');
  }
  function resume() { race.current.phase = race.current.countdown > 0 ? 'countdown' : 'racing'; go('racing'); root.current?.focus(); }
  function start(watch = false) {
    if (error) return;
    race.current = createRace({ seed: Date.now() >>> 0, upgrade: garage.selected, mode, policy: policy.policy });
    watching.current = watch === true;
    awarded.current = false; setView(null); go('racing'); root.current?.focus();
  }
  useEffect(() => {
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(garage)); setSaveError(''); }
    catch { setSaveError('Saving is unavailable. Your garage works for this session.'); }
  }, [garage]);
  useEffect(() => {
    let scene;
    try { scene = createScene(host.current); }
    catch { setError('This sample needs WebGL 2. Enable hardware acceleration or try another browser. You can still read the opening lesson.'); return; }
    let frame, previous = 0, accumulator = 0, lastUi = 0;
    const tick = now => {
      const elapsed = previous ? Math.min(0.1, (now - previous) / 1000) : 0;
      previous = now;
      const r = race.current;
      if (screenRef.current === 'racing') {
        accumulator += elapsed;
        while (accumulator >= STEP) {
          const held = keys.current;
          const action = queue.current.shift() || 'race';
          stepRace(r, { 0: watching.current ? drive(r, r.racers[0]) : { throttle: held.has('ArrowUp') || held.has('KeyW') ? 1 : 0,
            brake: held.has('ArrowDown') || held.has('KeyS'),
            steer: Number(held.has('ArrowRight') || held.has('KeyD')) - Number(held.has('ArrowLeft') || held.has('KeyA')),
            action, recover: action === 'recover' } });
          accumulator -= STEP;
          if (r.phase === 'finished') {
            if (!awarded.current) {
              awarded.current = true;
              const place = rank(r).findIndex(k => k.id === 0) + 1;
              const prize = watching.current || r.racers[0].finish == null ? 0 : 60 + (4 - place) * 30;
              r.prize = prize;
              setGarage(g => ({ ...g, credits: Math.min(100000, g.credits + prize) }));
            }
            go('results'); break;
          }
        }
      } else accumulator = 0;
      scene.draw(r, ['menu', 'garage', 'learning'].includes(screenRef.current));
      if (now - lastUi > 100) {
        lastUi = now;
        setView({ player: { ...r.racers[0] }, time: r.time, countdown: r.countdown,
          order: rank(r).map(k => ({ ...k })), events: r.events.filter(e => r.time - e.time < 4),
          state: observe(r, r.racers[1]), legal: legalActions(r.racers[1]), prize: r.prize, seed: r.seed, watching: watching.current });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const hidden = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause); document.addEventListener('visibilitychange', hidden);
    return () => {
      cancelAnimationFrame(frame); scene.dispose(); worker.current?.terminate();
      window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
  function press(code, repeat = false) {
    if (code === 'Escape') { if (!repeat) screenRef.current === 'paused' ? resume() : pause(); return; }
    if (screenRef.current !== 'racing') return;
    keys.current.add(code);
    if (repeat) return;
    if (code === 'Digit1' || code === 'Digit2') { weaponRef.current = code === 'Digit1' ? 'rocket' : 'mine'; setWeapon(weaponRef.current); }
    const action = { Space: weaponRef.current, ShiftLeft: 'boost', ShiftRight: 'boost', KeyE: 'shield', KeyR: 'recover' }[code];
    if (action) queue.current.push(action);
  }
  function train() {
    setTraining({ episodes: 0 });
    try {
      worker.current?.terminate();
      const w = new Worker(new URL('./training.worker.js', import.meta.url), { type: 'module' });
      worker.current = w;
      w.onmessage = ({ data }) => {
        if (data.type === 'done') { setPolicy(data.result); race.current.policy = data.result.policy; setTraining(null); w.terminate(); }
        else if (data.type === 'error') { setTraining({ error: data.message }); w.terminate(); }
        else setTraining(data);
      };
      w.onerror = () => { setTraining({ error: 'Training could not start. The included policy is still available.' }); w.terminate(); };
      w.postMessage({});
    } catch { setTraining({ error: 'Training is unavailable in this browser. The included policy still works.' }); }
  }
  const player = view?.player || race.current.racers[0];
  const place = (view?.order.findIndex(r => r.id === 0) ?? 0) + 1;
  const touch = (code, label, className = '') => <button className={className} aria-label={label}
    onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); press(code); }}
    onPointerUp={() => keys.current.delete(code)} onPointerCancel={() => keys.current.delete(code)}
    onLostPointerCapture={() => keys.current.delete(code)}>{label}</button>;
  return <div className="cc-game" ref={root} tabIndex={0}
    onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) pause(); }}
    onKeyDown={e => { if (keysUsed.includes(e.code) && (screenRef.current === 'racing' || (screenRef.current === 'paused' && e.code === 'Escape'))) { e.preventDefault(); press(e.code, e.repeat); } }}
    onKeyUp={e => keys.current.delete(e.code)}>
    <div className="cc-scene" ref={host} />
    <div className="cc-vignette" />
    <header className="cc-top"><span className="cc-wordmark">CC<span> / </span>CIRCUIT CLASH</span><span className="cc-tag">ALPINE CIRCUIT · {LAPS} LAPS</span></header>
    {error && <div className="cc-error" role="alert">{error}</div>}
    {['menu', 'garage', 'learning'].includes(screen) && <div className="cc-menu">
      <nav className="cc-tabs" aria-label="Game menu">{[['menu', 'Race'], ['garage', 'Garage'], ['learning', 'Learning rivals']].map(([key, label]) => <button key={key} aria-current={screen === key ? 'page' : undefined} onClick={() => go(key)}>{label}</button>)}</nav>
      {screen === 'menu' && <section className="cc-panel cc-hero">
        <p className="cc-eyebrow">PLAY FIRST. BUILD IT YOURSELF.</p>
        <h1>Good lines.<br />Bad intentions.</h1>
        <p>Take the mountain circuit. Outrace three rivals.<br />Save a shield for the one behind you.</p>
        <div className="cc-badges"><span>3D chase camera</span><span>Weapons + upgrades</span><span>Q-learning tactics</span></div>
        <label className="cc-select">Rival tactics <select value={mode} onChange={e => setMode(e.target.value)}><option value="learned">Trained Q-learning policy</option><option value="scripted">Scripted comparison</option></select></label>
        <button className="cc-primary" onClick={start} disabled={!!error}>Start race <span>→</span></button>
        <button className="cc-link" onClick={() => start(true)} disabled={!!error}>Watch a demo race</button>
        <button className="cc-link" onClick={() => openLab('project-studio', '?track=circuit-clash')}>Open Project Studio · Circuit Clash introduction ↗</button>
        <p className="cc-note">Playable browser reference. The standalone C# course is in development; its introduction is available now.</p>
      </section>}
      {screen === 'garage' && <section className="cc-panel cc-garage">
        <p className="cc-eyebrow">BUILD FOR YOUR DRIVING STYLE</p><h1>The garage.</h1>
        <p>Choose one package. More speed isn’t always a faster lap.</p>
        <div className="cc-wallet">{garage.credits} <span>credits · earn more by finishing races</span></div>
        <div className="cc-upgrades">{Object.entries(UPGRADES).map(([key, spec]) => <article key={key} data-selected={garage.selected === key}>
          <span className="cc-upgrade-icon">{key === 'engine' ? '↗' : key === 'handling' ? '⌁' : '⬡'}</span><h2>{spec.label}</h2><p>{spec.detail}</p>
          <dl><dt>Top speed</dt><dd>{Math.round(spec.speed * 3.6)} km/h</dd><dt>Steering</dt><dd>{spec.turn.toFixed(1)}</dd><dt>Hit penalty</dt><dd>{spec.armor * 100}%</dd></dl>
          <button disabled={garage.selected === key || (!garage.owned.includes(key) && garage.credits < 150)} onClick={() => setGarage(g => purchase(g, key))}>
            {garage.selected === key ? 'Equipped' : garage.owned.includes(key) ? 'Equip' : 'Unlock · 150 credits'}</button>
        </article>)}</div>
        <button className="cc-primary" onClick={start} disabled={!!error}>Race with {UPGRADES[garage.selected].label} →</button>
        {saveError && <p role="status">{saveError}</p>}
      </section>}
      {screen === 'learning' && <section className="cc-panel cc-learning">
        <p className="cc-eyebrow">AN OPPONENT YOU CAN EXPLAIN</p><h1>Learn the fight.</h1>
        <p>Waypoint steering drives the karts. A Q-table chooses <strong>race, rocket, mine, shield, or boost</strong> every half-second. All racers obey the same equipment rules.</p>
        <div className="cc-metrics"><div><b>{policy.episodes}</b><span>training races</span></div><div><b>{Object.keys(policy.policy).length}</b><span>visited states</span></div><div><b>{policy.totalUpdates.toLocaleString()}</b><span>Q updates</span></div></div>
        <p>Training alternates scripted rivals and frozen snapshots of earlier policies. Rewards favor track progress, successful hits, blocks, and finishing; damage has a cost. Evaluation uses separate seeds.</p>
        <table><caption>Held-out evaluation · same driving controller · {policy.evaluation.learned.records.length} races per policy</caption><thead><tr><th>Tactics</th><th>Mean finish</th><th>Mean place</th></tr></thead><tbody>
          {['learned', 'scripted'].map(k => <tr key={k}><th>{k === 'learned' ? 'Q-learning' : 'Scripted'}</th><td>{seconds(policy.evaluation[k].meanSeconds)}</td><td>{policy.evaluation[k].meanRank.toFixed(2)}</td></tr>)}
        </tbody></table>
        <p className="cc-note">This small benchmark is not proof of general intelligence or superiority against people. Policies are frozen during your race. Retraining uses the same reproducible seeds and does not learn from your personal races.</p>
        <button className="cc-primary" disabled={training && !training.error} onClick={train}>{training && !training.error ? `Training ${training.episodes} / 600 races…` : 'Run the training experiment again'}</button>
        {training?.error && <p role="alert">{training.error}</p>}
      </section>}
      <aside className="cc-controls"><h2>Your first lap</h2><p><kbd>W A S D</kbd> or <kbd>↑ ← ↓ →</kbd> Drive</p><p><kbd>1</kbd> Rocket <kbd>2</kbd> Mine <kbd>Space</kbd> Fire</p><p><kbd>Shift</kbd> Boost <kbd>E</kbd> Shield</p><p><kbd>R</kbd> Recover <kbd>Esc</kbd> Pause</p><small>Mint crystals refill equipment. Yellow posts mark checkpoints. Cross them in order; the grass slows you down.</small></aside>
    </div>}
    {['racing', 'paused', 'results'].includes(screen) && <>
      <div className="cc-race-hud"><div className="cc-position"><b>{place}<small>/4</small></b><span>POSITION</span></div><div><b>{Math.min(LAPS, player.lap + 1)}<small>/{LAPS}</small></b><span>LAP</span></div><div><b>{seconds(view?.time || 0)}</b><span>RACE TIME</span></div><button onClick={pause} disabled={screen !== 'racing'}>Pause</button></div>
      <ol className="cc-leaderboard">{view?.order.map((r, i) => <li key={r.id} data-player={r.id === 0}><span style={{ color: r.color }}>●</span><span>{i + 1}. {r.name}</span><small>{r.finish != null ? 'Finished' : r.id === 0 ? 'You' : mode === 'learned' ? r.action : 'Scripted'}</small></li>)}</ol>
      {view?.watching && screen === 'racing' && <div className="cc-demo-label">DEMO DRIVER · no credits awarded</div>}
      <div className="cc-feed" aria-live="polite">{view?.events.slice(0, 2).map((e, i) => <p key={`${e.time}-${i}`}>{e.text}</p>)}</div>
      <div className="cc-bottom"><div className="cc-speed"><b>{Math.round(player.speed * 3.6)}</b><span>KM/H</span></div><div className="cc-equipment">
        <button className={weapon === 'rocket' ? 'selected' : ''} onClick={() => { weaponRef.current = 'rocket'; setWeapon('rocket'); }}><kbd>1</kbd> Rocket <b>{player.rockets}</b></button>
        <button className={weapon === 'mine' ? 'selected' : ''} onClick={() => { weaponRef.current = 'mine'; setWeapon('mine'); }}><kbd>2</kbd> Mine <b>{player.mines}</b></button>
        <div className="cc-energy"><span>ENERGY {Math.floor(player.energy)}% {player.shield > 0 ? '· SHIELD ACTIVE' : player.boost > 0 ? '· BOOSTING' : ''}</span><meter min="0" max="100" value={player.energy} aria-label="Energy" /></div>
      </div><p className="cc-bottom-hint">Space · fire<br />Shift · boost / E · shield</p></div>
      {screen === 'racing' && (view?.countdown ?? 3) > 0 && <div className="cc-countdown" aria-live="polite">{Math.ceil(view?.countdown ?? 3)}<span>GET READY</span></div>}
      {screen === 'racing' && <div className="cc-touch" aria-label="Touch driving controls"><div>{touch('ArrowLeft', '◀')}{touch('ArrowRight', '▶')}{touch('ArrowUp', 'Go')}{touch('ArrowDown', 'Brake')}</div><div>{touch('Space', 'Fire')}{touch('ShiftLeft', 'Boost')}{touch('KeyE', 'Shield')}{touch('KeyR', 'Recover')}</div></div>}
    </>}
    {screen === 'paused' && <div className="cc-modal"><section className="cc-panel"><p className="cc-eyebrow">TAKE A BREATHER</p><h1>Race paused.</h1><p>The clock and all opponents are stopped.</p><button className="cc-primary" onClick={resume}>Resume race →</button><button onClick={start}>Restart race</button><button onClick={() => go('menu')}>Return to menu</button></section></div>}
    {screen === 'results' && <div className="cc-modal"><section className="cc-panel cc-results"><p className="cc-eyebrow">{player.finish == null ? 'TIME LIMIT REACHED' : 'CHEQUERED FLAG'}</p><h1>{player.finish == null ? 'Next lap, next time.' : place === 1 ? 'Mountain conquered.' : 'That was a race.'}</h1>
      <p>{player.finish == null ? 'Finish within three minutes to earn credits. Try braking before the tighter turns.' : `${seconds(player.finish)} · ${player.hits} hits landed · +${view?.prize ?? race.current.prize ?? 0} credits`}</p>
      <ol>{view?.order.map(r => <li key={r.id}><span style={{ color: r.color }}>{r.name}</span><span>{r.finish != null ? seconds(r.finish) : 'On track'}</span></li>)}</ol>
      <button className="cc-primary" onClick={start}>Race again →</button><button onClick={() => go('garage')}>Visit the garage</button><button onClick={() => go('menu')}>Main menu</button>
      <p className="cc-note">Results stop when you finish. Unfinished rivals are ranked by checkpoint progress.</p>
    </section></div>}
  </div>;
}
