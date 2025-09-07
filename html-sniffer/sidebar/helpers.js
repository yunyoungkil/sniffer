// helpers.js

// ✅ HTML 문자열에서 텍스트만 추출
export function extractText(htmlString) {
    const temp = document.createElement('div');
    temp.innerHTML = htmlString;
    return temp.textContent.trim();
  }
  
// ✅ 새로 추가: 이미지 src 클린 함수
export function cleanImageUrl(url) {
    if (!url) return '';
    return url.split('?')[0]; // ❌ "?" 이후 쿼리스트링 제거
  }
  
  // ✅ 수정된 이미지 링크 추출 함수
  export function extractImageSources(htmlString) {
    const temp = document.createElement('div');
    temp.innerHTML = htmlString;
    const imgs = temp.querySelectorAll('img');
  
    return Array.from(imgs)
      .map(img => cleanImageUrl(img.getAttribute('src')))  // ✅ 클린 처리 추가
      .filter(src => !!src);
  }

// ✅ HTML 또는 selector를 기반으로 역할(role) 추정
export function guessRoleFromSelector(htmlString) {
  const text = extractText(htmlString);

  // 1) 경쟁 블로그 네이버 (Editor SE component)
  if (/\bse-documentTitle\b/.test(htmlString) || /\bse-section-documentTitle\b/.test(htmlString)) {
    return '[경쟁 블로그 네이버]';
  }

    // 3) 상품 구매 패널 (e.g., class prod-buy with prod-buy-blocker)
  if (/class=["'][^"']*\bprod-buy\b[^"']*["']/.test(htmlString)
      && /class=["'][^"']*\bprod-buy-blocker\b[^"']*["']/.test(htmlString)) {
    return '[가격정보 쿠팡]';
  }
  // 4) 상품 이미지 리스트 (dl.search-product-wrap + adjust-spacing)
  if (/class=["'][^"']*\bsearch-product-wrap\b[^"']*\badjust-spacing\b[^"']*["']/.test(htmlString)
      && /<dt\s+class=["']image["']/.test(htmlString)) {
    return '[상품 리스트 쿠팡]';
  }
    // 4) 추적 URL 입력 필드 (unselectable-input tracking-url-input large)
  if (/class=["'][^"']*\bunselectable-input\b[^"']*\btracking-url-input\b[^"']*\blarge\b[^"']*["']/.test(htmlString)) {
    return '[파트너스 링크 쿠팡]';
  }

  // 4) 이미지 타입 섹션 (type-IMAGE_NO_SPACE + subType-IMAGE)
  if (/class=["'][^"']*\btype-IMAGE_NO_SPACE\b[^"']*["']/.test(htmlString) && /class=["'][^"']*\bsubType-IMAGE\b[^"']*["']/.test(htmlString)) {
    return '[상품 상세페이지]';
  }

  // 2) 텍스트 기반 주요 섹션 매핑
  if (/연관\s*검색어/i.test(text)) {
    return '[연관검색어 네이버]';
  }
  if (/지식iN/i.test(text)) {
    return '[지식iN 네이버]';
  }
  if (/FAQ/i.test(text)) {
    return '[FAQ 네이버]';
  }
  if (/함께\s*많이\s*찾는/i.test(text)) {
    return '[함께 많이 찾는 검색어 네이버]';
  }
  if (/인기주제/i.test(text)) {
    return '[인기주제 네이버]';
  }
  if (/인기글/i.test(text)) {
    return '[인기글 네이버]';
  }
  if (/상품문의/i.test(text)) {
    return '[상품문의 쿠팡]';
  }
  if (/상품평/i.test(text)) {
    return '[상품평 쿠팡]';
  }  
// 유튜브
  if (/스크립트/i.test(text)) {
    return '[스크립트 유튜브]';
  }  


  // 3) 자동완성 검색어 네이버 (kwd_lst + _kwd_list)
  if (/class=["'][^"']*\bkwd_lst\b[^"']*\b_kwd_list\b[^"']*["']/i.test(htmlString)) {
    return '[자동완성 검색어 네이버]';
  }

  // 4) 자동완성 검색어 구글 (jsname=erkvQe)
  if (/jsname=["']erkvQe["']/.test(htmlString) && /class=["'][^"']*\berkvQe\b[^"']*["']/.test(htmlString)) {
    return '[자동완성 검색어 구글]';
  }

  // 5) ARIA role 속성 매핑
  const roleAttr = /role=["']([^"']+)["']/i.exec(htmlString);
  if (roleAttr) {
    const val = roleAttr[1].toLowerCase();
    if (val.includes('list')) return '목록';
    if (val.includes('button')) return '버튼';
    if (val.includes('img') || val.includes('image')) return '이미지';
  }

  // 6) 클래스 속성 기반 일반 매핑
  const classList = [];
  const classRegex = /class=["']([^"']+)["']/g;
  let match;
  while ((match = classRegex.exec(htmlString))) {
    classList.push(...match[1].split(/\s+/));
  }
  const unique = Array.from(new Set(classList));
  for (const cls of unique) {
    if (/date/i.test(cls)) return '날짜';
    if (/price|cost|amount/i.test(cls)) return '가격';
    if (/title|header/i.test(cls)) return '제목';
    if (/desc|content|text/i.test(cls)) return '설명';
    if (/img|image|ico/i.test(cls)) return '이미지';
    if (/list|item|container/i.test(cls)) return '목록';
  }

  // 7) 텍스트 기반 매핑 (fallback)
  if (/title|header/i.test(text)) return '제목';
  if (/price|cost|amount/i.test(text)) return '가격';
  if (/desc|content|text/i.test(text)) return '설명';
  if (/img|image/i.test(text)) return '이미지';

  // 8) 기본값
  return '기타';
}
export function unescapeHtml(str) {
  if (typeof str !== 'string') return str;

  return str
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');
}

export function normalizeRole(role) {
  if (!role || typeof role !== 'string') return '기타';
  return role.trim().replace(/\s+/g, ' ');  // 여러 공백을 하나로 정리
}