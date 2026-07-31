// src/ui/HistoryManager.js

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
    history = history.filter((item) => item.expression !== expression);

    history.unshift({
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      expression: expression,
      result: result,
    });

    if (history.length > 20) {
      history = history.slice(0, 20);
    }
    this.saveHistory(history);
  }

  deleteItem(id) {
    let history = this.getHistory();
    history = history.filter((item) => item.id !== id);
    this.saveHistory(history);
  }

  // متد جدید برای پاک‌سازی کامل تاریخچه
  clearAll() {
    localStorage.removeItem(this.key);
  }
}
