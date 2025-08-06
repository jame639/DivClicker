// 检查是否在独立窗口中运行
const isStandaloneWindow = window.location.search.includes('standalone=true');

// 全局变量
let currentTab = null;
let tabUpdateInterval = null;

// 获取目标标签页的函数
function getTargetTab(callback) {
  if (isStandaloneWindow) {
    // 独立窗口模式：获取当前活跃的标签页（跨所有窗口）
    chrome.tabs.query({active: true}, function(tabs) {
      // 过滤掉扩展页面
      const normalTabs = tabs.filter(tab => 
        !tab.url.startsWith('chrome-extension://') && 
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('moz-extension://') &&
        !tab.url.startsWith('about:')
      );
      
      if (normalTabs.length > 0) {
        callback(normalTabs[0]);
        return;
      }
      
      // 如果没有活跃的正常标签页，查找最近访问的
      chrome.tabs.query({}, function(allTabs) {
        const availableTabs = allTabs.filter(tab => 
          !tab.url.startsWith('chrome-extension://') && 
          !tab.url.startsWith('chrome://') &&
          !tab.url.startsWith('moz-extension://') &&
          !tab.url.startsWith('about:')
        );
        
        if (availableTabs.length === 0) {
          callback(null);
          return;
        }
        
        // 找到最近活跃的标签页
        const targetTab = availableTabs.reduce((latest, current) => 
          (current.lastAccessed || 0) > (latest.lastAccessed || 0) ? current : latest
        );
        
        callback(targetTab);
      });
    });
  } else {
    // 普通popup模式：使用当前活跃标签页
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      callback(tabs[0] || null);
    });
  }
}

// 显示当前目标标签页信息
function displayCurrentTab(tab) {
  const currentTabDiv = document.getElementById('currentTab');
  if (!currentTabDiv) return;
  
  if (isStandaloneWindow && tab) {
    currentTabDiv.innerHTML = `
      <div class="tab-title">当前操作页面: ${tab.title || '未知页面'}</div>
      <div class="tab-url">${tab.url || ''}</div>
      <div class="tab-connection-status" id="connectionStatus">检测中...</div>
    `;
    currentTabDiv.style.display = 'block';
    
    // 重新获取连接状态元素
    const newConnectionStatusDiv = document.getElementById('connectionStatus');
    updateConnectionStatus(tab, newConnectionStatusDiv);
  } else {
    currentTabDiv.style.display = 'none';
  }
}

// 更新连接状态
function updateConnectionStatus(tab, statusElement) {
  if (!tab || !statusElement) return;
  
  statusElement.textContent = '检测连接...';
  statusElement.className = 'tab-connection-status connecting';
  
  // 检测脚本是否已注入
  chrome.tabs.sendMessage(tab.id, { action: 'ping' }, function(response) {
    if (chrome.runtime.lastError || !response) {
      statusElement.textContent = '未连接 - 将自动注入脚本';
      statusElement.className = 'tab-connection-status disconnected';
    } else {
      statusElement.textContent = '✓ 已连接，可以操作';
      statusElement.className = 'tab-connection-status connected';
    }
  });
}

// 标签页监听器 - 实时检测焦点标签页变化
function startTabListener() {
  // 立即更新一次
  updateCurrentTab();
  
  // 设置定时器，每3秒检查一次标签页变化（降低频率以提升性能）
  tabUpdateInterval = setInterval(updateCurrentTab, 3000);
  
  // 监听标签页激活事件
  if (chrome.tabs && chrome.tabs.onActivated) {
    chrome.tabs.onActivated.addListener(function(activeInfo) {
      console.log('[DivClicker] 标签页激活事件:', activeInfo);
      setTimeout(updateCurrentTab, 200); // 延迟一点执行，确保标签页信息已更新
    });
  }
  
  // 监听标签页更新事件
  if (chrome.tabs && chrome.tabs.onUpdated) {
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
      if (changeInfo.status === 'complete' || changeInfo.title) {
        console.log('[DivClicker] 标签页更新事件:', tabId, changeInfo);
        setTimeout(updateCurrentTab, 200);
      }
    });
  }
  
  // 监听窗口焦点变化
  if (chrome.windows && chrome.windows.onFocusChanged) {
    chrome.windows.onFocusChanged.addListener(function(windowId) {
      if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        console.log('[DivClicker] 窗口焦点变化:', windowId);
        setTimeout(updateCurrentTab, 200);
      }
    });
  }
}

// 更新当前标签页信息
function updateCurrentTab() {
  getTargetTab(function(tab) {
    // 检查标签页是否发生变化
    const hasChanged = !currentTab || 
                      !tab || 
                      currentTab.id !== tab.id || 
                      currentTab.url !== tab.url || 
                      currentTab.title !== tab.title;
    
    if (hasChanged) {
      console.log('[DivClicker] 检测到标签页变化:', currentTab?.title, '->', tab?.title);
      currentTab = tab;
      displayCurrentTab(tab);
      
      // 如果有新的标签页，预先检查是否需要注入脚本
      if (tab) {
        preInjectScript(tab);
      }
    }
  });
}

// 预先注入脚本到新标签页
function preInjectScript(tab) {
  // 发送一个测试消息来检查脚本是否已注入
  chrome.tabs.sendMessage(tab.id, { action: 'ping' }, function(response) {
    if (chrome.runtime.lastError) {
      console.log('[DivClicker] 标签页需要注入脚本:', tab.title);
      // 尝试注入content script
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }, function() {
        if (chrome.runtime.lastError) {
          console.log('[DivClicker] 预注入失败:', chrome.runtime.lastError.message);
        } else {
          console.log('[DivClicker] 预注入成功:', tab.title);
          // 重新检测连接状态
          const statusElement = document.getElementById('connectionStatus');
          if (statusElement) {
            setTimeout(() => updateConnectionStatus(tab, statusElement), 500);
          }
        }
      });
    } else {
      console.log('[DivClicker] 标签页脚本已就绪:', tab.title);
    }
  });
}

// 停止标签页监听器
function stopTabListener() {
  if (tabUpdateInterval) {
    clearInterval(tabUpdateInterval);
    tabUpdateInterval = null;
  }
}

// 窗口关闭时清理
window.addEventListener('beforeunload', stopTabListener);

document.addEventListener('DOMContentLoaded', function() {
  // 如果是独立窗口，添加特殊样式
  if (isStandaloneWindow) {
    document.body.classList.add('standalone-window');
    // 隐藏固定按钮
    const pinBtn = document.getElementById('pinBtn');
    if (pinBtn) {
      pinBtn.style.display = 'none';
    }
    
    // 启动标签页监听器
    startTabListener();
  }
  
  // 固定窗口按钮事件
  const pinBtn = document.getElementById('pinBtn');
  if (pinBtn && !isStandaloneWindow) {
    pinBtn.addEventListener('click', function() {
      chrome.windows.create({
        url: chrome.runtime.getURL('popup.html?standalone=true'),
        type: 'popup',
        width: 420,
        height: 650,
        focused: true
      }, function(newWindow) {
        if (chrome.runtime.lastError) {
          console.error('创建独立窗口失败:', chrome.runtime.lastError);
        } else {
          // 关闭当前popup（如果是在popup中）
          if (window.chrome && window.chrome.extension) {
            window.close();
          }
        }
      });
    });
  }
  
  const findBtn = document.getElementById('findBtn');
  const clearBtn = document.getElementById('clearBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const statusDiv = document.getElementById('status');
  const currentTabDiv = document.getElementById('currentTab');
  const connectionStatusDiv = document.getElementById('connectionStatus');
  
  let currentClassNames = [];
  let isOperating = false; // 添加操作状态标志

  // 在独立窗口模式下显示刷新按钮
  if (isStandaloneWindow && refreshBtn) {
    refreshBtn.style.display = 'block';
    refreshBtn.addEventListener('click', function() {
      console.log('[DivClicker] 手动刷新标签页信息');
      updateCurrentTab();
      statusDiv.textContent = '已刷新标签页信息';
      statusDiv.style.color = '#17a2b8';
      setTimeout(() => {
        if (statusDiv.textContent === '已刷新标签页信息') {
          statusDiv.textContent = '';
        }
      }, 2000);
    });
  }

  // 创建停止按钮（动态创建）
  function createStopButton() {
    const stopBtn = document.createElement('button');
    stopBtn.id = 'stopBtn';
    stopBtn.className = 'button button-danger';
    stopBtn.textContent = '停止操作';
    stopBtn.style.display = 'none';
    
    // 将停止按钮插入到findBtn后面
    findBtn.parentNode.insertBefore(stopBtn, findBtn.nextSibling);
    
    stopBtn.addEventListener('click', function() {
      console.log('[DivClicker] 用户点击停止操作');
      stopCurrentOperation();
    });
    
    return stopBtn;
  }

  const stopBtn = createStopButton();

  // 停止当前操作
  function stopCurrentOperation() {
    getTargetTab(function(tab) {
      if (!tab) {
        statusDiv.textContent = '未找到可操作的页面';
        statusDiv.style.color = '#e74c3c';
        return;
      }
      
      chrome.tabs.sendMessage(tab.id, { action: 'stopOperation' }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('[DivClicker] 停止操作通信失败:', chrome.runtime.lastError.message);
        }
        
        // 重置UI状态
        resetOperationUI();
        statusDiv.textContent = '操作已停止';
        statusDiv.style.color = '#e74c3c';
      });
    });
  }

  // 重置操作UI状态
  function resetOperationUI() {
    isOperating = false;
    findBtn.style.display = 'block';
    findBtn.disabled = false;
    findBtn.textContent = '点击元素';
    stopBtn.style.display = 'none';
  }

  // 设置操作UI状态
  function setOperatingUI() {
    isOperating = true;
    findBtn.textContent = '操作中...';
    findBtn.disabled = true;
    stopBtn.style.display = 'block';
  }

  // 查找元素按钮点击事件
  findBtn.addEventListener('click', function() {
    // 检查是否正在操作中
    if (isOperating) {
      statusDiv.textContent = '操作正在进行中，请稍候...';
      statusDiv.style.color = '#f39c12';
      return;
    }

    console.log('[DivClicker] 开始自动点击操作（无需输入类名）');
    
    // 设置操作中的UI状态
    setOperatingUI();
    statusDiv.textContent = '正在处理页面元素...';
    statusDiv.style.color = '#3498db';

    // 获取目标标签页并发送消息
    getTargetTab(function(tab) {
      if (!tab) {
        statusDiv.textContent = '未找到可操作的页面';
        statusDiv.style.color = '#e74c3c';
        currentTabDiv.style.display = 'none';
        resetOperationUI();
        return;
      }
      
      // 显示当前目标标签页信息
      displayCurrentTab(tab);
      
      const message = {
        action: 'autoClickElements'  // 使用新的自动点击动作
      };
      
      // 改进的消息发送和脚本注入逻辑
      function sendMessageWithInjection() {
        // 首先尝试发送消息
        chrome.tabs.sendMessage(tab.id, message, function(response) {
          if (chrome.runtime.lastError) {
            console.log('[DivClicker] 首次通信失败，尝试注入脚本:', chrome.runtime.lastError.message);
            
            // 尝试注入content script
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            }, function() {
              if (chrome.runtime.lastError) {
                console.error('[DivClicker] 脚本注入失败:', chrome.runtime.lastError.message);
                statusDiv.textContent = `脚本注入失败: ${chrome.runtime.lastError.message}`;
                statusDiv.style.color = '#e74c3c';
                resetOperationUI();
                return;
              }
              
              console.log('[DivClicker] 脚本注入成功，等待页面准备...');
              
              // 等待一小段时间让脚本初始化
              setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, message, function(response) {
                  if (chrome.runtime.lastError) {
                    console.error('[DivClicker] 重试通信失败:', chrome.runtime.lastError.message);
                    statusDiv.textContent = '页面通信失败，请刷新页面后重试';
                    statusDiv.style.color = '#e74c3c';
                    resetOperationUI();
                    return;
                  }
                  console.log('[DivClicker] 重试通信成功');
                  handleResponse(response);
                });
              }, 500);
            });
            return;
          }
          console.log('[DivClicker] 首次通信成功');
          handleResponse(response);
        });
      }
      
      function handleResponse(response) {
        // 重置UI状态
        resetOperationUI();
        
        if (response && (response.status === 'success' || response.status === 'stopped')) {
          let statusText = '';
          if (response.status === 'stopped') {
            statusText = `操作已停止 - 已点击 ${response.count} 个目标元素`;
            statusDiv.style.color = '#f39c12';
          } else {
            statusText = `操作完成 - 点击了 ${response.count} 个目标元素`;
            if (response.preprocessCount !== undefined) {
              statusText = `${response.mode || '默认'}模式 - 处理了 ${response.preprocessCount} 个触发元素，点击了 ${response.count} 个目标元素`;
            }
            statusDiv.style.color = '#2ecc71';
          }
          statusDiv.textContent = statusText;
        } else {
          statusDiv.textContent = response?.message || '操作失败';
          statusDiv.style.color = '#e74c3c';
        }
      }
      
      // 调用发送消息函数
      sendMessageWithInjection();
    });
  });
  
  // 清除高亮按钮（已移除元素选择功能，只保留清除功能）
  clearBtn.addEventListener('click', function() {
    getTargetTab(function(tab) {
      if (!tab) {
        statusDiv.textContent = '未找到可操作的页面';
        statusDiv.style.color = '#e74c3c';
        currentTabDiv.style.display = 'none';
        return;
      }
      
      // 显示当前目标标签页信息
      displayCurrentTab(tab);
      
      chrome.tabs.sendMessage(tab.id, {
        action: 'clearHighlight'
      }, function(response) {
        clearBtn.style.display = 'none';
        statusDiv.textContent = '已清除高亮';
        statusDiv.style.color = '#666';
      });
    });
  });
});