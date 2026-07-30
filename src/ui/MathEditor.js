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

      const JABRINO_LAYOUT = {
        label: "جبرینو",
        tooltip: "کیبورد اختصاصی جبرینو",
        // تعریف لایه‌ها (Layers/Tabs) به صورت مجزا
        layers: [
          // ۱. لایه اول: تب ریاضی (اعداد و نمادهای اصلی)
          {
            label: "ریاضی", // نام تب اول
            rows: [
              [
                { latex: "\\frac{#?}{#?}", label: "کسر" },
                { latex: "#?^{#?}", label: "توان" },
                { latex: "\\sqrt{#?}", label: "رادیکال" },
                { latex: "(" }, { latex: ")" }, { latex: "=" }
              ],
              [
                { latex: "x" }, { latex: "y" }, { latex: "z" },
                { latex: "+" }, { latex: "-" },
                { latex: "\\cdot", label: "×" },
                { latex: "\\div", label: "÷" }
              ],
              [
                { latex: "7" }, { latex: "8" }, { latex: "9" },
                { latex: "4" }, { latex: "5" }, { latex: "6" },
                { latex: "1" }, { latex: "2" }, { latex: "3" },
                { latex: "0" }, { latex: "." },
                { command: "deleteBackward", label: "⌫" }
              ],
              [
                { command: "moveToPreviousChar", label: "◀" },
                { command: "moveToNextChar", label: "▶" },
                { command: "hideVirtualKeyboard", label: "بستن" }
              ]
            ]
          },
          // ۲. لایه دوم: تب حروف انگلیسی (ABC)
          {
            label: "abc", // نام تب دوم
            rows: [
              [
                { latex: "q" }, { latex: "w" }, { latex: "e" }, { latex: "r" }, { latex: "t" }, { latex: "y" }, { latex: "u" }, { latex: "i" }, { latex: "o" }, { latex: "p" }
              ],
              [
                { latex: "a" }, { latex: "s" }, { latex: "d" }, { latex: "f" }, { latex: "g" }, { latex: "h" }, { latex: "j" }, { latex: "k" }, { latex: "l" }
              ],
              [
                { latex: "z" }, { latex: "x" }, { latex: "c" }, { latex: "v" }, { latex: "b" }, { latex: "n" }, { latex: "m" },
                { command: "deleteBackward", label: "⌫" }
              ],
              [
                { command: "moveToPreviousChar", label: "◀" },
                { command: "moveToNextChar", label: "▶" },
                { command: "hideVirtualKeyboard", label: "بستن" }
              ]
            ]
          }
        ]
      };

      // جایگزین کردن چیدمان (Layout) اختصاصی ما به جای کیبورد پیش‌فرض
      window.mathVirtualKeyboard.layouts = [JABRINO_LAYOUT];
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
