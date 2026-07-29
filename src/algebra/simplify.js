import { parsePolynomial } from "./parser.js";

export function simplify(expr, steps) {
  steps.push(expr);
  steps.push("بسط و ترکیب جملات هم‌نوع");
  const poly = parsePolynomial(expr);
  const result = poly.toString();
  steps.push(result);
  return result;
}
