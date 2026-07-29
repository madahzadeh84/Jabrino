import { tokenize } from "./tokenizer.js";
import { Parser } from "./parser.js";

export function parsePolynomial(expr) {
  const tokens = tokenize(expr);
  const parser = new Parser(tokens);
  return parser.parse();
}

export function simplify(expr, steps = []) {
  steps.push(expr);
  const poly = parsePolynomial(expr);
  const result = poly.toString();
  steps.push(result);
  return result;
}

export function solveEquation(eq, steps = []) {
  steps.push(eq);

  const [leftRaw, rightRaw] = eq.split("=");

  if (leftRaw === "" || rightRaw === "") {
    throw new Error("ساختار معادله نامعتبر است.");
  }

  const left = parsePolynomial(leftRaw);
  const right = parsePolynomial(rightRaw);

  steps.push(`${left.toString()} = ${right.toString()}`);

  const diff = left.subtract(right); // ax + b = 0
  const { variable, a, b } = diff.toLinearForm();

  if (!variable) {
    if (b.isZero()) throw new Error("بی‌نهایت جواب دارد.");
    throw new Error("جواب ندارد.");
  }

  if (a.isZero()) {
    if (b.isZero()) throw new Error("بی‌نهایت جواب دارد.");
    throw new Error("جواب ندارد.");
  }

  // x = -b / a
  const x = b.negate().divide(a);

  steps.push(`${variable} = ${x.toString()}`);
  return `${variable} = ${x.toString()}`;
}
