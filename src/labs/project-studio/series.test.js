import {it,expect} from 'vitest';
import {TRACKS,TRACK_KEYS,trackTitle} from './trackLoader.js';
import {studioSeries,nextSeriesLesson} from './series.js';
it('groups C++ topics into one ordered series while preserving all discovered lesson ids and unrelated series',()=>{
 const grouped=studioSeries(TRACKS,TRACK_KEYS,trackTitle);const cpp=grouped.find(item=>item.key==='cpp-mastery');
 expect(cpp.chapters.slice(0,3).map(item=>item.key)).toEqual(['cpp-foundations','cpp-language-basics','cpp-memory']);
 expect(cpp.chapters.some(item=>item.key==='cpp-generic')).toBe(true);
 expect(grouped.some(item=>item.key==='cpp-generic')).toBe(false);
 expect(grouped.find(item=>item.key==='spreadsheet-build')).toBeDefined();
 expect(grouped.find(item=>item.key==='pyside6-engine')).toBeDefined();
 const original=TRACK_KEYS.flatMap(key=>TRACKS[key].map(lesson=>lesson.id)).sort();
 const after=grouped.flatMap(item=>item.chapters.flatMap(chapter=>TRACKS[chapter.key].map(lesson=>lesson.id))).sort();expect(after).toEqual(original);
 expect(cpp.planned).toContain('planned');
});
it('continues through lessons and then chapters without changing their project keys',()=>{
 const cpp=studioSeries(TRACKS,TRACK_KEYS,trackTitle).find(item=>item.key==='cpp-mastery');
 const tools=TRACKS['cpp-foundations'];
 expect(nextSeriesLesson(cpp,TRACKS,'cpp-foundations',tools[0].id)).toEqual({trackKey:'cpp-foundations',lesson:tools[1]});
 expect(nextSeriesLesson(cpp,TRACKS,'cpp-foundations',tools.at(-1).id)).toEqual({trackKey:'cpp-language-basics',lesson:TRACKS['cpp-language-basics'][0]});
 expect(nextSeriesLesson(cpp,TRACKS,'cpp-game',TRACKS['cpp-game'].at(-1).id)).toBeNull();
});
it('automatically keeps newly discovered C++ topics inside the C++ series',()=>{
 const tracks={...TRACKS,'cpp-graphics':[{id:'cpp-graphics/first'}]};
 const grouped=studioSeries(tracks,[...TRACK_KEYS,'cpp-graphics'],trackTitle);
 expect(grouped.find(item=>item.key==='cpp-mastery').chapters.some(chapter=>chapter.key==='cpp-graphics')).toBe(true);
 expect(grouped.some(item=>item.key==='cpp-graphics')).toBe(false);
});
it('groups the aml-* tracks into the Applied Machine Learning series, separate from the ml-* series',()=>{
 const grouped=studioSeries(TRACKS,TRACK_KEYS,trackTitle);const aml=grouped.find(item=>item.key==='applied-ml');
 expect(aml.chapters[0].key).toBe('aml-python');
 expect(aml.chapters.every(chapter=>chapter.key.startsWith('aml-'))).toBe(true);
 expect(grouped.find(item=>item.key==='ml-production').chapters.some(chapter=>chapter.key.startsWith('aml-'))).toBe(false);
 expect(grouped.some(item=>item.key==='aml-python')).toBe(false);
 expect(aml.planned).toContain('docs/applied-ml-series-plan.md');
});
it('groups the ml-* tracks into the Machine Learning series, in chapter order',()=>{
 const grouped=studioSeries(TRACKS,TRACK_KEYS,trackTitle);const ml=grouped.find(item=>item.key==='ml-production');
 expect(ml.chapters.map(item=>item.key)).toEqual(['ml-software','ml-data','ml-math','ml-first-model','ml-web','ml-database','ml-security','ml-evaluation','ml-classification','ml-trees','ml-clustering','ml-pca','ml-neural','ml-pytorch','ml-nlp','ml-studio','ml-capstone','ml-timeseries','ml-boosting']);
 expect(grouped.some(item=>item.key==='ml-data')).toBe(false);
 expect(nextSeriesLesson(ml,TRACKS,'ml-software',TRACKS['ml-software'].at(-1).id)).toEqual({trackKey:'ml-data',lesson:TRACKS['ml-data'][0]});
 expect(ml.planned).toContain('transformers');
});

it('chooses a lesson\'s folder: its own project first, then its series\' shared folder, then its track', async () => {
  const { projectKeyFor } = await import('./series.js');
  const series = [{ key: 'shared-series', sharedProject: true, chapters: [{ key: 'shared-ch1' }] }];
  expect(projectKeyFor(series, 'shared-ch1', { meta: { project: 'swe-kit' } })).toBe('swe-kit');
  expect(projectKeyFor(series, 'shared-ch1', { meta: {} })).toBe('shared-series');
  expect(projectKeyFor(series, 'lone-track', { meta: {} })).toBe('lone-track');
  expect(projectKeyFor(series, 'lone-track', undefined)).toBe('lone-track');
  // Two lessons in one chapter can work in two different projects.
  expect(projectKeyFor(series, 'shared-ch1', { meta: { project: 'swe-blockfall' } })).toBe('swe-blockfall');
});

it('accepts a project: key with a folder key\'s form and rejects anything else', async () => {
  const { parseLesson } = await import('./parseTrack.js');
  const lesson = (project) => `---\ntitle: T\nproject: ${project}\n---\n\n## Step\n\nText.\n`;
  expect(parseLesson(lesson('swe-kit'), 't/01').meta.project).toBe('swe-kit');
  expect(() => parseLesson(lesson('Swe Kit'), 't/01')).toThrow(/project:/);
  expect(() => parseLesson(lesson('../kit'), 't/01')).toThrow(/project:/);
});
