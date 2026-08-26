import { splitCompactPrice } from '../data/priceDisplay';

export default function PriceText({ value }) {
  return splitCompactPrice(value).map((part, index) => (
    part.subscript
      ? <sub key={index} className="up-price-zero-count">{part.text}</sub>
      : part.text
  ));
}
