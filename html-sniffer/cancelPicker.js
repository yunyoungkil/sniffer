//cancelPicker.js
(() => {
  if (!window.__elementPickerActive) return;

  document.removeEventListener('mouseover', window.__onElementMouseOver, true);
  document.removeEventListener('click', window.__onElementClick, true);
/*
  if (window.__prevElem) {
    window.__prevElem.style.outline = '';
    window.__prevElem = null;
  }

  window.__elementPickerActive = false;
  console.log('🔕 요소 선택 모드가 해제되었습니다.');
*/
  chrome.runtime.sendMessage({ type: 'PICKER_CANCELED' });
})();
