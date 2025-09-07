# 📦 Sidebar 프로젝트 모듈 설명서

이 프로젝트는 기능별로 다음과 같이 파일을 분리하여 관리합니다.

---

## 1. db.js
> 📂 데이터베이스(IndexedDB) 관련 모든 작업을 담당합니다.

- `openDatabase()`: 데이터베이스 연결 (ElementCaptureDB 생성)
- `saveElementToDB(item)`: 새로운 요소를 DB에 저장
- `updateRoleInDB(selector, html, newRole)`: 요소의 role만 업데이트
- `loadElementsFromDB()`: 모든 요소를 DB에서 불러오기
- `deleteElementFromDB(id)`: 요소를 ID로 삭제

---

## 2. ui.js
> 🖥️ 화면 렌더링 관련 기능을 담당합니다.

- `clearResultContainer()`: 저장된 요소 출력 영역 초기화
- `renderElement(message)`: 하나의 요소(선택된 HTML 요소)를 사이드바에 표시

---

## 3. roleList.js
> 🏷️ 역할(role) 목록 생성 및 필터링 기능을 담당합니다.

- `updateRoleListUI()`: 현재 DB에 저장된 role 목록을 표시
- `filterByRole(role)`: 특정 role만 필터링해서 사이드바에 표시

---

## 4. events.js
> 🎯 이벤트 바인딩(입력, 클릭 등)만 전문적으로 처리합니다.

- `addRoleInputEvents(roleInput, message)`: 역할 입력 필드에 실시간 저장 이벤트 추가
- `addDeleteButtonEvents(deleteBtn, message, block)`: 삭제 버튼에 삭제 동작 이벤트 추가

---

## 5. main.js
> 🚀 프로그램 전체 흐름을 통제하는 진입 파일입니다.

- Chrome 확장 프로그램 메시지 수신 (`chrome.runtime.onMessage`)
- 초기 로딩 시 DB 데이터 불러오기
- 새 데이터 수신 → 저장 → 렌더링 → 이벤트 바인딩 연결

---

# ✨ 프로젝트 흐름 요약

1. 사용자가 요소를 선택하면 메시지(`ELEMENT_SELECTED`) 수신
2. `saveElementToDB`로 DB 저장
3. 저장 완료 후 `renderElement`로 화면에 표시
4. role을 수정하거나 삭제하면 DB와 화면이 동기화
5. 역할별 필터링 가능 (role 클릭)

---

# 🧠 추가 규칙

- 모든 함수는 **async/await 기반**으로 비동기 제어
- 모든 요소 조작은 `resultContainer`, `roleListContainer`를 기준
- DB 트랜잭션은 항상 `tx.complete` 또는 `onsuccess` 이후에 다음 동작 실행
