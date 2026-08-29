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
  initHelpModalMath();

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

    /*
     * مهم:
     * عرض math-field نباید 100 درصد باشد.
     * عرض آن باید به اندازه عبارت ریاضی باشد تا wrapper بتواند
     * پیمایش افقی ایجاد کند.
     */
    mf.style.width = "max-content";
    mf.style.minWidth = "max-content";
    mf.style.maxWidth = "none";

    mf.style.display = "inline-block";
    mf.style.whiteSpace = "nowrap";
    mf.style.fontSize = "1.05rem";
    mf.style.outline = "none";

    mf.value = latex || "";

    return mf;
  }

  function createMathScrollArea(latex) {
    const scrollArea = document.createElement("div");
    scrollArea.className = "math-scroll-area";
    scrollArea.setAttribute("dir", "ltr");

    const mathField = makeReadonlyMathField(latex);

    scrollArea.appendChild(mathField);

    return scrollArea;
  }

  function linearToLatexSafe(linear) {
    if (!linear) return "";
    try {
      return MathAdapter.linearToLatex(linear);
    } catch (err) {
      console.warn("خطا در تبدیل عبارات به LaTeX:", err);
      return String(linear); // جایگزین احتیاطی
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

        const fromScrollArea = createMathScrollArea(linearToLatexSafe(from));

        row.appendChild(fromScrollArea);
        mathBox.appendChild(row);
      }

      if (to) {
        const row = document.createElement("div");
        row.className = "jabrino-math-row";

        const toScrollArea = createMathScrollArea(linearToLatexSafe(to));

        row.appendChild(toScrollArea);
        mathBox.appendChild(row);
      }
    } else if (shown) {
      mathBox.appendChild(createMathScrollArea(linearToLatexSafe(shown)));
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

  window.solve = function () {
    resetUI();

    if (typeof MathAdapter.resetVariableColorRegistry === "function") {
      MathAdapter.resetVariableColorRegistry();
    }

    const rawLatex = editor.getValue();

    if (!rawLatex || !rawLatex.trim()) {
      showError("عبارتی وارد نشده است.");
      return;
    }

    try {
      // ۱) LaTeX -> linear
      const linearNormalized =
        typeof MathAdapter.latexToLinear === "function"
          ? MathAdapter.latexToLinear(rawLatex)
          : rawLatex;

      // ۲) normalize + validate
      let expr = normalize(linearNormalized);
      expr = normalizeMathInput(expr);
      expr = validate(expr);

      // ۳) محدودیت‌ها
      rejectFractionalExponents(expr);
      detectAmbiguousDivision(expr);

      // ۴) حل/ساده‌سازی
      let result;
      if (expr.includes("=")) {
        result = solveEquation(expr, steps);
      } else {
        result = simplify(expr, steps);
      }

      // ۵) نمایش نتیجه
      resultDiv.innerHTML = "";
      const resultViewer = document.createElement("math-field");
      resultViewer.setAttribute("read-only", "true");
      resultViewer.setAttribute("dir", "ltr");
      resultViewer.style.border = "none";
      resultViewer.style.background = "transparent";
      resultViewer.style.outline = "none";
      resultViewer.style.fontSize = "1.25rem";

      const latexResult = linearToLatexSafe(result);
      resultViewer.value = latexResult;
      resultDiv.appendChild(resultViewer);

      // ۶) تقریب عددی
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

      // ۷) تاریخچه
      history.addToHistory(rawLatex, result);

      // ۸) دکمه مراحل
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
  const aboutModal = document.getElementById("aboutModal");

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

  // --- مودال درباره ما ---
  window.openAboutModal = () => {
    if (!aboutModal) return;
    aboutModal.classList.remove("hide");
    aboutModal.classList.add("show");
    aboutModal.style.display = "flex";
  };

  window.closeAboutModal = () => {
    if (!aboutModal) return;
    aboutModal.classList.remove("show");
    aboutModal.classList.add("hide");
    setTimeout(() => {
      aboutModal.style.display = "none";
      aboutModal.classList.remove("hide");
    }, 220);
  };
  // ---------------------------
  // بخش ریاضی دانان
  // دریافت خودکار داده از ویکی پدیای فارسی
  // ---------------------------
  const mathematiciansModal = document.getElementById("mathematiciansModal");
  const mathematiciansBtn = document.getElementById("mathematiciansBtn");
  const closeMathematiciansBtn = document.getElementById("closeMathematicians");
  const mathematicianSearchInput = document.getElementById(
    "mathematicianSearchInput",
  );
  const mathematicianSearchBtn = document.getElementById(
    "mathematicianSearchBtn",
  );
  const mathematicianList = document.getElementById("mathematicianList");
  const mathematicianDetail = document.getElementById("mathematicianDetail");
  const mathematicianStatus = document.getElementById("mathematicianStatus");

  const defaultMathematicians = [
    "محمد بن موسی خوارزمی",
    "عمر خیام",
    "اقلیدس",
    "رنه دکارت",
    "مریم میرزاخانی",
    "غیاث الدین جمشید کاشانی",
  ];
  const mathematicianDetailModal = document.getElementById(
    "mathematicianDetailModal",
  );
  const mathematicianDetailContent = document.getElementById(
    "mathematicianDetailContent",
  );
  const closeMathematicianDetailBtn = document.getElementById(
    "closeMathematicianDetail",
  );

  function setMathematicianStatus(message = "", type = "") {
    if (!mathematicianStatus) return;

    mathematicianStatus.textContent = message;
    mathematicianStatus.className = "mathematician-status";

    if (type) {
      mathematicianStatus.classList.add(`status-${type}`);
    }
  }

  function getWikipediaSearchUrl(searchText) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: searchText,
      gsrnamespace: "0",
      gsrlimit: "12",
      prop: "extracts|pageimages|info",
      exintro: "1",
      explaintext: "1",
      piprop: "thumbnail",
      pithumbsize: "420",
      inprop: "url",
    });

    return `https://fa.wikipedia.org/w/api.php?${params.toString()}`;
  }

  function normalizeWikipediaPages(data) {
    const pages = Object.values(data?.query?.pages || {});

    return pages
      .filter((page) => page && page.title && page.pageid > 0)
      .sort((first, second) => {
        const firstIndex = Number(first.index || 9999);
        const secondIndex = Number(second.index || 9999);
        return firstIndex - secondIndex;
      });
  }

  function createMathematicianCard(page) {
    const card = document.createElement("article");
    card.className = "mathematician-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `نمایش اطلاعات ${page.title}`);

    const imageUrl = page.thumbnail?.source || "";
    const excerpt = page.extract || "خلاصه ای برای این صفحه در دسترس نیست.";

    card.innerHTML = `
      <div class="mathematician-card-image">
        ${
          imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" alt="تصویر ${escapeHtml(page.title)}">`
            : `<span class="mathematician-image-placeholder" aria-hidden="true">∑</span>`
        }
      </div>

      <div class="mathematician-card-content">
        <h3>${escapeHtml(page.title)}</h3>
        <p>${escapeHtml(excerpt)}</p>
      </div>
    `;

    const openDetail = () => renderMathematicianDetail(page);

    card.addEventListener("click", openDetail);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDetail();
      }
    });

    return card;
  }

  function renderMathematicianDetail(page) {
    if (!mathematicianDetailModal || !mathematicianDetailContent) return;

    const title = page.title || "بدون عنوان";
    const description =
      page.extract ||
      "برای این ریاضی دان، توضیح کاملی در ویکی پدیای فارسی پیدا نشد.";

    const imageUrl = page.thumbnail?.source;
    const wikipediaUrl = page.fullurl || "#";

    mathematicianDetailContent.innerHTML = `
    <section class="mathematician-detail-view" dir="rtl">
      ${
        imageUrl
          ? `<img
              class="mathematician-detail-image"
              src="${imageUrl}"
              alt="تصویر ${title}"
            />`
          : ""
      }

      <h2>${title}</h2>

      <p>${description}</p>

      ${
        wikipediaUrl !== "#"
          ? `<a
              class="mathematician-source-link"
              href="${wikipediaUrl}"
              target="_blank"
              rel="noopener noreferrer"
            >
              مشاهده صفحه کامل در ویکی پدیای فارسی
            </a>`
          : ""
      }
    </section>
  `;

    mathematicianDetailModal.style.display = "flex";

    requestAnimationFrame(() => {
      mathematicianDetailModal.classList.add("show");
    });
  }

  function renderMathematicianResults(pages) {
    if (!mathematicianList) return;

    mathematicianList.innerHTML = "";
    mathematicianDetail.hidden = true;
    mathematicianList.hidden = false;

    if (pages.length === 0) {
      setMathematicianStatus(
        "نتیجه ای پیدا نشد. نام را با شکل دیگری وارد کنید.",
        "error",
      );
      return;
    }

    setMathematicianStatus(`${pages.length} نتیجه پیدا شد.`, "success");

    pages.forEach((page) => {
      mathematicianList.appendChild(createMathematicianCard(page));
    });
  }

  async function searchMathematicians(searchText) {
    const query = String(searchText || "").trim();

    if (!query) {
      setMathematicianStatus("ابتدا نام یک ریاضی دان را وارد کنید.", "error");
      return;
    }

    setMathematicianStatus("در حال دریافت اطلاعات...", "loading");

    if (mathematicianSearchBtn) {
      mathematicianSearchBtn.disabled = true;
      mathematicianSearchBtn.textContent = "در حال جستجو";
    }

    try {
      const response = await fetch(getWikipediaSearchUrl(query));

      if (!response.ok) {
        throw new Error("ارتباط با منبع اطلاعات برقرار نشد.");
      }

      const data = await response.json();
      const pages = normalizeWikipediaPages(data);

      renderMathematicianResults(pages);
    } catch (error) {
      console.error("خطا در دریافت اطلاعات ریاضی دانان:", error);
      setMathematicianStatus(
        "دریافت اطلاعات انجام نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.",
        "error",
      );
    } finally {
      if (mathematicianSearchBtn) {
        mathematicianSearchBtn.disabled = false;
        mathematicianSearchBtn.textContent = "جستجو";
      }
    }
  }

  function renderDefaultMathematicians() {
    if (!mathematicianList) return;

    mathematicianDetail.hidden = true;
    mathematicianList.hidden = false;
    mathematicianList.innerHTML = "";

    setMathematicianStatus(
      "یک نام را انتخاب کنید یا نام دلخواه خود را جستجو کنید.",
    );

    defaultMathematicians.forEach((name) => {
      const button = document.createElement("button");
      button.className = "mathematician-suggestion-btn";
      button.type = "button";
      button.textContent = name;

      button.addEventListener("click", () => {
        if (mathematicianSearchInput) {
          mathematicianSearchInput.value = name;
        }

        searchMathematicians(name);
      });

      mathematicianList.appendChild(button);
    });
  }

  window.openMathematiciansModal = () => {
    if (!mathematiciansModal) return;

    mathematiciansModal.classList.remove("hide");
    mathematiciansModal.classList.add("show");
    mathematiciansModal.style.display = "flex";

    if (mathematicianSearchInput) {
      mathematicianSearchInput.value = "";
    }

    renderDefaultMathematicians();

    setTimeout(() => {
      mathematicianSearchInput?.focus();
    }, 250);
  };

  window.closeMathematiciansModal = () => {
    if (!mathematiciansModal) return;

    mathematiciansModal.classList.remove("show");
    mathematiciansModal.classList.add("hide");

    setTimeout(() => {
      mathematiciansModal.style.display = "none";
      mathematiciansModal.classList.remove("hide");
    }, 220);
  };

  mathematiciansBtn?.addEventListener("click", window.openMathematiciansModal);

  closeMathematiciansBtn?.addEventListener(
    "click",
    window.closeMathematiciansModal,
  );

  mathematicianSearchBtn?.addEventListener("click", () => {
    searchMathematicians(mathematicianSearchInput?.value);
  });
  window.closeMathematicianDetailModal = () => {
    if (!mathematicianDetailModal) return;

    mathematicianDetailModal.classList.remove("show");
    mathematicianDetailModal.classList.add("hide");

    setTimeout(() => {
      mathematicianDetailModal.style.display = "none";
      mathematicianDetailModal.classList.remove("hide");
    }, 220);
  };

  closeMathematicianDetailBtn?.addEventListener("click", () => {
    window.closeMathematicianDetailModal();
  });

  mathematicianSearchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      searchMathematicians(mathematicianSearchInput.value);
    }
  });

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

  // دکمه‌های درباره ما
  document
    .getElementById("aboutBtn")
    ?.addEventListener("click", window.openAboutModal);
  document
    .getElementById("closeAbout")
    ?.addEventListener("click", window.closeAboutModal);

  // --- دکمه پاک‌سازی تاریخچه (داخل DOMContentLoaded) ---
  // پیدا کردن دکمه پاک‌سازی تاریخچه
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");

  if (clearHistoryBtn) {
    // حذف شنونده قبلی برای اطمینان و اضافه کردن شنونده جدید
    clearHistoryBtn.onclick = () => {
      if (!confirm("آیا از پاک کردن تمام تاریخچه اطمینان دارید؟")) return;

      // پاک کردن از حافظه مرورگر
      if (typeof history.clearAll === "function") {
        history.clearAll();
      } else {
        localStorage.removeItem("jabrino_calculations_history");
      }

      // بروزرسانی رابط کاربری
      if (typeof window.renderHistoryUI === "function") {
        window.renderHistoryUI();
      }

      console.log("History cleared successfully.");
    };
  }

  window.addEventListener("click", (e) => {
    if (e.target === helpModal) window.closeHelpModal();
    if (e.target === historyModal) window.closeHistoryModal();
    if (e.target === aboutModal) window.closeAboutModal();

    if (e.target === mathematiciansModal) {
      window.closeMathematiciansModal();
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (helpModal?.classList.contains("show")) window.closeHelpModal();
      if (historyModal?.classList.contains("show")) window.closeHistoryModal();
      if (aboutModal?.classList.contains("show")) window.closeAboutModal();

      if (mathematiciansModal?.classList.contains("show")) {
        window.closeMathematiciansModal();
      }
      if (mathematicianDetailModal?.classList.contains("show")) {
        window.closeMathematicianDetailModal();
      }
    }
  });

  // مقداردهی اولیه رندر فرمول‌های راهنما
  initHelpModalMath();

  /* =========================================
   ENTER BEHAVIOR FOR MAIN MATH INPUT
========================================= */

  editor.onEnter(() => {
    /*
     * حالت فعال Self Solve را از خود UI می‌خوانیم.
     * بنابراین main.js لازم نیست state داخلی
     * selfSolve.js را بشناسد.
     */

    const selfModeButton = document.querySelector('[data-jabrino-mode="self"]');

    const isSelfSolveMode = selfModeButton?.classList.contains("is-active");

    /* -----------------------------------------
     حالت «خودم حل می‌کنم»
  ----------------------------------------- */

    if (isSelfSolveMode) {
      /*
       * به selfSolve.js اعلام می‌کنیم
       * که Enter روی صورت سؤال زده شده است.
       */

      document.dispatchEvent(new CustomEvent("jabrino:self-solve-enter"));

      return;
    }

    /* -----------------------------------------
     حالت عادی «حل با جبرینو»
  ----------------------------------------- */

    window.solve();
  });
});

document.addEventListener("pointerdown", (event) => {
  const scrollArea = event.target.closest(".math-scroll-area");

  if (!scrollArea) return;

  const startX = event.clientX;
  const startScrollLeft = scrollArea.scrollLeft;

  let isDragging = true;

  const move = (moveEvent) => {
    if (!isDragging) return;

    const distance = moveEvent.clientX - startX;
    scrollArea.scrollLeft = startScrollLeft - distance;
  };

  const stop = () => {
    isDragging = false;

    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", stop);
    document.removeEventListener("pointercancel", stop);
  };

  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", stop);
  document.addEventListener("pointercancel", stop);
});
