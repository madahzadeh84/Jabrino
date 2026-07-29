// src/core/parser.js
import { Polynomial } from "./polynomial.js";
import { Fraction } from "./fraction.js";

// تابع کمکی برای ساده‌سازی رادیکال‌های عددی محض
// sqrt(12) -> 2 * sqrt(3)
function evaluateNumericSqrt(fractionVal) {
  if (fractionVal.num < 0) {
    throw new Error("رادیکال با شناسه منفی در اعداد حقیقی تعریف نشده است.");
  }
  
  const num = fractionVal.num;
  const den = fractionVal.den;

  // محاسبه جذر صورت و مخرج به صورت مجزا
  let outNum = 1, inNum = num;
  for (let i = Math.floor(Math.sqrt(num)); i >= 2; i--) {
    if (inNum % (i * i) === 0) {
      outNum *= i;
      inNum /= (i * i);
    }
  }

  let outDen = 1, inDen = den;
  for (let i = Math.floor(Math.sqrt(den)); i >= 2; i--) {
    if (inDen % (i * i) === 0) {
      outDen *= i;
      inDen /= (i * i);
    }
  }

  // اگر زیر رادیکال کسر ماند، گویا می‌کنیم
  if (inDen > 1) {
    inNum *= inDen;
    outDen *= inDen;
    inDen = 1;
  }

  const coeff = new Fraction(outNum, outDen);
  return { coeff, inside: inNum };
}

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos];
  }

  consume(expectedValue = null) {
    const token = this.peek();
    if (!token) {
      throw new Error("پایان غیرمنتظره عبارت.");
    }
    if (expectedValue !== null && token.value !== expectedValue) {
      throw new Error(`انتظار '${expectedValue}' وجود داشت.`);
    }
    this.pos++;
    return token;
  }

  parse() {
    const result = this.expr();
    if (this.pos < this.tokens.length) {
      throw new Error(`توکن اضافی: ${this.tokens[this.pos].value}`);
    }
    return result;
  }

  expr() {
    let node = this.term();
    while (true) {
      const next = this.peek();
      if (next && next.type === "OP" && (next.value === "+" || next.value === "-")) {
        const op = this.consume().value;
        const right = this.term();
        node = op === "+" ? node.add(right) : node.subtract(right);
      } else {
        break;
      }
    }
    return node;
  }

  term() {
    let node = this.power();
    while (true) {
      const next = this.peek();
      if (next && next.type === "OP" && (next.value === "*" || next.value === "/")) {
        const op = this.consume().value;
        const right = this.power();
        if (op === "*") {
          node = node.multiply(right);
        } else {
          if (!right.isConstant()) {
            throw new Error("تقسیم بر عبارتی که شامل متغیر است پشتیبانی نمی‌شود.");
          }
          node = node.divideByConstant(right.constantValue());
        }
      } else {
        break;
      }
    }
    return node;
  }

  power() {
    let node = this.factor();
    while (true) {
      const next = this.peek();
      if (next && next.type === "OP" && next.value === "^") {
        this.consume("^");
        const right = this.factor();
        if (!right.isConstant()) {
          throw new Error("توان فقط می‌تواند یک عدد ثابت باشد.");
        }
        const expVal = right.constantValue();
        if (expVal.den !== 1) {
          throw new Error("توان‌های کسری پشتیبانی نمی‌شوند.");
        }
        node = node.pow(expVal.num);
      } else {
        break;
      }
    }
    return node;
  }

  factor() {
    const token = this.peek();
    if (!token) {
      throw new Error("پایان غیرمنتظره عبارت.");
    }

    // پردازش توابع (مثل sqrt)
    if (token.type === "FN" && token.value === "sqrt") {
      this.consume("sqrt");
      this.consume("(");
      const innerNode = this.expr();
      this.consume(")");

      // اگر عبارت زیر رادیکال عدد ثابت بود، آن را ساده می‌کنیم
      if (innerNode.isConstant()) {
        const val = innerNode.constantValue();
        const { coeff, inside } = evaluateNumericSqrt(val);
        
        if (inside === 1) {
          return Polynomial.fromNumber(coeff);
        } else {
          // نگهداری ترم رادیکالی غیرکامل به صورت متغیر سمبلیک مجازی
          // x_sqrt_3
          const dummyVar = `sqrt(${inside})`;
          return new Polynomial([{ coeff, vars: { [dummyVar]: 1 } }]);
        }
      } else {
        // اگر عبارت زیر رادیکال متغیر بود، کل آن را به صورت متغیر مجازی نگه می‌داریم
        const dummyVar = `sqrt(${innerNode.toString()})`;
        return Polynomial.fromVariable(dummyVar);
      }
    }

    if (token.type === "OP" && token.value === "-") {
      this.consume("-");
      return Polynomial.fromNumber(new Fraction(-1)).multiply(this.power());
    }

    if (token.type === "OP" && token.value === "+") {
      this.consume("+");
      return this.power();
    }

    if (token.type === "NUM") {
      this.consume();
      return Polynomial.fromNumber(Fraction.fromNumber(token.value));
    }

    if (token.type === "VAR") {
      this.consume();
      return Polynomial.fromVariable(token.value);
    }

    if (token.type === "OP" && token.value === "(") {
      this.consume("(");
      const node = this.expr();
      this.consume(")");
      return node;
    }

    throw new Error(`توکن غیرمنتظره: ${token.value}`);
  }
}
