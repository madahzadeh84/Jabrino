export default class MathAdapter {
  static defaultVarColor = "#374151";

  static fixedVariableColors = {
    x: "#2563EB",
    y: "#DC2626",
    z: "#059669",
    a: "#7C3AED",
    b: "#EA580C",
    c: "#0F766E",
    m: "#C026D3",
    n: "#CA8A04",
    p: "#1D4ED8",
    q: "#BE123C",
    r: "#4D7C0F",
    t: "#0284C7",
  };

  static variablePalette = [
    "#2563EB",
    "#DC2626",
    "#059669",
    "#7C3AED",
    "#EA580C",
    "#0F766E",
    "#C026D3",
    "#CA8A04",
    "#1D4ED8",
    "#BE123C",
    "#4D7C0F",
    "#0284C7",
    "#9333EA",
    "#0891B2",
    "#B45309",
    "#16A34A",
    "#E11D48",
    "#0369A1",
    "#65A30D",
    "#7E22CE",
    "#C2410C",
    "#0D9488",
    "#4338CA",
    "#A21CAF",
  ];

  static variableColorRegistry = new Map();

  static operatorMap = {
    "+": "+",
    "-": "-",
    "*": "\\cdot",
    "/": "/",
    "^": "^",
    "=": "=",
    "(": "(",
    ")": ")",
  };

  static normalizeVariableName(name) {
    const raw = String(name || "").trim();
    if (!raw) return "";

    const braceMatch = raw.match(/^\{([A-Za-z][A-Za-z0-9_]*)\}$/);
    if (braceMatch) return braceMatch[1];

    return raw;
  }

  static isSqrtVirtualVariable(name) {
    return /^sqrt\(.+\)$/.test(name);
  }

  static sqrtVirtualVariableToLatex(name) {
    const inner = name.slice(5, -1);
    return `\\sqrt{${this.linearToLatex(inner)}}`;
  }

  static hashString(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  static getNextPaletteColor(name) {
    const hash = this.hashString(name);
    const startIndex = hash % this.variablePalette.length;
    const usedColors = new Set(this.variableColorRegistry.values());

    for (let offset = 0; offset < this.variablePalette.length; offset++) {
      const index = (startIndex + offset) % this.variablePalette.length;
      const candidate = this.variablePalette[index];
      if (!usedColors.has(candidate)) {
        return candidate;
      }
    }

    return this.variablePalette[startIndex];
  }

  static getVariableColor(varName) {
    const name = this.normalizeVariableName(varName);
    if (!name) return this.defaultVarColor;

    if (this.fixedVariableColors[name]) {
      return this.fixedVariableColors[name];
    }

    if (this.variableColorRegistry.has(name)) {
      return this.variableColorRegistry.get(name);
    }

    const assignedColor = this.getNextPaletteColor(name);
    this.variableColorRegistry.set(name, assignedColor);
    return assignedColor;
  }

  static colorizeVariable(name) {
    const normalized = this.normalizeVariableName(name);

    if (this.isSqrtVirtualVariable(normalized)) {
      return this.sqrtVirtualVariableToLatex(normalized);
    }

    const color = this.getVariableColor(normalized);
    return `\\textcolor{${color}}{${normalized}}`;
  }

  // بخشی از MathAdapter.js

  static tokenToLatex(token) {
    if (token.type === "NUM") return token.value.toString();
    if (token.type === "VAR") return this.colorizeVariable(token.value);
    if (token.type === "OP") {
      if (token.value === "*") return "\\cdot ";
      return token.value;
    }
    // هماهنگی با نوع FN
    if (token.type === "FN" && token.value === "sqrt") {
      return "\\sqrt";
    }
    return token.value;
  }

  // برای رادیکال‌های نمادین که به صورت متغیر مجازی در چندجمله‌ای مانده‌اند
  static isSqrtVirtualVariable(name) {
    return typeof name === "string" && name.startsWith("sqrt(");
  }

  static sqrtVirtualVariableToLatex(name) {
    const inner = name.slice(5, -1);
    // تبدیل بازگشتی داخل رادیکال به لاتک (مثلاً برای رادیکال‌های مرکب)
    return `\\sqrt{${this.linearToLatex(inner)}}`;
  }
  // -----------------------------
  // Helpers for parsing LaTeX commands like \frac and \sqrt
  // -----------------------------

  static findMatchingGroup(str, startIndex, openChar = "{", closeChar = "}") {
    if (!str || str[startIndex] !== openChar) return null;

    let depth = 0;
    for (let i = startIndex; i < str.length; i++) {
      const ch = str[i];
      if (ch === openChar) depth++;
      else if (ch === closeChar) depth--;

      if (depth === 0) {
        return {
          start: startIndex,
          end: i,
          content: str.slice(startIndex + 1, i),
        };
      }
    }

    return null;
  }

  static readLatexArgument(str, startIndex) {
    if (startIndex >= str.length) return null;

    const ch = str[startIndex];

    if (ch === "{") {
      return this.findMatchingGroup(str, startIndex, "{", "}");
    }

    if (ch === "(") {
      return this.findMatchingGroup(str, startIndex, "(", ")");
    }

    // No-brace single-token argument (e.g. \frac34, \sqrtx)
    return {
      start: startIndex,
      end: startIndex,
      content: str[startIndex],
    };
  }

  static replaceLatexFractions(str) {
    let result = str;
    let changed = true;

    while (changed) {
      changed = false;

      for (let i = 0; i < result.length; i++) {
        if (
          result.startsWith("\\frac", i) ||
          result.startsWith("\\dfrac", i) ||
          result.startsWith("\\tfrac", i)
        ) {
          const cmd = result.startsWith("\\dfrac", i)
            ? "\\dfrac"
            : result.startsWith("\\tfrac", i)
              ? "\\tfrac"
              : "\\frac";

          const arg1Start = i + cmd.length;
          const arg1 = this.readLatexArgument(result, arg1Start);
          if (!arg1) continue;

          const arg2Start = arg1.end + 1;
          const arg2 = this.readLatexArgument(result, arg2Start);
          if (!arg2) continue;

          const replacement = `(${arg1.content})/(${arg2.content})`;
          result =
            result.slice(0, i) + replacement + result.slice(arg2.end + 1);

          changed = true;
          break;
        }
      }
    }

    return result;
  }

  static replaceLatexSqrt(str) {
    let result = str;
    let changed = true;

    while (changed) {
      changed = false;

      for (let i = 0; i < result.length; i++) {
        if (result.startsWith("\\sqrt", i)) {
          const argStart = i + "\\sqrt".length;
          const arg = this.readLatexArgument(result, argStart);
          if (!arg) continue;

          const replacement = `sqrt(${arg.content})`;
          result = result.slice(0, i) + replacement + result.slice(arg.end + 1);

          changed = true;
          break;
        }
      }
    }

    return result;
  }

  // -----------------------------
  // LaTeX -> linear
  // -----------------------------
  static latexToLinear(latex) {
    if (typeof latex !== "string") {
      return "";
    }

    let str = latex;

    // 1) remove whitespace
    str = str.replace(/\s+/g, "");

    // 2) remove color wrapper: \textcolor{...}{...} -> inner
    str = str.replace(/\\textcolor{[^}]+}{([^}]*)}/g, "$1");

    // 3) normalize \left...\right...
    str = str.replace(/\\left\(/g, "(").replace(/\\right\)/g, ")");
    str = str.replace(/\\left\[/g, "[").replace(/\\right\]/g, "]");
    str = str.replace(/\\left\\{/g, "{").replace(/\\right\\}/g, "}");
    str = str.replace(/\\left\./g, "").replace(/\\right\./g, "");

    // 4) fractions: supports \frac{a}{b} and \fracab
    str = this.replaceLatexFractions(str);

    // 5) sqrt: supports \sqrt{a} and \sqrta
    str = this.replaceLatexSqrt(str);

    // 6) multiply/divide commands
    str = str.replace(/\\cdot/g, "*");
    str = str.replace(/\\times/g, "*");
    str = str.replace(/\\div/g, "/");

    // 7) convert remaining braces to parentheses to keep grouping
    str = str.replace(/{/g, "(").replace(/}/g, ")");

    // 8) remove remaining backslashes
    str = str.replace(/\\/g, "");

    return str;
  }

  // -----------------------------
  // linear -> LaTeX (for rendering + colors)
  // -----------------------------

  static stripOuterParens(str) {
    const s = String(str || "").trim();
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

    return s.slice(1, -1).trim();
  }

  static findTopLevelOperator(str, operators) {
    let depth = 0;

    for (let i = str.length - 1; i >= 0; i--) {
      const ch = str[i];
      if (ch === ")") depth++;
      else if (ch === "(") depth--;
      else if (depth === 0 && operators.includes(ch)) {
        // ignore unary minus
        if (ch === "-" && (i === 0 || "+-*/^=(".includes(str[i - 1]))) {
          continue;
        }
        return i;
      }
    }

    return -1;
  }

  // src/ui/MathAdapter.js

  static linearToLatex(expr) {
    if (expr == null) return "";

    const str = String(expr).trim();
    if (!str) return "";

    // ۱. معادله
    const eqIndex = this.findTopLevelOperator(str, ["="]);
    if (eqIndex !== -1) {
      const left = str.slice(0, eqIndex);
      const right = str.slice(eqIndex + 1);
      return `${this.linearToLatex(left)} = ${this.linearToLatex(right)}`;
    }

    // ۲. جمع و تفریق
    const addSubIndex = this.findTopLevelOperator(str, ["+", "-"]);
    if (addSubIndex !== -1) {
      const left = str.slice(0, addSubIndex);
      const op = str[addSubIndex];
      const right = str.slice(addSubIndex + 1);
      return `${this.linearToLatex(left)} ${op} ${this.linearToLatex(right)}`;
    }

    // ۳. ضرب و تقسیم
    const mulDivIndex = this.findTopLevelOperator(str, ["*", "/"]);
    if (mulDivIndex !== -1) {
      const left = str.slice(0, mulDivIndex);
      const op = str[mulDivIndex];
      const right = str.slice(mulDivIndex + 1);

      if (op === "/") {
        return `\\frac{${this.linearToLatex(this.stripOuterParens(left))}}{${this.linearToLatex(this.stripOuterParens(right))}}`;
      }

      return `${this.linearToLatex(left)} \\cdot ${this.linearToLatex(right)}`;
    }

    // ۴. توان
    const powIndex = this.findTopLevelOperator(str, ["^"]);
    if (powIndex !== -1) {
      const base = str.slice(0, powIndex).trim();
      const exponent = str.slice(powIndex + 1).trim();

      const cleanBase = this.stripOuterParens(base);
      const cleanExponent = this.stripOuterParens(exponent);
      const expLatex = this.linearToLatex(cleanExponent);

      const fracIndex = this.findTopLevelOperator(cleanBase, ["/"]);
      if (fracIndex !== -1) {
        const numerator = cleanBase.slice(0, fracIndex).trim();
        const denominator = cleanBase.slice(fracIndex + 1).trim();

        return `\\frac{${this.linearToLatex(numerator)}^{${expLatex}}}{${this.linearToLatex(denominator)}^{${expLatex}}}`;
      }

      return `${this.linearToLatex(cleanBase)}^{${expLatex}}`;
    }

    // ۵. رادیکال (حالت کلی: حتی اگر بخشی از عبارت باشد)
    // اینجا به جای چک کردن اینکه آیا «کل» عبارت رادیکال است، بررسی می‌کنیم که آیا با sqrt شروع می‌شود
    if (this.isSqrtVirtualVariable(str)) {
      return this.sqrtVirtualVariableToLatex(str);
    }

    // ۶. پرانتز کامل
    if (str.startsWith("(") && str.endsWith(")")) {
      const inner = this.stripOuterParens(str);
      if (inner !== str) {
        return `\\left(${this.linearToLatex(inner)}\\right)`;
      }
    }

    // ۷. عدد
    if (/^-?\d+(\.\d+)?$/.test(str)) {
      return str;
    }

    // ۸. متغیر
    if (/^[A-Za-z][A-Za-z0-9_]*$/.test(str)) {
      return this.colorizeVariable(str);
    }

    // ۹. حالت ضرب ضمنی (مثل 3x)
    const implicitMulMatch = str.match(
      /^(-?\d+(?:\.\d+)?)([A-Za-z][A-Za-z0-9_]*)$/,
    );
    if (implicitMulMatch) {
      const [, coeff, variable] = implicitMulMatch;
      return `${coeff}${this.colorizeVariable(variable)}`;
    }

    // ۱۰. جایگزین (Fallback): اصلاح نهایی برای پیدا کردن sqrt در عبارات مرکب
    // در این مرحله، هر رشته‌ای که با sqrt شروع شود را به لاتک تبدیل می‌کنیم
    if (str.includes("sqrt(")) {
      // این بخش کمک می‌کند تا `6sqrt(2)` به شکل درست پردازش شود
      return str.replace(/sqrt\([^)]+\)/g, (match) =>
        this.sqrtVirtualVariableToLatex(match),
      );
    }

    return str
      .replace(/([A-Za-z][A-Za-z0-9_]*)/g, (_, v) => this.colorizeVariable(v))
      .replace(/\*/g, " \\cdot ");
  }

  static resetVariableColorRegistry() {
    this.variableColorRegistry.clear();
  }
}
