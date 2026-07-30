// src/algebra/identityDetector.js

function stripOuterSpaces(s) {
  return (s || "").replace(/\s+/g, "");
}

/**
 * تلاش می‌کند پرانتز بیرونی را فقط اگر کل عبارت را پوشش می‌دهد حذف کند
 */
function unwrapOuterParens(expr) {
  let s = stripOuterSpaces(expr);
  if (!s.startsWith("(") || !s.endsWith(")")) return s;

  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;

    if (depth === 0 && i < s.length - 1) {
      return s;
    }
  }

  return s.slice(1, -1);
}

function splitTopLevelByPlusMinus(expr) {
  const s = stripOuterSpaces(expr);
  let depth = 0;
  let idx = -1;
  let sign = null;

  for (let i = 1; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if ((ch === "+" || ch === "-") && depth === 0) {
      idx = i;
      sign = ch;
      break;
    }
  }

  if (idx === -1) return null;

  return {
    left: s.slice(0, idx),
    right: s.slice(idx + 1),
    sign,
  };
}

function sameText(a, b) {
  return stripOuterSpaces(a) === stripOuterSpaces(b);
}

/**
 * تشخیص (a+b)^2 یا (a-b)^2
 */
function detectBinomialSquare(expr) {
  const s = stripOuterSpaces(expr);

  const m = s.match(/^\((.+)\)\^2$/);
  if (!m) return null;

  const inside = unwrapOuterParens(m[1]);
  const parts = splitTopLevelByPlusMinus(inside);
  if (!parts) return null;

  const { left, right, sign } = parts;

  return {
    kind: "BINOMIAL_SQUARE",
    raw: s,
    normalized: s,
    generalForm: sign === "+" ? "(a+b)^2" : "(a-b)^2",
    expansionForm: sign === "+" ? "a^2+2ab+b^2" : "a^2-2ab+b^2",
    matchedParts: {
      a: left,
      b: right,
      sign,
    },
    priority: 100,
  };
}

/**
 * تشخیص (a+b)(a-b) یا (a-b)(a+b)
 */
function detectConjugate(expr) {
  const s = stripOuterSpaces(expr);

  const m = s.match(/^\((.+)\)\((.+)\)$/);
  if (!m) return null;

  const p1 = unwrapOuterParens(m[1]);
  const p2 = unwrapOuterParens(m[2]);

  const a1 = splitTopLevelByPlusMinus(p1);
  const a2 = splitTopLevelByPlusMinus(p2);

  if (!a1 || !a2) return null;

  // شرط اتحاد مزدوج:
  // leftها برابر باشند، rightها برابر باشند، و علامت‌ها مخالف باشند
  if (
    sameText(a1.left, a2.left) &&
    sameText(a1.right, a2.right) &&
    ((a1.sign === "+" && a2.sign === "-") ||
      (a1.sign === "-" && a2.sign === "+"))
  ) {
    return {
      kind: "CONJUGATE",
      raw: s,
      normalized: s,
      generalForm: "(a+b)(a-b)",
      expansionForm: "a^2-b^2",
      matchedParts: {
        a: a1.left,
        b: a1.right,
        sign1: a1.sign,
        sign2: a2.sign,
      },
      priority: 90,
    };
  }

  return null;
}

/**
 * تشخیص ضرب توزیعی ساده مثل (a+b)x یا x(a+b)
 */
function detectSimpleDistribution(expr) {
  const s = stripOuterSpaces(expr);

  // فرم: ( ... )something
  let m = s.match(/^\((.+)\)([a-zA-Z0-9]+)$/);
  if (m) {
    const inside = unwrapOuterParens(m[1]);
    const factor = m[2];
    const parts = splitTopLevelByPlusMinus(inside);
    if (parts) {
      return {
        kind: "DISTRIBUTION",
        raw: s,
        normalized: s,
        generalForm: "(a±b)c",
        expansionForm:
          parts.sign === "+"
            ? "ac+bc"
            : "ac-bc",
        matchedParts: {
          a: parts.left,
          b: parts.right,
          c: factor,
          sign: parts.sign,
        },
        priority: 60,
      };
    }
  }

  // فرم: something( ... )
  m = s.match(/^([a-zA-Z0-9]+)\((.+)\)$/);
  if (m) {
    const factor = m[1];
    const inside = unwrapOuterParens(m[2]);
    const parts = splitTopLevelByPlusMinus(inside);
    if (parts) {
      return {
        kind: "DISTRIBUTION",
        raw: s,
        normalized: s,
        generalForm: "c(a±b)",
        expansionForm:
          parts.sign === "+"
            ? "ca+cb"
            : "ca-cb",
        matchedParts: {
          a: parts.left,
          b: parts.right,
          c: factor,
          sign: parts.sign,
        },
        priority: 60,
      };
    }
  }

  return null;
}

export function detectIdentities(expr) {
  const results = [];

  const candidates = [
    detectBinomialSquare(expr),
    detectConjugate(expr),
    detectSimpleDistribution(expr),
  ].filter(Boolean);

  candidates.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const c of candidates) {
    results.push(c);
  }

  return results;
}
