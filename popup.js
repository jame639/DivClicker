document.addEventListener('DOMContentLoaded', function() {
  const findBtn = document.getElementById('findBtn');
  const clearBtn = document.getElementById('clearBtn');
  const clickSelectedBtn = document.getElementById('clickSelectedBtn');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const selectNoneBtn = document.getElementById('selectNoneBtn');
  const statusDiv = document.getElementById('status');
  const elementsContainer = document.getElementById('elementsContainer');
  const elementsList = document.getElementById('elementsList');
  
  let currentClassNames = [];
  let foundElements = [];

  // 查找元素按钮点击事件
  findBtn.addEventListener('click', function() {
    const classNames = document.getElementById('classInput').value.trim();
    
    if (!classNames) {
      statusDiv.textContent = '请输入目标元素的class名称';
      statusDiv.style.color = '#e74c3c';
      return;
    }

    currentClassNames = classNames.split(' ').filter(name => name.trim());
    statusDiv.textContent = '正在处理页面元素...';
    statusDiv.style.color = '#3498db';
    elementsContainer.style.display = 'none';

    // 向content.js发送查找消息
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (chrome.runtime.lastError) {
        statusDiv.textContent = '获取当前页面失败';
        statusDiv.style.color = '#e74c3c';
        return;
      }
      
      if (!tabs[0]) {
        statusDiv.textContent = '未找到活动页面';
        statusDiv.style.color = '#e74c3c';
        return;
      }
      
      const message = {
        action: 'findElements',
        classNames: currentClassNames
      };
      
      chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
        if (chrome.runtime.lastError) {
          statusDiv.textContent = '无法与页面通信，请刷新页面后重试';
          statusDiv.style.color = '#e74c3c';
          return;
        }
        
        if (response && response.status === 'success') {
          foundElements = response.elements || [];
          if (foundElements.length === 0) {
            statusDiv.textContent = '未找到匹配的目标元素';
            statusDiv.style.color = '#f39c12';
            elementsContainer.style.display = 'none';
          } else {
            let statusText = `找到 ${foundElements.length} 个目标元素（已在页面中高亮显示）`;
            if (response.preprocessCount !== undefined) {
              statusText = `处理了 ${response.preprocessCount} 个触发元素，找到并点击了 ${foundElements.length} 个目标元素`;
            }
            statusDiv.textContent = statusText;
            statusDiv.style.color = '#2ecc71';
            displayElements(foundElements);
            elementsContainer.style.display = 'block';
            clearBtn.style.display = 'inline-block';
          }
        } else {
          statusDiv.textContent = response?.message || '查找失败';
          statusDiv.style.color = '#e74c3c';
        }
      });
    });
  });

  // 显示元素列表
  function displayElements(elements) {
    elementsList.innerHTML = '';
    
    elements.forEach((element, index) => {
      const elementDiv = document.createElement('div');
      elementDiv.className = 'element-item';
      
      elementDiv.innerHTML = `
        <div class="element-checkbox">
          <input type="checkbox" id="element_${index}" value="${index}" checked>
          <label for="element_${index}" class="element-number">#${index}</label>
        </div>
        <div class="element-info">
          <div class="element-tag">&lt;${element.tagName}&gt;</div>
          <div class="element-details">
            ${element.className ? `<span class="element-class">class="${element.className}"</span>` : ''}
            ${element.id ? `<span class="element-id">id="${element.id}"</span>` : ''}
          </div>
          <div class="element-text">${element.text}</div>
          <div class="element-status ${element.visible ? 'visible' : 'hidden'}">
            ${element.visible ? '可见' : '隐藏'}
          </div>
        </div>
      `;
      
      elementsList.appendChild(elementDiv);
    });
  }

  // 全选按钮
  selectAllBtn.addEventListener('click', function() {
    const checkboxes = elementsList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
  });

  // 全不选按钮
  selectNoneBtn.addEventListener('click', function() {
    const checkboxes = elementsList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
  });

  // 点击选中元素按钮
  clickSelectedBtn.addEventListener('click', function() {
    const checkboxes = elementsList.querySelectorAll('input[type="checkbox"]:checked');
    const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    if (selectedIndices.length === 0) {
      statusDiv.textContent = '请至少选择一个元素';
      statusDiv.style.color = '#e74c3c';
      return;
    }

    statusDiv.textContent = `正在点击 ${selectedIndices.length} 个元素...`;
    statusDiv.style.color = '#3498db';

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'clickElements',
        classNames: currentClassNames,
        indices: selectedIndices
      }, function(response) {
        if (chrome.runtime.lastError) {
          statusDiv.textContent = '无法与页面通信';
          statusDiv.style.color = '#e74c3c';
          return;
        }
        
        if (response && response.status === 'success') {
          statusDiv.textContent = `成功点击了 ${response.count} 个元素`;
          statusDiv.style.color = '#2ecc71';
          // 点击完成后隐藏元素列表
          elementsContainer.style.display = 'none';
          clearBtn.style.display = 'none';
        } else {
          statusDiv.textContent = response?.message || '点击失败';
          statusDiv.style.color = '#e74c3c';
        }
      });
    });
  });

  // 清除高亮按钮
  clearBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'clearHighlight'
      }, function(response) {
        elementsContainer.style.display = 'none';
        clearBtn.style.display = 'none';
        statusDiv.textContent = '已清除高亮';
        statusDiv.style.color = '#666';
      });
    });
  });
});