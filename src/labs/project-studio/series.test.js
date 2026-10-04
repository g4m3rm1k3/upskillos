import {it,expect} from 'vitest';
import {TRACKS,TRACK_KEYS,trackTitle} from './trackLoader.js';
import {studioSeries,nextSeriesLesson} from './series.js';
it('groups C++ topics into one ordered series while preserving all discovered lesson ids and unrelated series',()=>{
 const grouped=studioSeries(TRACKS,TRACK_KEYS,trackTitle);const cpp=grouped.find(item=>item.key==='cpp-mastery');
 expect(cpp.chapters.slice(0,3).map(item=>item.key)).toEqual(['cpp-foundations','cpp-language-basics','cpp-memory']);
 expect(cpp.chapters.some(item=>item.key==='cpp-generic')).toBe(true);
 expect(grouped.some(item=>item.key==='cpp-generic')).toBe(false);
 expect(grouped.slice(0,2).map(item=>item.key)).toEqual(['spreadsheet-build','pyside6-engine']);
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
it('groups the ml-* tracks into the Machine Learning series, in chapter order',()=>{
 const grouped=studioSeries(TRACKS,TRACK_KEYS,trackTitle);const ml=grouped.find(item=>item.key==='ml-production');
 expect(ml.chapters.map(item=>item.key)).toEqual(['ml-software','ml-data','ml-math','ml-first-model','ml-web','ml-database','ml-security','ml-evaluation','ml-classification','ml-trees','ml-clustering']);
 expect(grouped.some(item=>item.key==='ml-data')).toBe(false);
 expect(nextSeriesLesson(ml,TRACKS,'ml-software',TRACKS['ml-software'].at(-1).id)).toEqual({trackKey:'ml-data',lesson:TRACKS['ml-data'][0]});
 expect(ml.planned).toContain('PCA');
});
