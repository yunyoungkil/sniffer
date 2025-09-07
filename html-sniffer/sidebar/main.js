// main.js

import { loadElementsFromDB, saveElementToDB, clearAllElements, openDatabase } from './db.js';
import { renderElement, clearResultContainer, createControlButtons } from './ui.js';
import { updateRoleListUI, getCategoriesFromRole } from './roleList.js';
import { addRoleInputEvents, addDeleteButtonEvents } from './events.js';
import { guessRoleFromSelector, unescapeHtml, normalizeRole } from './helpers.js';

// ✅ 요소 선택 모드 진입 스크립트 실행
function startPickerMode() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id, allFrames: true },
      files: ['picker.js']
    });
  });
}

// ✅ 요소 선택 모드 취소 스크립트 실행
function cancelPickerMode() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id, allFrames: true },
      files: ['cancelPicker.js']
    });
  });
}

// ✅ 초기 데이터 로딩
async function loadAndRenderElements() {
  // 1) IndexedDB 불러오기
  let items = await loadElementsFromDB();

  // 2) 요소가 하나도 없으면, 백업에서 복원 시도
  if (items.length === 0) {
    chrome.storage.local.get('htmlSnifferBackup', ({ htmlSnifferBackup }) => {
      if (!htmlSnifferBackup) return;  // 백업 자체가 없으면 아무것도 안 함

      const backup = JSON.parse(htmlSnifferBackup);
      // captured_elements 배열을 하나씩 DB에 재저장
      backup.captured_elements.forEach(elem => {
        saveElementToDB({
          role:           elem.role,
          selector:       elem.selector,
          html:           elem.html,
          styledHTML:     elem.styled_html,
          textContent:    elem.text_content,         
          page_url:       elem.page_url,
          timestamp:      new Date(elem.timestamp).getTime()
        });
      });

      // 복원 후 재호출하여 렌더링
      loadAndRenderElements();
    });
    return;
  }

  // 3) 정상적으로 불러온 items 렌더링
  clearResultContainer();
  items.sort((a, b) => b.timestamp - a.timestamp);
  items.forEach(item => {
    const { roleInput, deleteBtn, block } = renderElement(item);
    addRoleInputEvents(roleInput, item);
    addDeleteButtonEvents(deleteBtn, item, block);
  });
  updateRoleListUI();
}

// 🆕 JSON 내보내기 로직: 모든 메모 포함
async function handleDownload() {
  // 기존 수집 요소 로드
  const items = await loadElementsFromDB();

  // 모든 메모 레코드 로드
  const allEditorContent = await (async () => {
    const db = await openDatabase();
    const tx = db.transaction('editorContent', 'readonly');
    const store = tx.objectStore('editorContent');
    const req = store.getAll();
    return new Promise((res) => {
      req.onsuccess = e => res(e.target.result.map(r => ({ timestamp: r.timestamp, content: r.content })));  
      req.onerror = () => res([]);
    });
  })();

  // 에디터에 표시된 선택된 메모 텍스트 가져오기
  const editorEl = document.getElementById('editor');
  // 편집기 텍스트 또는 최신 메모를 prompt로 사용
  let selectedPrompt = editorEl ? editorEl.innerText.trim() : '';
  // 최신 메모 순으로 정렬
  allEditorContent.sort((a, b) => b.timestamp - a.timestamp);
  if (!selectedPrompt && allEditorContent.length > 0) {
    selectedPrompt = allEditorContent[0].content;
  }

  const transformed = items.map((item, idx) => ({
    id: item.id || idx + 1,
    role: normalizeRole(item.role || '기타'),
//    selector: item.selector,
//    html: unescapeHtml(item.html),
//    styled_html: unescapeHtml(item.styledHTML),
    text_content: item.textContent,
    page_url: item.page_url || 'unknown',
    timestamp: new Date(item.timestamp).toISOString()
  }));

  // 🆕 메모 기록 백업을 Storage에 저장 (allEditorContent 기준)
  try {
    await new Promise(resolve =>
      chrome.storage.local.set({ memoBackup: JSON.stringify(allEditorContent) }, resolve)
    );
  } catch (e) {
    console.warn('⚠️ 메모 기록 Storage 백업 실패:', e);
  }
  // 모든 role을 추출해서 중복 없이 정렬
  const allRoles = Array.from(new Set(transformed.map(e => normalizeRole(e.role)).filter(Boolean)));


  const promptRole = `다음은 HTML Sniffer 확장 프로그램에서 추출한 JSON 데이터입니다.
  각 항목은 "role", "selector", "text_content" 등의 필드를 포함하고 있습니다.

  GPT는 아래 지시사항을 순서대로 따르세요:
  1. 아래 조건에 해당하는 항목을 모두 찾아주세요. 각 조건은 "role" 값과 정확히 일치해야 합니다.
  2. 조건에 해당하는 항목이 있다면, 그 항목들의 "text_content" 값만 모두 출력하세요.
  3. 그 다음, JSON 데이터 전체에 포함된 모든 "role" 값 목록을 출력하세요. 중복 없이 정렬된 리스트로 출력해주세요.

  🔽 반드시 확인하고 처리해야 할 조건 목록:
  ` + allRoles.map(
    r => `- "role" 값이 "${r}"인 항목`
  ).join('\n');

  const prompt =  `전자제품 관련 검색 키워드를 다음과 같이 분류해줘:
 
      - 상업적 (구매 전 정보 탐색)
      - 정보탐색형 (비교, 사용법, 후기)
      - 문제 해결형 (에러 해결, 설정법 등)    
    각 검색 의도에 적합한 블로그 콘텐츠 포맷을 알려주고, 예시 주제와 함께 써줘.`

  // 🆕 HTML Sniffer + 메모 기록 통합 백업
  const output = {
    extension: "HTML Sniffer",
    version: "1.0.0",
    //prompt: selectedPrompt,
    promptRole: promptRole,
    prompt: prompt,
    allEditorContent: allEditorContent,
    captured_elements: transformed,
    // memoBackup을 allEditorContent 그대로 할당
    memoBackup: allEditorContent
  };

  try {
    await new Promise(resolve =>
      chrome.storage.local.set({ htmlSnifferBackup: JSON.stringify(output) }, resolve)
    );
  } catch (e) {
    console.warn('⚠️ chrome.storage.local 백업 실패:', e);
  }

  const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';  // 사이드바 리로드 방지
  a.style.display = 'none';
  a.download = `${output.extension}-${new Date().toISOString().replace(/[:T]/g, '-').slice(0,19)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log('📁 JSON 파일 다운로드 완료');
}

// ✅ 사이드바 버튼 이벤트 연결
function attachButtonEvents() {
  const pickerBtn = document.getElementById('pickerBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const clearBtn = document.getElementById('clearBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  if (pickerBtn) pickerBtn.addEventListener('click', startPickerMode);
  if (cancelBtn) cancelBtn.addEventListener('click', cancelPickerMode);
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      await clearAllElements();
      clearResultContainer();
      updateRoleListUI();
      console.log('🧹 전체 데이터 삭제 완료');
    });
  }
  if (downloadBtn) {
  downloadBtn.addEventListener('click', handleDownload);

  // ✅ 드롭 시 시각 효과
  downloadBtn.addEventListener('dragover', (e) => {
    e.preventDefault();
    downloadBtn.style.backgroundColor = '#e0f7fa';
  });

  downloadBtn.addEventListener('dragleave', () => {
    downloadBtn.style.backgroundColor = '';
  });

  // ✅ 드래그된 역할 또는 카테고리별 JSON 내보내기 처리
  downloadBtn.addEventListener('drop', async (e) => {
    e.preventDefault();
    downloadBtn.style.backgroundColor = '';

    const type = e.dataTransfer.getData('type');   // 'role' or 'category'
    const value = e.dataTransfer.getData('value'); // 역할 이름 or 카테고리 이름
    if (!type || !value) return;

    const all = await loadElementsFromDB();
    let filtered = [];

    if (type === 'role') {
      filtered = all.filter(item => (item.role || '(미지정)') === value);
    } else if (type === 'category') {
      const roleSet = new Set();
      for (const item of all) {
        const roles = getCategoriesFromRole(item.role || '');
        if (roles.includes(value)) roleSet.add(item.role);
      }
      filtered = all.filter(item => roleSet.has(item.role));
    }

    const transformed = filtered.map((item, idx) => ({
      id: item.id || idx + 1,
      role: item.role,
      //selector: item.selector,
      //styled_html: item.styledHTML,
      text_content: item.textContent,
      page_url: item.page_url,
      timestamp: new Date(item.timestamp).toISOString()
    }));

    const blob = new Blob([JSON.stringify(transformed, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${value.replace(/\s+/g, '_')}-filtered.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

}


// ✅ 페이지 로드 후 초기화
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await createControlButtons();     // 버튼 먼저 생성
    await loadAndRenderElements();    // 데이터 불러오기 및 화면 출력
    attachButtonEvents();             // 버튼에 이벤트 연결
  } catch (error) {
    console.error('❌ 초기화 중 오류 발생:', error);
  }
});

// ✅ 메시지 수신 (요소 선택 or DevTools 선택)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'ELEMENT_SELECTED' || message.type === 'ELEMENT_INSPECTED') {
        // 👉 역할 자동 추정
        if (!message.role) {
          message.role = guessRoleFromSelector(message.html);  // ✅ 추가
        }

    saveElementToDB(message).then(() => {
      const { roleInput, deleteBtn, block } = renderElement(message);
      addRoleInputEvents(roleInput, message);
      addDeleteButtonEvents(deleteBtn, message, block);
      updateRoleListUI();
    }).catch((error) => console.error('❌ 저장 실패:', error));
  }
});

// ✅ 사이드바 닫을 때 요소 선택 모드 자동 취소
window.addEventListener('unload', cancelPickerMode);
