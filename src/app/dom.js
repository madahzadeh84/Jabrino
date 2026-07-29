export function getUI() {
  return {
    input: document.getElementById("input"),
    resultDiv: document.getElementById("result"),
    stepsDiv: document.getElementById("steps"),
    errorDiv: document.getElementById("error"),
    stepsBtn: document.getElementById("stepsBtn"),
    solveBtn: document.getElementById("solveBtn"),
    helpBtn: document.getElementById("helpBtn"),
    helpModal: document.getElementById("helpModal"),
    closeHelp: document.getElementById("closeHelp")
  };
}

export function resetUI(ui) {
  ui.stepsDiv.innerHTML = "";
  ui.stepsDiv.style.display = "none";
  ui.stepsBtn.style.display = "none";
  ui.errorDiv.innerHTML = "";
  ui.errorDiv.style.display = "none";
  ui.resultDiv.innerText = "";
}

export function showError(ui, msg) {
  ui.errorDiv.style.display = "block";
  ui.errorDiv.innerText = msg;
}

export function renderResult(ui, result) {
  ui.resultDiv.innerHTML = `<span dir="ltr">${result}</span>`;
}

export function renderSteps(ui, steps) {
  ui.stepsDiv.innerHTML = "";
  steps.forEach(s => {
    const div = document.createElement("div");
    div.className = "step";
    div.innerHTML = `<span dir="ltr">${s}</span>`;
    ui.stepsDiv.appendChild(div);
  });
}

export function toggleSteps(ui) {
  ui.stepsDiv.style.display = ui.stepsDiv.style.display === "none" ? "block" : "none";
}
