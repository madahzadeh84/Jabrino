// src/core/MathAdapter.js
export class MathAdapter {
  static latexToLinear(latex) {
    if (latex == null) return "";
    let s = String(latex);

    s = s
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, "");

    s = s.replace(/√/g, "\\sqrt");
    s = s.replace(/\\left/g, "").replace(/\\right/g, "");

    // تبدیل توان
    s = s.replace(/\^\{([^}]+)\}/g, "^($1)");
    s = s.replace(/\^([a-zA-Z0-9]+|\([^)]+\))/g, "^($1)");

    // تبدیل کسر
    for (let i = 0; i < 12; i++) {
      const before = s;
      s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "(($1)/($2))");
      if (s === before) break;
    }

    // اصلاح ساختار رادیکال بدون آکولاد \sqrt5 -> \sqrt{5}
    s = s.replace(/\\sqrt(?!\{)([a-zA-Z0-9]+|\([^)]+\))/g, "\\sqrt{$1}");

    // تبدیل رادیکال‌های استاندارد به فرم تابعی sqrt(...)
    for (let i = 0; i < 12; i++) {
      const before = s;
      s = s.replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)");
      if (s === before) break;
    }

    s = s
      .replace(/\\cdot/g, "*")
      .replace(/\\times/g, "*")
      .replace(/\\div/g, "/");

    return s;
  }

  static linearToLatex(linear) {
    if (linear == null) return "";
    // بازگردانی توابع به فرمت زیبای LaTeX برای نمایش در خروجی MathField
    let s = String(linear);
    s = s.replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}");
    return s;
  }
}
