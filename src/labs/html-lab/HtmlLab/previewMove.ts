import { CONTAINER_TAGS } from './labReducer';
import type { LabElement } from './types';

export type PreviewDrop = { id: string; targetId: string | null; placement: 'before' | 'after' | 'inside' };

// Resolve against authored elements, not runtime DOM mutations. Both nesting
// and ordering use the destination siblings with the moved element excluded.
export function resolvePreviewMove(elements: LabElement[], drop: PreviewDrop) {
  const moving = elements.find(el => el.id === drop.id);
  const target = elements.find(el => el.id === drop.targetId);
  if (!moving || (drop.targetId !== null && !target) || target?.id === moving.id) return null;
  if (!['before', 'after', 'inside'].includes(drop.placement)) return null;
  if (drop.placement === 'inside' && target && !CONTAINER_TAGS.has(target.tag)) return null;
  const parentId = target ? (drop.placement === 'inside' ? target.id : target.parentId) : null;
  let ancestor = parentId;
  const visited = new Set<string>();
  while (ancestor) {
    if (ancestor === moving.id || visited.has(ancestor)) return null;
    visited.add(ancestor);
    ancestor = elements.find(el => el.id === ancestor)?.parentId ?? null;
  }
  const siblings = elements.filter(el => el.parentId === parentId && el.id !== moving.id).sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
  const index = target ? siblings.findIndex(el => el.id === target.id) : -1;
  const order = drop.placement === 'inside' || !target ? siblings.length : index + (drop.placement === 'after' ? 1 : 0);
  return { id: moving.id, parentId, order };
}
