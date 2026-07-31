// src/app/main.js

import { MathEditor } from "../ui/MathEditor.js";
import MathAdapter from "../ui/MathAdapter.js";
import { HistoryManager } from "../ui/HistoryManager.js";
import { normalize } from "../core/normalize.js";
import {
  validate,
  detectAmbiguousDivision,
  normalizeMathInput,
  rejectFractionalExponents,
} from "../core/validate.js";
import { solveEquation } from "../algebra/solveEquation.js";
import { simplify } from "../algebra/simplify.js";
import { evalNumeric } from "../core/numericEval.js";

document.addEventListener("DOMContentLoaded", () => {
  const editor = new MathEditor("mathInput", "miniKbd");
  const history = new HistoryManager();

  const resultDiv = document.getElementById("result");
  const stepsDiv = document.getElementById("steps");
  const errorDiv = document.getElementById("error");
  const stepsBtn = document.getElementById("stepsBtn");

  if (!resultDiv || !stepsDiv || !errorDiv || !stepsBtn) {
    console.error("عناصر اصلی رابط کاربری (UI Elements) در صفحه یافت نشدند.");
    return;
  }

  // ---------------------------
  // وضعیت سراسری ماژول (Module State)
  // ---------------------------
  let steps = [];
  let stepsVisible = false;
  let animationTimer = null; // برای جلوگیری از نشت تایمر (Timer Leak)

  function resetUI() {
    steps = [];
    stepsVisible = false;

    // توقف انیمیشن در حال اجرا در صورت وجود
    if (animationTimer) {
      clearInterval(animationTimer);
      animationTimer = null;
    }

    stepsDiv.innerHTML = "";
    stepsDiv.style.display = "none";

    stepsBtn.style.display = "none";
    stepsBtn.textContent = "نمایش مراحل";
    stepsBtn.disabled = true;

    errorDiv.innerHTML = "";
    errorDiv.style.display = "none";

    resultDiv.innerHTML = "";
  }

  function showError(message) {
    errorDiv.innerHTML = "";
    errorDiv.style.display = "block";

    const box = document.createElement("div");
    box.className = "error-box";
    box.textContent = message;
    errorDiv.appendChild(box);
  }

  function getKindLabel(kind) {
    switch (kind) {
      case "info":
        return "شروع";
      case "transform":
        return "تغییر";
      case "combine":
        return "ساده‌سازی";
      case "expand":
        return "گشودن پرانتز";
      case "solution":
        return "نتیجه";
      case "warning":
        return "هشدار";
      default:
        return "مرحله";
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function makeReadonlyMathField(latex) {
    const mf = document.createElement("math-field");
    mf.setAttribute("read-only", "true");
    mf.setAttribute("dir", "ltr");

    mf.style.direction = "ltr";
    mf.style.textAlign = "left";
    mf.style.border = "1px dashed #d1d5db";
    mf.style.borderRadius = "12px";
    mf.style.padding = "10px 12px";
    mf.style.background = "#f9fafb";
    mf.style.width = "100%";
    mf.style.fontSize = "1.05rem";
    mf.style.outline = "none";

    mf.value = latex || "";
    return mf;
  }

  function linearToLatexSafe(linear) {
    if (!linear) return "";
    try {
      if (typeof MathAdapter.linearToLatex === "function") {
        return MathAdapter.linearToLatex(linear);
      }
      return linear;
    } catch (err) {
      console.warn("خطا در تبدیل عبارات به LaTeX:", err);
      return linear; // جایگزین احتیاطی (Fallback / جایگزین اضطراری)
    }
  }

  // ---------------------------
  // رندر ریاضی در راهنما (Help Modal Math Renderer)
  // ---------------------------
  function initHelpModalMath() {
    const exampleBoxes = document.querySelectorAll("#helpModal .example-box");
    exampleBoxes.forEach((box) => {
      const latex = box.getAttribute("data-latex") || box.textContent.trim();
      if (!latex) return;

      box.innerHTML = "";
      const mf = makeReadonlyMathField(latex);
      mf.style.border = "none";
      mf.style.background = "transparent";
      mf.style.padding = "0";
      box.appendChild(mf);
    });

    // رندر فرمول‌های داخل متن (Inline Math)
    const inlineCodes = document.querySelectorAll(
      "#helpModal code[data-latex]",
    );
    inlineCodes.forEach((codeEl) => {
      const latex = codeEl.getAttribute("data-latex");
      if (!latex) return;

      codeEl.innerHTML = "";
      const mf = document.createElement("math-field");
      mf.setAttribute("read-only", "true");
      mf.value = latex;

      // اعمال استایل‌های لازم برای قرارگیری در خط
      mf.style.display = "inline-block";
      mf.style.verticalAlign = "middle"; // هم‌ترازی عمودی با متن
      mf.style.border = "none";
      mf.style.background = "transparent";
      mf.style.padding = "0 2px";
      mf.style.margin = "0";
      mf.style.minWidth = "auto";
      mf.style.fontSize = "1em"; // هماهنگی اندازه با متن اطراف

      codeEl.appendChild(mf);
    });
  }

  function createStepCard(step, index) {
    const card = document.createElement("div");
    const kind = step.kind || step.type || "info";
    const kindLabel = getKindLabel(kind);
    const title = step.title || `گام ${index + 1}`;
    const desc = step.description || "";

    card.className = `jabrino-step-card step-${kind}`;

    const header = document.createElement("div");
    header.className = "jabrino-step-header";
    header.innerHTML = `
      <span class="jabrino-step-index">گام ${index + 1}</span>
      <span class="jabrino-step-title">${escapeHtml(title)}</span>
      <span class="jabrino-step-kind">${escapeHtml(kindLabel)}</span>
    `;

    const body = document.createElement("div");
    body.className = "jabrino-step-body";

    const faBox = document.createElement("div");
    faBox.className = "jabrino-step-text";
    faBox.setAttribute("dir", "rtl");
    faBox.innerHTML = desc
      ? `<p>${escapeHtml(desc).replace(/\n/g, "<br>")}</p>`
      : "";

    const mathBox = document.createElement("div");
    mathBox.className = "jabrino-step-math";
    mathBox.setAttribute("dir", "ltr");

    const from = step.from || "";
    const to = step.to || "";
    const shown = step.value || step.meta?.preview || "";

    if (from || to) {
      if (from) {
        const row = document.createElement("div");
        row.className = "jabrino-math-row";
        row.appendChild(makeReadonlyMathField(linearToLatexSafe(from)));
        mathBox.appendChild(row);
      }
      if (to) {
        const row = document.createElement("div");
        row.className = "jabrino-math-row";
        row.appendChild(makeReadonlyMathField(linearToLatexSafe(to)));
        mathBox.appendChild(row);
      }
    } else if (shown) {
      mathBox.appendChild(makeReadonlyMathField(linearToLatexSafe(shown)));
    } else {
      mathBox.innerHTML = `<div class="jabrino-step-empty">—</div>`;
    }

    body.appendChild(faBox);
    body.appendChild(mathBox);
    card.appendChild(header);
    card.appendChild(body);

    return card;
  }

  // نمایش انیمیشنی گام‌ها (Animated Step Display)
  function showStepsAnimated(intervalMs = 400) {
    stepsDiv.innerHTML = "";

    if (!steps || steps.length === 0) {
      stepsDiv.style.display = "none";
      return;
    }

    stepsDiv.style.display = "block";
    let i = 0;

    if (animationTimer) {
      clearInterval(animationTimer);
    }

    animationTimer = setInterval(() => {
      if (i >= steps.length) {
        clearInterval(animationTimer);
        animationTimer = null;
        stepsBtn.disabled = false;
        stepsBtn.textContent = "مخفی‌سازی مراحل";
        return;
      }

      const card = createStepCard(steps[i], i);
      stepsDiv.appendChild(card);
      i++;
    }, intervalMs);
  }

  function toggleSteps() {
    if (!steps || steps.length === 0) return;

    if (!stepsVisible) {
      stepsVisible = true;
      stepsDiv.innerHTML = "";
      stepsDiv.style.display = "block";
      stepsBtn.textContent = "در حال نمایش گام‌ها...";
      stepsBtn.disabled = true;

      showStepsAnimated(400);
      return;
    }

    stepsVisible = false;
    if (animationTimer) {
      clearInterval(animationTimer);
      animationTimer = null;
    }
    stepsDiv.style.display = "none";
    stepsDiv.innerHTML = "";
    stepsBtn.disabled = false;
    stepsBtn.textContent = "نمایش مراحل";
  }

  stepsBtn.addEventListener("click", toggleSteps);
  // اگر در HTML onclick="toggleSteps()" دارید، می‌توانید این را نیز اضافه کنید:
  // window.toggleSteps = toggleSteps;

  window.solve = function () {
    resetUI();

    // پاک‌سازی ثبت‌کننده رنگ‌ها برای جلوگیری از نشت وضعیت بین مسائل
    if (typeof MathAdapter.resetVariableColorRegistry === "function") {
      MathAdapter.resetVariableColorRegistry();
    }

    const rawLatex = editor.getValue();

    if (!rawLatex || !rawLatex.trim()) {
      showError("عبارتی وارد نشده است.");
      return;
    }

    try {
      // ۱. تبدیل LaTeX به رشتهٔ خطی (Linear Notation)
      const linearNormalized =
        typeof MathAdapter.latexToLinear === "function"
          ? MathAdapter.latexToLinear(rawLatex)
          : rawLatex;

      console.log("عبارت خطی نرمال‌شده:", linearNormalized);

      // ۲. نرمال‌سازی و اعتبارسنجی ورودی
      let expr = normalize(linearNormalized);
      expr = normalizeMathInput(expr);
      expr = validate(expr);

      // ۳. بررسی محدودیت‌های ریاضی (توان کسری و تقسیم مبهم)
      rejectFractionalExponents(expr);
      detectAmbiguousDivision(expr);

      // ۴. حل معادله یا ساده‌سازی عبارت
      let result;
      if (expr.includes("=")) {
        result = solveEquation(expr, steps);
      } else {
        result = simplify(expr, steps);
      }

      // ۵. نمایش نتیجه اصلی با MathLive
      resultDiv.innerHTML = "";
      const resultViewer = document.createElement("math-field");
      resultViewer.setAttribute("read-only", "true");
      resultViewer.style.border = "none";
      resultViewer.style.background = "transparent";
      resultViewer.style.outline = "none";
      resultViewer.style.fontSize = "1.25rem";

      const latexResult = linearToLatexSafe(result);
      resultViewer.value = latexResult;
      resultDiv.appendChild(resultViewer);

      // ۶. محاسبه و نمایش تقریب عددی (Numeric Approximation)
      try {
        if (typeof evalNumeric === "function") {
          const numericVal = evalNumeric(expr);
          if (typeof numericVal === "number" && Number.isFinite(numericVal)) {
            const approxDiv = document.createElement("div");
            approxDiv.className = "approx-result";
            approxDiv.style.marginTop = "6px";
            approxDiv.style.fontSize = "0.95rem";
            approxDiv.style.color = "#4b5563";
            approxDiv.innerText = "≈ " + numericVal.toFixed(3);
            resultDiv.appendChild(approxDiv);
          }
        }
      } catch (err) {
        console.warn("ارزیابی عددی انجام نشد:", err);
      }

      // ۷. ثبت در تاریخچه
      history.addToHistory(rawLatex, result);

      // ۸. فعال‌سازی دکمه نمایش مراحل
      if (steps && steps.length > 0) {
        stepsBtn.style.display = "inline-block";
        stepsBtn.disabled = false;
        stepsVisible = false;
        stepsBtn.textContent = "نمایش مراحل";
      }
    } catch (e) {
      showError(e?.message || String(e));
    }
  };

  // ---------------------------
  // مدیریت تاریخچه و مدال‌ها (Modals & History)
  // ---------------------------
  const historyModal = document.getElementById("historyModal");
  const helpModal = document.getElementById("helpModal");

  // بازنویسی رندر تاریخچه با فرمت استاندارد ریاضی (History Math Rendering)
  window.renderHistoryUI = function () {
    const container = document.getElementById("historyContainer");
    if (!container) return;

    const list = history.getHistory();

    if (list.length === 0) {
      container.innerHTML = `<p style="color: #6b7280; text-align: center; padding: 20px 0;">هیچ عبارتی در تاریخچه ثبت نشده است.</p>`;
      return;
    }

    container.innerHTML = "";
    list.forEach((item) => {
      const box = document.createElement("div");
      box.className = "history-box";

      // ۱. بخش نمایش عبارت ورودی به شکل فرمول ریاضی (Input Expression Math Field)
      const exprClickable = document.createElement("div");
      exprClickable.className = "history-expr-clickable";
      exprClickable.title = "کلیک کنید تا در ویرایشگر بارگذاری شود";

      const exprMath = makeReadonlyMathField(item.expression);
      exprMath.style.cursor = "pointer";
      exprMath.style.border = "1px solid #e5e7eb";
      exprMath.style.borderRadius = "10px";
      exprMath.style.background = "#ffffff";
      exprMath.style.padding = "8px 12px";

      exprClickable.appendChild(exprMath);
      exprClickable.addEventListener("click", () => {
        window.loadFromHistory(encodeURIComponent(item.expression));
      });

      // ۲. بخش نمایش پاسخ به شکل فرمول ریاضی (Result Math Field)
      const resBox = document.createElement("div");
      resBox.id = `res-box-${item.id}`;
      resBox.className = "history-res-box";
      resBox.style.display = "none";

      const latexResult = linearToLatexSafe(item.result);
      const resMath = makeReadonlyMathField(latexResult);
      resMath.style.border = "none";
      resMath.style.background = "transparent";
      resMath.style.padding = "4px 8px";

      resBox.appendChild(resMath);

      // ۳. بخش فوتر و دکمه‌ها (Actions Footer)
      const footer = document.createElement("div");
      footer.className = "history-footer";

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "history-actions";

      const viewBtn = document.createElement("button");
      viewBtn.className = "btn-action-small btn-action-view";
      viewBtn.textContent = "مشاهده جواب";
      viewBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.toggleResult(item.id, viewBtn);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-action-small btn-action-delete";
      deleteBtn.textContent = "حذف";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.deleteHistoryItem(item.id);
      });

      actionsDiv.appendChild(viewBtn);
      actionsDiv.appendChild(deleteBtn);
      footer.appendChild(actionsDiv);

      box.appendChild(exprClickable);
      box.appendChild(resBox);
      box.appendChild(footer);
      container.appendChild(box);
    });
  };

  window.toggleResult = function (id, btn) {
    const resBox = document.getElementById(`res-box-${id}`);
    if (!resBox) return;

    if (resBox.style.display === "block") {
      resBox.style.display = "none";
      btn.textContent = "مشاهده جواب";
    } else {
      resBox.style.display = "block";
      btn.textContent = "مخفی‌سازی جواب";
    }
  };

  window.deleteHistoryItem = function (id) {
    history.deleteItem(id);
    window.renderHistoryUI();
  };

  window.loadFromHistory = function (encodedExpr) {
    const expr = decodeURIComponent(encodedExpr);
    editor.setValue(expr);
    closeHistoryModal();
    window.solve();
  };

  window.openHelpModal = () => {
    if (!helpModal) return;
    helpModal.classList.remove("hide");
    helpModal.classList.add("show");
    helpModal.style.display = "flex";
  };

  window.closeHelpModal = () => {
    if (!helpModal) return;
    helpModal.classList.remove("show");
    helpModal.classList.add("hide");
    setTimeout(() => {
      helpModal.style.display = "none";
      helpModal.classList.remove("hide");
    }, 220);
  };

  window.openHistoryModal = () => {
    if (!historyModal) return;
    window.renderHistoryUI();
    historyModal.classList.remove("hide");
    historyModal.classList.add("show");
    historyModal.style.display = "flex";
  };

  window.closeHistoryModal = () => {
    if (!historyModal) return;
    historyModal.classList.remove("show");
    historyModal.classList.add("hide");
    setTimeout(() => {
      historyModal.style.display = "none";
      historyModal.classList.remove("hide");
    }, 220);
  };

  document
    .getElementById("helpBtn")
    ?.addEventListener("click", window.openHelpModal);
  document
    .getElementById("closeHelp")
    ?.addEventListener("click", window.closeHelpModal);
  document
    .getElementById("historyBtn")
    ?.addEventListener("click", window.openHistoryModal);
  document
    .getElementById("closeHistory")
    ?.addEventListener("click", window.closeHistoryModal);

  // --- دکمه پاک‌سازی تاریخچه (داخل DOMContentLoaded) ---
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  clearHistoryBtn?.addEventListener("click", () => {
    if (!confirm("آیا از پاک کردن تمام تاریخچه اطمینان دارید؟")) return;

    // اگر HistoryManager متد clearAll دارد، از آن استفاده شود
    if (typeof history.clearAll === "function") {
      history.clearAll();
    } else {
      // در غیر این صورت، پاک‌سازی مستقیم LocalStorage (در صورت نیاز)
      localStorage.removeItem("jabrino_calculations_history");
    }

    window.renderHistoryUI();
    console.log("History cleared successfully.");
  });

  window.addEventListener("click", (e) => {
    if (e.target === helpModal) window.closeHelpModal();
    if (e.target === historyModal) window.closeHistoryModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (helpModal?.classList.contains("show")) window.closeHelpModal();
      if (historyModal?.classList.contains("show")) window.closeHistoryModal();
    }
  });

  // مقداردهی اولیه رندر فرمول‌های راهنما
  initHelpModalMath();

  editor.onEnter(window.solve);
});

// *** توجه: بلوک قبلی clearHistoryBtn که بیرون از DOMContentLoaded بود، در این نسخه حذف شده است. ***
