// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ open: vi.fn(), dispose: vi.fn() }));
vi.mock('../../components/desktop/useOpenLab.js', () => ({ useOpenLab: () => mocks.open }));
vi.mock('./scene.js', () => ({ createScene: () => ({ draw() {}, dispose: mocks.dispose }) }));
import CircuitClash from './index.jsx';
let callback, time;
function advance(count) { act(() => { for (let i = 0; i < count; i++) { time += 1000 / 60; callback(time); } }); }
beforeEach(() => {
  localStorage.clear(); time = 1; callback = null;
  vi.stubGlobal('requestAnimationFrame', fn => { callback = fn; return 1; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('sample menu and race lifecycle', () => {
  it('opens the actual introduction and purchases an upgrade only once', () => {
    render(<CircuitClash />);
    fireEvent.click(screen.getByRole('button', { name: /Open Project Studio/ }));
    expect(mocks.open).toHaveBeenCalledWith('project-studio', '?track=circuit-clash');
    fireEvent.click(screen.getByRole('button', { name: 'Garage', exact: true }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Unlock · 150 credits' })[0]);
    expect(screen.getByRole('button', { name: /Race with Turbo engine/ })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('circuit-clash:garage:v1')).credits).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Equip', exact: true }));
    expect(screen.getByRole('button', { name: /Race with Rally chassis/ })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('circuit-clash:garage:v1')).credits).toBe(0);
  });
  it('handles manual keyboard input, pauses on focus loss and does not keep accelerating on resume', () => {
    const { container } = render(<CircuitClash />);
    fireEvent.click(screen.getByRole('button', { name: /Start race/ })); advance(190);
    fireEvent.keyDown(container.querySelector('.cc-game'), { code: 'KeyW' }); advance(60);
    expect(Number(container.querySelector('.cc-speed b').textContent)).toBeGreaterThan(0);
    fireEvent.blur(window); expect(screen.getByText('Race paused.')).toBeTruthy();
    const before = container.querySelector('.cc-race-hud').textContent; advance(100);
    expect(container.querySelector('.cc-race-hud').textContent).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: /Resume race/ }));
    const speed = Number(container.querySelector('.cc-speed b').textContent); advance(60);
    expect(Number(container.querySelector('.cc-speed b').textContent)).toBeLessThan(speed);
  });
  it('finishes a demo, shows results, awards no demo credits and cleans up rendering', () => {
    const { unmount } = render(<CircuitClash />);
    fireEvent.click(screen.getByRole('button', { name: 'Watch a demo race' })); advance(60 * 80);
    expect(screen.getByText('CHEQUERED FLAG')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Race again/ })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('circuit-clash:garage:v1')).credits).toBe(150);
    advance(60); expect(JSON.parse(localStorage.getItem('circuit-clash:garage:v1')).credits).toBe(150);
    unmount(); expect(mocks.dispose).toHaveBeenCalledTimes(1);
  });
});
