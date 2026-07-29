export class HistoryManager {
  constructor(key = "jabrino_calculations_history") {
    this.key = key;
  }

  getHistory() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || [];
    } catch (e) {
      return [];
    }
  }

  saveHistory(history) {
    localStorage.setItem(this.key, JSON.stringify(history));
  }

  addToHistory(expression, result) {
    let history = this.getHistory();
    history = history.filter(item => item.expression !== expression);

    history.unshift({
      id: Date.now() + Math.random().toString(36).substr(2, 5),
      expression: expression,
      result: result
    });

    if (history.length > 20) {
      history = history.slice(0, 20);
    }
    this.saveHistory(history);
  }

  deleteItem(id) {
    let history = this.getHistory();
    history = history.filter(item => item.id !== id);
    this.saveHistory(history);
  }
}
