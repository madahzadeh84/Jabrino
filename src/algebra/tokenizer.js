// src/algebra/tokenizer.js

import { Fraction } from "./fraction.js";

/**
 * تجزیه رشته ورودی به توکن‌های قابل فهم برای Parser
 * @param {string} input عبارت ریاضی ورودی
 * @returns {Array} آرایه‌ای از توکن‌ها
 */
export function tokenize(input) {
  if (input == null) return [];

  let s = String(input)
    .replace(/\\textcolor\{[^}]*\}\{([^{}]*)\}/g, "$1")
    .replace(/\\left/g, "")
    .replace(/\\right/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "");

  const tokens = [];
  let i = 0;

  function prevCanMultiply() {
    const prev = tokens[tokens.length - 1];
    if (!prev) return false;

    return (
      prev.type === "NUM" ||
      prev.type === "VAR" ||
      prev.type === "CONST" ||
      (prev.type === "OP" && prev.value === ")")
    );
  }

  function insertImplicitMulIfNeeded(nextType) {
    // اصلاح: استفاده از FN برای هماهنگی با پارسر و حذف LPAREN برای دقت بیشتر
    const atomStarters = new Set(["NUM", "VAR", "FN", "CONST"]);
    if (prevCanMultiply() && atomStarters.has(nextType)) {
      tokens.push({ type: "OP", value: "*" });
    }
  }

  while (i < s.length) {
    const ch = s[i];

    // متغیرهای چندحرفی در آکولاد
    if (ch === "{") {
      const end = s.indexOf("}", i + 1);
      if (end === -1) {
        throw new Error("آکولاد بسته نشده است.");
      }

      const name = s.slice(i + 1, end).trim();
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
        throw new Error(`نام متغیر نامعتبر است: {${name}}`);
      }

      insertImplicitMulIfNeeded("VAR");
      tokens.push({ type: "VAR", value: name });
      i = end + 1;
      continue;
    }

    // تابع رادیکال - اصلاح نوع به FN
    if (s.startsWith("sqrt", i)) {
      insertImplicitMulIfNeeded("FN");
      tokens.push({ type: "FN", value: "sqrt" });
      i += 4;
      continue;
    }

    // عدد (Integer/Float)
    if (/[0-9.]/.test(ch)) {
      insertImplicitMulIfNeeded("NUM");

      let num = "";
      let dotCount = 0;

      while (i < s.length && /[0-9.]/.test(s[i])) {
        if (s[i] === ".") dotCount++;
        num += s[i];
        i++;
      }

      if (dotCount > 1 || num === ".") {
        throw new Error(`عدد نامعتبر است: ${num}`);
      }

      tokens.push({
        type: "NUM",
        value: num.includes(".") ? parseFloat(num) : parseInt(num, 10),
      });
      continue;
    }

    // پرانتز باز
    if (ch === "(") {
      // ضرب ضمنی قبل از پرانتز باز (مانند 2(x+1))
      if (prevCanMultiply()) {
        tokens.push({ type: "OP", value: "*" });
      }
      tokens.push({ type: "OP", value: "(" });
      i++;
      continue;
    }

    // پرانتز بسته
    if (ch === ")") {
      tokens.push({ type: "OP", value: ")" });
      i++;
      continue;
    }

    // عملگرها
    if ("+-*/^=".includes(ch)) {
      tokens.push({ type: "OP", value: ch });
      i++;
      continue;
    }

    // متغیرهای تک‌حرفی
    if (/[a-zA-Z]/.test(ch)) {
      insertImplicitMulIfNeeded("VAR");
      tokens.push({ type: "VAR", value: ch });
      i++;
      continue;
    }

    throw new Error(`کاراکتر نامعتبر شناسایی شد: ${ch}`);
  }

  return tokens;
}
