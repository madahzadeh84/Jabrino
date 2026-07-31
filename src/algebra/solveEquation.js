// src/equation/solveEquation.js

import { tokenize } from "../algebra/tokenizer.js";
import { Parser } from "../algebra/parser.js";

export function parsePolynomial(expr) {
  const tokens = tokenize(expr);
  const parser = new Parser(tokens);
  return parser.parse();
}

function formatNumber(n) {
  if (Number.isInteger(n)) {
    return String(n);
  }

  return String(Number(n.toFixed(10)));
}

function isValidRadicand(n) {
  return Number.isFinite(n) && n >= 0;
}

function normalizeRadicalExpression(expr) {
  let normalized = String(expr).trim();

  normalized = normalized
    .replace(/\\left/g, "")
    .replace(/\\right/g, "")
    .replace(/\\cdot/g, "*")
    .replace(/\\times/g, "*")
    .replace(/\\div/g, "/")
    .replace(/×/g, "*")
    .replace(/·/g, "*")
    .replace(/÷/g, "/");

  normalized = normalized.replace(
    /\\sqrt\s*\{\s*([0-9]+(?:\.[0-9]+)?)\s*\}/g,
    "sqrt($1)",
  );

  normalized = normalized.replace(
    /√\s*\(\s*([0-9]+(?:\.[0-9]+)?)\s*\)/g,
    "sqrt($1)",
  );

  normalized = normalized.replace(
    /√\s*([0-9]+(?:\.[0-9]+)?)/g,
    "sqrt($1)",
  );

  normalized = normalized.replace(/\s+/g, " ").trim();

  normalized = normalized.replace(
    /(sqrt\(\s*[0-9]+(?:\.[0-9]+)?\s*\))\s*(?=sqrt\()/g,
    "$1*",
  );

  return normalized;
}

/**
 * ترکیب رادیکال های عددی در ضرب و تقسیم
 *
 * نمونه:
 * sqrt(8) * sqrt(2) -> sqrt(16)
 * sqrt(4) * sqrt(8) -> sqrt(32)
 * sqrt(8) / sqrt(2) -> sqrt(4)
 */
function rewriteNumericSqrtMulDiv(expr) {
  let currentExpr = normalizeRadicalExpression(expr);
  let changed = currentExpr !== expr;

  const pattern =
    /sqrt\(\s*([0-9]+(?:\.[0-9]+)?)\s*\)\s*([*/])\s*sqrt\(\s*([0-9]+(?:\.[0-9]+)?)\s*\)/g;

  let previousExpr;

  do {
    previousExpr = currentExpr;

    currentExpr = currentExpr.replace(
      pattern,
      (match, leftText, operator, rightText) => {
        const left = Number(leftText);
        const right = Number(rightText);

        if (!isValidRadicand(left) || !isValidRadicand(right)) {
          return match;
        }

        if (operator === "/" && right === 0) {
          return match;
        }

        const inner = operator === "*" ? left * right : left / right;

        if (!isValidRadicand(inner)) {
          return match;
        }

        changed = true;

        return `sqrt(${formatNumber(inner)})`;
      },
    );
  } while (currentExpr !== previousExpr);

  return {
    changed,
    rewritten: currentExpr,
  };
}

function stringifyMathValue(value) {
  if (typeof value?.toString === "function") {
    return value.toString();
  }

  if (typeof value?.toDisplayString === "function") {
    return value.toDisplayString();
  }

  return String(value);
}

export function solveEquation(eq, steps = []) {
  steps.push({
    kind: "info",
    type: "info",
    title: "صورت مسئله",
    description: "معادله واردشده از همین جا بررسی می شود.",
    from: eq,
    value: eq,
    meta: {},
  });

  const parts = String(eq).split("=");

  if (parts.length !== 2) {
    throw new Error("ساختار معادله نامعتبر است.");
  }

  const [leftRaw, rightRaw] = parts;

  if (leftRaw.trim() === "" || rightRaw.trim() === "") {
    throw new Error("ساختار معادله نامعتبر است.");
  }

  let leftExpr = leftRaw.trim();
  let rightExpr = rightRaw.trim();

  const normalizedLeft = normalizeRadicalExpression(leftExpr);

  if (normalizedLeft !== leftExpr) {
    steps.push({
      kind: "transform",
      type: "transform",
      title: "یکدست کردن نوشتار طرف چپ",
      description:
        "شکل نوشتن رادیکال ها و عملگرهای طرف چپ برای ادامه محاسبه یکسان می شود.",
      from: leftExpr,
      to: normalizedLeft,
      meta: {
        phase: "normalize-left",
      },
    });

    leftExpr = normalizedLeft;
  }

  const normalizedRight = normalizeRadicalExpression(rightExpr);

  if (normalizedRight !== rightExpr) {
    steps.push({
      kind: "transform",
      type: "transform",
      title: "یکدست کردن نوشتار طرف راست",
      description:
        "شکل نوشتن رادیکال ها و عملگرهای طرف راست برای ادامه محاسبه یکسان می شود.",
      from: rightExpr,
      to: normalizedRight,
      meta: {
        phase: "normalize-right",
      },
    });

    rightExpr = normalizedRight;
  }

  const leftRadicalRewrite = rewriteNumericSqrtMulDiv(leftExpr);

  if (
    leftRadicalRewrite.changed &&
    leftRadicalRewrite.rewritten !== leftExpr
  ) {
    steps.push({
      kind: "transform",
      type: "transform",
      title: "ترکیب رادیکال های عددی در طرف چپ",
      description:
        "در ضرب یا تقسیم دو رادیکال عددی، عددهای زیر رادیکال با همان عمل ترکیب می شوند. سپس رادیکال جدید تا جای ممکن ساده می شود.",
      from: leftExpr,
      to: leftRadicalRewrite.rewritten,
      meta: {
        phase: "combine-numeric-radicals-left",
      },
    });

    leftExpr = leftRadicalRewrite.rewritten;
  }

  const rightRadicalRewrite = rewriteNumericSqrtMulDiv(rightExpr);

  if (
    rightRadicalRewrite.changed &&
    rightRadicalRewrite.rewritten !== rightExpr
  ) {
    steps.push({
      kind: "transform",
      type: "transform",
      title: "ترکیب رادیکال های عددی در طرف راست",
      description:
        "در ضرب یا تقسیم دو رادیکال عددی، عددهای زیر رادیکال با همان عمل ترکیب می شوند. سپس رادیکال جدید تا جای ممکن ساده می شود.",
      from: rightExpr,
      to: rightRadicalRewrite.rewritten,
      meta: {
        phase: "combine-numeric-radicals-right",
      },
    });

    rightExpr = rightRadicalRewrite.rewritten;
  }

  const left = parsePolynomial(leftExpr);
  const right = parsePolynomial(rightExpr);

  const leftStr = stringifyMathValue(left);
  const rightStr = stringifyMathValue(right);

  steps.push({
    kind: "transform",
    type: "transform",
    title: "ساده کردن طرف چپ",
    description: "طرف چپ معادله تا جای ممکن ساده می شود.",
    from: leftExpr,
    to: leftStr,
    meta: {
      phase: "simplify-left",
    },
  });

  steps.push({
    kind: "transform",
    type: "transform",
    title: "ساده کردن طرف راست",
    description: "طرف راست معادله نیز تا جای ممکن ساده می شود.",
    from: rightExpr,
    to: rightStr,
    meta: {
      phase: "simplify-right",
    },
  });

  steps.push({
    kind: "transform",
    type: "transform",
    title: "نوشتن معادله به شکل ساده تر",
    description: "اکنون هر دو طرف معادله را به صورت ساده تر می نویسیم.",
    from: `${leftExpr} = ${rightExpr}`,
    to: `${leftStr} = ${rightStr}`,
    meta: {
      phase: "write-simplified-equation",
    },
  });

  const diff = left.subtract(right);

  const { variable, a, b } = diff.toLinearForm();

  if (!variable) {
    if (b.isZero()) {
      throw new Error("بی نهایت جواب دارد.");
    }

    throw new Error("جواب ندارد.");
  }

  if (a.isZero()) {
    if (b.isZero()) {
      throw new Error("بی نهایت جواب دارد.");
    }

    throw new Error("جواب ندارد.");
  }

  const minusB = b.negate();

  const aStr = stringifyMathValue(a);
  const minusBStr = stringifyMathValue(minusB);

  const axEqMinusB = `${aStr}${variable} = ${minusBStr}`;

  const x = minusB.divide(a);

  const xStr = stringifyMathValue(x);

  const solutionStr = `${variable} = ${xStr}`;

  steps.push({
    kind: "solution",
    type: "solution",
    title: "پیدا کردن مقدار متغیر",
    description:
      `برای پیدا کردن مقدار ${variable}، عدد سمت دیگر مساوی یعنی ${minusBStr} را بر ضریب متغیر یعنی ${aStr} تقسیم می کنیم؛ بنابراین ${solutionStr}.`,
    from: axEqMinusB,
    to: solutionStr,
    value: solutionStr,
    meta: {
      final: true,
    },
  });

  return solutionStr;
}
