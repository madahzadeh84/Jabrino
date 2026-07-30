//src/app/steps.js

export function createStepsStore() {
  let steps = [];
  return {
    reset() { steps = []; },
    push(x) { steps.push(x); },
    all() { return steps.slice(); }
  };
}
