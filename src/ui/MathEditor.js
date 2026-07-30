// src/ui/MathEditor.js

export class MathEditor {
  constructor(mathFieldId, toolbarId) {
    this.mf = document.getElementById(mathFieldId);
    this.toolbar = typeof toolbarId === "string" ? document.getElementById(toolbarId) : toolbarId;

    if (!this.mf) {
      console.error(`Mathfield with id "${mathFieldId}" not found.`);
      return;
    }

    this.init();
  }

  init() {
    // تنظیمات پایه فیلد ورودی
    this.mf.mathVirtualKeyboardPolicy = "auto";
    this.mf.setAttribute("menu-items", "");
    this.mf.style.direction = "ltr";
    this.mf.setAttribute("dir", "ltr");

    // ۱. مقداردهی کیبورد اختصاصی
    this.setupJabrinoKeyboard();

    // ۲. اتصال رویداد کلیک دکمه‌های تولبار (Toolbar Event Listener)
    if (this.toolbar) {
      this.toolbar.addEventListener("click", (e) => this.handleToolbarClick(e));
    }
  }

setupJabrinoKeyboard() {
  try {
    if (typeof window.mathVirtualKeyboard === "undefined") return;

    // --- کیبورد ریاضی: "علامت‌های ریاضی" ---
    const MATH_LAYOUT = {
      name: "jabrino-math",
      label: "علامت‌های ریاضی",
      tooltip: "کلیدهای ریاضی جبرینو",

      rows: [
        // ردیف ۱: اعداد + نقطه اعشار + پاک‌کن
        [
          { latex: "1", label: "1" },
          { latex: "2", label: "2" },
          { latex: "3", label: "3" },
          { latex: "4", label: "4" },
          { latex: "5", label: "5" },
          { latex: "6", label: "6" },
          { latex: "7", label: "7" },
          { latex: "8", label: "8" },
          { latex: "9", label: "9" },
          { latex: "0", label: "0" },
          { latex: ".", label: "." },
          { command: "deleteBackward", label: "⌫" },
        ],

        // ردیف ۲: عملگرها + پرانتز + مساوی
        [
          { latex: "+", label: "+" },
          { latex: "-", label: "−" },
          { latex: "\\cdot", label: "×" },
          { latex: "\\div", label: "÷" },
          { latex: "(", label: "(" },
          { latex: ")", label: ")" },
          { latex: "=", label: "=" },
        ],

        // ردیف ۳: ساختارهای جبری + متغیرها
        [
          { latex: "\\frac{#?}{#?}", label: "کسر" },   // کسر
          { latex: "#?^{#?}", label: "توان" },           // توان
          { latex: "\\sqrt{#?}", label: "√" },         // رادیکال
          { latex: "x", label: "x" },
          { latex: "y", label: "y" },
          { latex: "z", label: "z" },
        ],

        // ردیف ۴: حرکت مکان‌نما + بستن کیبورد
        [
          { command: "moveToPreviousChar", label: "◀" },
          { command: "moveToNextChar", label: "▶" },
          { command: "hideVirtualKeyboard", label: "Close" },
        ],
      ],
    };

    // --- کیبورد حروف انگلیسی: "حروف انگلیسی" ---
    const LETTERS_LAYOUT = {
      name: "jabrino-abc",
      label: "حروف انگلیسی",
      tooltip: "حروف انگلیسی برای متغیرها",

      rows: [
        // ردیف ۱: اعداد + پاک‌کن
        [
          { insert: "1", label: "1" },
          { insert: "2", label: "2" },
          { insert: "3", label: "3" },
          { insert: "4", label: "4" },
          { insert: "5", label: "5" },
          { insert: "6", label: "6" },
          { insert: "7", label: "7" },
          { insert: "8", label: "8" },
          { insert: "9", label: "9" },
          { insert: "0", label: "0" },
          { command: "deleteBackward", label: "⌫" },
        ],

        // ردیف ۲: QWERTY
        [
          { insert: "q", label: "q" },
          { insert: "w", label: "w" },
          { insert: "e", label: "e" },
          { insert: "r", label: "r" },
          { insert: "t", label: "t" },
          { insert: "y", label: "y" },
          { insert: "u", label: "u" },
          { insert: "i", label: "i" },
          { insert: "o", label: "o" },
          { insert: "p", label: "p" },
        ],

        // ردیف ۳: ASDF
        [
          { insert: "a", label: "a" },
          { insert: "s", label: "s" },
          { insert: "d", label: "d" },
          { insert: "f", label: "f" },
          { insert: "g", label: "g" },
          { insert: "h", label: "h" },
          { insert: "j", label: "j" },
          { insert: "k", label: "k" },
          { insert: "l", label: "l" },
        ],

        // ردیف ۴: ZXCV + Space + بستن
        [
          { insert: "z", label: "z" },
          { insert: "x", label: "x" },
          { insert: "c", label: "c" },
          { insert: "v", label: "v" },
          { insert: "b", label: "b" },
          { insert: "n", label: "n" },
          { insert: "m", label: "m" },
          { insert: " ", label: "Space" },
          { command: "hideVirtualKeyboard", label: "Close" },
        ],
      ],
    };

    window.mathVirtualKeyboard.layouts = [MATH_LAYOUT, LETTERS_LAYOUT];
  } catch (err) {
    console.warn("MathLive keyboard customization failed:", err);
  }
}




  handleToolbarClick(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    this.mf.focus();

    // متد درج مستقیم (Direct Insert) در MathLive
    switch (action) {
      case "frac":
        this.mf.insert("\\frac{#?}{#?}");
        break;
      case "sqrt":
        this.mf.insert("\\sqrt{#?}");
        break;
      case "power":
        this.mf.insert("#?^{#?}");
        break;
      case "paren":
        this.mf.insert("\\left(#?\\right)");
        break;
    }
  }

  getValue() {
    return this.mf.value;
  }

  setValue(latexValue) {
    this.mf.setValue(latexValue, { insertionMode: "replaceAll" });
  }

  onEnter(callback) {
    this.mf.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        callback();
      }
    });
  }
}
