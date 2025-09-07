(() => {
  if (window.__elementPickerActive) return;
  window.__elementPickerActive = true;

  let selectedElement = null;
  let prevElem = null;

  // ✅ 안전하게 스타일 초기화
  function safeClearStyle(target) {
    if (!target || !(target instanceof Element)) return;
    try {
      target.style.outline = '';
      target.style.backgroundColor = '';
    } catch (err) {
      console.warn('❌ 스타일 초기화 실패:', err);
    }
  }

  // ✅ 선택 가능한지 체크
  function isSelectableElement(el) {
    if (!el || !(el instanceof Element)) return false;
    const tagName = el.tagName.toLowerCase();
    if (tagName === 'html' || tagName === 'body') return false;
    return true;
  }

  // ✅ 이전 강조 초기화
  function clearHighlight() {
    if (prevElem && prevElem !== selectedElement) {
      safeClearStyle(prevElem);
      prevElem = null;
    }
  }

  // ✅ CSS Selector 추출
  function getCssSelector(el) {
    if (!(el instanceof Element)) return;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector += `#${el.id}`;
        path.unshift(selector);
        break;
      } else {
        let sib = el, nth = 1;
        while (sib = sib.previousElementSibling) {
          if (sib.nodeName.toLowerCase() === selector)
            nth++;
        }
        if (nth !== 1) selector += `:nth-of-type(${nth})`;
      }
      path.unshift(selector);
      el = el.parentNode;
    }
    return path.join(' > ');
  }

  // ✅ XPath 추출
  function getXPath(el) {
    if (el.id !== '') {
      return `//*[@id="${el.id}"]`;
    }
    if (el === document.body) {
      return '/html/body';
    }
    let ix = 0;
    const siblings = el.parentNode ? el.parentNode.childNodes : [];
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === el) {
        return getXPath(el.parentNode) + '/' + el.tagName.toLowerCase() + `[${ix + 1}]`;
      }
      if (sibling.nodeType === 1 && sibling.tagName === el.tagName) {
        ix++;
      }
    }
    return '';
  }

  // ✅ 선택 모드 종료
  function exitPickerMode() {
    clearHighlight();
    window.__elementPickerActive = false;

    document.removeEventListener('mouseover', window.__onElementMouseOver, true);
    document.removeEventListener('click', window.__onElementClick, true);
    document.removeEventListener('mouseout', mouseOutMonitor);
    document.removeEventListener('visibilitychange', visibilityMonitor);
    window.removeEventListener('blur', exitPickerMode);

    chrome.runtime.sendMessage({ type: 'PICKER_CANCELED' });

    console.log('🛑 요소 선택 모드 완전 종료');
  }

  // ✅ 브라우저 벗어남 감지
  function mouseOutMonitor(e) {
    if (!e.relatedTarget && !e.toElement) {
      console.log('🛑 문서 벗어남 → 종료');
      safeClearStyle(prevElem)
      //exitPickerMode();
    }
  }

  // ✅ 탭 숨김 감지
  function visibilityMonitor() {
    if (document.visibilityState === 'hidden') {
      console.log('🛑 탭 비활성화 → 종료');
      exitPickerMode();
    }
  }

  // ✅ 마우스 오버 핸들러
  window.__onElementMouseOver = (e) => {
    const target = e.target;

    if (!isSelectableElement(target)) {
      clearHighlight();
      return;
    }

    if (prevElem && prevElem !== selectedElement) {
      safeClearStyle(prevElem);
    }

    prevElem = target;

    if (target !== selectedElement) {
      try {
        target.style.outline = '1px dashed red';
        target.style.backgroundColor = 'cornsilk';
      } catch (err) {
        console.warn('❌ 강조 적용 실패:', err);
      }
    }

    e.stopPropagation();
  };

  // ✅ 클릭 핸들러
  window.__onElementClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    if (!isSelectableElement(target)) return;

    if (prevElem && prevElem !== target && prevElem !== selectedElement) {
      safeClearStyle(prevElem);
    }

    selectedElement = target;

    try {
      selectedElement.style.outline = '';
      selectedElement.style.backgroundColor = '#f0f8ff';
    } catch (err) {
      console.warn('❌ 선택 스타일 적용 실패:', err);
    }

    if (prevElem === selectedElement) {
      prevElem = null;
    }

    const clone = selectedElement.cloneNode(true);
    clone.removeAttribute('style');
    const cleanHTML = clone.outerHTML;

    // ✨ CSS Selector + XPath 둘 다 생성
    const selector = getCssSelector(selectedElement);
    const xpath = getXPath(selectedElement);
    
    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'ELEMENT_SELECTED',
        selector: selector,
        xpath: xpath,
        html: cleanHTML,
        page_url: window.location.href
      });
    } else {
      console.warn('❌ chrome.runtime.sendMessage 불가 (CSP 등 문제)');
    }
  };

  // ✅ 이벤트 연결
  document.addEventListener('mouseover', window.__onElementMouseOver, true);
  document.addEventListener('click', window.__onElementClick, true);
  document.addEventListener('mouseout', mouseOutMonitor);
  document.addEventListener('visibilitychange', visibilityMonitor);
  window.addEventListener('blur', exitPickerMode);

  console.log('✅ 요소 선택 모드 활성화됨');
})();

