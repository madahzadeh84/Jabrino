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

function buildIdentityApplication(expr, identity) {
  if (!identity) return expr;

  const p = identity.matchedParts || {};

  switch (identity.kind) {
    case "BINOMIAL_SQUARE": {
      const a = p.a || "a";
      const b = p.b || "b";
      if (p.sign === "+") {
        return `(${a})^2 + 2(${a})(${b}) + (${b})^2`;
      }
      return `(${a})^2 - 2(${a})(${b}) + (${b})^2`;
    }

    case "CONJUGATE": {
      const a = p.a || "a";
      const b = p.b || "b";
      return `(${a})^2 - (${b})^2`;
    }

    case "DISTRIBUTION": {
      const a = p.a || "a";
      const b = p.b || "b";
      const c = p.c || "c";
      if (p.sign === "+") {
        return `(${a})(${c}) + (${b})(${c})`;
      }
      return `(${a})(${c}) - (${b})(${c})`;
    }

    default:
      return expr;
  }
}

export function simplify(expr, steps = []) {
  addInfoStep(steps, {
    title: "عبارت اولیه",
    description:
      "عبارت ورودی ثبت شده و برای فرآیند تجزیه‌وتحلیل و ساده‌سازی آماده می‌شود.",
    value: expr,
    meta: {
      exprOriginal: expr,
      preview: expr,
    },
  });

  const identities = detectIdentities(expr) || [];
  const primaryIdentity = identities[0] || null;

  if (primaryIdentity) {
    const applied = buildIdentityApplication(expr, primaryIdentity);

    if (applied && applied !== expr) {
      addTransformStep(steps, {
        title: "گشودن پرانتز",
        description:
          "با گشودن پرانتزها، عبارت به شکل بازشده و تفکیک‌شده نوشته می‌شود.",
        from: expr,
        to: applied,
        meta: {
          phase: "rewrite",
          identity: primaryIdentity.kind,
        },
      });
    }
  }

  let poly;
  let result;

  try {
    poly = parsePolynomial(expr);

    // برای مراحل، نسخهٔ پایه را از toString می‌گیریم تا اطلاعات کامل حفظ شود.
    if (typeof poly.toString === "function") {
      result = poly.toString();
    } else if (typeof poly.toDisplayString === "function") {
      result = poly.toDisplayString();
    } else {
      result = String(poly);
    }
  } catch (e) {
    addInfoStep(steps, {
      title: "خطا در ساده‌سازی",
      description:
        "در حین انجام محاسبات و ساده‌سازی عبارت خطایی رخ داد.\n" +
        `جزئیات فنی: ${e.message}`,
      value: expr,
      meta: { error: e.message, expr },
    });
    return expr;
  }

  // اصلاح: بعضی stepها از فیلد kind استفاده می‌کنند، بعضی type.
  const lastTransformTo =
    [...steps]
      .reverse()
      .find(
        (s) =>
          (s.kind === "transform" || s.type === "transform") &&
          typeof s.to === "string",
      )?.to || expr;

  if (result !== lastTransformTo) {
    addTransformStep(steps, {
      title: "ساده‌سازی عبارت",
      description:
        "جمله‌های هم‌نوع با یکدیگر ترکیب می‌شوند تا عبارت به فرم ساده‌تر برسد.",
      from: lastTransformTo,
      to: result,
      meta: {
        phase: "combine-like-terms",
      },
    });
  } else if (result !== expr) {
    addTransformStep(steps, {
      title: "ساده‌سازی عبارت",
      description:
        "عبارت به کمک موتور چندجمله‌ای محاسبه شده و جمله‌های متشابه با یکدیگر ترکیب می‌شوند.",
      from: expr,
      to: result,
      meta: {
        phase: "expand-and-combine",
      },
    });
  }

  addSolutionStep(steps, {
    description:
      "این عبارت، فرم نهایی و ساده‌شده پس از انجام تمامی تبدیل‌های جبری است.",
    value: result,
    meta: {
      identitiesCount: identities.length,
      final: true,
    },
  });

  return result;
}
