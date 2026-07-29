import { simplify } from "./simplify.js";
import { solveEquation } from "./solveEquation.js";

export function solveOrSimplify(expr, steps) {
  if (expr.includes("=")) return solveEquation(expr, steps);
  return simplify(expr, steps);
}
