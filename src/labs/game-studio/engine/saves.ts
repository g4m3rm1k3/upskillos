// Game state and saved games: the `state` and `save` globals.
//
// `state` is the game's own data: an ordinary object that lives as long as the game runs, so it survives
// scene.change() (a door to the next map, a title screen, game over). Restarting the game starts it empty again.
// It is the simplest form of Godot's autoloads: one shared place for the party, the gold, the quests.
//
// `save` keeps copies of data in named slots that outlast the game: close the editor, come back tomorrow, and
// save.load("slot1") puts it back into `state`. The engine does not know where slots are kept; a SaveStore does:
// - the editor's game frame cannot touch browser storage (it is sandboxed, ADR 3), so its store keeps the slots in
//   memory and tells the editor about every change, and the editor keeps them with the project;
// - an exported game keeps them in its own page's storage;
// - training an agent uses a store in memory only, so thousands of practice games save nothing.
// Slots hold JSON text, so a save is a copy: changing `state` afterwards does not change the save.

/** Where save slots are kept: JSON text by slot name. */
export interface SaveStore {
  get(slot: string): string | undefined;
  set(slot: string, json: string): void;
  delete(slot: string): void;
  list(): string[];
}

/** A store in memory, optionally starting with some slots and told about every change. */
export function memoryStore(initial: Record<string, string> = {}, onChange?: (slot: string, json: string | null) => void): SaveStore {
  const slots = new Map(Object.entries(initial));
  return {
    get: (slot) => slots.get(slot),
    set: (slot, json) => { slots.set(slot, json); onChange?.(slot, json); },
    delete: (slot) => { if (slots.delete(slot)) onChange?.(slot, null); },
    list: () => [...slots.keys()].sort(),
  };
}

/** A slot name: a non-empty string. */
function slotName(slot: unknown): string {
  if (typeof slot !== 'string' || !slot.trim()) throw new Error(`A save slot is named by a string, like "slot1" (got ${JSON.stringify(slot)})`);
  return slot;
}

/** JSON text for data, or a clear error when it cannot be saved. */
function toJson(data: unknown, slot: string): string {
  let json: string | undefined;
  try { json = JSON.stringify(data); }
  catch (e) { throw new Error(`save.write("${slot}"): the data cannot be saved (${e instanceof Error ? e.message : String(e)}). Save plain values: numbers, strings, true/false, lists and objects, not nodes`); }
  if (json === undefined) throw new Error(`save.write("${slot}"): there is nothing to save (the data is ${typeof data})`);
  return json;
}

/** The `save` global, over a store, loading into and saving from `state`. */
export function saveApi(store: SaveStore, state: Record<string, unknown>) {
  return {
    /** Save a copy of data (all of `state` unless given) in a slot, replacing what was there. */
    write(slot: string = 'main', data: unknown = state): void {
      const name = slotName(slot);
      store.set(name, toJson(data, name));
    },
    /** A copy of what is saved in a slot, or null if nothing is. */
    read(slot: string = 'main'): unknown {
      const json = store.get(slotName(slot));
      return json === undefined ? null : JSON.parse(json);
    },
    /** Replace everything in `state` with what is saved in a slot. False (and `state` untouched) if the slot is empty. */
    load(slot: string = 'main'): boolean {
      const json = store.get(slotName(slot));
      if (json === undefined) return false;
      const data = JSON.parse(json);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`save.load("${slot}"): that slot holds ${Array.isArray(data) ? 'a list' : typeof data}, not an object, so it cannot become state. Use save.read for it`);
      for (const k of Object.keys(state)) delete state[k];
      Object.assign(state, data);
      return true;
    },
    /** Whether a slot has something saved in it. */
    has(slot: string = 'main'): boolean { return store.get(slotName(slot)) !== undefined; },
    /** Empty a slot. */
    remove(slot: string = 'main'): void { store.delete(slotName(slot)); },
    /** The names of the slots that have something saved, in order. */
    slots(): string[] { return store.list(); },
  };
}
export type SaveApi = ReturnType<typeof saveApi>;
