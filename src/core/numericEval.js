import { tokenize } from "../algebra/tokenizer.js";
import { Parser } from "../algebra/parser.js";

export function evalNumeric(exprStr) {
  const tokens = tokenize(exprStr);
  const parser = new Parser(tokens);
  const poly = parser.parse();

  if (poly.isConstant()) {
    const frac = poly.constantValue();
    return frac.num / frac.den;
  }

  const sqrtMatch = String(exprStr).trim().match(/^sqrt\(([-+]?\d+(\.\d+)?)\)$/);
  if (sqrtMatch) {
    const val = parseFloat(sqrtMatch[1]);
    if (val < 0) {
      throw new Error("نمی‌توان sqrt عدد منفی را به صورت حقیقی محاسبه کرد.");
    }
    return Math.sqrt(val);
  }

  return null;
}
