export async function closePositionsSequentially({
  positions,
  closePosition,
  onProgress,
  onClosed,
  onError,
}) {
  const list = [...(positions || [])];
  let closed = 0;
  let failed = 0;

  for (let index = 0; index < list.length; index += 1) {
    const position = list[index];
    const context = { index, total: list.length, position };
    onProgress?.(context);

    try {
      const result = await closePosition(position, context);
      closed += 1;
      onClosed?.({ ...context, result });
    } catch (error) {
      failed += 1;
      onError?.({ ...context, error });
    }
  }

  return { closed, failed };
}
