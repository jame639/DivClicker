// 监听来自popup.js的消息（支持异步响应）
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('[DivClicker] 收到消息:', request);
  
  if (!document || !document.body) {
    console.error('[DivClicker] 错误: 未获取到DOM元素');
    sendResponse({ status: 'error', message: 'DOM not ready' });
    return true;
  }
  
  if (request.action === 'findElements') {
    console.log('[DivClicker] 开始查找和处理元素:', request.classNames);
    
    const handleFind = async () => {
      try {
        // 先在初始页面查找目标元素
        const selector = request.classNames.map(className => `.${className}`).join('');
        console.log('[DivClicker] 使用目标选择器:', selector);
        
        let initialElements = document.querySelectorAll(selector);
        console.log('[DivClicker] 初始页面找到目标元素数量:', initialElements.length);
        
        // 点击初始页面的目标元素
        initialElements.forEach((el, index) => {
          console.log(`[DivClicker] 点击初始目标元素 ${index + 1}/${initialElements.length}`);
          el.click();
        });
        
        // 查找class4元素（xch-menu-item）
        const class4Elements = document.querySelectorAll('.xch-menu-item');
        const class4Count = class4Elements.length;
        console.log('[DivClicker] 找到class4元素数量:', class4Count);
        
        let totalTargetElements = [...initialElements];
        
        // 依次点击每个class4元素，然后查找并点击新出现的目标元素
        for (let i = 0; i < class4Elements.length; i++) {
          console.log(`[DivClicker] 点击class4元素 ${i + 1}/${class4Count}`);
          class4Elements[i].click();
          
          // 等待DOM更新
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // 查找新出现的目标元素
          const newElements = document.querySelectorAll(selector);
          console.log('[DivClicker] 点击class4后找到目标元素数量:', newElements.length);
          
          // 点击所有找到的目标元素
          newElements.forEach((el, index) => {
            console.log(`[DivClicker] 点击新出现的目标元素 ${index + 1}/${newElements.length}`);
            el.click();
          });
          
          // 收集所有元素信息（避免重复）
          newElements.forEach(el => {
            if (!totalTargetElements.some(existing => existing === el)) {
              totalTargetElements.push(el);
            }
          });
        }
        
        // 高亮并收集所有元素信息
        const elementInfos = Array.from(totalTargetElements).map((el, index) => {
          el.style.outline = '2px solid #ff4444';
          el.style.outlineOffset = '2px';
          
          return {
            index: index,
            tagName: el.tagName.toLowerCase(),
            className: el.className,
            id: el.id || '',
            text: el.innerText?.substring(0, 50) + (el.innerText?.length > 50 ? '...' : '') || '',
            visible: el.offsetParent !== null
          };
        });
        
        const result = { 
          status: 'success', 
          count: totalTargetElements.length, 
          elements: elementInfos,
          preprocessCount: class4Count
        };
        console.log('[DivClicker] 处理完成:', result);
        sendResponse(result);
      } catch (error) {
        console.error('[DivClicker] 发生错误:', error);
        sendResponse({ status: 'error', message: error.message });
      }
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleFind);
    } else {
      handleFind();
    }
    
    return true;
  }
  
  if (request.action === 'clickElements') {
    console.log('[DivClicker] 开始点击指定元素，indices:', request.indices);
    
    const handleClick = () => {
      try {
        // 清除之前的高亮
        document.querySelectorAll('[style*="outline: 2px solid #ff4444"]').forEach(el => {
          el.style.outline = '';
          el.style.outlineOffset = '';
        });
        
        // 创建CSS选择器
        const selector = request.classNames.map(className => `.${className}`).join('');
        const elements = document.querySelectorAll(selector);
        let clickedCount = 0;
        
        request.indices.forEach(index => {
          if (index < elements.length) {
            console.log(`[DivClicker] 点击元素 ${index}`);
            elements[index].click();
            clickedCount++;
          }
        });
        
        const result = { status: 'success', count: clickedCount };
        console.log('[DivClicker] 点击完成:', result);
        sendResponse(result);
      } catch (error) {
        console.error('[DivClicker] 发生错误:', error);
        sendResponse({ status: 'error', message: error.message });
      }
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleClick);
    } else {
      handleClick();
    }
    
    return true;
  }
  
  if (request.action === 'clearHighlight') {
    // 清除高亮
    document.querySelectorAll('[style*="outline: 2px solid #ff4444"]').forEach(el => {
      el.style.outline = '';
      el.style.outlineOffset = '';
    });
    sendResponse({ status: 'success' });
    return true;
  }
  
  console.log('[DivClicker] 收到未知action:', request.action);
  return true;
});
