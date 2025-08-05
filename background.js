// Chrome扩展程序安装时的处理
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    console.log('[WebPluck] 扩展程序已安装');
  } else if (details.reason === 'update') {
    console.log('[WebPluck] 扩展程序已更新');
  }
});

// 监听来自popup.js的消息（虽然当前不处理，但保留结构）
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('[WebPluck] Background收到消息:', request);
  // 如果需要后台处理逻辑，可以在这里添加
  return true;
});