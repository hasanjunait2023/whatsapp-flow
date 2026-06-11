import { useState, useCallback } from 'react';

export function useSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);
  
  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < items.length;

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  }, [items, isAllSelected]);

  const selectRange = useCallback((startId: string, endId: string) => {
    const startIndex = items.findIndex((item) => item.id === startId);
    const endIndex = items.findIndex((item) => item.id === endId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    const rangeIds = items.slice(from, to + 1).map((item) => item.id);
    
    setSelectedIds((prev) => {
      const next = new Set(prev);
      rangeIds.forEach((id) => next.add(id));
      return next;
    });
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectOnly = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const selectedItems = items.filter((item) => selectedIds.has(item.id));

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    isSelected,
    isAllSelected,
    isPartiallySelected,
    toggle,
    toggleAll,
    selectRange,
    clearSelection,
    selectOnly,
  };
}
