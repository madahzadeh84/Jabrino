import { tokenize } from "../algebra/tokenizer.js";
import { Parser } from "../algebra/parser.js";

export function parsePolynomial(expr) {
  const tokens = tokenize(expr);
  const parser = new Parser(tokens);
  return parser.parse();
}

export function solveEquation(eq, steps = []) {
  steps.push({
    kind: "info",
    title: "صورت مسئله",
    description: "معادله‌ای که وارد شده، از همین‌جا بررسی می‌شود.",
    from: eq,
  });

  const [leftRaw, rightRaw] = eq.split("=");

  if (leftRaw === "" || rightRaw === "") {
    throw new Error("ساختار معادله نامعتبر است.");
  }

  const left = parsePolynomial(leftRaw.trim());
  const right = parsePolynomial(rightRaw.trim());

  const leftStr =
    typeof left.toDisplayString === "function"
      ? left.toDisplayString()
      : left.toString();

  const rightStr =
    typeof right.toDisplayString === "function"
      ? right.toDisplayString()
      : right.toString();

  steps.push({
    kind: "transform",
    title: "ساده کردن طرف چپ",
    description: "طرف چپ معادله تا جای ممکن ساده می‌شود.",
    from: leftRaw.trim(),
    to: leftStr,
  });

  steps.push({
    kind: "transform",
    title: "ساده کردن طرف راست",
    description: "طرف راست معادله نیز تا جای ممکن ساده می‌شود.",
    from: rightRaw.trim(),
    to: rightStr,
  });

  steps.push({
    kind: "transform",
    title: "نوشتن معادله به شکل ساده‌تر",
    description: "اکنون هر دو طرف معادله را به صورت ساده‌تر می‌نویسیم.",
    from: eq,
    to: `${leftStr} = ${rightStr}`,
  });

  const diff = left.subtract(right);
  const diffStr =
    typeof diff.toDisplayString === "function"
      ? diff.toDisplayString()
      : diff.toString();

  // steps.push({
  //   kind: "transform",
  //   title: "هم‌ارز کردن دو طرف معادله",
  //   description:
  //     "برای اینکه پیدا کردن مقدار متغیر آسان‌تر شود، معادله را به شکلی می‌نویسیم که یک طرف آن صفر باشد.",
  //   from: `${leftStr} = ${rightStr}`,
  //   to: `${diffStr} = 0`,
  // });

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

  const minusB = b.negate();
  const axEqMinusB = `${a.toString()}${variable} = ${minusB.toString()}`;

  // steps.push({
  //   kind: "transform",
  //   title: "رسیدن به شکل مناسب برای پیدا کردن مقدار متغیر",
  //   description:
  //     "معادله را طوری ساده می‌کنیم که مقدار متغیر روشن‌تر دیده شود.",
  //   from: `${diffStr} = 0`,
  //   to: axEqMinusB,
  // });

const x = minusB.divide(a);
const solutionStr = `${variable} = ${x.toString()}`;

steps.push({
  kind: "solution",
  title: "پیدا کردن مقدار متغیر",
  description:
    `برای پیدا کردن مقدار ${variable}، عددِ سمت دیگر مساوی یعنی ${minusB.toString()} را بر ضریب متغیر یعنی ${a.toString()} تقسیم می‌کنیم؛ بنابراین ${solutionStr}.`,
  from: axEqMinusB,
  to: solutionStr,
});


  return solutionStr;
}
