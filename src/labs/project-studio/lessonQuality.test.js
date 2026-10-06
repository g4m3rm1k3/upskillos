import { describe, it, expect } from 'vitest';
import { TRACKS, TRACK_KEYS, trackTitle } from './trackLoader.js';
import { studioSeries } from './series.js';
import { checkEvidence } from './checkEvidence.js';

describe('lesson entry and assessment contracts', () => {
  it('labels every discovered series and chapter without dropping advanced material', () => {
    const series=studioSeries(TRACKS,TRACK_KEYS,trackTitle);
    expect(series.flatMap(s=>s.chapters.map(c=>c.key)).sort()).toEqual([...TRACK_KEYS].sort());
    for(const profile of series.flatMap(s=>[s,...s.chapters])) {
      expect(profile.level).not.toBe('unclassified');
      expect(profile.audience.length).toBeGreaterThan(40);
      expect(['in-development','review-required']).toContain(profile.maturity);
    }
    expect(series.find(s=>s.key==='forge').recommended).toBe(true);
    expect(series.find(s=>s.key==='circuit-clash').maturity).toBe('in-development');
  });
  it('distinguishes source evidence from behavior and accounts for skipped checks', () => {
    expect(checkEvidence([{kind:'contains'},{kind:'run'}]).join(' ')).toContain('matching text does not establish runtime behavior');
    expect(checkEvidence([{kind:'contains'},{kind:'run'}]).join(' ')).toContain('other inputs and behavior remain untested');
    expect(checkEvidence([]).join(' ')).toContain('Skipped checks supply no evidence');
    expect(()=>checkEvidence([{}])).not.toThrow();
  });
  it('keeps calculator transfer independent and supplies progressive help', () => {
    const lesson=TRACKS['cpp-language-basics'][0];
    const task=lesson.steps.find(s=>s.title.includes('Challenge'));
    expect(lesson.meta.reference).toBe('optional');
    expect(task.hints[0].map(r=>r.key)).toEqual(['nudge','concept','shape']);
    expect(task.prose).toContain('five expressions');
  });
  it('preserves the Java introduction step progress keys while placing execution first', () => {
    const lesson=TRACKS['java-engineering'][0];
    expect(lesson.steps.map(s=>s.title)).toEqual(['Decide what the first release means','Prepare a real development folder','Keep evidence without blocking progress']);
    expect(lesson.steps[0].prose.indexOf('java scratch/Hello.java')).toBeLessThan(lesson.steps[0].prose.indexOf('modular monolith'));
  });
});
