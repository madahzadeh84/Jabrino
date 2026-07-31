// src/core/validate.js

/**
 * normalizeMathInput (Normalization / نرمال‌سازی)
 */
export function normalizeMathInput(expr) {
  if (!expr) return expr;

  return String(expr)
    .replace(/[\u00A0\u200B\u200C\u200D\u2060\uFEFF]/g, "")
    .replace(/[·⋅×]/g, "*")
    .replace(/[÷]/g, "/");
}

/**
 * validate (Validation / اعتبارسنجی)
 */
export function validate(expr) {
  expr = normalizeMathInput(expr);
  expr = expr.replace(/\s+/g, "");

  if (!expr) throw new Error("عبارت خالی است.");

  // ۱. جلوگیری از نقطه‌های پی‌درپی
  if (/\.{2,}/.test(expr)) {
    throw new Error("استفاده از چند نقطه پی‌درپی (..) مجاز نیست.");
  }

  // ۲. جلوگیری از نقطه چسبیده به متغیر تک‌حرفی
  // مثال: x.5 یا 3x.3
  if (/[a-zA-Z]\.|\.[a-zA-Z]/.test(expr)) {
    throw new Error(
      "نقطه (.) فقط برای اعداد اعشاری است. برای ضرب از علامت × استفاده کنید.",
    );
  }

  // ۳. فقط کاراکترهای مجاز خطی + آکولاد
  // NO backslash
  if (!/^[0-9a-zA-Z+\-*/=()^._{}]+$/.test(expr)) {
    throw new Error("کاراکتر غیرمجاز وجود دارد.");
  }

  const braceRegex = /\{([^{}]+)\}/g;
  let braceMatch;
  while ((braceMatch = braceRegex.exec(expr)) !== null) {
    const varName = braceMatch[1];
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(varName)) {
      throw new Error(`نام متغیر داخل آکولاد نامعتبر است: {${varName}}`);
    }
  }

  // ۵. آکولاد تودرتو یا ناقص
  let braceBalance = 0;
  for (const ch of expr) {
    if (ch === "{") braceBalance++;
    if (ch === "}") {
      braceBalance--;
      if (braceBalance < 0) throw new Error("آکولاد اضافی وجود دارد.");
    }
  }
  if (braceBalance !== 0) {
    throw new Error("آکولادها متوازن نیستند.");
  }

  // ۶. چینش عملگرها
  if (/[+\-*/^=]{2,}/.test(expr.replace(/--/g, ""))) {
    throw new Error("چینش عملگرها نامعتبر است.");
  }

  // Equals count
  const eqCount = (expr.match(/=/g) || []).length;
  if (eqCount > 1) throw new Error("بیش از یک مساوی وجود دارد.");

  // Parentheses balance
  let balance = 0;
  for (const ch of expr) {
    if (ch === "(") balance++;
    if (ch === ")") {
      balance--;
      if (balance < 0) throw new Error("پرانتز اضافی وجود دارد.");
    }
  }
  if (balance !== 0) throw new Error("پرانتزها متوازن نیستند.");

  // Cannot end with operator
  if (/[+\-*/=^]$/.test(expr)) throw new Error("عبارت ناقص است.");

  // Cannot start with these
  if (/^[*/=^]/.test(expr)) throw new Error("شروع عبارت نامعتبر است.");

  if (/==/.test(expr)) throw new Error("ساختار مساوی نامعتبر است.");

  return expr;
}

/**
 * Fractional exponent guard (توانِ کسری / Fractional Exponent)
 */
export function rejectFractionalExponents(expr) {
  const matches = expr.match(/\^\(\s*\d+\s*\/\s*\d+\s*\)/g);
  if (!matches) return;

  const unsupported = matches.filter(
    (m) => !/^\^\(\s*1\s*\/\s*2\s*\)$/.test(m),
  );

  if (unsupported.length > 0) {
    throw new Error("توانِ کسری فعلاً توسط موتور محاسباتی پشتیبانی نمی‌شود.");
  }
}

/**
 * detectAmbiguousDivision (Ambiguous Division / تقسیم مبهم)
 */
export function detectAmbiguousDivision(expr) {
  // فقط برای الگوهای تک‌حرفی ساده
  const pattern = /(\d*)([a-zA-Z])\/(\d*)([a-zA-Z])/g;
  const match = pattern.exec(expr);

  if (match) {
    const full = match[0];
    const a = match[1] || "1";
    const var1 = match[2];
    const b = match[3] || "1";
    const var2 = match[4];

    const suggestion =
      var1 === var2 ? `${var1}(${a}/${b})` : `(${a}${var1})/(${b}${var2})`;

    throw new Error(
      `تقسیم مبهم تشخیص داده شد: ${full}\nآیا منظورتان این بوده است:\n${suggestion}\nدر صورت منظور بودن کسر جبری، لطفاً از پرانتز استفاده کنید.`,
    );
  }

  // فقط نام تابع‌های واقعی، نه متغیرهای داخل آکولاد
  const functionCalls = expr.match(/\b[a-zA-Z]+(?=\()/g) || [];
  const allowedFunctions = new Set(["sqrt"]);

  for (const fn of functionCalls) {
    if (!allowedFunctions.has(fn)) {
      throw new Error(`تابع "${fn}" پشتیبانی نمی‌شود.`);
    }
  }
}
