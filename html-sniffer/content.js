// ✅ Content script 실행 확인
console.log('✅ Content script 실행됨:', window.location.href);

// ✅ 삭제 요청 처리
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CLEAR_ELEMENT_HIGHLIGHT') {
    const xpath = message.xpath;
    if (!xpath) {
      console.warn('❌ XPath가 비어있음');
      return;
    }

    try {
      const el = getElementByXpath(xpath);
      if (el) {
        try {
          el.style.outline = '';
          el.style.backgroundColor = '';
          console.log('✅ 강조 스타일 제거 완료:', xpath);
        } catch (styleErr) {
          console.warn('❌ 강조 스타일 제거 실패:', styleErr);
        }
      } else {
        console.warn('❌ XPath로 요소를 찾을 수 없음:', xpath);
      }
    } catch (err) {
      console.error('❌ XPath 파싱 실패:', err);
    }
  }
});

// ✅ 페이지 로딩 후 저장된 selectedElement 강조 복구
async function restoreHighlights() {
  try {
    const db = await openDatabase();  // IndexedDB 연결
    const tx = db.transaction('elements', 'readonly');
    const store = tx.objectStore('elements');
    const request = store.getAll();

    request.onsuccess = () => {
      const items = request.result;
      console.log('✅ 저장된 선택 강조 복구 시작:', items.length, '개');
      items.forEach(item => {
        const xpath = item.xpath;
        const el = getElementByXpath(xpath);
        if (el) {
          try {
            // ✅ selectedElement 강조 스타일 복원
            el.style.outline = '';
            el.style.backgroundColor = '#f0f8ff'; // 하늘색 고정
            console.log('✅ 선택 강조 복구 완료:', xpath);
          } catch (err) {
            console.warn('❌ 선택 강조 복구 실패:', err);
          }
        } else {
          console.warn('❌ 복원할 요소를 찾을 수 없음:', xpath);
        }
      });
    };

    request.onerror = () => {
      console.error('❌ 저장된 강조 데이터 가져오기 실패:', request.error);
    };
  } catch (err) {
    console.error('❌ DB 연결 실패:', err);
  }
}

// ✅ XPath로 실제 DOM 요소 찾기
function getElementByXpath(xpath) {
  try {
    return document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
  } catch (err) {
    console.warn('❌ XPath 파싱 실패:', err);
    return null;
  }
}

// ✅ 페이지 로딩 완료 후 강조 복구 자동 실행
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  restoreHighlights();
} else {
  document.addEventListener('DOMContentLoaded', restoreHighlights);
}
