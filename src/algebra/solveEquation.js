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

  normalized = normalized.replace(/√\s*([0-9]+(?:\.[0-9]+)?)/g, "sqrt($1)");

  normalized = normalized.replace(/\s+/g, " ").trim();

  normalized = normalized.replace(
    /(sqrt\(\s*[0-9]+(?:\.[0-9]+)?\s*\))\s*(?=sqrt\()/g,
    "$1*",
  );

  return normalized;
}

/**
 * ترکیب رادیکال های عددی در ضرب و تقسیم
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

function addTransformStep(steps, title, description, from, to, phase) {
  if (from === to) {
    return;
  }

  steps.push({
    kind: "transform",
    type: "transform",
    title,
    description,
    from,
    to,
    meta: { phase },
  });
}

/**
 * آیا عدد منفی است
 */
function isNegativeValue(value) {
  return value && typeof value.num === "number" && value.num < 0;
}

function absValue(value) {
  if (!value || typeof value.negate !== "function") {
    return value;
  }

  return isNegativeValue(value) ? value.negate() : value;
}

function formatTerm(coefficient, variable = "") {
  if (!coefficient || coefficient.isZero?.()) {
    return "0";
  }

  const negative = isNegativeValue(coefficient);
  const positiveCoefficient = absValue(coefficient);
  const coefficientText = stringifyMathValue(positiveCoefficient);

  let termText;

  if (variable) {
    if (positiveCoefficient.num === 1 && positiveCoefficient.den === 1) {
      termText = variable;
    } else {
      // کسر ضریب بدون پرانتز نوشته می شود: 1/3x
      termText = `${coefficientText}${variable}`;
    }
  } else {
    termText = coefficientText;
  }

  return negative ? `-${termText}` : termText;
}

function buildSumExpression(parts, variable = "") {
  const validParts = parts.filter((part) => part && !part.isZero?.());

  if (validParts.length === 0) {
    return "0";
  }

  const firstPart = validParts[0];
  const firstIsNegative = isNegativeValue(firstPart);
  const firstText = formatTerm(absValue(firstPart), variable);

  let result = firstIsNegative ? `-${firstText}` : firstText;

  for (let index = 1; index < validParts.length; index += 1) {
    const part = validParts[index];
    const negative = isNegativeValue(part);
    const text = formatTerm(absValue(part), variable);

    result += negative ? ` - ${text}` : ` + ${text}`;
  }

  return result;
}

export function solveEquation(eq, steps = []) {
  steps.push({
    kind: "info",
    type: "info",
    title: "صورت مسئله",
    description: "معادله واردشده را مرحله به مرحله حل می کنیم.",
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
    addTransformStep(
      steps,
      "آماده کردن عبارت سمت چپ",
      "ابتدا شکل نوشتن عبارت سمت چپ را برای انجام محاسبات یکسان می کنیم.",
      leftExpr,
      normalizedLeft,
      "prepare-left",
    );
    leftExpr = normalizedLeft;
  }

  const normalizedRight = normalizeRadicalExpression(rightExpr);
  if (normalizedRight !== rightExpr) {
    addTransformStep(
      steps,
      "آماده کردن عبارت سمت راست",
      "ابتدا شکل نوشتن عبارت سمت راست را برای انجام محاسبات یکسان می کنیم.",
      rightExpr,
      normalizedRight,
      "prepare-right",
    );
    rightExpr = normalizedRight;
  }

  const leftRadicalRewrite = rewriteNumericSqrtMulDiv(leftExpr);
  if (leftRadicalRewrite.changed && leftRadicalRewrite.rewritten !== leftExpr) {
    addTransformStep(
      steps,
      "ساده سازی طرف چپ",
      "در طرف چپ، ضرب یا تقسیم رادیکال های عددی را ساده می کنیم.",
      leftExpr,
      leftRadicalRewrite.rewritten,
      "simplify-left",
    );
    leftExpr = leftRadicalRewrite.rewritten;
  }

  const rightRadicalRewrite = rewriteNumericSqrtMulDiv(rightExpr);
  if (
    rightRadicalRewrite.changed &&
    rightRadicalRewrite.rewritten !== rightExpr
  ) {
    addTransformStep(
      steps,
      "ساده سازی طرف راست",
      "در طرف راست، ضرب یا تقسیم رادیکال های عددی را ساده می کنیم.",
      rightExpr,
      rightRadicalRewrite.rewritten,
      "simplify-right",
    );
    rightExpr = rightRadicalRewrite.rewritten;
  }

  const left = parsePolynomial(leftExpr);
  const right = parsePolynomial(rightExpr);

  const leftStr = stringifyMathValue(left);
  const rightStr = stringifyMathValue(right);

  if (leftStr !== leftExpr || rightStr !== rightExpr) {
    steps.push({
      kind: "transform",
      type: "transform",
      title: "ساده سازی دو طرف مساوی",
      description:
        "ابتدا در هر طرف مساوی، عبارت های مشابه را با هم جمع می کنیم و هر طرف را تا حد امکان ساده می کنیم.",
      from: `${leftExpr} = ${rightExpr}`,
      to: `${leftStr} = ${rightStr}`,
      meta: {
        phase: "simplify-both-sides",
      },
    });
  }

  const leftForm = left.toLinearForm();
  const rightForm = right.toLinearForm();

  const variable = leftForm.variable || rightForm.variable;

  if (!variable) {
    const diff = leftForm.b.subtract(rightForm.b);
    if (diff.isZero()) {
      throw new Error("این معادله بی نهایت جواب دارد.");
    }
    throw new Error("این معادله جواب ندارد.");
  }

  const movedLeftRaw = buildSumExpression(
    [leftForm.a, rightForm.a.negate()],
    variable,
  );

  const movedRightRaw = buildSumExpression([rightForm.b, leftForm.b.negate()]);

  const movedEquation = `${movedLeftRaw} = ${movedRightRaw}`;

  steps.push({
    kind: "transform",
    type: "transform",
    title: "جدا کردن متغیر و عددهای ثابت",
    description: `جمله های شامل متغیر ${variable} را به یک طرف مساوی و عددهای ثابت را به طرف دیگر مساوی منتقل می کنیم.`,
    from: `${leftStr} = ${rightStr}`,
    to: movedEquation,
    meta: {
      phase: "move-variable-and-constants",
    },
  });

  const variableCoefficient = leftForm.a.subtract(rightForm.a);
  const rightNumber = rightForm.b.subtract(leftForm.b);

  if (variableCoefficient.isZero()) {
    if (rightNumber.isZero()) {
      throw new Error("این معادله بی نهایت جواب دارد.");
    }
    throw new Error("این معادله جواب ندارد.");
  }

  const simplifiedLeft = formatTerm(variableCoefficient, variable);

  const simplifiedRight = formatTerm(rightNumber);

  const simplifiedMovedEquation = `${simplifiedLeft} = ${simplifiedRight}`;

  addTransformStep(
    steps,
    "ساده سازی پس از انتقال",
    "پس از انتقال جمله ها، عبارت های هر دو طرف مساوی را دوباره ساده می کنیم.",
    movedEquation,
    simplifiedMovedEquation,
    "simplify-after-moving",
  );

  const solution = rightNumber.divide(variableCoefficient);
  const solutionStr = `${variable} = ${stringifyMathValue(solution)}`;

  steps.push({
    kind: "solution",
    type: "solution",
    title: "به دست آوردن جواب معادله",
    description: `برای تنها ماندن متغیر ${variable}، هر دو طرف مساوی را بر ضریب متغیر ${variable} تقسیم می کنیم. بنابراین جواب معادله برابر است با ${solutionStr}.`,
    from: simplifiedMovedEquation,
    to: solutionStr,
    value: solutionStr,
    meta: {
      final: true,
      phase: "divide-by-variable-coefficient",
    },
  });

  return solutionStr;
}
