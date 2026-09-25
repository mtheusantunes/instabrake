import { labelsArray, defaultOptions } from "../modules/lib.js";

// Saving and loading options from storage
const saveOptions = () => {
  const options = {};

  for (const label of labelsArray) {
    const element = document.getElementById(label);
    if (element !== null) {
      if (element.type === "checkbox") {
        options[label] = element.checked;
      } else if (element.type === "number") {
        options[label] = Math.max(1, parseInt(element.value, 10) || defaultOptions[label] || 1);
      } else {
        options[label] = element.value;
      }
    }
  }

  const onSet = () => {
    const status = document.getElementById("status");
    if (chrome.runtime.lastError) {
      status.textContent = `Unable to save: ${chrome.runtime.lastError.message}`;
      return;
    }
    status.textContent = "Saved automatically";
    const intervalId = setInterval(() => {
      status.textContent = "";
      clearInterval(intervalId);
    }, 2000);
  };

  chrome.storage.sync.set(options, onSet);
};

const restoreOptions = () => {
  chrome.storage.sync.get(labelsArray, (items) => {
    for (const key of labelsArray) {
      const element = document.getElementById(key);
      if (element !== null) {
        const val = items[key] !== undefined ? items[key] : defaultOptions[key];
        if (element.type === "checkbox") {
          element.checked = Boolean(val);
        } else {
          element.value = val !== undefined ? val : "";
        }
      }
    }
  });
};

document.addEventListener("DOMContentLoaded", restoreOptions);

document.querySelectorAll("#options input").forEach((input) => {
  input.addEventListener(input.type === "number" ? "change" : "change", saveOptions);
});

document.querySelectorAll("[data-help-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const help = document.querySelector(button.dataset.helpTarget);
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    help.hidden = expanded;
  });
});

// Managing tab navigation
const tabs = document.querySelectorAll("[data-tab-target]");
const tabContents = document.querySelectorAll("[data-tab-content]");
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = document.querySelector(tab.dataset.tabTarget);
    tabContents.forEach((tabContent) => tabContent.classList.remove("active"));
    tabs.forEach((tab) => tab.classList.remove("active"));

    tab.classList.add("active");
    target.classList.add("active");
  });
});
