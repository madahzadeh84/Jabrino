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

  // --- رنگ‌دهی متغیرها ---

  static normalizeVariableName(name) {
    const raw = String(name || "").trim();
    if (!raw) return "";

    const braceMatch = raw.match(/^\{([A-Za-z][A-Za-z0-9_]*)\}$/);
    if (braceMatch) return braceMatch[1];

    return raw;
  }

  static isSqrtVirtualVariable(name) {
    const str = String(name || "");
    return /^sqrt\(.+\)$/.test(str);
  }

  static sqrtVirtualVariableToLatex(name) {
    const inner = String(name || "").slice(5, -1);
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

  static tokenToLatex(token) {
    if (token.type === "NUM") return token.value.toString();
    if (token.type === "VAR") return this.colorizeVariable(token.value);
    if (token.type === "OP") {
      if (token.value === "*") return "\\cdot ";
      return token.value;
    }
    if (token.type === "FN" && token.value === "sqrt") {
      return "\\sqrt";
    }
    return token.value;
  }

  // --- کمک‌تابع‌های لاتک → رشته خطی ---

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

          // فعلا به صورت (صورت)/(مخرج) تبدیل می‌شود؛
          // بعدا patternهای ضرب در متغیر را اصلاح می‌کنیم.
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

  static latexToLinear(latex) {
    if (typeof latex !== "string") {
      return "";
    }

    let str = latex;

    // حذف فاصله‌ها و رنگ متغیرها
    str = str.replace(/\s+/g, "");
    str = str.replace(/\\textcolor{[^}]+}{([^}]*)}/g, "$1");

    // حذف \left و \right
    str = str.replace(/\\left\(/g, "(").replace(/\\right\)/g, ")");
    str = str.replace(/\\left\[/g, "[").replace(/\\right\]/g, "]");
    str = str.replace(/\\left\\{/g, "{").replace(/\\right\\}/g, "}");
    str = str.replace(/\\left\./g, "").replace(/\\right\./g, "");

    // تبدیل \frac به (a)/(b)
    str = this.replaceLatexFractions(str);

    // در همین‌جا الگوی \frac{a}{b}x را به (a/b)*x تبدیل می‌کنیم
    // مثال: (3)/(4)x → (3/4)*x
    str = str.replace(
      /\(([^()]+)\)\/\(([^()]+)\)([A-Za-z][A-Za-z0-9_]*)/,
      (_match, num, den, variable) => `(${num}/${den})*${variable}`,
    );

    // رادیکال‌ها
    str = this.replaceLatexSqrt(str);

    // تبدیل ضرب و تقسیم
    str = str.replace(/\\cdot/g, "*");
    str = str.replace(/\\times/g, "*");
    str = str.replace(/\\div/g, "/");

    // بستن براکت‌ها
    str = str.replace(/{/g, "(").replace(/}/g, ")");
    str = str.replace(/\\/g, "");

    return str;
  }

  // --- کمک‌تابع‌های پرانتز و تشخیص مخرج ---

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

  static isFullyParenWrapped(str) {
    const s = String(str || "").trim();
    if (!s.startsWith("(") || !s.endsWith(")")) return false;
    return this.stripOuterParens(s) !== s;
  }

  /** مخرج کسر: متغیرهای ساده و مرکب با رنگ درست */
  static linearToLatexDenominator(expr) {
    const str = String(expr ?? "").trim();
    if (!str) return "";

    // اگر فقط یک متغیر ساده است، مستقیم رنگ‌دهی شود
    if (/^[A-Za-z][A-Za-z0-9_]*$/.test(str)) {
      return this.colorizeVariable(str);
    }

    // اگر مجازی sqrt(...) است
    if (this.isSqrtVirtualVariable(str)) {
      return this.sqrtVirtualVariableToLatex(str);
    }

    // در بقیه‌ی حالات، از همان منطق کلی استفاده می‌کنیم
    return this.linearToLatex(str);
  }

  static buildFractionLatex(numeratorExpr, denominatorExpr) {
    const numLatex = this.linearToLatex(this.stripOuterParens(numeratorExpr));
    const denLatex = this.linearToLatexDenominator(
      this.stripOuterParens(denominatorExpr),
    );
    return `\\frac{${numLatex}}{${denLatex}}`;
  }

  static findTopLevelOperator(str, operators) {
    let depth = 0;

    for (let i = str.length - 1; i >= 0; i--) {
      const ch = str[i];
      if (ch === ")") depth++;
      else if (ch === "(") depth--;
      else if (depth === 0 && operators.includes(ch)) {
        // علامت منفیِ ابتدای عبارت یا بعد از عملگر دیگر، به عنوان عملگر در نظر گرفته نشود
        if (ch === "-" && (i === 0 || "+-*/^=(".includes(str[i - 1]))) {
          continue;
        }
        return i;
      }
    }

    return -1;
  }

  // --- رشته خطی → لاتک ---

  static linearToLatex(expr) {
    if (expr == null) return "";

    let str = String(expr).trim();
    if (!str) return "";

    // قدر مطلق: abs(...)
    const absMatch = str.match(/^abs\(\s*(.+)\s*\)$/);
    if (absMatch) {
      const inner = absMatch[1];
      return `\\left|${this.linearToLatex(inner)}\\right|`;
    }

    // تساوی
    const eqIndex = this.findTopLevelOperator(str, ["="]);
    if (eqIndex !== -1) {
      const left = str.slice(0, eqIndex);
      const right = str.slice(eqIndex + 1);
      return `${this.linearToLatex(left)} = ${this.linearToLatex(right)}`;
    }

    // جمع و تفریق
    const addSubIndex = this.findTopLevelOperator(str, ["+", "-"]);
    if (addSubIndex !== -1) {
      const left = str.slice(0, addSubIndex);
      const op = str[addSubIndex];
      const right = str.slice(addSubIndex + 1);
      return `${this.linearToLatex(left)} ${op} ${this.linearToLatex(right)}`;
    }

    // ضرب و تقسیم
    const mulDivIndex = this.findTopLevelOperator(str, ["*", "/"]);
    if (mulDivIndex !== -1) {
      const left = str.slice(0, mulDivIndex);
      const op = str[mulDivIndex];
      const right = str.slice(mulDivIndex + 1);

      if (op === "/") {
        const leftTrimmed = left.trim();
        const rightTrimmed = right.trim();

        // اگر مخرج بدون پرانتز است، بررسی کنیم آیا عدد*متغیر است یا نه
        if (!this.isFullyParenWrapped(rightTrimmed)) {
          const coeffVarMatch = rightTrimmed.match(
            /^(-?\d+(?:\.\d+)?)([A-Za-z][A-Za-z0-9_]*(?:\^[0-9]+)?)$/,
          );

          if (coeffVarMatch) {
            // مثال: 3/(4x) → (3/4)*x
            const [, numPart, varPart] = coeffVarMatch;
            const fracLatex = this.buildFractionLatex(leftTrimmed, numPart);
            const varLatex = this.linearToLatex(varPart);
            return `${fracLatex}${varLatex}`;
          }
        }

        return this.buildFractionLatex(leftTrimmed, rightTrimmed);
      }

      // ضرب
      const leftTrimmed = left.trim();
      const rightTrimmed = right.trim();
      const isNumericLeft = /^-?\d+(\.\d+)?$/.test(leftTrimmed);
      const isSqrtRight = this.isSqrtVirtualVariable(rightTrimmed);

      // عدد در رادیکال: 2*sqrt(x)
      if (isNumericLeft && isSqrtRight) {
        return `${this.linearToLatex(leftTrimmed)}${this.linearToLatex(rightTrimmed)}`;
      }

      return `${this.linearToLatex(left)} \\cdot ${this.linearToLatex(right)}`;
    }

    // توان
    const powIndex = this.findTopLevelOperator(str, ["^"]);
    if (powIndex !== -1) {
      const base = str.slice(0, powIndex).trim();
      const exponent = str.slice(powIndex + 1).trim();

      const cleanBase = this.stripOuterParens(base);
      const cleanExponent = this.stripOuterParens(exponent);
      const expLatex = this.linearToLatex(cleanExponent);

      // اگر پایه خودش یک کسر a/b است، توان را روی صورت و مخرج اعمال می‌کنیم
      const fracIndex = this.findTopLevelOperator(cleanBase, ["/"]);
      if (fracIndex !== -1) {
        const numerator = cleanBase.slice(0, fracIndex).trim();
        const denominator = cleanBase.slice(fracIndex + 1).trim();

        return `\\frac{${this.linearToLatex(numerator)}^{${expLatex}}}{${this.linearToLatexDenominator(denominator)}^{${expLatex}}}`;
      }

      return `${this.linearToLatex(cleanBase)}^{${expLatex}}`;
    }

    // sqrt(...)
    if (this.isSqrtVirtualVariable(str)) {
      return this.sqrtVirtualVariableToLatex(str);
    }

    // پرانتز بیرونی
    if (str.startsWith("(") && str.endsWith(")")) {
      const inner = this.stripOuterParens(str);
      if (inner !== str) {
        return `\\left(${this.linearToLatex(inner)}\\right)`;
      }
    }

    // عدد خالص
    if (/^-?\d+(\.\d+)?$/.test(str)) {
      return str;
    }

    // متغیر خالص
    if (/^[A-Za-z][A-Za-z0-9_]*$/.test(str)) {
      return this.colorizeVariable(str);
    }

    // ضرب کسریِ ضمنی: (a/b)x
    const implicitFracMulMatch = str.match(
      /^\(([^)]+)\)([A-Za-z][A-Za-z0-9_]*)$/,
    );
    if (implicitFracMulMatch) {
      const [, frac, variable] = implicitFracMulMatch;
      const fracLatex = this.linearToLatex(frac);
      return `${fracLatex}${this.colorizeVariable(variable)}`;
    }

    // ضرب ضمنی عدد در متغیر: 3x
    const implicitMulMatch = str.match(
      /^(-?\d+(?:\.\d+)?)([A-Za-z][A-Za-z0-9_]*)$/,
    );
    if (implicitMulMatch) {
      const [, coeff, variable] = implicitMulMatch;
      return `${coeff}${this.colorizeVariable(variable)}`;
    }

    // رادیکال داخل رشته
    if (str.includes("sqrt(")) {
      return str.replace(/sqrt\([^)]+\)/g, (match) =>
        this.sqrtVirtualVariableToLatex(match),
      );
    }

    // حالت عمومی: متغیرها رنگ می‌گیرند، * تبدیل به \\cdot می‌شود
    return str
      .replace(/([A-Za-z][A-Za-z0-9_]*)/g, (_, v) => this.colorizeVariable(v))
      .replace(/\*/g, " \\cdot ");
  }

  static resetVariableColorRegistry() {
    this.variableColorRegistry.clear();
  }
}
