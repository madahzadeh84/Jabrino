// src/ui/SmartMathInput.js

export class SmartMathInput {
  constructor(editableEl, { onUpdate } = {}) {
    this.el = editableEl;
    this.onUpdate = onUpdate || (() => {});
    this._bind();
  }

  _bind() {
    this.el.addEventListener("input", () => this.onUpdate(this.serialize()));
    this.el.addEventListener("keydown", (e) => this._handleKeydown(e));
  }

  _handleKeydown(e) {
    // جلوگیری از شکستن ساختار ویجت با Backspace بد (می‌شود کامل‌تر کرد)
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    if (e.key === "Backspace") {
      const node = sel.anchorNode;
      // اگر داخل widget هستیم، اجازه بدهیم داخلش پاک کند؛
      // اگر روی خود widget هستیم، کل widget حذف شود (بهینه‌تر: بررسی دقیق‌تر)
    }
  }

  insertFractionAtCaret() {
    const widget = this._createFractionWidget();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      this.el.appendChild(widget);
    } else {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(widget);

      // یک space بعدش برای ادامه تایپ
      const space = document.createTextNode(" ");
      widget.after(space);

      // قرار دادن کرسر داخل صورت
      widget.querySelector("[data-part='num']").focus();
      this._placeCaretInside(widget.querySelector("[data-part='num']"));
    }

    this.onUpdate(this.serialize());
  }

  _createFractionWidget() {
    const wrap = document.createElement("span");
    wrap.className = "frac-widget";
    wrap.setAttribute("contenteditable", "false"); // خود wrap ثابت
    wrap.dataset.token = "fraction";

    // دو فیلد داخلی (این‌ها contenteditable هستند)
    const num = document.createElement("span");
    num.className = "frac-num";
    num.contentEditable = "true";
    num.dataset.part = "num";

    const den = document.createElement("span");
    den.className = "frac-den";
    den.contentEditable = "true";
    den.dataset.part = "den";

    const bar = document.createElement("span");
    bar.className = "frac-bar";
    bar.setAttribute("aria-hidden", "true");

    // داخل wrap نمی‌شود contenteditable=true داشت چون wrap false است.
    // پس تکنیک: wrap false باشد اما قسمت‌های داخلی را true کنیم => نیازمند رویکرد جایگزین:
    // راه ساده‌تر: wrap را true بگذاریم و با جلوگیری از تایپ مستقیم، فقط num/den را ویرایش کنیم.

    wrap.contentEditable = "true";
    wrap.setAttribute("role", "group");

    // محدود کردن تایپ مستقیم روی wrap
    wrap.addEventListener("beforeinput", (e) => {
      // اگر هدف تایپ روی خود wrap است و نه روی num/den، جلوگیری کن
      const target = e.target;
      if (target === wrap) e.preventDefault();
    });

    const focusToNum = () => {
      num.focus();
      this._placeCaretEnd(num);
    };

    // ناوبری
    num.addEventListener("keydown", (e) => {
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        den.focus();
        this._placeCaretEnd(den);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        den.focus();
        this._placeCaretEnd(den);
      }
    });

    den.addEventListener("keydown", (e) => {
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        num.focus();
        this._placeCaretEnd(num);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        // خروج از کسر: کرسر بعد از widget
        this._placeCaretAfter(wrap);
      }
    });

    num.addEventListener("input", () => this.onUpdate(this.serialize()));
    den.addEventListener("input", () => this.onUpdate(this.serialize()));

    // placeholder ساده با zero-width space
    num.textContent = "";
    den.textContent = "";

    wrap.appendChild(num);
    wrap.appendChild(bar);
    wrap.appendChild(den);

    // کلیک روی wrap => فوکوس به num
    wrap.addEventListener("mousedown", (e) => {
      // اجازه بده کلیک انتخاب متن بیرونی را خراب نکند
      e.stopPropagation();
      // بعد از mousedown، فوکوس را تنظیم می‌کنیم
      setTimeout(focusToNum, 0);
    });

    return wrap;
  }

  serialize() {
    // محتوا را پیمایش می‌کنیم:
    // - text nodes => متن
    // - frac-widget => (num)/(den)
    // خروجی را linearly می‌سازیم
    const out = [];

    const walk = (node) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          out.push(child.nodeValue);
          return;
        }
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child;
          if (el.classList.contains("frac-widget")) {
            const num = (el.querySelector(".frac-num")?.textContent || "").trim() || "?";
            const den = (el.querySelector(".frac-den")?.textContent || "").trim() || "?";
            out.push(`(${num})/(${den})`);
            return;
          }
          // سایر spanها یا wrapperها
          walk(el);
        }
      });
    };

    walk(this.el);

    // پاکسازی فاصله‌ها
    return out.join("").replace(/\s+/g, " ").trim();
  }

  setText(expr) {
    this.el.textContent = expr;
    this.onUpdate(this.serialize());
  }

  _placeCaretEnd(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  _placeCaretInside(el) {
    this._placeCaretEnd(el);
  }

  _placeCaretAfter(el) {
    const range = document.createRange();
    range.setStartAfter(el);
    range.setEndAfter(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    // فوکوس برگردد به ادیتور اصلی
    this.el.focus();
  }
}
