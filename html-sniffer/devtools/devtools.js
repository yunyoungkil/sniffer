//devtools.js
function sendInspectedElement() {
  const expression = `
    (() => {
      const el = $0;
      if (!el) return null;
      const id = el.id ? '#' + el.id : '';
      const classes = el.className ? '.' + el.className.split(/\\s+/).join('.') : '';
      const selector = el.tagName.toLowerCase() + id + classes;
      return { selector: selector, html: el.outerHTML };
    })()
  `;

  chrome.devtools.inspectedWindow.eval(expression, (result, exceptionInfo) => {
    if (exceptionInfo) {
      console.error('⚠️ DevTools eval 오류:', exceptionInfo);
      return;
    }
  
    if (!result) {
      console.log('ℹ️ 선택된 요소가 없습니다. ($0 is null)');
      return;
    }
    
    chrome.runtime.sendMessage({
      type: 'ELEMENT_INSPECTED',
      selector: result.selector,
      html: result.html
    });
  });
}

// DevTools 요소 선택 감지 시 자동 전송
chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
  sendInspectedElement();
});
  