chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(()=>console.warn('无法初始化侧边栏，请重新加载扩展'));
chrome.runtime.onInstalled.addListener(()=>{
  void chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
});
