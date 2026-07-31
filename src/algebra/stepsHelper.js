// src/algebra/stepsHelper.js

function sanitizeNoIdentityWord(s) {
  return String(s || "").replace(/اتحاد/g, "الگوی جبری");
}

function sanitizePayload(payload = {}) {
  return {
    ...payload,
    title: sanitizeNoIdentityWord(payload.title),
    description: sanitizeNoIdentityWord(payload.description),
    value: sanitizeNoIdentityWord(payload.value),
    from: sanitizeNoIdentityWord(payload.from),
    to: sanitizeNoIdentityWord(payload.to),
  };
}

export function addInfoStep(steps, payload = {}) {
  const p = sanitizePayload(payload);
  steps.push({
    type: "info",
    title: p.title || "",
    description: p.description || "",
    value: p.value || "",
    from: p.from || "",
    to: p.to || "",
    meta: p.meta || {},
    kind: p.kind, // اختیاری، ولی نگهش می‌داریم
  });
}

export function addTransformStep(steps, payload = {}) {
  const p = sanitizePayload(payload);
  steps.push({
    type: "transform",
    title: p.title || "",
    description: p.description || "",
    value: p.value || "",
    from: p.from || "",
    to: p.to || "",
    meta: p.meta || {},
    kind: p.kind,
  });
}

export function addSolutionStep(steps, payload = {}) {
  const p = sanitizePayload(payload);
  steps.push({
    type: "solution",
    title: p.title || "نتیجه نهایی",
    description: p.description || "",
    value: p.value || "",
    from: p.from || "",
    to: p.to || "",
    meta: p.meta || {},
    kind: p.kind,
  });
}
