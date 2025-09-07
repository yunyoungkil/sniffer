//background.js
chrome.runtime.onInstalled.addListener(() => {
    console.log('확장 프로그램 설치됨');
    // 액션 아이콘 클릭 시 sidePanel 열리도록 설정
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch(err => console.error('sidePanel.setPanelBehavior 오류:', err));
  });

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "sidebar-lifecycle") {
      console.log('📥 사이드바 열림');
  
      port.onDisconnect.addListener(() => {
        console.log('📤 사이드바 닫힘 → 요소 선택 해제 실행');
  
        // 현재 탭에 cancelPicker.js 실행
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]) return;
  
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id, allFrames: true },
            files: ['cancelPicker.js']
          });
        });
      });
    }
  });


