// src/app/selfSolve.js

import { MathEditor } from "../ui/MathEditor.js";
import MathAdapter from "../ui/MathAdapter.js";
import { normalize } from "../core/normalize.js";
import { AttemptManager } from "../core/AttemptManager.js";
import { initPerformanceDashboard } from "../ui/PerformanceDashboard.js";

import {
  validate,
  detectAmbiguousDivision,
  normalizeMathInput,
  rejectFractionalExponents,
} from "../core/validate.js";

import { solveEquation } from "../algebra/solveEquation.js";
import { simplify } from "../algebra/simplify.js";
import { checkAnswer } from "../core/answerChecker.js";

document.addEventListener("DOMContentLoaded", () => {
  /* =========================================
       DOM
    ========================================= */

  const modeButtons = document.querySelectorAll("[data-jabrino-mode]");

  const normalSolveButton = document.querySelector(".solveBtn");

  const resultDiv = document.getElementById("result");

  const stepsBtn = document.getElementById("stepsBtn");

  const stepsDiv = document.getElementById("steps");

  const errorDiv = document.getElementById("error");

  const selfSolvePanel = document.getElementById("selfSolvePanel");

  const selfStartBtn = document.getElementById("selfStartBtn");

  const selfAnswerArea = document.getElementById("selfAnswerArea");

  const selfCheckBtn = document.getElementById("selfCheckBtn");

  const selfRetryBtn = document.getElementById("selfRetryBtn");

  const selfShowSolutionBtn = document.getElementById("selfShowSolutionBtn");

  const selfNewProblemBtn = document.getElementById("selfNewProblemBtn");

  const selfFeedback = document.getElementById("selfFeedback");

  const selfSolution = document.getElementById("selfSolution");

  const selfProblemStatus = document.getElementById("selfProblemStatus");

  const problemMathField = document.getElementById("mathInput");

  /* =========================================
       SAFETY
    ========================================= */

  if (
    !modeButtons.length ||
    !normalSolveButton ||
    !selfSolvePanel ||
    !selfStartBtn ||
    !selfAnswerArea ||
    !selfCheckBtn ||
    !selfRetryBtn ||
    !selfShowSolutionBtn ||
    !selfNewProblemBtn ||
    !selfFeedback ||
    !selfSolution ||
    !selfProblemStatus ||
    !problemMathField
  ) {
    console.warn("Self Solve UI could not be initialized.");

    return;
  }

  /* =========================================
       SERVICES
    ========================================= */

  const answerEditor = new MathEditor("selfAnswerInput", "selfAnswerMiniKbd");

  const attemptManager = new AttemptManager();

  /* =========================================
   PERFORMANCE DASHBOARD
========================================= */

  initPerformanceDashboard({
    attemptManager,
  });

  /* =========================================
       STATE
    ========================================= */

  let currentMode = "jabrino";

  let currentProblemLatex = "";

  let currentProblemLinear = "";

  let expectedAnswer = "";

  let hiddenSteps = [];

  let attemptCount = 0;

  let problemStarted = false;

  let answerWasCorrect = false;

  /*
   * شناسه Attempt فعلی در LocalStorage
   */
  let currentAttemptId = null;

  /* =========================================
       DYNAMIC UI
    ========================================= */

  const progressElement = createProgressIndicator();

  const attemptCounter = createAttemptCounter();

  selfSolvePanel.insertBefore(progressElement, selfAnswerArea);

  selfAnswerArea.insertBefore(
    attemptCounter,
    selfAnswerArea.querySelector("#selfAnswerMiniKbd"),
  );

  /* =========================================
       PROGRESS
    ========================================= */

  function createProgressIndicator() {
    const wrapper = document.createElement("div");

    wrapper.className = "self-solve-progress";

    wrapper.setAttribute("aria-label", "مراحل حل تمرین");

    const items = [
      {
        step: 1,
        label: "صورت سؤال",
      },
      {
        step: 2,
        label: "پاسخ من",
      },
      {
        step: 3,
        label: "نتیجه",
      },
    ];

    items.forEach(({ step, label }) => {
      const item = document.createElement("div");

      item.className = "self-progress-item";

      item.dataset.progressStep = String(step);

      const dot = document.createElement("span");

      dot.className = "self-progress-dot";

      dot.textContent = String(step);

      const text = document.createElement("span");

      text.className = "self-progress-label";

      text.textContent = label;

      item.appendChild(dot);

      item.appendChild(text);

      wrapper.appendChild(item);
    });

    return wrapper;
  }

  function updateProgress(activeStep) {
    const items = progressElement.querySelectorAll(".self-progress-item");

    items.forEach((item) => {
      const step = Number(item.dataset.progressStep);

      item.classList.remove("is-active", "is-complete");

      const dot = item.querySelector(".self-progress-dot");

      if (step < activeStep) {
        item.classList.add("is-complete");

        if (dot) {
          dot.textContent = "✓";
        }

        return;
      }

      if (dot) {
        dot.textContent = String(step);
      }

      if (step === activeStep) {
        item.classList.add("is-active");
      }
    });
  }

  /* =========================================
       ATTEMPT COUNTER
    ========================================= */

  function createAttemptCounter() {
    const counter = document.createElement("div");

    counter.className = "self-attempt-counter";

    counter.hidden = true;

    return counter;
  }

  function updateAttemptCounter() {
    if (!problemStarted || attemptCount === 0) {
      attemptCounter.hidden = true;

      attemptCounter.classList.remove("has-attempt");

      attemptCounter.textContent = "";

      return;
    }

    attemptCounter.hidden = false;

    attemptCounter.classList.add("has-attempt");

    attemptCounter.textContent = `تلاش ${attemptCount}`;
  }

  /* =========================================
       ATTEMPT DATA
    ========================================= */

  function extractSkills() {
    return [
      ...new Set(
        hiddenSteps
          .map((step) => step?.meta?.phase)
          .filter(Boolean)
          .map(String),
      ),
    ];
  }

  function ensureCurrentAttempt() {
    if (currentAttemptId) {
      return currentAttemptId;
    }

    const attempt = attemptManager.createAttempt({
      problemLatex: currentProblemLatex,

      problemLinear: currentProblemLinear,

      correctAnswer: expectedAnswer,

      problemType: currentProblemLinear.includes("=")
        ? "equation"
        : "expression",

      skills: extractSkills(),
    });

    currentAttemptId = attempt.id;

    return currentAttemptId;
  }

  /* =========================================
       NORMAL OUTPUT
    ========================================= */

  function clearNormalOutput() {
    if (resultDiv) {
      resultDiv.innerHTML = "";
    }

    if (stepsDiv) {
      stepsDiv.innerHTML = "";

      stepsDiv.style.display = "none";
    }

    if (stepsBtn) {
      stepsBtn.style.display = "none";

      stepsBtn.disabled = true;

      stepsBtn.textContent = "نمایش مراحل";
    }

    if (errorDiv) {
      errorDiv.innerHTML = "";

      errorDiv.style.display = "none";
    }
  }

  /* =========================================
       INPUT PIPELINE
    ========================================= */

  function prepareMathInput(rawLatex) {
    const linear =
      typeof MathAdapter.latexToLinear === "function"
        ? MathAdapter.latexToLinear(rawLatex)
        : rawLatex;

    let expr = normalize(linear);

    expr = normalizeMathInput(expr);

    expr = validate(expr);

    rejectFractionalExponents(expr);

    detectAmbiguousDivision(expr);

    return expr;
  }

  /* =========================================
       LATEX
    ========================================= */

  function linearToLatexSafe(linear) {
    if (!linear) {
      return "";
    }

    try {
      return MathAdapter.linearToLatex(linear);
    } catch (error) {
      console.warn("Could not convert expression to LaTeX:", error);

      return String(linear);
    }
  }

  /* =========================================
       KIND
    ========================================= */

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

      case "identity":
        return "الگوی جبری";

      case "solution":
        return "نتیجه";

      case "warning":
        return "هشدار";

      default:
        return "مرحله";
    }
  }

  /* =========================================
       READ ONLY MATH
    ========================================= */

  function createReadonlyMathField(latex, className = "") {
    const field = document.createElement("math-field");

    field.setAttribute("read-only", "true");

    field.setAttribute("dir", "ltr");

    field.style.direction = "ltr";

    field.style.textAlign = "left";

    if (className) {
      field.className = className;
    }

    field.value = latex || "";

    return field;
  }

  function createMathScrollArea(expression) {
    const scrollArea = document.createElement("div");

    scrollArea.className = "math-scroll-area";

    scrollArea.setAttribute("dir", "ltr");

    scrollArea.appendChild(
      createReadonlyMathField(linearToLatexSafe(expression)),
    );

    return scrollArea;
  }

  /* =========================================
       STEP CARD
    ========================================= */

  function createStepCard(step, index) {
    const card = document.createElement("div");

    const kind = step?.kind || step?.type || "info";

    const kindLabel = getKindLabel(kind);

    const title = step?.title || `گام ${index + 1}`;

    const description = step?.description || "";

    card.className = `jabrino-step-card step-${kind}`;

    card.dataset.stepIndex = String(index);

    card.style.setProperty("--step-order", index);

    if (step?.meta?.phase) {
      card.dataset.phase = String(step.meta.phase);
    }

    /* Number Badge */

    const numberBadge = document.createElement("span");

    numberBadge.className = "jabrino-step-number-badge";

    numberBadge.textContent = String(index + 1);

    numberBadge.setAttribute("aria-hidden", "true");

    card.appendChild(numberBadge);

    /* Header */

    const header = document.createElement("div");

    header.className = "jabrino-step-header";

    const indexElement = document.createElement("span");

    indexElement.className = "jabrino-step-index";

    indexElement.textContent = `گام ${index + 1}`;

    const titleElement = document.createElement("span");

    titleElement.className = "jabrino-step-title";

    titleElement.textContent = title;

    const kindElement = document.createElement("span");

    kindElement.className = "jabrino-step-kind";

    kindElement.textContent = kindLabel;

    header.appendChild(indexElement);

    header.appendChild(titleElement);

    header.appendChild(kindElement);

    /* Body */

    const body = document.createElement("div");

    body.className = "jabrino-step-body";

    /* Text */

    const textBox = document.createElement("div");

    textBox.className = "jabrino-step-text";

    textBox.setAttribute("dir", "rtl");

    if (description) {
      const paragraph = document.createElement("p");

      paragraph.className = "jabrino-step-description";

      paragraph.textContent = description;

      textBox.appendChild(paragraph);
    } else {
      const empty = document.createElement("div");

      empty.className = "jabrino-step-empty";

      empty.textContent = "—";

      textBox.appendChild(empty);
    }

    /* Math */

    const mathBox = document.createElement("div");

    mathBox.className = "jabrino-step-math";

    mathBox.setAttribute("dir", "ltr");

    const from = step?.from || "";

    const to = step?.to || "";

    const shown = step?.value || step?.meta?.preview || "";

    if (from || to) {
      if (from) {
        const row = document.createElement("div");

        row.className = "jabrino-math-row";

        row.appendChild(createMathScrollArea(from));

        mathBox.appendChild(row);
      }

      if (to) {
        const row = document.createElement("div");

        row.className = "jabrino-math-row";

        row.appendChild(createMathScrollArea(to));

        mathBox.appendChild(row);
      }
    } else if (shown) {
      const row = document.createElement("div");

      row.className = "jabrino-math-row";

      row.appendChild(createMathScrollArea(shown));

      mathBox.appendChild(row);
    } else {
      const empty = document.createElement("div");

      empty.className = "jabrino-step-empty";

      empty.textContent = "—";

      mathBox.appendChild(empty);
    }

    body.appendChild(textBox);

    body.appendChild(mathBox);

    card.appendChild(header);

    card.appendChild(body);

    return card;
  }

  /* =========================================
       FEEDBACK
    ========================================= */

  function getFeedbackIcon(type) {
    switch (type) {
      case "success":
        return "✓";

      case "warning":
        return "!";

      case "error":
        return "×";

      case "info":
        return "i";

      default:
        return "";
    }
  }

  function setFeedback(type = "", message = "") {
    selfFeedback.className = "self-solve-feedback";

    selfFeedback.innerHTML = "";

    if (!message) {
      selfFeedback.hidden = true;

      return;
    }

    selfFeedback.hidden = false;

    if (type) {
      selfFeedback.classList.add(`is-${type}`);
    }

    const icon = document.createElement("span");

    icon.className = "self-solve-feedback-icon";

    icon.textContent = getFeedbackIcon(type);

    icon.setAttribute("aria-hidden", "true");

    const text = document.createElement("div");

    text.className = "self-solve-feedback-text";

    text.textContent = message;

    selfFeedback.appendChild(icon);

    selfFeedback.appendChild(text);
  }

  /* =========================================
       ANIMATIONS
    ========================================= */

  function triggerWrongAnimation() {
    selfAnswerArea.classList.remove("is-wrong");

    void selfAnswerArea.offsetWidth;

    selfAnswerArea.classList.add("is-wrong");

    window.setTimeout(() => {
      selfAnswerArea.classList.remove("is-wrong");
    }, 420);
  }

  function triggerSuccessAnimation() {
    selfAnswerArea.classList.add("is-correct");

    createConfetti();
  }

  function clearAnswerAnimations() {
    selfAnswerArea.classList.remove("is-wrong", "is-correct");

    selfAnswerArea.querySelector(".self-confetti-layer")?.remove();
  }

  /* =========================================
       CONFETTI
    ========================================= */

  function createConfetti() {
    selfAnswerArea.querySelector(".self-confetti-layer")?.remove();

    const layer = document.createElement("div");

    layer.className = "self-confetti-layer";

    const totalPieces = 18;

    for (let index = 0; index < totalPieces; index += 1) {
      const piece = document.createElement("span");

      piece.className = "self-confetti-piece";

      const startX = 20 + Math.random() * 60;

      const x = -100 + Math.random() * 200;

      const y = -50 - Math.random() * 100;

      const rotation = -220 + Math.random() * 440;

      piece.style.left = `${startX}%`;

      piece.style.setProperty("--confetti-x", `${x}px`);

      piece.style.setProperty("--confetti-y", `${y}px`);

      piece.style.setProperty("--confetti-r", `${rotation}deg`);

      piece.style.animationDelay = `${Math.random() * 120}ms`;

      layer.appendChild(piece);
    }

    selfAnswerArea.appendChild(layer);

    window.setTimeout(() => {
      layer.remove();
    }, 1250);
  }

  /* =========================================
       RESET
    ========================================= */

  function resetSelfSolveAttempt({ keepProblem = true } = {}) {
    attemptCount = 0;

    problemStarted = false;

    answerWasCorrect = false;

    expectedAnswer = "";

    hiddenSteps = [];

    currentProblemLinear = "";

    currentAttemptId = null;

    if (!keepProblem) {
      currentProblemLatex = "";

      if (typeof problemMathField.setValue === "function") {
        problemMathField.setValue("", {
          insertionMode: "replaceAll",
        });
      } else {
        problemMathField.value = "";
      }
    }

    answerEditor.setValue("");

    selfAnswerArea.hidden = true;

    selfRetryBtn.hidden = true;

    selfShowSolutionBtn.hidden = true;

    selfSolution.hidden = true;

    selfSolution.innerHTML = "";

    selfCheckBtn.disabled = false;

    selfStartBtn.disabled = false;

    selfShowSolutionBtn.textContent = "مشاهده راه‌حل جبرینو";

    selfProblemStatus.textContent =
      "صورت سؤال را در کادر بالا وارد کن و سپس «شروع حل» را بزن.";

    clearAnswerAnimations();

    updateAttemptCounter();

    updateProgress(1);

    setFeedback();
  }

  /* =========================================
       MODE
    ========================================= */

  function setMode(mode) {
    currentMode = mode === "self" ? "self" : "jabrino";

    modeButtons.forEach((button) => {
      const active = button.dataset.jabrinoMode === currentMode;

      button.classList.toggle("is-active", active);

      button.setAttribute("aria-selected", active ? "true" : "false");
    });

    clearNormalOutput();

    if (currentMode === "self") {
      normalSolveButton.hidden = true;

      selfSolvePanel.hidden = false;

      resetSelfSolveAttempt({
        keepProblem: true,
      });

      return;
    }

    normalSolveButton.hidden = false;

    selfSolvePanel.hidden = true;

    resetSelfSolveAttempt({
      keepProblem: true,
    });
  }

  /* =========================================
       START
    ========================================= */

  function startSelfSolve() {
    clearNormalOutput();

    clearAnswerAnimations();

    setFeedback();

    const rawLatex = String(problemMathField.value || "").trim();

    if (!rawLatex) {
      setFeedback("error", "اول صورت سؤال را در کادر بالا وارد کن.");

      return;
    }

    try {
      if (typeof MathAdapter.resetVariableColorRegistry === "function") {
        MathAdapter.resetVariableColorRegistry();
      }

      const expr = prepareMathInput(rawLatex);

      const stepsForProblem = [];

      const result = expr.includes("=")
        ? solveEquation(expr, stepsForProblem)
        : simplify(expr, stepsForProblem);

      if (!result) {
        throw new Error("جبرینو نتوانست پاسخ نهایی این سؤال را محاسبه کند.");
      }

      currentProblemLatex = rawLatex;

      currentProblemLinear = expr;

      expectedAnswer = result;

      hiddenSteps = stepsForProblem;

      attemptCount = 0;

      answerWasCorrect = false;

      problemStarted = true;

      currentAttemptId = null;

      answerEditor.setValue("");

      selfAnswerArea.hidden = false;

      selfRetryBtn.hidden = true;

      selfShowSolutionBtn.hidden = true;

      selfSolution.hidden = true;

      selfSolution.innerHTML = "";

      selfCheckBtn.disabled = false;

      selfProblemStatus.textContent =
        "سؤال آماده است؛ حالا خودت حل کن و پاسخ نهایی را وارد کن.";

      updateAttemptCounter();

      updateProgress(2);

      requestAnimationFrame(() => {
        answerEditor.mf?.focus?.();
      });
    } catch (error) {
      setFeedback(
        "error",
        error?.message || "صورت سؤال قابل بررسی نیست. آن را دوباره بررسی کن.",
      );
    }
  }

  /* =========================================
       CHECK ANSWER
    ========================================= */

  function checkUserAnswer() {
    if (!problemStarted || !expectedAnswer) {
      setFeedback("error", "ابتدا روی «شروع حل» بزن.");

      return;
    }

    const rawUserAnswer = answerEditor.getValue();

    if (!rawUserAnswer || !rawUserAnswer.trim()) {
      setFeedback("error", "پاسخت را در کادر «پاسخ من» وارد کن.");

      return;
    }

    try {
      const userAnswerLinear = MathAdapter.latexToLinear(rawUserAnswer);

      const normalizedUserAnswer = normalize(userAnswerLinear);

      const correct = checkAnswer(normalizedUserAnswer, expectedAnswer);

      /*
       * اولین بار که دانش‌آموز واقعاً
       * پاسخ ارسال می‌کند Attempt ساخته می‌شود.
       */
      const attemptId = ensureCurrentAttempt();

      attemptManager.addSubmission(attemptId, {
        answerLatex: rawUserAnswer,

        answerLinear: normalizedUserAnswer,

        isCorrect: correct,
      });

      document.dispatchEvent(new CustomEvent("jabrino:attempts-updated"));

      attemptCount += 1;

      updateAttemptCounter();

      /* =====================================
           CORRECT
        ===================================== */

      if (correct) {
        answerWasCorrect = true;

        const firstTry = attemptCount === 1;

        setFeedback(
          "success",
          firstTry
            ? "آفرین! در همان تلاش اول به پاسخ درست رسیدی."
            : `آفرین! پاسخ درست است؛ در تلاش ${attemptCount} به جواب رسیدی.`,
        );

        triggerSuccessAnimation();

        updateProgress(3);

        selfRetryBtn.hidden = true;

        selfShowSolutionBtn.hidden = false;

        selfShowSolutionBtn.textContent = "مقایسه با راه‌حل جبرینو";

        selfCheckBtn.disabled = true;

        return;
      }

      /* =====================================
           WRONG
        ===================================== */

      answerWasCorrect = false;

      triggerWrongAnimation();

      if (attemptCount === 1) {
        setFeedback(
          "warning",
          "هنوز درست نیست. یک بار دیگر محاسباتت را بررسی کن؛ جبرینو فعلاً جواب را نشان نمی‌دهد.",
        );
      } else {
        setFeedback(
          "warning",
          `این پاسخ هم درست نیست. تا اینجا ${attemptCount} بار تلاش کرده‌ای؛ می‌توانی دوباره امتحان کنی یا راه‌حل جبرینو را ببینی.`,
        );
      }

      selfRetryBtn.hidden = false;

      if (attemptCount >= 2) {
        selfShowSolutionBtn.hidden = false;

        selfShowSolutionBtn.textContent = "مشاهده راه‌حل جبرینو";
      }
    } catch (error) {
      setFeedback(
        "error",
        "پاسخ واردشده قابل بررسی نیست. شکل نوشتن پاسخ را بررسی کن.",
      );
    }
  }

  /* =========================================
       RETRY
    ========================================= */

  function retryAnswer() {
    if (!problemStarted) {
      return;
    }

    clearAnswerAnimations();

    answerEditor.setValue("");

    selfRetryBtn.hidden = true;

    selfCheckBtn.disabled = false;

    setFeedback("info", "یک بار دیگر امتحان کن؛ پاسخ صحیح هنوز مخفی است.");

    requestAnimationFrame(() => {
      answerEditor.mf?.focus?.();
    });
  }

  /* =========================================
       SOLUTION STEPS
    ========================================= */

  function renderSolutionSteps() {
    const fragment = document.createDocumentFragment();

    if (!hiddenSteps.length) {
      const note = document.createElement("p");

      note.className = "self-solve-solution-note";

      note.textContent = "برای این سؤال مرحله آموزشی جداگانه‌ای ثبت نشده است.";

      fragment.appendChild(note);

      return fragment;
    }

    const heading = document.createElement("div");

    heading.className = "self-solve-solution-heading";

    heading.textContent = "مراحل حل جبرینو";

    const stepsContainer = document.createElement("div");

    stepsContainer.className = "steps-container";

    hiddenSteps.forEach((step, index) => {
      stepsContainer.appendChild(createStepCard(step, index));
    });

    fragment.appendChild(heading);

    fragment.appendChild(stepsContainer);

    return fragment;
  }

  /* =========================================
       SOLUTION SUMMARY
    ========================================= */

  function createSolutionSummary() {
    const wrapper = document.createElement("div");

    wrapper.className = "self-solution-summary";

    const main = document.createElement("div");

    main.className = "self-solution-summary-main";

    const eyebrow = document.createElement("span");

    eyebrow.className = "self-solution-eyebrow";

    eyebrow.textContent = answerWasCorrect
      ? "برای مقایسه روش‌ها"
      : "راه‌حل آموزشی";

    const title = document.createElement("h3");

    title.className = "self-solution-summary-title";

    title.textContent = answerWasCorrect ? "روش حل جبرینو" : "راه‌حل جبرینو";

    const icon = document.createElement("div");

    icon.className = "self-solution-summary-icon";

    icon.textContent = "∑";

    icon.setAttribute("aria-hidden", "true");

    main.appendChild(eyebrow);

    main.appendChild(title);

    wrapper.appendChild(main);

    wrapper.appendChild(icon);

    return wrapper;
  }

  /* =========================================
       SHOW SOLUTION
    ========================================= */

  function showSolution() {
    if (!problemStarted || !expectedAnswer) {
      return;
    }

    /*
     * اگر Attempt وجود دارد، ثبت می‌کنیم
     * که دانش‌آموز راه‌حل را دیده است.
     */
    const attemptId = ensureCurrentAttempt();

    attemptManager.markSolutionViewed(attemptId);

    document.dispatchEvent(new CustomEvent("jabrino:attempts-updated"));

    selfSolution.innerHTML = "";

    selfSolution.hidden = false;

    updateProgress(3);

    selfSolution.appendChild(createSolutionSummary());

    /* Final answer */

    const answerHeading = document.createElement("div");

    answerHeading.className = "self-solve-solution-heading";

    answerHeading.textContent = "پاسخ نهایی";

    const answerBox = document.createElement("div");

    answerBox.className = "self-solve-correct-answer";

    answerBox.appendChild(
      createReadonlyMathField(
        linearToLatexSafe(expectedAnswer),
        "self-solve-readonly-math",
      ),
    );

    selfSolution.appendChild(answerHeading);

    selfSolution.appendChild(answerBox);

    /* Steps */

    selfSolution.appendChild(renderSolutionSteps());

    /* Footer */

    if (hiddenSteps.length > 0) {
      const note = document.createElement("p");

      note.className = "self-solve-solution-note";

      note.textContent = answerWasCorrect
        ? `این راه‌حل ${hiddenSteps.length} گام دارد؛ آن را با روش خودت مقایسه کن و ببین در کدام بخش روش‌ها متفاوت‌اند.`
        : `این راه‌حل ${hiddenSteps.length} گام دارد؛ هر مرحله را جداگانه بررسی کن و بعد دوباره سؤال را بدون دیدن راه‌حل حل کن.`;

      selfSolution.appendChild(note);
    }

    selfShowSolutionBtn.hidden = true;

    requestAnimationFrame(() => {
      selfSolution.scrollIntoView({
        behavior: "smooth",

        block: "nearest",
      });
    });
  }

  /* =========================================
       NEW PROBLEM
    ========================================= */

  function newProblem() {
    resetSelfSolveAttempt({
      keepProblem: false,
    });

    clearNormalOutput();

    requestAnimationFrame(() => {
      problemMathField.focus?.();
    });
  }

  /* =========================================
       EVENTS
    ========================================= */

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setMode(button.dataset.jabrinoMode);
    });
  });

  selfStartBtn.addEventListener("click", startSelfSolve);

  selfCheckBtn.addEventListener("click", checkUserAnswer);

  selfRetryBtn.addEventListener("click", retryAnswer);

  selfShowSolutionBtn.addEventListener("click", showSolution);

  selfNewProblemBtn.addEventListener("click", newProblem);

  answerEditor.onEnter(checkUserAnswer);

  /* =========================================
   OPEN SELF MODE FROM DASHBOARD
========================================= */

  document.addEventListener("jabrino:open-self-mode", () => {
    setMode("self");

    requestAnimationFrame(() => {
      problemMathField.focus?.();
    });
  });

  /* =========================================
   RETRY OLD ATTEMPT
========================================= */

  document.addEventListener("jabrino:retry-attempt", (event) => {
    const problemLatex = String(event.detail?.problemLatex || "").trim();

    if (!problemLatex) {
      return;
    }

    /*
     * وارد حالت Self Solve می‌شویم.
     */
    setMode("self");

    /*
     * سؤال قبلی را داخل MathLive
     * قرار می‌دهیم.
     */
    if (typeof problemMathField.setValue === "function") {
      problemMathField.setValue(problemLatex, {
        insertionMode: "replaceAll",
      });
    } else {
      problemMathField.value = problemLatex;
    }

    /*
     * یک فریم صبر می‌کنیم تا UI
     * کاملاً وارد Self Solve شود،
     * سپس تمرین را شروع می‌کنیم.
     */
    requestAnimationFrame(() => {
      startSelfSolve();
    });
  });
  /* =========================================
   ENTER ON MAIN PROBLEM INPUT
========================================= */

  document.addEventListener("jabrino:self-solve-enter", () => {
    /*
     * فقط وقتی واقعاً در حالت
     * «خودم حل می‌کنم» هستیم اجرا شود.
     */

    if (currentMode !== "self") {
      return;
    }

    /*
     * اگر هنوز سؤال شروع نشده،
     * Enter دقیقاً معادل دکمه «شروع حل» است.
     */

    if (!problemStarted) {
      startSelfSolve();

      return;
    }

    /*
     * اگر سؤال قبلاً شروع شده باشد،
     * بهتر است دوباره Start اجرا نشود.
     *
     * کاربر باید پاسخ را در فیلد
     * «پاسخ من» وارد کند.
     */

    answerEditor.mf?.focus?.();
  });

  /* =========================================
       PROBLEM CHANGED
    ========================================= */

  problemMathField.addEventListener("input", () => {
    if (currentMode !== "self" || !problemStarted) {
      return;
    }

    const newValue = String(problemMathField.value || "");

    if (newValue !== currentProblemLatex) {
      resetSelfSolveAttempt({
        keepProblem: true,
      });

      selfProblemStatus.textContent =
        "صورت سؤال تغییر کرد؛ برای شروع دوباره روی «شروع حل» بزن.";
    }
  });

  /* =========================================
       INITIAL
    ========================================= */

  updateProgress(1);

  setMode("jabrino");
});
