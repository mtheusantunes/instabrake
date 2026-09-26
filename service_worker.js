const FEEDBACK_FORM_URL = "https://tally.so/r/yPLpb8";

chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.setUninstallURL(FEEDBACK_FORM_URL);
});
