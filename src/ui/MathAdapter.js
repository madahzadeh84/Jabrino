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
    "#2563EB", "#DC2626", "#059669", "#7C3AED",
    "#EA580C", "#0F766E", "#C026D3", "#CA8A04",
    "#1D4ED8", "#BE123C", "#4D7C0F", "#0284C7",
    "#9333EA", "#0891B2", "#B45309", "#16A34A",
    "#E11D48", "#0369A1", "#65A30D", "#7E22CE",
    "#C2410C", "#0D9488", "#4338CA", "#A21CAF",
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
    return `\\sqrt{${inner}}`;
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
    if (!token) return "";

    if (token.type === "VAR") {
      return this.colorizeVariable(token.value);
    }

    if (token.type === "NUM") {
      return String(token.value);
    }

    if (token.type === "OP") {
      return this.operatorMap[token.value] || token.value;
    }

    if (token.type === "FN" && token.value === "sqrt") {
      return "\\sqrt";
    }

    return String(token.value || "");
  }

  static tokensToLatex(tokens = []) {
    return tokens.map((token) => this.tokenToLatex(token)).join(" ");
  }

  static resetVariableColorRegistry() {
    this.variableColorRegistry.clear();
  }
}
