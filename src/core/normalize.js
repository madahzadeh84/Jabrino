export function normalize(expr) {
  expr = expr.replace(/\s+/g, "");
  expr = expr.replace(/×|&times;|⋅|∙/g, "*");
  expr = expr.replace(/÷/g, "/");
  return expr;
}

