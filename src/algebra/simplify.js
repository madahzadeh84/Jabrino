// src/algebra/simplify.js

import { tokenize } from "./tokenizer.js";
import { Parser } from "./parser.js";
import {
  addInfoStep,
  addTransformStep,
  addSolutionStep,
} from "./stepsHelper.js";
import { detectIdentities } from "./identityDetector.js";

function parsePolynomial(expr) {
  const tokens = tokenize(expr);
  const parser = new Parser(tokens);
  return parser.parse();
}

function wrapParenLatex(value) {
  const text = String(value || "").trim();
  return `\\left(${text}\\right)`;
}

function buildIdentityLatex(identity) {
  if (!identity) {
    return "";
  }

  const parts = identity.matchedParts || {};
  const firstPart = parts.a || "a";
  const secondPart = parts.b || "b";
  const multiplier = parts.c || "c";

  switch (identity.kind) {
    case "BINOMIAL_SQUARE": {
      if (parts.sign === "+") {
        return (
          `${wrapParenLatex(firstPart)}${wrapParenLatex(firstPart)}` +
          `+${wrapParenLatex(firstPart)}${wrapParenLatex(secondPart)}` +
          `+${wrapParenLatex(secondPart)}${wrapParenLatex(firstPart)}` +
          `+${wrapParenLatex(secondPart)}${wrapParenLatex(secondPart)}`
        );
      }

      return (
        `${wrapParenLatex(firstPart)}${wrapParenLatex(firstPart)}` +
        `-${wrapParenLatex(firstPart)}${wrapParenLatex(secondPart)}` +
        `-${wrapParenLatex(secondPart)}${wrapParenLatex(firstPart)}` +
        `+${wrapParenLatex(secondPart)}${wrapParenLatex(secondPart)}`
      );
    }

    case "CONJUGATE":
      return (
        `${wrapParenLatex(firstPart)}${wrapParenLatex(firstPart)}` +
        `-${wrapParenLatex(firstPart)}${wrapParenLatex(secondPart)}` +
        `+${wrapParenLatex(secondPart)}${wrapParenLatex(firstPart)}` +
        `-${wrapParenLatex(secondPart)}${wrapParenLatex(secondPart)}`
      );

    case "DISTRIBUTION": {
      if (parts.sign === "+") {
        return (
          `${wrapParenLatex(multiplier)}${wrapParenLatex(firstPart)}` +
          `+${wrapParenLatex(multiplier)}${wrapParenLatex(secondPart)}`
        );
      }

      return (
        `${wrapParenLatex(multiplier)}${wrapParenLatex(firstPart)}` +
        `-${wrapParenLatex(multiplier)}${wrapParenLatex(secondPart)}`
      );
    }

    default:
      return "";
  }
}

function buildIdentityApplication(expr, identity) {
  if (!identity) {
    return expr;
  }

  const parts = identity.matchedParts || {};
  const firstPart = parts.a || "a";
  const secondPart = parts.b || "b";
  const multiplier = parts.c || "c";

  switch (identity.kind) {
    case "BINOMIAL_SQUARE":
      return parts.sign === "+"
        ? `(${firstPart})*(${firstPart}) + (${firstPart})*(${secondPart}) + (${secondPart})*(${firstPart}) + (${secondPart})*(${secondPart})`
        : `(${firstPart})*(${firstPart}) - (${firstPart})*(${secondPart}) - (${secondPart})*(${firstPart}) + (${secondPart})*(${secondPart})`;

    case "CONJUGATE":
      return `(${firstPart})*(${firstPart}) - (${firstPart})*(${secondPart}) + (${secondPart})*(${firstPart}) - (${secondPart})*(${secondPart})`;

    case "DISTRIBUTION":
      return parts.sign === "+"
        ? `(${multiplier})*(${firstPart}) + (${multiplier})*(${secondPart})`
        : `(${multiplier})*(${firstPart}) - (${multiplier})*(${secondPart})`;

    default:
      return expr;
  }
}

function getPolynomialText(expr) {
  try {
    const polynomial = parsePolynomial(expr);

    if (typeof polynomial.toDisplayString === "function") {
      return polynomial.toDisplayString();
    }

    if (typeof polynomial.toString === "function") {
      return polynomial.toString();
    }

    return String(polynomial);
  } catch {
    return expr;
  }
}

function buildCalculatedProducts(identity) {
  if (!identity) {
    return "";
  }

  const parts = identity.matchedParts || {};
  const firstPart = parts.a || "a";
  const secondPart = parts.b || "b";
  const multiplier = parts.c || "c";

  const multiply = (left, right) => getPolynomialText(`(${left})*(${right})`);

  switch (identity.kind) {
    case "BINOMIAL_SQUARE": {
      const firstSquared = multiply(firstPart, firstPart);
      const firstSecond = multiply(firstPart, secondPart);
      const secondFirst = multiply(secondPart, firstPart);
      const secondSquared = multiply(secondPart, secondPart);

      return parts.sign === "+"
        ? `${firstSquared} + ${firstSecond} + ${secondFirst} + ${secondSquared}`
        : `${firstSquared} - ${firstSecond} - ${secondFirst} + ${secondSquared}`;
    }

    case "CONJUGATE": {
      const firstSquared = multiply(firstPart, firstPart);
      const firstSecond = multiply(firstPart, secondPart);
      const secondFirst = multiply(secondPart, firstPart);
      const secondSquared = multiply(secondPart, secondPart);

      return `${firstSquared} - ${firstSecond} + ${secondFirst} - ${secondSquared}`;
    }

    case "DISTRIBUTION": {
      const firstProduct = multiply(multiplier, firstPart);
      const secondProduct = multiply(multiplier, secondPart);

      return parts.sign === "+"
        ? `${firstProduct} + ${secondProduct}`
        : `${firstProduct} - ${secondProduct}`;
    }

    default:
      return "";
  }
}

function formatNumber(number) {
  if (Number.isInteger(number)) {
    return String(number);
  }

  return String(Number(number.toFixed(10)));
}

function isValidRadicand(number) {
  return Number.isFinite(number) && number >= 0;
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

  normalized = normalized.replace(/\\sqrt\s*\{\s*([^{}]+?)\s*\}/g, "sqrt($1)");

  normalized = normalized.replace(/√\s*\(\s*([^()]+?)\s*\)/g, "sqrt($1)");

  normalized = normalized.replace(
    /√\s*([0-9]+(?:\.[0-9]+)?(?:\s*\*?\s*[a-zA-Z][a-zA-Z0-9]*(?:\^[0-9]+)?)?)/g,
    "sqrt($1)",
  );

  normalized = normalized
    .replace(/\s+/g, " ")
    .replace(
      /sqrt\(\s*([0-9]+)\s*([a-zA-Z][a-zA-Z0-9]*(?:\^[0-9]+)?)\s*\)/g,
      "sqrt($1*$2)",
    )
    .replace(/(\d)\s*([a-zA-Z])/g, "$1*$2")
    .trim();

  normalized = normalized.replace(
    /(sqrt\(\s*[^()]+\s*\))\s*(?=sqrt\()/g,
    "$1*",
  );

  return normalized;
}

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

        const radicand = operator === "*" ? left * right : left / right;

        if (!isValidRadicand(radicand)) {
          return match;
        }

        changed = true;
        return `sqrt(${formatNumber(radicand)})`;
      },
    );
  } while (currentExpr !== previousExpr);

  return {
    changed,
    rewritten: currentExpr,
  };
}

function findLargestSquareFactor(radicand) {
  if (!Number.isSafeInteger(radicand) || radicand < 2) {
    return null;
  }

  for (let root = Math.floor(Math.sqrt(radicand)); root >= 2; root -= 1) {
    const square = root * root;

    if (radicand % square === 0) {
      return {
        root,
        square,
        remainder: radicand / square,
      };
    }
  }

  return null;
}

/**
 * یک رادیکال را در هر بار ساده می کند.
 *
 * نمونه ها:
 * sqrt(32)    -> 4*sqrt(2)
 * sqrt(9*x)   -> 3*sqrt(x)
 * sqrt(72*x)  -> 6*sqrt(2*x)
 * sqrt(x^2)   -> abs(x)
 */
function simplifyOneRadical(expr) {
  const text = String(expr);

  // ۱) حالت ویژه: sqrt(x^2) -> abs(x)
  const variableSquarePattern = /sqrt\(\s*([a-zA-Z][a-zA-Z0-9]*)\s*\^\s*2\s*\)/;
  const variableSquareMatch = variableSquarePattern.exec(text);

  if (variableSquareMatch) {
    const variablePart = variableSquareMatch[1];
    const separatedRadical = `sqrt((${variablePart})^2)`;
    const simplifiedRadical = `abs(${variablePart})`;

    return {
      kind: "variable-square",
      original: variableSquareMatch[0],
      separated: text.replace(variableSquareMatch[0], separatedRadical),
      simplified: text.replace(variableSquareMatch[0], simplifiedRadical),
      square: `${variablePart}^2`,
    };
  }

  // ۲) sqrt(عدد * متغیر)
  const coefficientVariablePattern =
    /sqrt\(\s*([0-9]+)\s*\*?\s*([a-zA-Z][a-zA-Z0-9]*(?:\^[0-9]+)?)\s*\)/;

  const coefficientVariableMatch = coefficientVariablePattern.exec(text);

  if (coefficientVariableMatch) {
    const coefficient = Number(coefficientVariableMatch[1]);
    const variablePart = coefficientVariableMatch[2];
    const factor = findLargestSquareFactor(coefficient);

    if (!factor) {
      return null;
    }

    const { root, square, remainder } = factor;
    const remainingInside =
      remainder === 1 ? variablePart : `${remainder}*${variablePart}`;

    const separatedRadical = `sqrt(${square}*${remainingInside})`;
    const simplifiedRadical = `${root}*sqrt(${remainingInside})`;

    return {
      kind: "numeric-coefficient",
      original: coefficientVariableMatch[0],
      separated: text.replace(coefficientVariableMatch[0], separatedRadical),
      simplified: text.replace(coefficientVariableMatch[0], simplifiedRadical),
      square,
    };
  }

  // ۳) sqrt(عدد)
  const numericPattern = /sqrt\(\s*([0-9]+)\s*\)/;
  const numericMatch = numericPattern.exec(text);

  if (!numericMatch) {
    return null;
  }

  const radicand = Number(numericMatch[1]);
  const factor = findLargestSquareFactor(radicand);

  if (!factor) {
    return null;
  }

  const { root, square, remainder } = factor;

  // مربع کامل خالص: sqrt(9) -> 3
  if (remainder === 1) {
    const separatedRadical = numericMatch[0]; // همان شکل اولیه
    const simplifiedRadical = String(root);

    return {
      kind: "pure-perfect-square",
      original: numericMatch[0],
      separated: text.replace(numericMatch[0], separatedRadical),
      simplified: text.replace(numericMatch[0], simplifiedRadical),
      square,
    };
  }

  // سایر اعداد: sqrt(32) -> 4*sqrt(2)
  const separatedRadical = `sqrt(${square}*${remainder})`;
  const simplifiedRadical = `${root}*sqrt(${remainder})`;

  return {
    kind: "pure-numeric",
    original: numericMatch[0],
    separated: text.replace(numericMatch[0], separatedRadical),
    simplified: text.replace(numericMatch[0], simplifiedRadical),
    square,
  };
}

/**
 * تشخیص وجود تابع های ویژه مثل sqrt(...) یا abs(...)
 * این تابع فقط برای محافظت از Parser استفاده می شود.
 */
function containsSpecialMathFunction(expr) {
  const text = String(expr || "");
  return /\b(?:sqrt|abs)\s*\(/.test(text);
}
// نمایش ویژه برای «جواب نهایی»:
// اگر رشته به صورت (a/b)*x باشد، آن را به a/bx تبدیل می کند.
// مثال: "(3/19)*x" -> "3/19x"
function formatFinalAnswer(linear) {
  const str = String(linear).trim();

  // الگوی "(صورت/مخرج)*متغیر"
  const fracTimesVariable = str.match(
    /^\(([^()]+)\)\*([A-Za-z][A-Za-z0-9_]*)$/,
  );

  if (fracTimesVariable) {
    const [, fraction, variable] = fracTimesVariable;
    // fraction مثل "3/19" است، variable مثل "x"
    return `${fraction}${variable}`; // "3/19x"
  }

  // در سایر حالت ها، همان رشته را بدون تغییر برگردان
  return str;
}

export function simplify(expr, steps = []) {
  // گام ۱: ثبت عبارت اولیه
  addInfoStep(steps, {
    title: "عبارت اولیه",
    description: "عبارت ورودی ثبت شده و برای بررسی و ساده سازی آماده می شود.",
    value: expr,
    meta: {
      exprOriginal: expr,
      preview: expr,
    },
  });

  // گام ۲: یکدست کردن نوشتار رادیکال ها و عملگرها
  const normalizedExpr = normalizeRadicalExpression(expr);

  if (normalizedExpr !== expr) {
    addTransformStep(steps, {
      title: "یکدست کردن نوشتار عبارت",
      description:
        "شکل نوشتن رادیکال ها و عملگرها برای ادامه محاسبه یکسان می شود.",
      from: expr,
      to: normalizedExpr,
      meta: {
        phase: "normalize-expression",
      },
    });
  }

  let currentExpr = normalizedExpr;

  // گام ۳: تشخیص گشودن پرانتز
  const identities = detectIdentities(currentExpr) || [];
  const primaryIdentity = identities[0] || null;

  if (primaryIdentity) {
    const applied = buildIdentityApplication(currentExpr, primaryIdentity);
    const appliedLatex = buildIdentityLatex(primaryIdentity);

    if (applied && applied !== currentExpr) {
      addTransformStep(steps, {
        title: "گشودن پرانتز",
        description:
          "با استفاده از خاصیت پخش پذیری، جمله های داخل پرانتزها تک به تک در هم ضرب می شوند.",
        from: currentExpr,
        to: applied,
        meta: {
          phase: "rewrite",
          identity: primaryIdentity.kind,
          latex: {
            to: appliedLatex,
          },
        },
      });

      currentExpr = applied;

      const calculatedProducts = buildCalculatedProducts(primaryIdentity);

      if (calculatedProducts && calculatedProducts !== currentExpr) {
        addTransformStep(steps, {
          title: "محاسبه ضرب ها",
          description:
            "حاصل ضرب هر جمله به دست می آید. در این گام هنوز جمله های متشابه با هم ترکیب نمی شوند.",
          from: currentExpr,
          to: calculatedProducts,
          meta: {
            phase: "calculate-products",
            identity: primaryIdentity.kind,
            latex: {
              to: calculatedProducts,
            },
          },
        });

        currentExpr = calculatedProducts;
      }
    }
  }

  // گام ۴: ترکیب رادیکال های عددی در ضرب و تقسیم
  const radicalRewrite = rewriteNumericSqrtMulDiv(currentExpr);

  if (radicalRewrite.changed && radicalRewrite.rewritten !== currentExpr) {
    addTransformStep(steps, {
      title: "ترکیب رادیکال های عددی",
      description:
        "در ضرب یا تقسیم دو رادیکال عددی، عددهای زیر رادیکال با همان عمل با یکدیگر ترکیب می شوند.",
      from: currentExpr,
      to: radicalRewrite.rewritten,
      meta: {
        phase: "combine-numeric-radicals",
      },
    });

    currentExpr = radicalRewrite.rewritten;
  }

  // گام ۵: ساده کردن رادیکال ها (یک رادیکال در هر بار)
  let radicalStep = simplifyOneRadical(currentExpr);

  while (radicalStep) {
    let separateTitle = "جدا کردن مربع کامل از زیر رادیکال";
    let separateDescription =
      "بزرگ ترین مربع کامل از بخش عددی یا توان دوم زیر رادیکال جدا می شود تا رادیکال ساده تر شود.";

    let simplifyTitle = "ساده کردن رادیکال";
    let simplifyDescription =
      "ریشه دوم مربع کامل محاسبه می شود و بخش باقی مانده زیر رادیکال می ماند.";

    if (radicalStep.kind === "variable-square") {
      separateTitle = "تشخیص توان دوم زیر رادیکال";
      separateDescription =
        "توان دوم متغیر زیر رادیکال مشخص می شود تا بتوان آن را به شکل مناسب ساده کرد.";

      simplifyTitle = "ساده کردن رادیکال توان دوم";
      simplifyDescription =
        "ریشه دوم توان دوم متغیر زیر رادیکال محاسبه و به صورت قدر مطلق نوشته می شود.";
    } else if (radicalStep.kind === "numeric-coefficient") {
      separateDescription =
        "بزرگ ترین مربع کامل از بخش عددی در ضرب با متغیر زیر رادیکال جدا می شود تا رادیکال ساده تر شود.";
    } else if (radicalStep.kind === "pure-numeric") {
      separateDescription =
        "بزرگ ترین مربع کامل از عدد زیر رادیکال جدا می شود تا رادیکال ساده تر شود.";
    } else if (radicalStep.kind === "pure-perfect-square") {
      separateTitle = "تشخیص مربع کامل زیر رادیکال";
      separateDescription =
        "عدد زیر رادیکال بررسی می شود تا مشخص شود مربع کامل است و ریشه دوم آن یک عدد صحیح است.";

      simplifyTitle = "ساده کردن رادیکال مربع کامل";
      simplifyDescription =
        "چون عدد زیر رادیکال مربع کامل است، ریشه دوم آن محاسبه و به صورت عدد صحیح نوشته می شود.";
    }

    // برای همه انواع به جز مربع کامل خالص، کارت «جدا کردن مربع کامل» اضافه می شود
    if (radicalStep.kind !== "pure-perfect-square") {
      addTransformStep(steps, {
        title: separateTitle,
        description: separateDescription,
        from: currentExpr,
        to: radicalStep.separated,
        meta: {
          phase: "separate-perfect-square",
          kind: radicalStep.kind,
          originalRadical: radicalStep.original,
          square: radicalStep.square,
        },
      });
    }

    // کارت ساده کردن رادیکال (برای همه انواع، از جمله pure-perfect-square)
    addTransformStep(steps, {
      title: simplifyTitle,
      description: simplifyDescription,
      from:
        radicalStep.kind === "pure-perfect-square"
          ? currentExpr
          : radicalStep.separated,
      to: radicalStep.simplified,
      meta: {
        phase: "simplify-radical",
        kind: radicalStep.kind,
        originalRadical: radicalStep.original,
      },
    });

    currentExpr = radicalStep.simplified;
    radicalStep = simplifyOneRadical(currentExpr);
  }

  // گام ۶: ساده سازی عبارت با ترکیب جمله های متشابه
  let result = currentExpr;

  if (!containsSpecialMathFunction(currentExpr)) {
    try {
      const polynomial = parsePolynomial(currentExpr);
      if (typeof polynomial.toDisplayString === "function") {
        result = polynomial.toDisplayString();
      } else if (typeof polynomial.toString === "function") {
        result = polynomial.toString();
      } else {
        result = String(polynomial);
      }
    } catch (error) {
      addInfoStep(steps, {
        title: "خطا در ساده سازی",
        description:
          "در حین انجام محاسبات و ساده سازی عبارت خطایی رخ داد.\n" +
          `جزئیات فنی: ${error.message}`,
        value: currentExpr,
        meta: {
          error: error.message,
          expr: currentExpr,
        },
      });

      return expr;
    }
  }

  const lastTransformTo =
    [...steps]
      .reverse()
      .find(
        (step) =>
          (step.kind === "transform" || step.type === "transform") &&
          typeof step.to === "string",
      )?.to || currentExpr;
  if (result !== lastTransformTo) {
    addTransformStep(steps, {
      title: "ساده سازی عبارت",
      description:
        "جمله های متشابه با یکدیگر ترکیب و عبارت به شکل ساده تر نوشته می شود.",
      from: lastTransformTo,
      to: result,
      meta: {
        phase: "combine-like-terms",
      },
    });
  }

  // فقط برای نمایش جواب نهایی، رشته را در صورت امکان ساده تر (بدون پرانتز و بدون علامت ضرب) می کنیم
  const finalValue = formatFinalAnswer(result);

  addSolutionStep(steps, {
    description: "این عبارت، شکل نهایی و ساده شده پس از انجام همه محاسبات است.",
    value: finalValue,
    meta: {
      identitiesCount: identities.length,
      final: true,
    },
  });

  return finalValue;
}
