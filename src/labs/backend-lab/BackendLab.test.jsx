// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BackendLab from './BackendLab';
import { runRequest } from './runRequest';

vi.mock('../../context/ThemeContext.jsx', () => ({ useGlobalTheme: () => ({ studioTheme: 'default', themeStyles: { ui: {}, monaco: 'vs-dark' } }) }));
vi.mock('../../hooks/useThemeColors', () => ({ useThemeColors: () => ({}) }));
vi.mock('@monaco-editor/react', () => ({ default: ({ value, onChange }) => <textarea aria-label="Code editor" value={value} onChange={e => onChange(e.target.value)} /> }));
vi.mock('./runRequest', () => ({ runRequest: vi.fn() }));
vi.mock('./LessonPanel', () => ({ default: ({ checked, checklist, onToggleCheck, onNextLesson, onPrevLesson }) => <div>
  <input aria-label="First checklist item" type="checkbox" checked={checked.includes(checklist[0])} onChange={() => onToggleCheck(checklist[0])} />
  <button onClick={onNextLesson}>Next lesson</button><button onClick={onPrevLesson}>Previous lesson</button>
</div> }));
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('sends the latest edit immediately, locks duplicate sends and recovers from failure', async () => {
  let reject;
  runRequest.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
  runRequest.mockResolvedValue({ response: { status: 200, body: 'ok' }, logs: [], error: null });
  render(<BackendLab />);
  fireEvent.change(screen.getByLabelText('Code editor'), { target: { value: 'latest code' } });
  fireEvent.click(screen.getByText('Send'));
  expect(runRequest.mock.calls[0][0][0].code).toBe('latest code');
  expect(screen.getByText('Sending…').disabled).toBe(true);
  fireEvent.click(screen.getByText('Sending…'));
  expect(runRequest).toHaveBeenCalledTimes(1);
  reject(new Error('Temporary failure'));
  await waitFor(() => expect(screen.getByText('Send').disabled).toBe(false));
  expect(screen.getByText('Temporary failure')).toBeTruthy();
  fireEvent.click(screen.getByText('Send'));
  await screen.findByText('200');
});

it('keeps checklist progress through navigation and a fresh mount without signup', () => {
  const first = render(<BackendLab />);
  fireEvent.click(screen.getByLabelText('First checklist item'));
  fireEvent.click(screen.getByText('Next lesson'));
  expect(screen.getByLabelText('First checklist item').checked).toBe(false);
  fireEvent.click(screen.getByText('Previous lesson'));
  expect(screen.getByLabelText('First checklist item').checked).toBe(true);
  first.unmount();
  render(<BackendLab />);
  expect(screen.getByLabelText('First checklist item').checked).toBe(true);
});

it('keeps the edited file current when immediately switching and typing in another file', () => {
  vi.stubGlobal('prompt', vi.fn(() => 'routes.js'));
  render(<BackendLab />);
  fireEvent.change(screen.getByLabelText('Code editor'), { target: { value: 'first file' } });
  fireEvent.click(screen.getByText('+ New'));
  fireEvent.change(screen.getByLabelText('Code editor'), { target: { value: 'second file' } });
  fireEvent.click(screen.getByText('server.js'));
  expect(screen.getByLabelText('Code editor').value).toBe('first file');
  expect(JSON.parse(localStorage.getItem('oc-backend-lab')).files.map(f => f.code)).toEqual(['first file', 'second file']);
});

it('checks responses and loads recorded history without sending another request', async () => {
  runRequest.mockResolvedValue({ response: { status: 201, body: { name: 'Ada', id: 1 } }, logs: [], error: null });
  render(<BackendLab />);
  fireEvent.click(screen.getByText('checks', { exact: true }));
  fireEvent.change(screen.getByLabelText('Expected status'), { target: { value: '201' } });
  fireEvent.change(screen.getByLabelText('Expected JSON body'), { target: { value: '{"id":1,"name":"Ada"}' } });
  fireEvent.click(screen.getByText('Send'));
  await screen.findByText('PASS Status');
  expect(screen.getByText('PASS JSON body')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Request path'), { target: { value: '/different' } });
  fireEvent.click(screen.getByText('history', { exact: true }));
  fireEvent.click(screen.getByText('GET /users', { exact: true }));
  expect(screen.getByLabelText('Request path').value).toBe('/users');
  expect(runRequest).toHaveBeenCalledTimes(1);
  expect(screen.getByText('PASS Status')).toBeTruthy();
});

it('does not execute a request when its expected JSON is malformed', async () => {
  render(<BackendLab />);
  fireEvent.click(screen.getByText('checks', { exact: true }));
  fireEvent.change(screen.getByLabelText('Expected JSON body'), { target: { value: '{broken' } });
  fireEvent.click(screen.getByText('Send'));
  expect(screen.getByText('Check configuration')).toBeTruthy();
  expect(runRequest).not.toHaveBeenCalled();
});
