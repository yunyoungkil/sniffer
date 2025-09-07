// roleList.js (다대다 카테고리 매핑 적용)

import { openDatabase, loadElementsFromDB } from './db.js';
import { clearResultContainer, renderElement } from './ui.js';
import { addRoleInputEvents, addDeleteButtonEvents } from './events.js';

// ✅ 역할 → 키워드 기반 카테고리 사전
const categoryKeywordMap = {
  '검색어': ['자동완성', '검색어'],
  '네이버': ['네이버'],
  '기사': ['기사'],
  '구글': ['구글'],
  '관련': ['관련'],
  '지식': ['FAQ','지식iN'],
  '경쟁 블로그':['경쟁'],
  '참고 블로그':['참고'],
  '유튜브': ['유튜브'],
  '쿠팡': ['쿠팡'],

};


// ✅ 역할 문자열로부터 다중 카테고리 추출
export function getCategoriesFromRole(role) {
  if (!role) return ['기타'];
  const plain = role.replace(/[\[\]]/g, '');
  const words = plain.split(/\s+/);
  const categories = new Set();

  for (const [category, keywords] of Object.entries(categoryKeywordMap)) {
    if (words.some(word => keywords.includes(word))) {
      categories.add(category);
    }
  }

  return categories.size ? Array.from(categories) : ['기타'];
}

// ✅ 역할 목록 트리 형태로 렌더링
export async function updateRoleListUI(preserved = {}) {
  const db = await openDatabase();
  const tx = db.transaction("elements", "readonly");
  const store = tx.objectStore("elements");
  const request = store.getAll();

  // 🔸 펼쳐진 카테고리 상태 저장
  const expandedCategories = preserved.expandedCategories || new Set(
    Array.from(document.querySelectorAll('#roleListContainer details[open] summary'))
      .map(s => s.textContent?.replace('📁 ', '').trim())
  );

  request.onsuccess = () => {
    const items = request.result;
    const roleListContainer = document.getElementById('roleListContainer');
    if (!roleListContainer) return;

    if (!items.length) {
      roleListContainer.innerHTML = '<strong>📋 현재 수집된 역할(role)</strong><br>아직 없음';
      return;
    }

    const roleCountMap = {};
    items.forEach(item => {
      const role = item.role || '(미지정)';
      roleCountMap[role] = (roleCountMap[role] || 0) + 1;
    });

    const categoryMap = {};
    Object.entries(roleCountMap).forEach(([role, count]) => {
      const categories = getCategoriesFromRole(role);
      categories.forEach(category => {
        if (!categoryMap[category]) categoryMap[category] = [];
        categoryMap[category].push({ role, count });
      });
    });

    let html = `<strong>📋 역할 분류별 보기</strong><ul class="role-tree">`;
    html += `<li><span class="role-item" data-role="all" style="color:blue; cursor:pointer;">전체보기</span></li>`;

    for (const [category, roles] of Object.entries(categoryMap)) {
      const isOpen = expandedCategories.has(category);
      html += `<li><details${isOpen ? ' open' : ''}><summary draggable="true" data-category="${category}">📁 ${category}</summary><ul>`;
      roles.forEach(({ role, count }) => {
        html += `<li><span class="role-item" data-role="${role}">${role} (${count})</span></li>`;
      });
      html += `</ul></details></li>`;
    }

    html += `</ul>`;
    roleListContainer.innerHTML = html;

  document.querySelectorAll('.role-item').forEach(el => {
    el.addEventListener('click', (e) => {
      const selectedRole = e.target.getAttribute('data-role');
      filterByRole(selectedRole);
    });
  });
      
  // ✅ 역할 아이템 드래그 이벤트
  document.querySelectorAll('.role-item').forEach(el => {
    el.setAttribute('draggable', true);
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('type', 'role');
      e.dataTransfer.setData('value', el.dataset.role);
    });
  });

  // ✅ 카테고리 summary 드래그 이벤트
  document.querySelectorAll('summary[draggable]').forEach(summary => {
    summary.addEventListener('dragstart', e => {
      e.dataTransfer.setData('type', 'category');
      e.dataTransfer.setData('value', summary.dataset.category);
    });
  });
  };

  request.onerror = () => {
    console.error('❌ 역할 목록 불러오기 실패');
  };
}



// ✅ 역할 필터링
export async function filterByRole(role) {
  const items = await loadElementsFromDB();
  const resultContainer = document.getElementById('resultContainer');
  if (!resultContainer) return;

  clearResultContainer();

  const filteredItems = role === 'all'
    ? items
    : items.filter(item => {
        const roleStr = item.role || '(미지정)';
        return roleStr === role || roleStr.includes(role);
      });

  filteredItems.sort((a, b) => b.timestamp - a.timestamp);

  filteredItems.forEach(item => {
    const { roleInput, deleteBtn, block } = renderElement(item);
    addRoleInputEvents(roleInput, item);
    addDeleteButtonEvents(deleteBtn, item, block);
  });

  console.log(`✅ 필터링 완료: ${role} (${filteredItems.length}개)`);
}

// 🔄 외부에서 펼친 상태 유지하며 갱신할 수 있게 export
export function preserveAndUpdateRoleListUI() {
  const expandedCategories = new Set(
    Array.from(document.querySelectorAll('#roleListContainer details[open] summary'))
      .map(s => s.textContent?.replace('📁 ', '').trim())
  );
  updateRoleListUI({ expandedCategories });
}