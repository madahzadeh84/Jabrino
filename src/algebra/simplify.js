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

function formatIdentityDescription(identity) {
  switch (identity.kind) {
    case "BINOMIAL_SQUARE":
      return {
        title: "تشخیص اتحاد مربع دوجمله‌ای",
        description:
          "اتحاد مربع دوجمله‌ای (Binomial Square | مربع دوجمله‌ای) در عبارت شناسایی شد.",
      };

    case "CONJUGATE":
      return {
        title: "تشخیص اتحاد مزدوج",
        description:
          "اتحاد مزدوج (Conjugate Identity | اتحاد مزدوج) از نوع \n(a+b)(a-b) در عبارت شناسایی شد.",
      };

    case "DISTRIBUTION":
      return {
        title: "تشخیص خاصیت توزیع‌پذیری",
        description:
          "الگوی توزیع‌پذیری (Distributive Property | خاصیت توزیع‌پذیری) در عبارت شناسایی شد.",
      };

    default:
      return {
        title: "تشخیص الگوی جبری",
        description:
          "یک الگوی جبری (Algebraic Pattern | الگوی جبری) در عبارت شناسایی شد.",
      };
  }
}

function buildIdentityPreview(identity) {
  if (!identity) return "";

  const gf = identity.generalForm || "";
  const ef = identity.expansionForm || "";
  return ef ? `${gf}  →  ${ef}` : gf;
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
      "عبارت ورودی ثبت می‌شود و برای تحلیل، تشخیص الگوهای جبری و ساده‌سازی آماده می‌شود.",
    value: expr,
    meta: {
      exprOriginal: expr,
      preview: expr,
    },
  });

  const identities = detectIdentities(expr) || [];
  const primaryIdentity = identities[0] || null;

  if (primaryIdentity) {
    const identityText = formatIdentityDescription(primaryIdentity);

    addInfoStep(steps, {
      title: identityText.title,
      description:
        `${identityText.description}\n` +
        `بخش شناسایی‌شده در عبارت: ${primaryIdentity.raw}`,
      value: buildIdentityPreview(primaryIdentity),
      meta: {
        identity: primaryIdentity,
        preview: buildIdentityPreview(primaryIdentity),
        generalForm: primaryIdentity.generalForm,
        expansionForm: primaryIdentity.expansionForm,
        matchedParts: primaryIdentity.matchedParts,
      },
    });

    const applied = buildIdentityApplication(expr, primaryIdentity);

    if (applied && applied !== expr) {
      addTransformStep(steps, {
        title:
          primaryIdentity.kind === "BINOMIAL_SQUARE"
            ? "اعمال اتحاد مربع دوجمله‌ای"
            : primaryIdentity.kind === "CONJUGATE"
            ? "اعمال اتحاد مزدوج"
            : "اعمال توزیع‌پذیری",
        description:
          primaryIdentity.kind === "BINOMIAL_SQUARE"
            ? "با استفاده از فرمول اتحاد مربع دوجمله‌ای، عبارت به مجموع جمله‌های استاندارد تبدیل می‌شود."
            : primaryIdentity.kind === "CONJUGATE"
            ? "با استفاده از اتحاد مزدوج، حاصل‌ضرب دو عبارت مزدوج به تفاضل دو مربع تبدیل می‌شود."
            : "با استفاده از خاصیت توزیع‌پذیری، عامل مشترک در جمله‌های داخل پرانتز توزیع می‌شود.",
        from: expr,
        to: applied,
        meta: {
          phase: "identity-application",
          identity: primaryIdentity.kind,
        },
      });
    }
  }

  let poly;
  let result;

  try {
    poly = parsePolynomial(expr);
    result = poly.toString();
  } catch (e) {
    addInfoStep(steps, {
      title: "خطا در ساده‌سازی",
      description:
        "در حین بسط و ساده‌سازی عبارت خطایی رخ داد.\n" +
        `جزئیات فنی (Technical Details | جزئیات فنی): ${e.message}`,
      value: expr,
      meta: { error: e.message, expr },
    });
    return expr;
  }

  const lastTransformTo =
    [...steps]
      .reverse()
      .find((s) => s.type === "transform" && s.to)?.to || expr;

  if (result !== lastTransformTo) {
    addTransformStep(steps, {
      title: "ترکیب جملات هم‌نوع",
      description:
        "پس از بسط، جمله‌های هم‌نوع با هم ترکیب می‌شوند تا عبارت به فرم ساده‌تر و استاندارد برسد.",
      from: lastTransformTo,
      to: result,
      meta: {
        phase: "combine-like-terms",
      },
    });
  } else if (result !== expr) {
    addTransformStep(steps, {
      title: "بسط و ترکیب جملات هم‌نوع",
      description:
        "عبارت با استفاده از موتور چندجمله‌ای بسط داده شده و سپس جمله‌های هم‌نوع با هم ترکیب می‌شوند.",
      from: expr,
      to: result,
      meta: {
        phase: "expand-and-combine",
      },
    });
  }

  addSolutionStep(steps, {
    description:
      "این عبارت، فرم نهایی و ساده‌شده بعد از اعمال تبدیل‌های جبری است.",
    value: result,
    meta: {
      identitiesCount: identities.length,
      final: true,
    },
  });

  return result;
}
