// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import DiffBlock from './DiffBlock.jsx';

const C = { border: '#333', surface2: '#222', muted: '#999', teal: '#2dd4bf', text: '#eee' };
const file = (n) => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join('\n');

afterEach(cleanup);

describe('DiffBlock', () => {
  it('shows a change in a long file as the change and a few lines around it', () => {
    const before = file(40);
    const after = before.replace('line 20', 'line 20\nnew line');
    const { container } = render(<DiffBlock current={before} target={after} C={C} />);
    expect(screen.getByText('1 new line to type')).toBeTruthy();
    expect(container.querySelectorAll('[data-diff]').length).toBe(7);
    expect(screen.getAllByText(/unchanged lines/).length).toBe(2);
  });

  it('marks a line to delete', () => {
    const before = file(10);
    const after = before.replace('line 5', 'five');
    const { container } = render(<DiffBlock current={before} target={after} C={C} />);
    expect(screen.getByText('1 new line to type, 1 line to delete')).toBeTruthy();
    expect(container.querySelector('[data-diff="remove"]').textContent).toContain('line 5');
  });

  it('shows the whole file on request', () => {
    const before = file(40);
    const after = before.replace('line 20', 'line 20\nnew line');
    const { container } = render(<DiffBlock current={before} target={after} C={C} />);
    fireEvent.click(screen.getByText('Show whole file'));
    expect(container.querySelectorAll('[data-diff]').length).toBe(41);
    expect(screen.queryByText(/unchanged lines/)).toBeNull();
  });

  it('shows a file not yet started as all new, with nothing to delete', () => {
    const { container } = render(<DiffBlock current="" target={'a\nb'} C={C} />);
    expect(screen.getByText('2 new lines to type')).toBeTruthy();
    expect(container.querySelectorAll('[data-diff="remove"]').length).toBe(0);
  });

  it('says so when the file already matches', () => {
    render(<DiffBlock current={'a\nb'} target={'a\nb'} C={C} />);
    expect(screen.getByText('✓ your file already matches this')).toBeTruthy();
  });
});

describe('DiffBlock, indentation', () => {
  it('tells the learner to indent a block instead of retyping it', () => {
    const before = 'import pygame\n\npygame.init()\nscreen = make()\nrun(screen)\n';
    const after = 'import pygame\n\n\ndef main():\n    pygame.init()\n    screen = make()\n    run(screen)\n';
    const { container } = render(<DiffBlock current={before} target={after} C={C} />);
    expect(screen.getByText('2 new lines to type, 3 lines to indent')).toBeTruthy();
    expect(container.querySelector('[data-diff="indented"]').textContent).toContain('lines 5–7: indent these 3 lines by 4 spaces (select them and press Tab)');
    expect(container.querySelectorAll('[data-diff="remove"]').length).toBe(0);
  });
});
