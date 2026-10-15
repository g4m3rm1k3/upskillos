import fs from 'node:fs';
import continuation from '../dataFixtures/walkthrough.json';
const B = 'data-foundations';
const answer = name => fs.readFileSync(new URL(`./${B}/answers/${name}`, import.meta.url), 'utf8');
export const WALKTHROUGH = {
  ...continuation,
  [`${B}/01-01-ask-a-question#Your turn: estimate a batch`]: {
    files: { 'quote.sql': answer('quote.sql') },
    wrong: [
      { name: 'adds instead of multiplies', files: { 'quote.sql': 'SELECT 45 + 5 AS total_minutes;' }, fails: [0] },
      { name: 'wrong unit name', files: { 'quote.sql': 'SELECT 45 * 5 AS total_hours;' }, fails: [0] },
    ],
  },
  [`${B}/01-02-records-that-remain#Close and reopen`]: {
    run: ['sqlite3 -batch -bail tracker.db ".read schema.sql" ".read seed.sql"'],
  },
  [`${B}/01-02-records-that-remain#Your turn: read only what the screen needs`]: {
    files: { 'labels.sql': answer('labels.sql') },
    wrong: [
      { name: 'returns every column', files: { 'labels.sql': 'SELECT * FROM tickets;' }, fails: [0] },
      { name: 'hardcodes familiar titles', files: { 'labels.sql': "SELECT 'Fix login';" }, fails: [0] },
    ],
  },
  [`${B}/01-03-filter-and-order#Your turn: a longer-task list`]: {
    files: { 'longer.sql': answer('longer.sql') },
    wrong: [
      { name: 'loses boundary equality', files: { 'longer.sql': answer('longer.sql').replace('>=', '>') }, fails: [0] },
      { name: 'reverses tie order', files: { 'longer.sql': answer('longer.sql').replace('ticket_id ASC', 'ticket_id DESC') }, fails: [0] },
      { name: 'keeps short tickets', files: { 'longer.sql': answer('longer.sql').replace('WHERE estimate_minutes >= 60', '') }, fails: [0] },
    ],
  },
  [`${B}/01-04-let-the-database-refuse#Your turn: rooms at a venue`]: {
    files: { 'rooms.sql': answer('rooms.sql') },
    wrong: [
      { name: 'allows zero', files: { 'rooms.sql': answer('rooms.sql').replace('> 0', '>= 0') }, fails: [3] },
      { name: 'missing identity constraint', files: { 'rooms.sql': answer('rooms.sql').replace(' PRIMARY KEY', '') }, fails: [1] },
      { name: 'CHECK alone allows unknown', files: { 'rooms.sql': answer('rooms.sql').replace('capacity INTEGER NOT NULL', 'capacity INTEGER') }, fails: [2] },
      { name: 'rejects a valid one-person room', files: { 'rooms.sql': answer('rooms.sql').replace('> 0', '> 1') }, fails: [0] },
      { name: 'makes names unique without a requirement', files: { 'rooms.sql': answer('rooms.sql').replace('name TEXT NOT NULL', 'name TEXT NOT NULL UNIQUE') }, fails: [0] },
    ],
  },
};
