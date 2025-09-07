// ui.js

import { updateRoleInDB, updateStyledHTML, openDatabase, saveEditorContentToDB, loadLatestEditorContent } from './db.js';
import { updateRoleListUI } from './roleList.js';
import { guessRoleFromSelector } from './helpers.js';

// ✅ resultContainer 초기화
export function clearResultContainer() {
  const resultContainer = document.getElementById('resultContainer');
  if (resultContainer) {
    resultContainer.innerHTML = '';
  }
}

// ✅ 요소를 화면에 렌더링
export function renderElement(message) {
  const { selector, html, styledHTML } = message;
  const resultContainer = document.getElementById('resultContainer');

  const block = document.createElement('div');
  block.style.marginBottom = '16px';
  block.style.paddingBottom = '8px';
  block.style.borderBottom = '1px dashed #ccc';

  // 1. 원본 HTML 컨테이너
  const htmlContainer = document.createElement('pre');
  htmlContainer.textContent = html;
  htmlContainer.style.whiteSpace = 'pre-wrap';
  htmlContainer.style.maxHeight = '150px';
  htmlContainer.style.overflowY = 'auto';
  htmlContainer.style.background = '#f0f0f0';
  htmlContainer.style.padding = '8px';
  htmlContainer.style.borderRadius = '4px';
  htmlContainer.style.display = 'none';  // ✅ 처음에 숨김

  // 2. 스타일된 HTML 컨테이너
  const styledContainer = document.createElement('div');
  styledContainer.style.maxHeight = '200px';
  styledContainer.style.overflowY = 'auto';
  styledContainer.style.border = '1px solid #ddd';
  styledContainer.style.padding = '8px';
  styledContainer.style.marginTop = '8px';
  if (styledHTML) {
    styledContainer.innerHTML = styledHTML;
    console.log(styledContainer)
  }

  const roleInput = document.createElement('input');
  roleInput.type = 'text';
  roleInput.placeholder = '예: 제목, 설명, 가격';
  roleInput.value = message.role || guessRoleFromSelector(html);
  roleInput.style.width = '160px';
  roleInput.style.marginRight = '8px';
  roleInput.setAttribute('data-selector', selector);
  roleInput.setAttribute('data-html', html);



  const toggleHtmlBtn = document.createElement('button');
  toggleHtmlBtn.textContent = '👁️ HTML 보기';
  toggleHtmlBtn.style.marginRight = '8px';

  let htmlVisible = false;

  toggleHtmlBtn.addEventListener('click', () => {
    htmlVisible = !htmlVisible;
    htmlContainer.style.display = htmlVisible ? 'block' : 'none';
    toggleHtmlBtn.textContent = htmlVisible ? '🙈 HTML 숨기기' : '👁️ HTML 보기';
  });


  const copyHtmlBtn = document.createElement('button');
  copyHtmlBtn.textContent = 'HTML 복사';
  copyHtmlBtn.style.marginRight = '8px';
  copyHtmlBtn.addEventListener('click', () => {
    const roleValue = roleInput.value.trim();
    let htmlToCopy = html;
    if (roleValue) {
      htmlToCopy = htmlToCopy.replace(/^<([a-zA-Z0-9\-]+)/, `<$1 role=\"${roleValue}\"`);
    }
    navigator.clipboard.writeText(htmlToCopy)
      .then(() => showToast('✅ HTML 복사되었습니다.'))
      .catch(err => console.error('HTML 복사 실패:', err));
  });

  const copyStyledHtmlBtn = document.createElement('button');
  copyStyledHtmlBtn.textContent = '스타일 복사';
  copyStyledHtmlBtn.style.marginRight = '8px';
  copyStyledHtmlBtn.addEventListener('click', () => {
    const roleValue = roleInput.value.trim();
    let styledToCopy = styledHTML || html;

  // 역할(role) 속성 삽입 (기존에 없을 경우에만)
  if (roleValue) {
    styledToCopy = styledToCopy.replace(
      /^<([a-zA-Z0-9\-]+)/,
      `<$1 role="${roleValue}"`
    );
  }

  navigator.clipboard.writeText(styledToCopy)
    .then(() => showToast('✅ 스타일 복사되었습니다.'))
    .catch(err => console.error('스타일 포함 HTML 복사 실패:', err));
  });


  const copyTextBtn = document.createElement('button');
  copyTextBtn.textContent = '텍스트 복사';
  copyTextBtn.addEventListener('click', () => {
  const tmpDiv = document.createElement('div');
  tmpDiv.innerHTML = html;

  let text = (tmpDiv.innerText || tmpDiv.textContent || '');

  let lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '');

  let joined = [];
  for (let i = 0; i < lines.length; i += 2) {
    const a = lines[i];
    const b = lines[i + 1] || '';
    joined.push(a + b);
  }

  text = joined.join('\n');

  const role = roleInput.value.trim();
  const textToCopy = role ? `[${role}]\n${text}` : text;

  navigator.clipboard.writeText(textToCopy)
    .then(() => showToast('✅ 텍스트가 복사되었습니다.'))
    .catch(err => console.error('텍스트 복사 실패:', err));
  });



  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '삭제';

  const topControl = document.createElement('div');
  topControl.style.display = 'flex';
  topControl.style.alignItems = 'center';
  topControl.style.gap = '8px';
  topControl.style.marginBottom = '8px';

  //topControl.appendChild(roleLabel);
  topControl.appendChild(roleInput);
  topControl.appendChild(toggleHtmlBtn);
  topControl.appendChild(copyHtmlBtn);
  topControl.appendChild(copyStyledHtmlBtn);
  topControl.appendChild(copyTextBtn);
  topControl.appendChild(deleteBtn);

  const info = document.createElement('p');
  info.textContent = '선택된 요소: ' + selector;
  info.style.fontSize = '13px';
  info.style.color = '#555';
  info.style.margin = '4px 0';

  block.appendChild(topControl);
  // block.appendChild(info); // 필요 시 주석 해제
  block.appendChild(htmlContainer);
  block.appendChild(styledContainer);

  resultContainer.prepend(block);

  // ✅ styledHTML이 없으면 자동 추출 실행
if (!styledHTML) {
  try {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const cleanedHTML = temp.innerHTML.trim();

    const parseTemp = document.createElement('div');
    parseTemp.innerHTML = cleanedHTML;

    const el = parseTemp.querySelector('*'); // 가장 첫 요소 선택

    if (el) {
      inlineStyles(el); // 🔥 업그레이드 스타일 함수 적용
      styledContainer.innerHTML = el.outerHTML;
      updateStyledHTML(selector, html, el.outerHTML);
    }
  } catch (err) {
    console.warn('❌ 스타일 추출 실패:', err);
  }
}

  return { roleInput, deleteBtn, block };

}

// ✅ 사이드바에 잠깐 표시되는 알림 메시지 생성 함수
function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#4caf50',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    fontSize: '14px',
    zIndex: 9999,
    opacity: '0',
    transition: 'opacity 0.3s ease'
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.addEventListener('transitionend', () => toast.remove());
  }, 2000);
}
/**
 * 지정된 DOM 노드와 그 자식 요소에 대해 주요 CSS 속성을 인라인 스타일로 적용합니다.
 * - getComputedStyle()을 기반으로 실제 렌더링된 스타일을 추출
 * - 자식 요소들도 재귀적으로 처리
 * - 불필요한 기본값은 제외하여 HTML 간결화
 */
function inlineStyles(node) {
  if (!(node instanceof Element)) return;

  const computed = getComputedStyle(node);
  const styles = [
    'fontSize',
    'fontWeight',
    'fontStyle',
    'textDecoration',
    'color',
    'backgroundColor',
    'lineHeight',
    'letterSpacing',
    'textAlign',
    'whiteSpace',
    'display',
    'padding',
    'margin',
    'border',
    'borderRadius'
  ];

  let styleText = '';
  for (const prop of styles) {
    const value = computed[prop];
    if (value && value !== 'initial' && value !== 'normal' && value !== '0px' && value !== 'none') {
      const kebab = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
      styleText += `${kebab}:${value};`;
    }
  }

  node.setAttribute('style', (node.getAttribute('style') || '') + styleText);

  Array.from(node.children).forEach(inlineStyles);
}



// ✅ 상단 컨트롤 버튼들 생성 (요소 선택, 취소, 삭제, JSON 저장)
export async function createControlButtons() {
  const div = document.getElementById('content');
  
  // Helper: 신규 에디터 콘텐츠 저장
  async function addEditorContentInDB(timestamp, content) {
    const db = await openDatabase();
    const tx = db.transaction('editorContent', 'readwrite');
    tx.objectStore('editorContent').add({ timestamp, content });
    return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  }

  
    // Helper: editorContent 업데이트 (기존 레코드 수정)
    async function updateEditorContentInDB(timestamp, content) {
      const db = await openDatabase();
      const tx = db.transaction('editorContent', 'readwrite');
      const store = tx.objectStore('editorContent');
      store.put({ timestamp, content });
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

  // Helper: editorContent 삭제
  async function deleteEditorContentInDB(timestamp) {
    const db = await openDatabase();
    const tx = db.transaction('editorContent', 'readwrite');
    const store = tx.objectStore('editorContent');
    store.delete(timestamp);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
 /* 
  const infoContainer = document.createElement('div');
  infoContainer.id = 'infoContainer';
  infoContainer.style.background = '#fafafa';
  infoContainer.style.border = '1px solid #ddd';
  infoContainer.style.padding = '12px';
  infoContainer.style.borderRadius = '8px';
  infoContainer.style.marginBottom = '12px';

  const desc = document.createElement('p');
  desc.textContent = '✨ 페이지에서 요소를 선택하고 텍스트를 추출할 수 있습니다.';
  desc.style.margin = '0';
  desc.style.fontSize = '14px';
  desc.style.color = '#444';

  infoContainer.appendChild(desc);
  div.appendChild(infoContainer);
*/
 // 메모 기록
 const entriesContainer = document.createElement('div');
 Object.assign(entriesContainer.style, { margin: '8px 0', padding: '8px', border: '1px solid #ddd', background: '#fff' });
 const header = document.createElement('strong');
 header.textContent = '📜 메모 기록';
 Object.assign(header.style, { display: 'block', marginBottom: '6px' });
 entriesContainer.append(header);

 let selectedTimestamp = null;
 let selectedLi = null;
 let ul;

 // 초기 로드
  try {
    // 🆕 먼저 chrome.storage.local 백업 시도
    const { memoBackup } = await new Promise(res =>
      chrome.storage.local.get('memoBackup', res)
    );
    let items = [];
    if (memoBackup) {
      try {
        items = JSON.parse(memoBackup);
      } catch {
        items = [];
      }
    }
    // 🆕 백업이 비었으면 IndexedDB에서 불러오기
    if (items.length === 0) {
      const db = await openDatabase();
      const tx = db.transaction('editorContent', 'readonly');
      const store = tx.objectStore('editorContent');
      items = await new Promise((res, rej) => {
        const req = store.getAll();
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
    }
    if (items.length === 0) {
      const noData = document.createElement('div');
      noData.textContent = '저장된 메모가 없습니다.';
      Object.assign(noData.style, { fontSize: '13px', color: '#888' });
      entriesContainer.append(noData);
    } else {
      items.sort((a, b) => b.timestamp - a.timestamp);
      ul = document.createElement('ul'); Object.assign(ul.style, { listStyle: 'none', padding: 0 });
      items.forEach(item => {
        const li = document.createElement('li');
        const date = new Date(item.timestamp).toLocaleString();
        li.textContent = `${date}: ${item.content}`;
        Object.assign(li.style, { fontSize: '13px', marginBottom: '4px', cursor: 'pointer' });
        li.addEventListener('click', () => {
          if (selectedLi) selectedLi.style.background = '';
          li.style.background = '#e0f0ff';
          selectedLi = li; selectedTimestamp = item.timestamp;
          editor.innerText = item.content;
        });
        ul.append(li);
      });
      entriesContainer.append(ul);
    }
  } catch (err) { console.error('메모 기록 불러오기 오류:', err); }

    div.appendChild(entriesContainer);

  // 텍스트 에디터 및 삭제 버튼 컨테이너
  const editorContainer = document.createElement('div');
  Object.assign(editorContainer.style, { display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '20px' });
  
  const editor = document.createElement('div');
  editor.id = 'editor';
  editor.contentEditable = 'true';
  Object.assign(editor.style, { border: '1px solid #ccc', padding: '10px', flex: '1' });
  const savedContent = await loadLatestEditorContent();
  editor.textContent = savedContent;
  
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️ 메모 삭제';
  Object.assign(deleteBtn.style, { padding: '6px', marginTop: '4px' });
  
  deleteBtn.addEventListener('click', async () => {
    if (!selectedTimestamp) return;
    try {
      // 1) IndexedDB에서 메모 삭제
      await deleteEditorContentInDB(selectedTimestamp);
      // 2) UI에서 항목 제거 및 에디터 초기화
      if (selectedLi) selectedLi.remove();
      const ts = selectedTimestamp;
      selectedLi = null;
      selectedTimestamp = null;
      editor.textContent = '';

      // 3) chrome.storage.local의 memoBackup 배열에서도 해당 항목 제거
      const { memoBackup } = await new Promise(res =>
        chrome.storage.local.get('memoBackup', res)
      );
      const arr = memoBackup ? JSON.parse(memoBackup) : [];
      const updated = arr.filter(item => item.timestamp !== ts);
      await new Promise(res =>
        chrome.storage.local.set({ memoBackup: JSON.stringify(updated) }, res)
      );
    } catch (e) {
      console.warn('⚠️ 메모 삭제 및 백업 갱신 실패:', e);
    }
  });



  editorContainer.append(editor, deleteBtn);
  div.append(editorContainer);
  
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'buttonContainer';

  const pickerBtn = document.createElement('button');
  pickerBtn.textContent = '요소 선택 모드';
  pickerBtn.id = 'pickerBtn';
  buttonContainer.appendChild(pickerBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '선택 모드 취소';
  cancelBtn.id = 'cancelBtn';
  buttonContainer.appendChild(cancelBtn);

  const clearBtn = document.createElement('button');
  clearBtn.textContent = '전체 삭제';
  clearBtn.id = 'clearBtn';
  buttonContainer.appendChild(clearBtn);

  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = '📁 JSON 내보내기';
  downloadBtn.id = 'downloadBtn';
  buttonContainer.appendChild(downloadBtn);


  div.appendChild(buttonContainer);

  // 메모 선택 취소: entriesContainer 외부 & deleteBtn 제외
  document.addEventListener('click',e=>{
    const t=e.target;
    if(selectedLi && !entriesContainer.contains(t) && !editorContainer.contains(t) && t!==deleteBtn) {
      selectedLi.style.background=''; selectedLi=null; selectedTimestamp=null;
      editor.textContent='';
    }
  },true);

  // 입력 감지 및 실시간 업데이트
  editor.addEventListener('input', async () => {
    const content = editor.innerText;
    if (selectedTimestamp) {
      await updateEditorContentInDB(selectedTimestamp, content);
      if (selectedLi) selectedLi.textContent = `${new Date(selectedTimestamp).toLocaleString()}: ${content}`;
    } else {
      const ts = Date.now();
      await addEditorContentInDB(ts, content);
      // 🆕 실시간 추가
      if (!ul) {
        ul = document.createElement('ul'); Object.assign(ul.style, { listStyle: 'none', padding: 0 });
        entriesContainer.innerHTML = '';
        entriesContainer.append(header, ul);
      }
      const li = document.createElement('li');
      li.textContent = `${new Date(ts).toLocaleString()}: ${content}`;
      Object.assign(li.style, { fontSize: '13px', marginBottom: '4px', cursor: 'pointer' });
      li.addEventListener('click', () => {
        if (selectedLi) selectedLi.style.background = '';
        li.style.background = '#e0f0ff'; selectedLi = li; selectedTimestamp = ts;
        editor.textContent = content;
      });
      ul.prepend(li);
      selectedLi = li; selectedTimestamp = ts;
    }
  });

}
