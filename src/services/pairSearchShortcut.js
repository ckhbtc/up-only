export function shouldOpenPairSearch(event) {
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return false;

  const target = event.target;
  const tag = target?.tagName;
  const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable;
  if (!isEditable) return true;

  return Boolean(target?.matches?.('[data-pair-search-shortcut]'));
}
