// src/app/main.js

import { MathEditor } from "../ui/MathEditor.js";
import { MathAdapter } from "../ui/MathAdapter.js";
import { HistoryManager } from "../ui/HistoryManager.js";
import { normalize } from "../core/normalize.js";
import {
  validate,
  detectAmbiguousDivision,
  normalizeMathInput,
  rejectFractionalExponents,
} from "../core/validate.js";
import { solveEquation, simplify } from "../algebra/solveEquation.js";
import { evalNumeric } from "../core/numericEval.js";

document.addEventListener("DOMContentLoaded", () => {
  const editor = new MathEditor("mathInput", "miniKbd");
  const history = new HistoryManager();

  const resultDiv = document.getElementById("result");
  const stepsDiv = document.getElementById("steps");
  const errorDiv = document.getElementById("error");
  const stepsBtn = document.getElementById("stepsBtn");

  let steps = [];

  function resetUI() {
    steps = [];
    stepsDiv.innerHTML = "";
    stepsDiv.style.display = "none";
    stepsBtn.style.display = "none";
    errorDiv.innerHTML = "";
    errorDiv.style.display = "none";
    resultDiv.innerHTML = "";
  }

  function showError(msg) {
    errorDiv.style.display = "block";
    errorDiv.innerText = msg;
  }

  function showSteps() {
    stepsDiv.innerHTML = "";
    steps.forEach((s) => {
      const div = document.createElement("div");
      div.className = "step";
      div.innerHTML = '<span dir="ltr">' + s + "</span>";
      stepsDiv.appendChild(div);
    });
  }

  window.toggleSteps = function () {
    stepsDiv.style.display =
      stepsDiv.style.display === "none" ? "block" : "none";
  };

  window.solve = function () {
    resetUI();
    const rawLatex = editor.getValue();

    if (!rawLatex) {
      showError("عبارتی وارد نشده است.");
      return;
    }

    try {
      const linearNormalized = MathAdapter.latexToLinear(rawLatex);
      console.log("Linearized Formula:", linearNormalized);

      let expr = normalize(linearNormalized);
      expr = normalizeMathInput(expr);
      expr = validate(expr);

      rejectFractionalExponents(expr);
      detectAmbiguousDivision(expr);

      let result;
      if (expr.includes("=")) {
        result = solveEquation(expr, steps);
      } else {
        result = simplify(expr, steps);
      }

      resultDiv.innerHTML = "";
      const resultViewer = document.createElement("math-field");
      resultViewer.setAttribute("read-only", "true");
      resultViewer.style.border = "none";
      resultViewer.style.background = "transparent";
      resultViewer.style.outline = "none";
      resultViewer.style.fontSize = "1.2rem";

      const latexResult = MathAdapter.linearToLatex
        ? MathAdapter.linearToLatex(result)
        : result;
      resultViewer.value = latexResult;
      resultDiv.appendChild(resultViewer);

      try {
        if (typeof evalNumeric === "function") {
          const numericVal = evalNumeric(expr);
          if (typeof numericVal === "number" && Number.isFinite(numericVal)) {
            const approxDiv = document.createElement("div");
            approxDiv.className = "approx-result";
            approxDiv.style.marginTop = "4px";
            approxDiv.style.fontSize = "0.9rem";
            approxDiv.style.color = "#4b5563";
            approxDiv.innerText = "≈ " + numericVal.toFixed(3);
            resultDiv.appendChild(approxDiv);
          }
        }
      } catch (err) {
        console.warn("Numeric eval failed:", err);
      }

      history.addToHistory(rawLatex, result);
      showSteps();
      stepsBtn.style.display = "block";
    } catch (e) {
      showError(e.message || e);
    }
  };

  const historyModal = document.getElementById("historyModal");

  window.renderHistoryUI = function () {
    const container = document.getElementById("historyContainer");
    const list = history.getHistory();

    if (list.length === 0) {
      container.innerHTML = `<p style="color: #6b7280; text-align: center; padding: 20px 0;">هیچ عبارتی در تاریخچه ثبت نشده است.</p>`;
      return;
    }

    container.innerHTML = "";
    list.forEach((item) => {
      const box = document.createElement("div");
      box.className = "history-box";
      const escapedExpr = encodeURIComponent(item.expression);

      box.innerHTML = `
        <div class="history-expr-clickable" onclick="loadFromHistory('${escapedExpr}')">${item.expression}</div>
        <div id="res-box-${item.id}" class="history-res-box">${item.result}</div>
        <div class="history-footer">
          <div class="history-actions">
            <button class="btn-action-small btn-action-view" onclick="toggleResult('${item.id}', this)">مشاهده جواب</button>
            <button class="btn-action-small btn-action-delete" onclick="deleteHistoryItem('${item.id}')">حذف</button>
          </div>
        </div>
      `;
      container.appendChild(box);
    });
  };

  window.toggleResult = function (id, btn) {
    const resBox = document.getElementById(`res-box-${id}`);
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

  const helpBtn = document.getElementById("helpBtn");
  const helpModal = document.getElementById("helpModal");
  const closeHelp = document.getElementById("closeHelp");
  const historyBtn = document.getElementById("historyBtn");
  const closeHistory = document.getElementById("closeHistory");

  window.openHelpModal = () => {
    helpModal.classList.remove("hide");
    helpModal.classList.add("show");
    helpModal.style.display = "flex";
  };

  window.closeHelpModal = () => {
    helpModal.classList.remove("show");
    helpModal.classList.add("hide");
    setTimeout(() => {
      helpModal.style.display = "none";
      helpModal.classList.remove("hide");
    }, 220);
  };

  window.openHistoryModal = () => {
    window.renderHistoryUI();
    historyModal.classList.remove("hide");
    historyModal.classList.add("show");
    historyModal.style.display = "flex";
  };

  window.closeHistoryModal = () => {
    historyModal.classList.remove("show");
    historyModal.classList.add("hide");
    setTimeout(() => {
      historyModal.style.display = "none";
      historyModal.classList.remove("hide");
    }, 220);
  };

  helpBtn?.addEventListener("click", window.openHelpModal);
  closeHelp?.addEventListener("click", window.closeHelpModal);
  historyBtn?.addEventListener("click", window.openHistoryModal);
  closeHistory?.addEventListener("click", window.closeHistoryModal);

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

  editor.onEnter(window.solve);
});
