import fs from 'node:fs';
const raw = JSON.parse(fs.readFileSync(new URL('./frontend.walkthrough.json', import.meta.url), 'utf8'));
export const WALKTHROUGH = Object.fromEntries(Object.entries(raw).map(([key, action]) => {
  const { answerFiles, ...rest } = action;
  return [key, { ...rest, ...(answerFiles ? { files: Object.fromEntries(Object.entries(answerFiles).map(([file, source]) => [file, fs.readFileSync(new URL(source, import.meta.url), 'utf8')])) } : {}) }];
}));
