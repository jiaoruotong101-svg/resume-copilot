// src/background.ts
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => console.warn("\u65E0\u6CD5\u521D\u59CB\u5316\u4FA7\u8FB9\u680F\uFF0C\u8BF7\u91CD\u65B0\u52A0\u8F7D\u6269\u5C55"));
chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
});
