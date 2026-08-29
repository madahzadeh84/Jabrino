// src/ui/PerformanceDashboard.js

import MathAdapter from "./MathAdapter.js";

/* =========================================================
   SKILL LABELS
========================================================= */

const SKILL_LABELS = {
  normalize: "آماده‌سازی عبارت",

  rewrite: "بازنویسی عبارت",

  identity: "اتحادهای جبری",

  "calculate-products": "محاسبه ضرب‌ها",

  "combine-numeric-radicals": "ترکیب رادیکال‌ها",

  "separate-perfect-square": "استخراج مربع کامل",

  "simplify-radical": "ساده‌سازی رادیکال",

  "combine-like-terms": "جمع جملات هم‌نوع",

  "simplify-both-sides": "ساده‌سازی دو طرف معادله",

  "move-variable-and-constants": "انتقال جملات در معادله",

  "simplify-after-moving": "ساده‌سازی پس از انتقال",

  "divide-by-variable-coefficient": "تقسیم بر ضریب مجهول",
};

/* =========================================================
   PUBLIC INITIALIZER
========================================================= */

export function initPerformanceDashboard({ attemptManager } = {}) {
  if (!attemptManager) {
    console.warn("Performance Dashboard requires AttemptManager.");

    return null;
  }

  /* =======================================================
     CSS
  ======================================================= */

  ensureDashboardStyles();

  /* =======================================================
     BUTTON
  ======================================================= */

  const button = createDashboardButton();

  /* =======================================================
     MODAL
  ======================================================= */

  const { modal, content, closeButton } = createDashboardModal();

  /* =======================================================
     OPEN
  ======================================================= */

  function openDashboard() {
    renderDashboard(content, attemptManager, closeDashboard);

    modal.classList.add("show");

    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("performance-modal-open");
  }

  /* =======================================================
     CLOSE
  ======================================================= */

  function closeDashboard() {
    modal.classList.remove("show");

    modal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("performance-modal-open");
  }

  /* =======================================================
     EVENTS
  ======================================================= */

  button.addEventListener("click", openDashboard);

  closeButton.addEventListener("click", closeDashboard);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeDashboard();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("show")) {
      closeDashboard();
    }
  });

  /*
   * اگر داده جدیدی در آینده ثبت شد،
   * می‌توانیم این Event را Dispatch کنیم
   * تا Dashboard باز Refresh شود.
   */

  document.addEventListener("jabrino:attempts-updated", () => {
    if (modal.classList.contains("show")) {
      renderDashboard(content, attemptManager, closeDashboard);
    }
  });

  return {
    openDashboard,
    closeDashboard,
  };
}

/* =========================================================
   CSS LOADER
========================================================= */

function ensureDashboardStyles() {
  const id = "jabrino-performance-dashboard-css";

  if (document.getElementById(id)) {
    return;
  }

  const link = document.createElement("link");

  link.id = id;

  link.rel = "stylesheet";

  link.href = "./assets/styles/performanceDashboard.css";

  document.head.appendChild(link);
}

/* =========================================================
   BUTTON
========================================================= */

function createDashboardButton() {
  const existing = document.getElementById("performanceBtn");

  if (existing) {
    return existing;
  }

  const container = document.querySelector(".container");

  const button = document.createElement("button");

  button.id = "performanceBtn";

  button.type = "button";

  button.className = "performance-floating-btn";

  button.setAttribute("aria-label", "مشاهده عملکرد من");

  button.innerHTML = `
    <span class="performance-btn-icon">
      ◔
    </span>

    <span>
      عملکرد من
    </span>
  `;

  const modeSwitch = document.querySelector(".jabrino-mode-switch");

  if (modeSwitch) {
    modeSwitch.insertAdjacentElement("beforebegin", button);
  } else if (container) {
    container.appendChild(button);
  } else {
    document.body.appendChild(button);
  }
  return button;
}

/* =========================================================
   MODAL
========================================================= */

function createDashboardModal() {
  const existing = document.getElementById("performanceModal");

  if (existing) {
    return {
      modal: existing,

      content: existing.querySelector("#performanceDashboardContent"),

      closeButton: existing.querySelector("#closePerformanceDashboard"),
    };
  }

  const modal = document.createElement("div");

  modal.id = "performanceModal";

  modal.className = "modal performance-modal";

  modal.setAttribute("aria-hidden", "true");

  modal.innerHTML = `
    <div
      class="modal-content performance-modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="performanceDashboardTitle"
    >

      <button
        id="closePerformanceDashboard"
        class="close-btn performance-close-btn"
        type="button"
        aria-label="بستن عملکرد من"
      >
        <span>✕</span>
      </button>

      <div
        id="performanceDashboardContent"
      ></div>

    </div>
  `;

  document.body.appendChild(modal);

  return {
    modal,

    content: modal.querySelector("#performanceDashboardContent"),

    closeButton: modal.querySelector("#closePerformanceDashboard"),
  };
}

/* =========================================================
   RENDER
========================================================= */

function renderDashboard(container, attemptManager, closeDashboard) {
  if (!container) {
    return;
  }

  const attempts = attemptManager.getAttempts();

  const usableAttempts = attempts.filter(
    (attempt) =>
      Array.isArray(attempt.submissions) && attempt.submissions.length > 0,
  );

  const stats = attemptManager.getStats();

  const skillStats = attemptManager.getSkillStats();

  container.innerHTML = "";

  /* =======================================================
     HEADER
  ======================================================= */

  container.appendChild(createDashboardHeader(stats));

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  if (usableAttempts.length === 0) {
    container.appendChild(createEmptyState(closeDashboard));

    return;
  }

  /* =======================================================
     KPI
  ======================================================= */

  container.appendChild(createStatsGrid(stats));

  /* =======================================================
     INSIGHT
  ======================================================= */

  container.appendChild(createInsightBox(stats));

  /* =======================================================
     REVIEW
  ======================================================= */

  const reviewAttempts = usableAttempts.filter(
    (attempt) =>
      !attempt.eventuallyCorrect ||
      attempt.solutionViewed ||
      attempt.firstTryCorrect === false,
  );

  container.appendChild(
    createAttemptsSection({
      title: "نیاز به مرور",

      description:
        "تمرین‌هایی که در تلاش اول اشتباه بوده‌اند، راه‌حلشان را دیده‌ای یا هنوز کامل حل نشده‌اند.",

      attempts: reviewAttempts.slice(0, 6),

      emptyMessage: "فعلاً تمرینی برای مرور نداری.",

      variant: "review",

      closeDashboard,
    }),
  );

  /* =======================================================
     SKILLS
  ======================================================= */

  container.appendChild(createSkillsSection(skillStats));

  /* =======================================================
     RECENT
  ======================================================= */

  container.appendChild(
    createAttemptsSection({
      title: "تمرین‌های اخیر",

      description:
        "آخرین تمرین‌هایی که در حالت «خودم حل می‌کنم» انجام داده‌ای.",

      attempts: usableAttempts.slice(0, 8),

      emptyMessage: "هنوز تمرینی ثبت نشده است.",

      variant: "recent",

      closeDashboard,
    }),
  );
}

/* =========================================================
   HEADER
========================================================= */

function createDashboardHeader(stats) {
  const header = document.createElement("header");

  header.className = "performance-dashboard-header";

  header.innerHTML = `
    <div class="performance-dashboard-heading">

      <span
        class="performance-dashboard-eyebrow"
      >
        مسیر یادگیری من
      </span>

      <h2
        id="performanceDashboardTitle"
      >
        عملکرد من
      </h2>

      <p>
        اینجا فقط نتیجه مهم نیست؛
        جبرینو روند تلاش و یادگیریت را هم دنبال می‌کند.
      </p>

    </div>

    <div
      class="performance-dashboard-score"
      aria-label="دقت تلاش اول"
    >
      <strong>
        ${toPersianNumber(stats.firstTryAccuracy)}٪
      </strong>

      <span>
        دقت تلاش اول
      </span>
    </div>
  `;

  return header;
}

/* =========================================================
   KPI GRID
========================================================= */

function createStatsGrid(stats) {
  const grid = document.createElement("section");

  grid.className = "performance-stats-grid";

  const items = [
    {
      value: stats.totalAttempts,

      title: "تمرین انجام‌شده",

      subtitle: "تعداد تمرین‌های ثبت‌شده",

      type: "neutral",

      icon: "∑",
    },

    {
      value: `${stats.firstTryAccuracy}%`,

      title: "درست در تلاش اول",

      subtitle: `${stats.firstTryCorrect} تمرین`,

      type: "success",

      icon: "✓",
    },

    {
      value: stats.correctedAfterRetry,

      title: "اصلاح بعد از اشتباه",

      subtitle: "اشتباه‌هایی که خودت اصلاح کردی",

      type: "blue",

      icon: "↻",
    },

    {
      value: stats.needsReview,

      title: "نیاز به مرور",

      subtitle: "برای تمرین دوباره",

      type: stats.needsReview > 0 ? "warning" : "success",

      icon: "!",
    },
  ];

  items.forEach((item) => {
    const card = document.createElement("article");

    card.className = `performance-stat-card is-${item.type}`;

    card.innerHTML = `
        <div
          class="performance-stat-icon"
          aria-hidden="true"
        >
          ${item.icon}
        </div>

        <div
          class="performance-stat-content"
        >
          <strong>
            ${formatValue(item.value)}
          </strong>

          <span
            class="performance-stat-title"
          >
            ${item.title}
          </span>

          <small>
            ${formatValue(item.subtitle)}
          </small>
        </div>
      `;

    grid.appendChild(card);
  });

  return grid;
}

/* =========================================================
   INSIGHT
========================================================= */

function createInsightBox(stats) {
  const box = document.createElement("section");

  box.className = "performance-insight";

  let icon = "★";

  let title = "شروع خوبی است";

  let message =
    "با انجام تمرین‌های بیشتر، جبرینو تصویر دقیق‌تری از نقاط قوت و بخش‌های نیازمند تمرین به تو نشان می‌دهد.";

  if (stats.totalAttempts >= 3 && stats.firstTryAccuracy >= 80) {
    icon = "✓";

    title = "عملکرد خیلی خوب";

    message =
      "بیشتر سؤال‌ها را در همان تلاش اول درست حل کرده‌ای. برای پیشرفت بیشتر، تمرین‌های سخت‌تر و متنوع‌تر انجام بده.";
  } else if (stats.correctedAfterRetry > 0) {
    icon = "↻";

    title = "اشتباه‌ها را اصلاح می‌کنی";

    message = `تا الان ${toPersianNumber(
      stats.correctedAfterRetry,
    )} اشتباه را بدون رها کردن تمرین اصلاح کرده‌ای؛ این یکی از مهم‌ترین نشانه‌های یادگیری فعال است.`;
  } else if (stats.needsReview > 0) {
    icon = "◎";

    title = "چند تمرین ارزش مرور دارند";

    message =
      "پایین همین صفحه تمرین‌هایی را که بهتر است دوباره حل کنی جدا کرده‌ایم.";
  }

  box.innerHTML = `
    <span
      class="performance-insight-icon"
      aria-hidden="true"
    >
      ${icon}
    </span>

    <div>
      <strong>
        ${title}
      </strong>

      <p>
        ${message}
      </p>
    </div>
  `;

  return box;
}

/* =========================================================
   ATTEMPTS SECTION
========================================================= */

function createAttemptsSection({
  title,
  description,
  attempts,
  emptyMessage,
  variant,
  closeDashboard,
}) {
  const section = document.createElement("section");

  section.className = `performance-section performance-${variant}-section`;

  const header = document.createElement("div");

  header.className = "performance-section-header";

  header.innerHTML = `
    <div>
      <h3>
        ${title}
      </h3>

      <p>
        ${description}
      </p>
    </div>

    ${
      attempts.length > 0
        ? `
          <span
            class="performance-section-count"
          >
            ${toPersianNumber(attempts.length)}
          </span>
        `
        : ""
    }
  `;

  section.appendChild(header);

  if (attempts.length === 0) {
    const empty = document.createElement("div");

    empty.className = "performance-small-empty";

    empty.textContent = emptyMessage;

    section.appendChild(empty);

    return section;
  }

  const list = document.createElement("div");

  list.className = "performance-attempt-list";

  attempts.forEach((attempt) => {
    list.appendChild(createAttemptCard(attempt, closeDashboard));
  });

  section.appendChild(list);

  return section;
}

/* =========================================================
   ATTEMPT CARD
========================================================= */

function createAttemptCard(attempt, closeDashboard) {
  const card = document.createElement("article");

  card.className = "performance-attempt-card";

  if (attempt.eventuallyCorrect) {
    card.classList.add("is-solved");
  } else {
    card.classList.add("is-unsolved");
  }

  const header = document.createElement("div");

  header.className = "performance-attempt-top";

  const status = createAttemptStatus(attempt);

  const date = document.createElement("span");

  date.className = "performance-attempt-date";

  date.textContent = formatDate(attempt.updatedAt || attempt.createdAt);

  header.appendChild(status);

  header.appendChild(date);

  /* =======================================================
     PROBLEM
  ======================================================= */

  const problemBox = document.createElement("div");

  problemBox.className = "performance-problem-box";

  const mathField = document.createElement("math-field");

  mathField.setAttribute("read-only", "true");

  mathField.setAttribute("dir", "ltr");

  mathField.value = getProblemLatex(attempt);

  problemBox.appendChild(mathField);

  /* =======================================================
     META
  ======================================================= */

  const meta = document.createElement("div");

  meta.className = "performance-attempt-meta";

  const submissionCount = attempt.submissions?.length || 0;

  meta.innerHTML = `
    <span>
      ${toPersianNumber(submissionCount)}
      تلاش
    </span>

    ${
      attempt.firstTryCorrect
        ? `
          <span class="is-positive">
            درست در تلاش اول
          </span>
        `
        : `
          <span>
            نیاز به تلاش دوباره
          </span>
        `
    }

    ${
      attempt.solutionViewed
        ? `
          <span class="is-viewed">
            راه‌حل دیده شده
          </span>
        `
        : ""
    }
  `;

  /* =======================================================
     SKILLS
  ======================================================= */

  const skills = createAttemptSkills(attempt.skills);

  /* =======================================================
     ACTIONS
  ======================================================= */

  const actions = document.createElement("div");

  actions.className = "performance-attempt-actions";

  const retryButton = document.createElement("button");

  retryButton.type = "button";

  retryButton.className = "performance-retry-btn";

  retryButton.textContent = "دوباره حل می‌کنم";

  retryButton.addEventListener("click", () => {
    const problemLatex = attempt.problem?.latex || getProblemLatex(attempt);

    closeDashboard();

    document.dispatchEvent(
      new CustomEvent("jabrino:retry-attempt", {
        detail: {
          attemptId: attempt.id,

          problemLatex,
        },
      }),
    );
  });

  actions.appendChild(retryButton);

  /* =======================================================
     ASSEMBLE
  ======================================================= */

  card.appendChild(header);

  card.appendChild(problemBox);

  card.appendChild(meta);

  if (skills) {
    card.appendChild(skills);
  }

  card.appendChild(actions);

  return card;
}

/* =========================================================
   STATUS
========================================================= */

function createAttemptStatus(attempt) {
  const status = document.createElement("span");

  status.className = "performance-attempt-status";

  if (attempt.firstTryCorrect) {
    status.classList.add("is-first");

    status.textContent = "حل سریع";

    return status;
  }

  if (attempt.eventuallyCorrect) {
    status.classList.add("is-corrected");

    status.textContent = "اصلاح شد";

    return status;
  }

  if (attempt.solutionViewed) {
    status.classList.add("is-review");

    status.textContent = "نیاز به مرور";

    return status;
  }

  status.classList.add("is-progress");

  status.textContent = "در حال تمرین";

  return status;
}

/* =========================================================
   ATTEMPT SKILLS
========================================================= */

function createAttemptSkills(skills) {
  const cleanSkills = Array.isArray(skills)
    ? [...new Set(skills.filter(Boolean))]
    : [];

  if (cleanSkills.length === 0) {
    return null;
  }

  const wrapper = document.createElement("div");

  wrapper.className = "performance-attempt-skills";

  cleanSkills.slice(0, 4).forEach((skill) => {
    const tag = document.createElement("span");

    tag.textContent = getSkillLabel(skill);

    wrapper.appendChild(tag);
  });

  return wrapper;
}

/* =========================================================
   SKILLS SECTION
========================================================= */

function createSkillsSection(skillStats) {
  const section = document.createElement("section");

  section.className = "performance-section performance-skills-section";

  const header = document.createElement("div");

  header.className = "performance-section-header";

  header.innerHTML = `
    <div>
      <h3>
        مهارت‌های من
      </h3>

      <p>
        بر اساس نوع گام‌هایی که در تمرین‌ها دیده‌ای.
      </p>
    </div>
  `;

  section.appendChild(header);

  if (skillStats.length === 0) {
    const empty = document.createElement("div");

    empty.className = "performance-small-empty";

    empty.textContent = "هنوز داده کافی برای تحلیل مهارت‌ها وجود ندارد.";

    section.appendChild(empty);

    return section;
  }

  const sorted = [...skillStats]
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 8);

  const list = document.createElement("div");

  list.className = "performance-skill-list";

  sorted.forEach((skill) => {
    list.appendChild(createSkillRow(skill));
  });

  section.appendChild(list);

  return section;
}

/* =========================================================
   SKILL ROW
========================================================= */

function createSkillRow(skill) {
  const row = document.createElement("div");

  row.className = "performance-skill-row";

  const accuracy = Number(skill.firstTryAccuracy || 0);

  row.innerHTML = `
    <div
      class="performance-skill-heading"
    >
      <span>
        ${getSkillLabel(skill.skill)}
      </span>

      <strong>
        ${toPersianNumber(accuracy)}٪
      </strong>
    </div>

    <div
      class="performance-skill-bar"
      aria-label="دقت تلاش اول ${accuracy} درصد"
    >
      <span
        style="width: ${Math.max(4, accuracy)}%"
      ></span>
    </div>

    <small>
      ${toPersianNumber(skill.attempts)}
      تمرین
    </small>
  `;

  return row;
}

/* =========================================================
   EMPTY STATE
========================================================= */

function createEmptyState(closeDashboard) {
  const section = document.createElement("section");

  section.className = "performance-empty-state";

  section.innerHTML = `
    <div
      class="performance-empty-icon"
      aria-hidden="true"
    >
      ∑
    </div>

    <h3>
      مسیر یادگیریت از اینجا شروع می‌شود
    </h3>

    <p>
      هنوز تمرینی در حالت «خودم حل می‌کنم»
      ثبت نشده است.
      چند تمرین حل کن تا جبرینو بتواند
      روند پیشرفتت را نشان دهد.
    </p>
  `;

  const button = document.createElement("button");

  button.type = "button";

  button.className = "performance-start-btn";

  button.textContent = "شروع یک تمرین";

  button.addEventListener("click", () => {
    closeDashboard();

    document.dispatchEvent(new CustomEvent("jabrino:open-self-mode"));
  });

  section.appendChild(button);

  return section;
}

/* =========================================================
   HELPERS
========================================================= */

function getSkillLabel(skill) {
  return SKILL_LABELS[skill] || skill;
}

function getProblemLatex(attempt) {
  const latex = attempt?.problem?.latex;

  if (latex) {
    return latex;
  }

  const linear = attempt?.problem?.linear || "";

  try {
    return MathAdapter.linearToLatex(linear);
  } catch {
    return linear;
  }
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("fa-IR", {
      month: "short",

      day: "numeric",

      hour: "2-digit",

      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function toPersianNumber(value) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
}

function formatValue(value) {
  return toPersianNumber(value);
}
