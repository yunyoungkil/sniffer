// db.js
import { extractText, extractImageSources } from './helpers.js';

// ✅ IndexedDB 열기
export function openDatabase() {
  return new Promise((resolve, reject) => {
    // 버전을 6으로 올려서 스키마 재초기화
    const request = indexedDB.open("ElementCaptureDB", 6);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      const oldVersion = e.oldVersion;
      const newVersion = e.newVersion;

      console.log(`🔄 DB 업그레이드: ${oldVersion} -> ${newVersion}`);

      // 기존 스토어 삭제
      if (db.objectStoreNames.contains("elements")) {
        db.deleteObjectStore("elements");
      }
      if (db.objectStoreNames.contains("editorContent")) {
        db.deleteObjectStore("editorContent");
      }

      // elements 스토어 새로 생성
      const elementsStore = db.createObjectStore("elements", { keyPath: "id", autoIncrement: true });
      elementsStore.createIndex("timestamp", "timestamp", { unique: false });
      console.log("✅ elements 스토어 생성됨");

      // editorContent 스토어 새로 생성
      const editorStore = db.createObjectStore("editorContent", { keyPath: "timestamp" });
      console.log("✅ editorContent 스토어 생성됨");
    };
  });
}

// ✅ 요소 저장 함수 수정
export async function saveElementToDB(item) {
    const db = await openDatabase();
    const tx = db.transaction("elements", "readwrite");
    const store = tx.objectStore("elements");
  
    const cleanItem = {
      selector: item.selector,
      xpath: item.xpath,
      html: item.html,
      styledHTML: item.styledHTML,
      textContent: item.textContent || extractText(item.html),
      images: extractImageSources(item.html),  // ✅ 이미지 링크 저장
      role: item.role || "기타",
      page_url: item.page_url || 'unknown',
      timestamp: Date.now()
    };
  
    store.add(cleanItem);
    return tx.complete;
  }

// ✅ 요소 모두 불러오기
export async function loadElementsFromDB() {
  const db = await openDatabase();
  const tx = db.transaction("elements", "readonly");
  const store = tx.objectStore("elements");
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ✅ 요소 전체 삭제
export async function clearAllElements() {
  const db = await openDatabase();
  const tx = db.transaction("elements", "readwrite");
  await tx.objectStore("elements").clear();
  return tx.complete;
}

// ✅ styledHTML 업데이트
export async function updateStyledHTML(selector, html, styledHTML) {
    const db = await openDatabase();
    const tx = db.transaction("elements", "readwrite");
    const store = tx.objectStore("elements");
  
    const getAllRequest = store.getAll();
    getAllRequest.onsuccess = () => {
      const all = getAllRequest.result;
      const match = all.find(e => e.selector === selector && e.html === html);
      if (!match) return;
  
      store.delete(match.id);
  
      const newItem = {
        ...match,
        styledHTML,
        textContent: extractText(match.html) || '',
        timestamp: Date.now()
      };
  
      store.add(newItem);
  
      console.log("✅ styledHTML + 텍스트 저장 완료");
    };
  }
  

// ✅ 역할(role) 수정
export async function updateRoleInDB(selector, html, newRole) {
  const db = await openDatabase();
  const tx = db.transaction("elements", "readwrite");
  const store = tx.objectStore("elements");

  const getAllRequest = store.getAll();
  getAllRequest.onsuccess = () => {
    const all = getAllRequest.result;
    const match = all.find(e => e.selector === selector && e.html === html);
    if (!match) {
      console.warn('❌ 업데이트할 항목을 찾을 수 없음');
      return;
    }

    store.delete(match.id);
    store.add({
      ...match,
      role: newRole,
      timestamp: Date.now()
    });
    console.log('✅ role 수정 완료:', newRole);
  };
}

// ✅ 개별 요소 삭제
export async function deleteElementFromDB(id) {
  const db = await openDatabase();
  const tx = db.transaction("elements", "readwrite");
  tx.objectStore("elements").delete(id);
  return tx.complete;
}


export async function saveEditorContentToDB(content) {
  let db = null;
  let tx = null;
  
  try {
    // 1. 데이터베이스 연결
    db = await openDatabase();
    
    // 2. 트랜잭션 시작 전 스토어 존재 확인
    if (!db.objectStoreNames.contains("editorContent")) {
      throw new Error("editorContent 스토어가 존재하지 않습니다.");
    }
    
    // 3. 트랜잭션 시작
    tx = db.transaction("editorContent", "readwrite");
    const store = tx.objectStore("editorContent");

    // 4. 데이터 저장
    const item = {
      content: content,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      // 트랜잭션 에러 처리
      tx.onerror = (event) => {
        console.error("❌ 트랜잭션 에러:", event.target.error);
        reject(event.target.error);
      };

      // 트랜잭션 완료 처리
      tx.oncomplete = () => {
        console.log("✅ 에디터 내용이 DB에 저장되었습니다.");
        resolve();
      };

      // 저장 요청
      const request = store.add(item);
      
      request.onerror = (event) => {
        console.error("❌ 저장 요청 에러:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("❌ 에디터 내용 저장 실패:", error);
    throw error;
  } finally {
    // 트랜잭션이 아직 활성 상태라면 중단
    if (tx && tx.state === 'active') {
      tx.abort();
    }
  }
}

// ✅ 에디터 내용 불러오기
export async function loadLatestEditorContent() {
  try {
    const db = await openDatabase();
    const tx = db.transaction("editorContent", "readonly");
    const store = tx.objectStore("editorContent");
    
    // timestamp를 기준으로 내림차순 정렬하여 최신 내용 가져오기
    const request = store.openCursor(null, 'prev');
    
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          resolve(cursor.value.content);
        } else {
          // 저장된 내용이 없는 경우 기본 텍스트 반환
          resolve("명령 프롬프트 또는 메모 입력");
        }
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("❌ 에디터 내용 불러오기 실패:", error);
    // 에러 발생 시에도 기본 텍스트 반환
    return "명령 프롬프트 또는 메모 입력";
  }
}