// src/algebra/solveEquation.js

import { tokenize } from "../algebra/tokenizer.js";
import { Parser } from "../algebra/parser.js";

export function parsePolynomial(expr) {
  const tokens = tokenize(expr);
  const parser = new Parser(tokens);
  return parser.parse();
}

export function simplify(expr, steps = []) {
  // گام ۱: عبارت اولیه
  steps.push({
    kind: "info",
    title: "عبارت اولیه",
    description: "عبارت ورودی به فرم خطیِ قابل پردازش تبدیل می‌شود.",
    from: expr
  });

  const poly = parsePolynomial(expr);

  // گام ۲: بسط و ترکیب جملات هم‌نوع
  const simplified = poly.toString();
  steps.push({
    kind: "transform",
    title: "بسط و ترکیب جملات هم‌نوع",
    description: "عبارت به صورت چندجمله‌ای استاندارد نوشته می‌شود و جملات هم‌نوع با هم ترکیب می‌شوند.",
    from: expr,
    to: simplified
  });

  return simplified;
}

export function solveEquation(eq, steps = []) {
  // گام ۰: ثبت معادله اولیه
  steps.push({
    kind: "info",
    title: "معادله اولیه",
    description: "این معادله‌ای است که کاربر وارد کرده است.",
    from: eq
  });

  const [leftRaw, rightRaw] = eq.split("=");

  if (leftRaw === "" || rightRaw === "") {
    throw new Error("ساختار معادله نامعتبر است.");
  }

  const left = parsePolynomial(leftRaw.trim());
  const right = parsePolynomial(rightRaw.trim());

  // گام ۱: تبدیل هر طرف به فرم چندجمله‌ای
  steps.push({
    kind: "transform",
    title: "بسط هر دو طرف معادله",
    description: "هر طرف معادله به صورت چندجمله‌ای نوشته می‌شود.",
    from: eq,
    to: `${left.toString()} = ${right.toString()}`
  });

  // گام ۲: انتقال همه عبارت‌ها به یک سمت (diff = 0)
  const diff = left.subtract(right); // ax + b = 0
  const diffStr = diff.toString();

  steps.push({
    kind: "transform",
    title: "انتقال همه عبارت‌ها به یک طرف معادله",
    description: "عبارت سمت راست از سمت چپ کم می‌شود تا معادله به فرم ax + b = 0 برسد.",
    from: `${left.toString()} = ${right.toString()}`,
    to: `${diffStr} = 0`
  });

  const { variable, a, b } = diff.toLinearForm();

  if (!variable) {
    if (b.isZero()) {
      throw new Error("بی‌نهایت جواب دارد.");
    }
    throw new Error("جواب ندارد.");
  }

  if (a.isZero()) {
    if (b.isZero()) {
      throw new Error("بی‌نهایت جواب دارد.");
    }
    throw new Error("جواب ندارد.");
  }

  // گام ۳: ایزوله کردن متغیر (x = -b/a)
  const x = b.negate().divide(a);
  const solutionStr = `${variable} = ${x.toString()}`;

  steps.push({
    kind: "solution",
    title: "به‌دست‌آوردن جواب معادله",
    description: `معادله به فرم ${diffStr} = 0 است، پس ${solutionStr}.`,
    from: `${diffStr} = 0`,
    to: solutionStr
  });

  return solutionStr;
}
