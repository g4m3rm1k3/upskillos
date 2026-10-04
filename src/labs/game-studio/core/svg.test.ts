// SVG images written as text (project.writeSvg): code can draw a picture instead of importing one.
import { describe, expect, it } from 'vitest';
import { newProject } from './project';
import { projectApi, svgSize } from './api';
import { Doc } from './doc';
import { deserialize, serialize } from './serialize';
import { projectZip, readProjectZip } from './archive';

const CARD = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140"><rect width="100" height="140" rx="8" fill="white" stroke-width="2"/></svg>';

describe('SVG images', () => {
  it('reads the size from the <svg> element, and says what is missing', () => {
    expect(svgSize(CARD)).toEqual({ width: 100, height: 140 });
    expect(svgSize('<svg xmlns="http://www.w3.org/2000/svg" width="64px" height="32.4">')).toEqual({ width: 64, height: 32 });
    expect(svgSize('<rect/>')).toMatch(/needs an <svg/);
    expect(svgSize('<svg width="10" height="10"></svg>')).toMatch(/xmlns/);
    expect(svgSize('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>')).toMatch(/width and height/);
    expect(svgSize('<svg xmlns="http://www.w3.org/2000/svg" width="50%" height="10"></svg>')).toMatch(/width and height/);
  });

  it('writes an image in assets/, replaces it at the same path, and undo brings the old one back', () => {
    const doc = new Doc(newProject('Cards'));
    const first = doc.writeSvg('assets/cards/back.svg', CARD);
    expect(doc.project.assets).toEqual([{ id: first, path: 'assets/cards/back.svg', kind: 'image', mime: 'image/svg+xml', width: 100, height: 140, svg: CARD }]);
    const red = CARD.replace('white', 'red');
    const second = doc.writeSvg('assets/cards/back.svg', red);
    expect(second).not.toBe(first);
    expect(doc.project.assets.map((a) => a.svg)).toEqual([red]);
    doc.undo();
    expect(doc.project.assets.map((a) => a.id)).toEqual([first]);
    expect(() => projectApi(doc.project).writeSvg('art/x.svg', CARD)).toThrow(/assets\//);
    expect(() => projectApi(doc.project).writeSvg('assets/x.png', CARD)).toThrow(/extension/);
    expect(() => projectApi(doc.project).writeSvg('assets/x.svg', '<svg width="1" height="1">')).toThrow(/xmlns/);
  });

  it('is code in the GUI → code log, and survives saving, loading and a .zip', () => {
    const doc = new Doc(newProject('Cards'));
    doc.writeSvg('assets/card.svg', CARD);
    const replay = new Doc(newProject('Cards'));
    replay.runCode('replay', doc.log.map((e) => e.code).join('\n'));
    expect(replay.project.assets[0].svg).toBe(CARD);
    expect(deserialize(serialize(doc.project)).assets[0].svg).toBe(CARD);
    const { project, bytes } = readProjectZip(projectZip(doc.project, () => undefined));
    expect(project.assets[0].svg).toBe(CARD);
    expect(new TextDecoder().decode(bytes.get(project.assets[0].id))).toBe(CARD);
  });
});
