// src/core/tokenizer.js
export function tokenize(str) {
  str = str.replace(/\s+/g, "");

  // موقتاً فقط این دو implicit-mul را داشته باش:
  str = str.replace(/(\d)\(/g, "$1*(");     // 2(x+1) -> 2*(x+1)
  str = str.replace(/\)(\d)/g, ")*$1");     // (x+1)2 -> (x+1)*2

  
  const tokens = [];
  let i = 0;

  while (i < str.length) {

    // --- تشخیص sqrt ---
    if (str.startsWith("sqrt", i)) {
      tokens.push({ type: "FN", value: "sqrt" });
      i += 4;
      continue;
    }

    const char = str[i];

    if ("+-*/^()".includes(char)) {
      tokens.push({ type: "OP", value: char });
      i++;
    } else if (/[0-9.]/.test(char)) {
      let num = "";
      let dotCount = 0;
      while (i < str.length && /[0-9.]/.test(str[i])) {
        if (str[i] === ".") dotCount++;
        num += str[i];
        i++;
      }
      if (dotCount > 1 || num === ".") {
        throw new Error("عدد نامعتبر است.");
      }
      tokens.push({ type: "NUM", value: parseFloat(num) });
    } else if (/[a-zA-Z]/.test(char)) {
      tokens.push({ type: "VAR", value: char });
      i++;
    } else {
      throw new Error(`کاراکتر نامعتبر: ${char}`);
    }
  }

  return tokens;
}
