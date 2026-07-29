// src/ui/MathEditor.js
export class MathEditor {
  constructor(mathFieldId, toolbarId) {
    this.mf = document.getElementById(mathFieldId);
    this.toolbar = document.getElementById(toolbarId);

    if (!this.mf) {
      console.error(`Mathfield with id "${mathFieldId}" not found.`);
      return;
    }

    this.init();
  }

  init() {
    // Turn off MathLive default virtual keyboard
    this.mf.mathVirtualKeyboardPolicy = "off";
    this.mf.setAttribute("menu-items", "");

    // Force LTR for math typing
    this.mf.style.direction = "ltr";
    this.mf.setAttribute("dir", "ltr");

    if (this.toolbar) {
      this.toolbar.addEventListener("click", (e) => this.handleToolbarClick(e));
    }
  }

  handleToolbarClick(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    this.mf.focus();
    const action = btn.dataset.action;

    switch (action) {
      case "frac":
        this.mf.executeCommand(["insert", "\\frac{\\placeholder{}}{\\placeholder{}}"]);
        break;
      case "sqrt":
        this.mf.executeCommand(["insert", "\\sqrt{\\placeholder{}}"]);
        break;
      case "power":
        this.mf.executeCommand(["insert", "^{\\placeholder{}}"]);
        break;
      case "paren":
        this.mf.executeCommand(["insert", "\\left(\\placeholder{}\\right)"]);
        break;
    }
  }

  getValue() {
    return this.mf.value; // LaTeX string
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
