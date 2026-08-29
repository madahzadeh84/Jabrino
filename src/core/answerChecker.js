// src/core/answerChecker.js

import { tokenize } from "../algebra/tokenizer.js";
import { Parser } from "../algebra/parser.js";
import { normalize } from "./normalize.js";

/* =========================================
   INTERNAL HELPERS
========================================= */

/**
 * تبدیل یک عبارت خطی به Polynomial
 */
function parsePolynomial(expr) {
  const normalized = normalize(expr);

  if (!normalized) {
    throw new Error("پاسخ خالی است.");
  }

  const tokens = tokenize(normalized);
  const parser = new Parser(tokens);

  return parser.parse();
}

/**
 * بررسی معادل بودن دو عبارت جبری
 *
 * مثال:
 *
 * 2x + 2x
 * و
 * 4x
 *
 * معادل هستند، چون:
 *
 * (2x + 2x) - 4x = 0
 */
function areEquivalentExpressions(firstExpression, secondExpression) {
  const firstPolynomial = parsePolynomial(firstExpression);
  const secondPolynomial = parsePolynomial(secondExpression);

  const difference = firstPolynomial.subtract(secondPolynomial);

  return difference.terms.length === 0;
}

/**
 * جدا کردن دو طرف یک معادله
 *
 * خروجی:
 *
 * {
 *   left: "x",
 *   right: "3/4"
 * }
 */
function splitEquation(expression) {
  const normalized = normalize(expression);

  const parts = normalized.split("=");

  if (parts.length !== 2) {
    return null;
  }

  const [left, right] = parts;

  if (!left || !right) {
    return null;
  }

  return {
    left,
    right,
  };
}

/**
 * تشخیص معادله‌ای که به جواب نهایی رسیده است.
 *
 * پشتیبانی:
 *
 * x = 3
 * 3 = x
 * y = 2/5
 *
 * عدم پشتیبانی به عنوان جواب نهایی:
 *
 * 2x = 6
 * x + 1 = 4
 */
function extractSolvedEquation(expression) {
  const equation = splitEquation(expression);

  if (!equation) {
    return null;
  }

  const variablePattern = /^[A-Za-z][A-Za-z0-9_]*$/;

  /*
   * x = 3
   */
  if (variablePattern.test(equation.left)) {
    return {
      variable: equation.left,
      value: equation.right,
    };
  }

  /*
   * 3 = x
   */
  if (variablePattern.test(equation.right)) {
    return {
      variable: equation.right,
      value: equation.left,
    };
  }

  return null;
}

/* =========================================
   EXPRESSION CHECKER
========================================= */

/**
 * بررسی پاسخ مربوط به ساده‌سازی عبارت
 *
 * نمونه:
 *
 * پاسخ صحیح:
 * 4x
 *
 * پاسخ کاربر:
 * 2x + 2x
 *
 * نتیجه:
 * true
 */
export function checkExpressionAnswer(userAnswer, correctAnswer) {
  try {
    const user = normalize(userAnswer);
    const correct = normalize(correctAnswer);

    if (!user || !correct) {
      return false;
    }

    /*
     * این تابع مخصوص عبارت است.
     * وجود = یعنی ورودی باید توسط Equation Checker بررسی شود.
     */
    if (user.includes("=") || correct.includes("=")) {
      return false;
    }

    return areEquivalentExpressions(user, correct);
  } catch (error) {
    return false;
  }
}

/* =========================================
   EQUATION CHECKER
========================================= */

/**
 * بررسی جواب نهایی یک معادله
 *
 * فرض:
 *
 * جواب صحیح:
 * x = 3/4
 *
 * پاسخ‌های قابل قبول:
 *
 * x = 3/4
 * 3/4 = x
 * 3/4
 *
 *
 * پاسخ‌های غیرقابل قبول:
 *
 * 4x = 3
 * x + 1 = 7/4
 *
 * چون این‌ها هنوز جواب نهایی نیستند.
 */
export function checkEquationAnswer(userAnswer, correctAnswer) {
  try {
    const user = normalize(userAnswer);
    const correct = normalize(correctAnswer);

    if (!user || !correct) {
      return false;
    }

    /* -----------------------------------------
       استخراج جواب صحیح
    ----------------------------------------- */

    const correctSolvedEquation = extractSolvedEquation(correct);

    if (!correctSolvedEquation) {
      return false;
    }

    /* -----------------------------------------
       حالت ۱:
       کاربر فقط مقدار مجهول را نوشته است.

       مثال:

       جواب صحیح:
       x = 3/4

       جواب کاربر:
       3/4
    ----------------------------------------- */

    if (!user.includes("=")) {
      return areEquivalentExpressions(user, correctSolvedEquation.value);
    }

    /* -----------------------------------------
       حالت ۲:
       جواب به شکل معادله نوشته شده است.

       x = 3/4

       یا:

       3/4 = x
    ----------------------------------------- */

    const userSolvedEquation = extractSolvedEquation(user);

    if (!userSolvedEquation) {
      return false;
    }

    /*
     * متغیر باید همان متغیر جواب صحیح باشد.
     */
    if (userSolvedEquation.variable !== correctSolvedEquation.variable) {
      return false;
    }

    /*
     * مقایسه مقدار جواب‌ها از نظر جبری
     */
    return areEquivalentExpressions(
      userSolvedEquation.value,
      correctSolvedEquation.value,
    );
  } catch (error) {
    return false;
  }
}

/* =========================================
   MAIN ANSWER CHECKER
========================================= */

/**
 * تابع اصلی بررسی پاسخ
 *
 * خودش از روی correctAnswer تشخیص می‌دهد
 * که با یک عبارت روبه‌روست یا جواب یک معادله.
 */
export function checkAnswer(userAnswer, correctAnswer) {
  const correct = normalize(correctAnswer);

  if (!correct) {
    return false;
  }

  /*
   * جواب معادله
   */
  if (correct.includes("=")) {
    return checkEquationAnswer(userAnswer, correctAnswer);
  }

  /*
   * جواب ساده‌سازی عبارت
   */
  return checkExpressionAnswer(userAnswer, correctAnswer);
}
