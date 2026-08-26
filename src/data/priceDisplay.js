const SUBSCRIPT_DIGITS = new Map([
  ['₀', '0'],
  ['₁', '1'],
  ['₂', '2'],
  ['₃', '3'],
  ['₄', '4'],
  ['₅', '5'],
  ['₆', '6'],
  ['₇', '7'],
  ['₈', '8'],
  ['₉', '9'],
]);

export function splitCompactPrice(value) {
  const text = String(value ?? '');
  const match = text.match(/[₀-₉]+/u);
  if (!match) return [{ text, subscript: false }];

  const subscriptStart = match.index ?? 0;
  const subscriptEnd = subscriptStart + match[0].length;
  return [
    { text: text.slice(0, subscriptStart), subscript: false },
    {
      text: [...match[0]].map(digit => SUBSCRIPT_DIGITS.get(digit)).join(''),
      subscript: true,
    },
    { text: text.slice(subscriptEnd), subscript: false },
  ].filter(part => part.text.length > 0);
}
