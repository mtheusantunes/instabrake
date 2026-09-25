const FEEDBACK_FORM_URL = "";

chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.setUninstallURL(FEEDBACK_FORM_URL);
});
