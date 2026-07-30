// src/algebra/stepsHelper.js

export function addInfoStep(steps, payload = {}) {
  steps.push({
    type: "info",
    title: payload.title || "",
    description: payload.description || "",
    value: payload.value || "",
    from: payload.from || "",
    to: payload.to || "",
    meta: payload.meta || {},
  });
}

export function addTransformStep(steps, payload = {}) {
  steps.push({
    type: "transform",
    title: payload.title || "",
    description: payload.description || "",
    value: payload.value || "",
    from: payload.from || "",
    to: payload.to || "",
    meta: payload.meta || {},
  });
}

export function addSolutionStep(steps, payload = {}) {
  steps.push({
    type: "solution",
    title: payload.title || "نتیجه نهایی",
    description: payload.description || "",
    value: payload.value || "",
    from: payload.from || "",
    to: payload.to || "",
    meta: payload.meta || {},
  });
}
