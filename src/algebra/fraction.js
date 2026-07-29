export class Fraction {
  constructor(num, den = 1) {
    if (den === 0) {
      throw new Error("مخرج کسر نمی‌تواند صفر باشد.");
    }
    if (den < 0) {
      num = -num;
      den = -den;
    }
    const g = Fraction.gcd(Math.abs(num), Math.abs(den));
    this.num = num / g;
    this.den = den / g;
  }

  static gcd(a, b) {
    return b === 0 ? a : Fraction.gcd(b, a % b);
  }

  static fromNumber(val) {
    if (val instanceof Fraction) return val;
    if (Number.isInteger(val)) return new Fraction(val, 1);
    
    const str = String(val);
    if (!str.includes(".")) return new Fraction(parseInt(str, 10), 1);
    
    const decimalPlaces = str.split(".")[1].length;
    const denominator = Math.pow(10, decimalPlaces);
    const numerator = Math.round(val * denominator);
    return new Fraction(numerator, denominator);
  }

  add(other) {
    const o = Fraction.fromNumber(other);
    return new Fraction(
      this.num * o.den + o.num * this.den,
      this.den * o.den
    );
  }

  subtract(other) {
    const o = Fraction.fromNumber(other);
    return new Fraction(
      this.num * o.den - o.num * this.den,
      this.den * o.den
    );
  }

  multiply(other) {
    const o = Fraction.fromNumber(other);
    return new Fraction(this.num * o.num, this.den * o.den);
  }

  divide(other) {
    const o = Fraction.fromNumber(other);
    if (o.num === 0) throw new Error("تقسیم بر صفر مجاز نیست.");
    return new Fraction(this.num * o.den, this.den * o.num);
  }

  negate() {
    return new Fraction(-this.num, this.den);
  }

  isZero() {
    return this.num === 0;
  }

  toString() {
    if (this.den === 1) return String(this.num);
    return `${this.num}/${this.den}`;
  }
}
