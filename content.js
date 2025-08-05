// 监听来自popup.js的消息（支持异步响应）
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('[DivClicker] 收到消息:', request);
  
  // 响应ping消息，用于检测脚本是否已注入
  if (request.action === 'ping') {
    console.log('[DivClicker] 响应ping消息');
    sendResponse({ status: 'pong', ready: true });
    return true;
  }
  
  if (!document || !document.body) {
    console.error('[DivClicker] 错误: 未获取到DOM元素');
    sendResponse({ status: 'error', message: 'DOM not ready' });
    return true;
  }
  
  if (request.action === 'findElements' || request.action === 'clickElements') {
    console.log('[DivClicker] 开始查找和处理元素:', request.classNames);
    
    // 验证classNames参数
    if (!request.classNames || !Array.isArray(request.classNames) || request.classNames.length === 0) {
      console.error('[DivClicker] 错误: classNames参数无效');
      sendResponse({ status: 'error', message: 'Invalid classNames parameter' });
      return true;
    }
    
    const handleFind = async () => {
      try {
        // 先在初始页面查找目标元素
        const selector = request.classNames.map(className => `.${className}`).join('');
        console.log('[DivClicker] 使用目标选择器:', selector);
        
        let initialElements = document.querySelectorAll(selector);
        console.log('[DivClicker] 初始页面找到目标元素数量:', initialElements.length);
        
        // 点击初始页面的目标元素
        let clickedInitial = 0;
        initialElements.forEach((el, index) => {
          try {
            console.log(`[DivClicker] 点击初始目标元素 ${index + 1}/${initialElements.length}`);
            if (el && typeof el.click === 'function') {
              el.click();
              clickedInitial++;
            }
          } catch (e) {
            console.warn(`[DivClicker] 点击初始元素失败 ${index + 1}:`, e);
          }
        });
        
        // 查找class4元素（xch-menu-item）
        const class4Elements = document.querySelectorAll('.xch-menu-item');
        const class4Count = class4Elements.length;
        console.log('[DivClicker] 找到class4元素数量:', class4Count);
        
        let totalTargetElements = [...initialElements];
        let totalClicked = clickedInitial;
        
        // 依次点击每个class4元素，然后查找并点击新出现的目标元素
        for (let i = 0; i < class4Elements.length; i++) {
          try {
            console.log(`[DivClicker] 点击class4元素 ${i + 1}/${class4Count}`);
            if (class4Elements[i] && typeof class4Elements[i].click === 'function') {
              class4Elements[i].click();
            }
            
            // 等待DOM更新
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 查找新出现的目标元素
            const newElements = document.querySelectorAll(selector);
            console.log('[DivClicker] 点击class4后找到目标元素数量:', newElements.length);
            
            // 点击所有找到的目标元素
            let clickedNew = 0;
            newElements.forEach((el, index) => {
              try {
                console.log(`[DivClicker] 点击新出现的目标元素 ${index + 1}/${newElements.length}`);
                if (el && typeof el.click === 'function') {
                  el.click();
                  clickedNew++;
                }
              } catch (e) {
                console.warn(`[DivClicker] 点击新元素失败 ${index + 1}:`, e);
              }
            });
            
            totalClicked += clickedNew;
            
            // 收集所有元素信息（避免重复）
            newElements.forEach(el => {
              if (!totalTargetElements.some(existing => existing === el)) {
                totalTargetElements.push(el);
              }
            });
          } catch (e) {
            console.warn(`[DivClicker] 处理class4元素失败 ${i + 1}:`, e);
          }
        }
        
        // 返回简化结果，只包含计数信息
        const result = { 
          status: 'success', 
          count: totalClicked,
          preprocessCount: class4Count
        };
        console.log('[DivClicker] 处理完成:', result);
        sendResponse(result);
      } catch (error) {
        console.error('[DivClicker] 发生错误:', error);
        sendResponse({ status: 'error', message: error.message });
      }
    };
    
    // 确保DOM已准备好
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleFind);
    } else {
      handleFind();
    }
    
    return true;
  }
  
  if (request.action === 'clearHighlight') {
    // 由于不再使用高亮功能，此操作不需要执行任何内容
    sendResponse({ status: 'success' });
    return true;
  }
  
  console.log('[DivClicker] 收到未知action:', request.action);
  return true;
});
