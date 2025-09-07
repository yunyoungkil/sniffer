// events.js

import { openDatabase, updateRoleInDB, deleteElementFromDB } from './db.js';
import { updateRoleListUI } from './roleList.js';

// ✅ 역할 입력창 이벤트 연결
export function addRoleInputEvents(roleInput, message) {
  roleInput.addEventListener('input', async () => {
    const selector = roleInput.getAttribute('data-selector');
    const html = roleInput.getAttribute('data-html');
    const newRole = roleInput.value.trim();

    message.role = newRole; // 로컬에도 업데이트

    await updateRoleInDB(selector, html, newRole);
    setTimeout(updateRoleListUI, 100); // 수정 후 역할 목록 갱신
    console.log('✅ 역할(role) 실시간 수정 완료:', newRole);
  });
}

// ✅ 삭제 버튼 이벤트 연결
export function addDeleteButtonEvents(deleteBtn, message, block) {
  deleteBtn.addEventListener('click', async () => {
    const xpath = message.xpath;
    const selector = message.selector;
    const html = message.html;
    
    console.log(message);
    
    // 1. 현재 탭에 content script로 강조 해제 요청
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'CLEAR_ELEMENT_HIGHLIGHT',
          xpath: xpath
        }).catch((error) => {
          console.warn('❌ content script 연결 실패 (무시):', error.message);
        });
      }
    });

    // 2. IndexedDB 삭제
    const db = await openDatabase();
    const tx = db.transaction('elements', 'readonly');
    const store = tx.objectStore('elements');
    const request = store.getAll();

    request.onsuccess = async () => {
      const items = request.result;
      const match = items.find(item => item.selector === selector && item.html === html);

      if (!match) {
        console.warn('❌ 삭제할 데이터 찾을 수 없음');
        return;
      }

      await deleteElementFromDB(match.id);

      block.remove();           // 3. 사이드바 블록 삭제
      updateRoleListUI();       // 4. 역할 목록 갱신
      console.log('🗑️ 삭제 완료 + 강조 제거 요청 완료');
      // 🆕 백업 업데이트: chrome.storage.local의 htmlSnifferBackup 수정
      chrome.storage.local.get('htmlSnifferBackup', data => {
        if (!data.htmlSnifferBackup) return;
        try {
          const backup = JSON.parse(data.htmlSnifferBackup);
          if (Array.isArray(backup.captured_elements)) {
            backup.captured_elements = backup.captured_elements.filter(e =>
              !(e.selector === selector && e.html === html)
            );
          }
          chrome.storage.local.set({ htmlSnifferBackup: JSON.stringify(backup) });
        } catch (err) {
          console.warn('⚠️ 백업 업데이트 실패:', err);
        }
      });
    };

    request.onerror = () => {
      console.error('❌ 삭제 실패:', request.error);
    };
  });
}


