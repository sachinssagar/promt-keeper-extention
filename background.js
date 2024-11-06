// Listener for messages sent from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_IMAGES_AND_PROMPT') {
    chrome.scripting.executeScript(
      {
        target: { tabId: message.tabId },
        function: getContentFromPage,
      },
      (results) => {
        if (results && results[0].result) {
          const { imageUrls, promptText } = results[0].result;
          sendResponse({ imageUrls, promptText });
        }
      },
    );
    return true;
  }
});

// Content script function
function getContentFromPage() {
  const images = Array.from(document.querySelectorAll('img')).map((img) => img.src);

  let promptDiv = document.querySelector('h2.prompt');
  if (!promptDiv) {
    promptDiv = document.querySelector('div.prompt');
  }
  // const promptDiv = document.querySelector('.mantine-Text-root.text-sm.mantine-1c2skr8');
  const promptText = promptDiv ? promptDiv.textContent : ''; // Extract text from the div if it exists
  return { imageUrls: images, promptText };
}
