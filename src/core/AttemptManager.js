// src/core/AttemptManager.js

export class AttemptManager {
  constructor(key = "jabrino_self_solve_attempts", maxItems = 200) {
    this.key = key;
    this.maxItems = maxItems;
  }

  /* =========================================
     ID
  ========================================= */

  createId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-` + Math.random().toString(36).slice(2, 10);
  }

  /* =========================================
     STORAGE
  ========================================= */

  getAttempts() {
    try {
      const raw = localStorage.getItem(this.key);

      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Could not read self-solve attempts:", error);

      return [];
    }
  }

  saveAttempts(attempts) {
    try {
      const cleanAttempts = Array.isArray(attempts)
        ? attempts.slice(0, this.maxItems)
        : [];

      localStorage.setItem(this.key, JSON.stringify(cleanAttempts));

      return true;
    } catch (error) {
      console.warn("Could not save self-solve attempts:", error);

      return false;
    }
  }

  /* =========================================
     CREATE ATTEMPT
  ========================================= */

  createAttempt({
    problemLatex = "",
    problemLinear = "",
    correctAnswer = "",
    problemType = "expression",
    skills = [],
  } = {}) {
    const now = new Date().toISOString();

    const attempt = {
      id: this.createId(),

      problem: {
        latex: String(problemLatex || ""),

        linear: String(problemLinear || ""),

        type: problemType === "equation" ? "equation" : "expression",
      },

      correctAnswer: String(correctAnswer || ""),

      skills: [
        ...new Set(
          (Array.isArray(skills) ? skills : []).filter(Boolean).map(String),
        ),
      ],

      submissions: [],

      firstTryCorrect: null,

      eventuallyCorrect: false,

      solutionViewed: false,

      status: "in_progress",

      createdAt: now,

      updatedAt: now,

      completedAt: null,
    };

    const attempts = this.getAttempts();

    attempts.unshift(attempt);

    this.saveAttempts(attempts);

    return attempt;
  }

  /* =========================================
     GET ONE ATTEMPT
  ========================================= */

  getAttempt(id) {
    if (!id) {
      return null;
    }

    return this.getAttempts().find((attempt) => attempt.id === id) || null;
  }

  /* =========================================
     UPDATE HELPER
  ========================================= */

  updateAttempt(id, updater) {
    if (!id || typeof updater !== "function") {
      return null;
    }

    const attempts = this.getAttempts();

    const index = attempts.findIndex((attempt) => attempt.id === id);

    if (index === -1) {
      return null;
    }

    const current = attempts[index];

    const updated = updater({
      ...current,

      problem: {
        ...(current.problem || {}),
      },

      submissions: [...(current.submissions || [])],

      skills: [...(current.skills || [])],
    });

    if (!updated) {
      return null;
    }

    updated.updatedAt = new Date().toISOString();

    attempts[index] = updated;

    this.saveAttempts(attempts);

    return updated;
  }

  /* =========================================
     SUBMISSION
  ========================================= */

  addSubmission(
    attemptId,
    { answerLatex = "", answerLinear = "", isCorrect = false } = {},
  ) {
    return this.updateAttempt(attemptId, (attempt) => {
      const now = new Date().toISOString();

      const attemptNumber = attempt.submissions.length + 1;

      attempt.submissions.push({
        attemptNumber,

        answerLatex: String(answerLatex || ""),

        answerLinear: String(answerLinear || ""),

        isCorrect: Boolean(isCorrect),

        submittedAt: now,
      });

      /*
       * فقط اولین Submission تعیین می‌کند
       * First Try Correct بوده یا نه.
       */
      if (attempt.firstTryCorrect === null) {
        attempt.firstTryCorrect = Boolean(isCorrect);
      }

      if (isCorrect) {
        attempt.eventuallyCorrect = true;

        attempt.status = "solved";

        attempt.completedAt = now;
      }

      return attempt;
    });
  }

  /* =========================================
     SOLUTION VIEWED
  ========================================= */

  markSolutionViewed(attemptId) {
    return this.updateAttempt(attemptId, (attempt) => {
      attempt.solutionViewed = true;

      /*
       * اگر قبل از دیدن جواب،
       * خودش حل نکرده باشد،
       * وضعیت را solution_viewed می‌کنیم.
       */
      if (!attempt.eventuallyCorrect) {
        attempt.status = "solution_viewed";

        if (!attempt.completedAt) {
          attempt.completedAt = new Date().toISOString();
        }
      }

      return attempt;
    });
  }

  /* =========================================
     DELETE
  ========================================= */

  deleteAttempt(id) {
    const attempts = this.getAttempts().filter((attempt) => attempt.id !== id);

    this.saveAttempts(attempts);
  }

  /* =========================================
     CLEAR
  ========================================= */

  clearAll() {
    localStorage.removeItem(this.key);
  }

  /* =========================================
     STATISTICS
  ========================================= */

  getStats() {
    const attempts = this.getAttempts();

    const attempted = attempts.filter(
      (attempt) =>
        Array.isArray(attempt.submissions) && attempt.submissions.length > 0,
    );

    const total = attempted.length;

    const firstTryCorrect = attempted.filter(
      (attempt) => attempt.firstTryCorrect === true,
    ).length;

    const eventuallyCorrect = attempted.filter(
      (attempt) => attempt.eventuallyCorrect === true,
    ).length;

    const solutionViewed = attempted.filter(
      (attempt) => attempt.solutionViewed === true,
    ).length;

    const correctedAfterRetry = attempted.filter(
      (attempt) =>
        attempt.firstTryCorrect === false && attempt.eventuallyCorrect === true,
    ).length;

    const needsReview = attempted.filter(
      (attempt) => !attempt.eventuallyCorrect || attempt.solutionViewed,
    ).length;

    return {
      totalAttempts: total,

      firstTryCorrect,

      eventuallyCorrect,

      correctedAfterRetry,

      solutionViewed,

      needsReview,

      firstTryAccuracy:
        total > 0 ? Math.round((firstTryCorrect / total) * 100) : 0,

      eventualAccuracy:
        total > 0 ? Math.round((eventuallyCorrect / total) * 100) : 0,
    };
  }

  /* =========================================
     SKILL STATISTICS
  ========================================= */

  getSkillStats() {
    const attempts = this.getAttempts().filter(
      (attempt) =>
        Array.isArray(attempt.submissions) && attempt.submissions.length > 0,
    );

    const skillMap = new Map();

    attempts.forEach((attempt) => {
      const skills = Array.isArray(attempt.skills) ? attempt.skills : [];

      skills.forEach((skill) => {
        if (!skillMap.has(skill)) {
          skillMap.set(skill, {
            skill,
            attempts: 0,
            firstTryCorrect: 0,
            eventuallyCorrect: 0,
            solutionViewed: 0,
          });
        }

        const stat = skillMap.get(skill);

        stat.attempts += 1;

        if (attempt.firstTryCorrect) {
          stat.firstTryCorrect += 1;
        }

        if (attempt.eventuallyCorrect) {
          stat.eventuallyCorrect += 1;
        }

        if (attempt.solutionViewed) {
          stat.solutionViewed += 1;
        }
      });
    });

    return Array.from(skillMap.values()).map((stat) => ({
      ...stat,

      firstTryAccuracy:
        stat.attempts > 0
          ? Math.round((stat.firstTryCorrect / stat.attempts) * 100)
          : 0,

      eventualAccuracy:
        stat.attempts > 0
          ? Math.round((stat.eventuallyCorrect / stat.attempts) * 100)
          : 0,
    }));
  }
}
