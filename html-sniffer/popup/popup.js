document.getElementById('btn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: () => alert('팝업 버튼이 클릭되었습니다!')
    });
  });
});