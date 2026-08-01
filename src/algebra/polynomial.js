// src/algebra/polynomial.js

import { Fraction } from "./fraction.js";

export class Polynomial {
  constructor(terms = []) {
    this.terms = terms;
  }

  static fromNumber(n) {
    const frac = n instanceof Fraction ? n : Fraction.fromNumber(n);
    return new Polynomial([{ coeff: frac, vars: {} }]);
  }

  static fromVariable(v) {
    return new Polynomial([{ coeff: new Fraction(1), vars: { [v]: 1 } }]);
  }

  static one() {
    return Polynomial.fromNumber(1);
  }

  static varsKey(vars) {
    return Object.keys(vars)
      .filter((k) => vars[k] !== 0)
      .sort()
      .map((k) => (vars[k] === 1 ? k : `${k}^${vars[k]}`))
      .join("*");
  }

  /**
   * شناسایی و تبدیل توان‌های رادیکال‌های عددی به ضریب (Coefficient)
   * مثال: sqrt(2)^2 را به ضریب 2 تبدیل می‌کند.
   */
  static simplifyRadicalVars(vars) {
    const newVars = { ...vars };
    let coeffFactor = new Fraction(1);

    for (const [name, exp] of Object.entries(newVars)) {
      // جستجوی الگوی sqrt(عدد) در نام متغیر
      const match = /^sqrt\((\d+)\)$/.exec(name);
      if (!match || exp === 0) continue;

      const insideValue = parseInt(match[1], 10);
      const evenPower = Math.floor(exp / 2);
      const remainder = exp % 2;

      if (evenPower > 0) {
        // تبدیل توان‌های زوج: sqrt(n)^2m = n^m
        const multiplier = Math.pow(insideValue, evenPower);
        coeffFactor = coeffFactor.multiply(new Fraction(multiplier));
        
        if (remainder === 0) {
          delete newVars[name];
        } else {
          newVars[name] = remainder;
        }
      }
    }
    return { vars: newVars, coeffFactor };
  }

  add(other) {
    const map = new Map();

    for (const t of [...this.terms, ...other.terms]) {
      const key = Polynomial.varsKey(t.vars);
      if (!map.has(key)) {
        map.set(key, { coeff: new Fraction(0), vars: { ...t.vars } });
      }
      map.set(key, {
        coeff: map.get(key).coeff.add(t.coeff),
        vars: { ...t.vars },
      });
    }

    return new Polynomial([...map.values()].filter((t) => !t.coeff.isZero()));
  }

  subtract(other) {
    const neg = new Polynomial(
      other.terms.map((t) => ({
        coeff: t.coeff.negate(),
        vars: { ...t.vars },
      })),
    );
    return this.add(neg);
  }

  multiply(other) {
    const result = new Map();

    for (const t1 of this.terms) {
      for (const t2 of other.terms) {
        let currentCoeff = t1.coeff.multiply(t2.coeff);
        let combinedVars = { ...t1.vars };

        // جمع توان متغیرها
        for (const [v, p] of Object.entries(t2.vars)) {
          combinedVars[v] = (combinedVars[v] || 0) + p;
        }

        // --- بخش اصلاح شده: اعمال ساده‌سازی رادیکال‌ها ---
        const { vars, coeffFactor } = Polynomial.simplifyRadicalVars(combinedVars);
        currentCoeff = currentCoeff.multiply(coeffFactor);
        const finalVars = vars;
        // ----------------------------------------------

        const key = Polynomial.varsKey(finalVars);

        if (!result.has(key)) {
          result.set(key, { coeff: new Fraction(0), vars: finalVars });
        }

        result.set(key, {
          coeff: result.get(key).coeff.add(currentCoeff),
          vars: finalVars,
        });
      }
    }

    return new Polynomial(
      [...result.values()].filter((t) => !t.coeff.isZero()),
    );
  }

  pow(exponent) {
    if (!Number.isInteger(exponent) || exponent < 0) {
      throw new Error("فقط توان‌های صحیح غیرمنفی پشتیبانی می‌شوند.");
    }
    if (exponent === 0) {
      return Polynomial.one();
    }

    let result = Polynomial.one();
    let base = this;
    let exp = exponent;

    while (exp > 0) {
      if (exp % 2 === 1) {
        result = result.multiply(base);
      }
      base = base.multiply(base);
      exp = Math.floor(exp / 2);
    }
    return result;
  }

  divideByConstant(frac) {
    const divisor = frac instanceof Fraction ? frac : Fraction.fromNumber(frac);
    if (divisor.isZero()) {
      throw new Error("تقسیم بر صفر مجاز نیست.");
    }

    return new Polynomial(
      this.terms.map((t) => ({
        coeff: t.coeff.divide(divisor),
        vars: { ...t.vars },
      })),
    );
  }

  isConstant() {
    return this.terms.every((t) => Object.keys(t.vars).length === 0);
  }

  constantValue() {
    if (!this.isConstant()) {
      throw new Error("عبارت ثابت نیست.");
    }
    return this.terms.reduce((sum, t) => sum.add(t.coeff), new Fraction(0));
  }

  getVariables() {
    const vars = new Set();
    for (const term of this.terms) {
      for (const v of Object.keys(term.vars)) vars.add(v);
    }
    return vars;
  }

  toLinearForm() {
    const vars = this.getVariables();

    if (vars.size === 0) {
      return { variable: null, a: new Fraction(0), b: this.constantValue() };
    }

    if (vars.size > 1) {
      throw new Error("چند متغیر تشخیص داده شد.");
    }

    const variable = [...vars][0];
    let a = new Fraction(0);
    let b = new Fraction(0);

    for (const term of this.terms) {
      const keys = Object.keys(term.vars);

      if (keys.length === 0) {
        b = b.add(term.coeff);
      } else if (
        keys.length === 1 &&
        keys[0] === variable &&
        term.vars[variable] === 1
      ) {
        a = a.add(term.coeff);
      } else {
        throw new Error("فقط معادله خطی تک‌متغیره پشتیبانی می‌شود.");
      }
    }

    return { variable, a, b };
  }

  toString() {
    if (this.terms.length === 0) return "0";

    const sorted = [...this.terms].sort((a, b) => {
      const degA = Object.values(a.vars).reduce((s, x) => s + x, 0);
      const degB = Object.values(b.vars).reduce((s, x) => s + x, 0);
      if (degB !== degA) return degB - degA;

      const keyA = Polynomial.varsKey(a.vars);
      const keyB = Polynomial.varsKey(b.vars);
      return keyA.localeCompare(keyB);
    });

    let result = "";

    sorted.forEach((term, index) => {
      let coeff = term.coeff;
      if (coeff.isZero()) return;

      const isNegative = coeff.num < 0;
      const absCoeff = new Fraction(Math.abs(coeff.num), coeff.den);

      let varPart = Object.keys(term.vars)
        .sort()
        .map((v) => (term.vars[v] === 1 ? v : `${v}^${term.vars[v]}`))
        .join("");

      let piece = "";

      if (varPart) {
        if (absCoeff.num === 1 && absCoeff.den === 1) {
          piece = varPart;
        } else {
          piece =
            absCoeff.den === 1
              ? absCoeff.num + varPart
              : `(${absCoeff.toString()})${varPart}`;
        }
      } else {
        piece = absCoeff.toString();
      }

      if (index === 0) {
        result += isNegative ? "-" + piece : piece;
      } else {
        result += isNegative ? " - " + piece : " + " + piece;
      }
    });

    return result || "0";
  }

  toDisplayString() {
    if (this.terms.length === 0) return "0";

    const sorted = [...this.terms].sort((a, b) => {
      const degA = Object.values(a.vars).reduce((s, x) => s + x, 0);
      const degB = Object.values(b.vars).reduce((s, x) => s + x, 0);
      if (degB !== degA) return degB - degA;

      const keyA = Polynomial.varsKey(a.vars);
      const keyB = Polynomial.varsKey(b.vars);
      return keyA.localeCompare(keyB);
    });

    let result = "";

    sorted.forEach((term, index) => {
      let coeff = term.coeff;
      if (coeff.isZero()) return;

      const isNegative = coeff.num < 0;
      const absCoeff = new Fraction(Math.abs(coeff.num), coeff.den);

      const varPart = Object.keys(term.vars)
        .sort()
        .map((v) => (term.vars[v] === 1 ? v : `${v}^${term.vars[v]}`))
        .join("*");

      let piece = "";

      if (varPart) {
        if (absCoeff.num === 1 && absCoeff.den === 1) {
          piece = varPart;
        } else if (absCoeff.den === 1) {
          piece = `${absCoeff.num}*${varPart}`;
        } else {
          piece = `(${absCoeff.toString()})*${varPart}`;
        }
      } else {
        piece = absCoeff.toString();
      }

      if (index === 0) {
        result += isNegative ? "-" + piece : piece;
      } else {
        result += isNegative ? " - " + piece : " + " + piece;
      }
    });

    return result || "0";
  }
}
