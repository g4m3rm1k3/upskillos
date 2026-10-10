// @vitest-environment happy-dom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import LivePreview from './LivePreview';
import { htmlToElements } from './htmlSync';
afterEach(cleanup);

it('accepts deletion immediately after preview selection, before React rerenders the selected ID', () => {
  const onDelete = vi.fn();
  const onSelect = vi.fn();
  const { container } = render(<LivePreview elements={htmlToElements('<div data-lab-id="one">One</div>')!} bodyStyles={{}} customCss="" javascript="" inspect selectedId={null} onSelect={onSelect} onDelete={onDelete} />);
  const frame = container.querySelector('iframe')!;
  const channel = JSON.parse(frame.getAttribute('srcdoc')!.match(/"html-lab-[a-z0-9]+"/)![0]);
  const message = (type: string, id: string, source = frame.contentWindow) => fireEvent(window, new MessageEvent('message', {source, data:{channel,type,id}}));
  message('select','one');
  message('delete','one');
  expect(onSelect).toHaveBeenCalledWith('one');
  expect(onDelete).toHaveBeenCalledExactlyOnceWith('one');
  message('delete','missing');
  message('delete','one',window);
  expect(onDelete).toHaveBeenCalledTimes(1);
});
