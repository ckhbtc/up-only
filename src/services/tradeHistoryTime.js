export function formatLocalTradeTimestamp(value, locales = undefined, timeZone = undefined) {
  if (value === null || value === undefined || value === '') return '';

  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '';

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  const options = {
    dateStyle: 'medium',
    timeStyle: 'short',
  };
  if (timeZone) options.timeZone = timeZone;

  return new Intl.DateTimeFormat(locales, options).format(date);
}
