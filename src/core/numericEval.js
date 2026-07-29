// src/core/numericEval.js
import { MathAdapter } from "../ui/MathAdapter.js";
import { tokenize } from "../algebra/tokenizer.js";


export function evalNumeric(exprStr) {
  // exprStr همون رشته خطی مثل "sqrt(10)" است
  const tokens = tokenize(exprStr);
  const parser = new Parser(tokens);
  const poly = parser.parse();

  // اگر polynomial فقط یک عدد است:
  if (poly.isConstant()) {
    const frac = poly.constantValue();
    return frac.num / frac.den;
  }

  // اگر عبارت فقط یک sqrt(constant) است، مستقیم sqrt را حساب کن
  // = چون factor ما برای sqrt(constant) الان یک عدد یا عدد*sqrt(inside) بر می‌گرداند
  // حالت ساده: اگر "sqrt(" و ")" دارد و داخلش یک عدد خالی است:
  const sqrtMatch = exprStr.match(/^sqrt\(([-+]?\d+(\.\d+)?)\)$/);
  if (sqrtMatch) {
    const val = parseFloat(sqrtMatch[1]);
    if (val < 0) throw new Error("نمی‌توان sqrt عدد منفی را به صورت حقیقی محاسبه کرد.");
    return Math.sqrt(val);
  }

  // بقیه حالات: فعلاً null برگردان (یعنی تقریبی نشان نده)
  return null;
}
