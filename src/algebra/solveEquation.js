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
    from: expr,
  });

  const poly = parsePolynomial(expr);

  // گام ۲: بسط و ترکیب جملات هم‌نوع
  const simplified = poly.toString();
  steps.push({
    kind: "transform",
    title: "بسط و ترکیب جملات هم‌نوع",
    description:
      "عبارت به صورت چندجمله‌ای استاندارد نوشته می‌شود و جملات هم‌نوع با هم ترکیب می‌شوند.",
    from: expr,
    to: simplified,
  });

  return simplified;
}

export function solveEquation(eq, steps = []) {
  // گام ۰: ثبت معادله اولیه
  steps.push({
    kind: "info",
    title: "معادله اولیه",
    description: "این معادله‌ای است که کاربر وارد کرده است.",
    from: eq,
  });

  const [leftRaw, rightRaw] = eq.split("=");

  if (leftRaw === "" || rightRaw === "") {
    throw new Error("ساختار معادله نامعتبر است.");
  }

  const left = parsePolynomial(leftRaw.trim());
  const right = parsePolynomial(rightRaw.trim());

  const leftStr = left.toString();
  const rightStr = right.toString();

  // گام ۱: تبدیل هر طرف به فرم چندجمله‌ای
  steps.push({
    kind: "transform",
    title: "بسط هر دو طرف معادله",
    description: "هر طرف معادله به صورت چندجمله‌ای نوشته می‌شود.",
    from: eq,
    to: `${leftStr} = ${rightStr}`,
  });

  // گام ۲: انتقال همه عبارت‌ها به یک سمت (diff = 0)
  const diff = left.subtract(right); // ax + b = 0
  const diffStr = diff.toString();

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

  // ----------------------
  // گام‌های «مثل دانش‌آموز فکر کردن»
  // ----------------------
  //
  // معادله ما در این مرحله به فرم: a x + b = 0 است.
  // از این، دو مرحله می‌سازیم:
  // ۱) a x = -b
  // ۲) x = (-b) / a

  const minusB = b.negate(); // -b
  const axEqMinusB = `${a.toString()}${variable} = ${minusB.toString()}`; // مثال: 28x = 5

  // گام ۴: تقسیم دو طرف بر ضریب متغیر و به‌دست‌آوردن جواب
  const x = minusB.divide(a); // x = (-b) / a
  const solutionStr = `${variable} = ${x.toString()}`;

  steps.push({
    kind: "solution",
    title: "به‌دست‌آوردن جواب معادله",
    description: `دو طرف معادله را بر ضریب ${variable} یعنی ${a.toString()} تقسیم می‌کنیم، بنابراین ${solutionStr}.`,
    from: axEqMinusB,
    to: solutionStr,
  });

  return solutionStr;
}
