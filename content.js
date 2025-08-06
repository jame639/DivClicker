// 全局变量用于停止操作
let isOperationStopped = false;

// 监听来自popup.js的消息（支持异步响应）
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('[DivClicker] 收到消息:', request);
  
  // 响应ping消息，用于检测脚本是否已注入
  if (request.action === 'ping') {
    console.log('[DivClicker] 响应ping消息');
    sendResponse({ status: 'pong', ready: true });
    return true;
  }
  
  // 停止操作
  if (request.action === 'stopOperation') {
    console.log('[DivClicker] 收到停止操作指令');
    isOperationStopped = true;
    sendResponse({ status: 'success', message: '操作已停止' });
    return true;
  }
  
  if (!document || !document.body) {
    console.error('[DivClicker] 错误: 未获取到DOM元素');
    sendResponse({ status: 'error', message: 'DOM not ready' });
    return true;
  }
  
  if (request.action === 'clickElements' || request.action === 'autoClickElements') {
    console.log('[DivClicker] 开始自动点击操作');
    
    // 重置停止标志
    isOperationStopped = false;
    
    const handleAutoClick = async () => {
      try {
        // 获取页面标题进行模式判断
        const pageTitle = document.title || '';
        console.log('[DivClicker] 页面标题:', pageTitle);
        
        // 确定操作模式
        let mode = 'default';
        let expectedClass4Count = 0;
        
        if (pageTitle.includes('模式1') || pageTitle.includes('模式2')) {
          mode = 'mode1or2';
          expectedClass4Count = 5;
          console.log('[DivClicker] 检测到模式1或模式2');
        } else if (pageTitle.includes('模式3')) {
          mode = 'mode3';
          expectedClass4Count = 8;
          console.log('[DivClicker] 检测到模式3');
        } else if (pageTitle.includes('模式4')) {
          mode = 'mode4';
          expectedClass4Count = 7;
          console.log('[DivClicker] 检测到模式4');
        } else {
          console.log('[DivClicker] 使用默认模式');
        }
        
        // 定义目标选择器（根据CLAUDE.md要求封装）
        const targetSelector = '.class1.class2.class3'; // class="class1 class2 class3"
        const triggerSelector = '.class4'; // class="class4" 
        const ytabSelector = '.y-tab'; // class="y-tab"（模式3专用）
        
        let totalClicked = 0;
        let totalClass4Processed = 0;
        
        // 先点击初始页面的目标元素
        console.log('[DivClicker] 查找初始目标元素...');
        let initialElements = document.querySelectorAll(targetSelector);
        console.log(`[DivClicker] 找到 ${initialElements.length} 个初始目标元素`);
        
        for (let el of initialElements) {
          if (isOperationStopped) break;
          if (el && typeof el.click === 'function') {
            el.click();
            totalClicked++;
            console.log(`[DivClicker] 点击初始目标元素，总计: ${totalClicked}`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // 查找所有class4元素
        const class4Elements = document.querySelectorAll(triggerSelector);
        console.log(`[DivClicker] 找到 ${class4Elements.length} 个class4元素`);
        
        // 根据模式处理class4元素
        const class4ToProcess = Array.from(class4Elements);
        let skipIndices = [];
        
        if (mode === 'mode3' && class4ToProcess.length >= 8) {
          // 模式3：跳过第8个class4
          skipIndices.push(7); // 索引从0开始
        } else if (mode === 'mode4' && class4ToProcess.length >= 7) {
          // 模式4：跳过第7个class4
          skipIndices.push(6);
        }
        
        // 依次处理每个class4元素
        for (let i = 0; i < class4ToProcess.length; i++) {
          if (isOperationStopped) break;
          
          if (skipIndices.includes(i)) {
            console.log(`[DivClicker] 跳过class4元素 ${i + 1}（模式要求）`);
            continue;
          }
          
          try {
            console.log(`[DivClicker] 处理class4元素 ${i + 1}/${class4ToProcess.length}`);
            
            // 点击class4元素
            if (class4ToProcess[i] && typeof class4ToProcess[i].click === 'function') {
              class4ToProcess[i].click();
              totalClass4Processed++;
              
              // 等待DOM加载完成
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              if (isOperationStopped) break;
              
              // 根据模式执行特殊逻辑
              if (mode === 'mode1or2' && i === 1) {
                // 模式1或2：第二个class4点击后只点击第1个目标元素，然后跳过后续class4
                console.log('[DivClicker] 模式1/2特殊处理：只点击第1个目标元素');
                const newElements = document.querySelectorAll(targetSelector);
                if (newElements.length > 0 && newElements[0] && typeof newElements[0].click === 'function') {
                  newElements[0].click();
                  totalClicked++;
                  console.log('[DivClicker] 模式1/2：点击第1个目标元素');
                }
                break; // 跳出循环
              } else if (mode === 'mode3' && i === 0) {
                // 模式3：第一个class4后点击第4、5、6个y-tab元素
                console.log('[DivClicker] 模式3特殊处理：点击y-tab元素');
                const ytabElements = document.querySelectorAll(ytabSelector);
                console.log(`[DivClicker] 找到 ${ytabElements.length} 个y-tab元素`);
                
                for (let tabIndex of [3, 4, 5]) { // 第4、5、6个（索引3、4、5）
                  if (isOperationStopped) break;
                  if (ytabElements[tabIndex] && typeof ytabElements[tabIndex].click === 'function') {
                    console.log(`[DivClicker] 点击y-tab元素 ${tabIndex + 1}`);
                    ytabElements[tabIndex].click();
                    
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    if (isOperationStopped) break;
                    
                    // 点击加载出来的目标元素
                    const tabTargets = document.querySelectorAll(targetSelector);
                    for (let targetEl of tabTargets) {
                      if (isOperationStopped) break;
                      if (targetEl && typeof targetEl.click === 'function') {
                        targetEl.click();
                        totalClicked++;
                        await new Promise(resolve => setTimeout(resolve, 300));
                      }
                    }
                  }
                }
              } else {
                // 普通处理：点击新加载的目标元素
                const newElements = document.querySelectorAll(targetSelector);
                console.log(`[DivClicker] 点击class4后找到 ${newElements.length} 个目标元素`);
                
                for (let el of newElements) {
                  if (isOperationStopped) break;
                  if (el && typeof el.click === 'function') {
                    el.click();
                    totalClicked++;
                    await new Promise(resolve => setTimeout(resolve, 300));
                  }
                }
              }
            }
          } catch (e) {
            console.warn(`[DivClicker] 处理class4元素失败 ${i + 1}:`, e);
          }
        }
        
        const result = {
          status: isOperationStopped ? 'stopped' : 'success',
          count: totalClicked,
          preprocessCount: totalClass4Processed,
          mode: mode,
          message: isOperationStopped ? '操作已停止' : '操作完成'
        };
        
        console.log('[DivClicker] 自动点击完成:', result);
        sendResponse(result);
        
      } catch (error) {
        console.error('[DivClicker] 自动点击发生错误:', error);
        sendResponse({ status: 'error', message: error.message });
      }
    };
    
    // 确保DOM已准备好
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleAutoClick);
    } else {
      handleAutoClick();
    }
    
    return true;
  }
  
  if (request.action === 'clearHighlight') {
    sendResponse({ status: 'success' });
    return true;
  }
  
  console.log('[DivClicker] 收到未知action:', request.action);
  return true;
});
