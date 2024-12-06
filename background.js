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

  let promptDiv1 = document.querySelector('.mantine-Text-root.text-sm.mantine-14lhcb9');
  let promptDiv2 = document.querySelector('.mantine-Text-root.text-sm.mantine-1c2skr8');

  // Fallbacks for each prompt div if not found
  if (!promptDiv1) {
    promptDiv1 = document.querySelector('h2.prompt') || document.querySelector('div.prompt');
  }
  if (!promptDiv2) {
    promptDiv2 = document.querySelector('h2.prompt') || document.querySelector('div.prompt');
  }

  // Extract text from the prompt divs if they exist
  const promptText1 = promptDiv1 ? promptDiv1.textContent : '';
  const promptText2 = promptDiv2 ? promptDiv2.textContent : '';

  // Combine the prompt texts
  const promptText = `${promptText1} ${promptText2}`.trim();

  // Return image URLs and combined prompt text as an object
  return { imageUrls: images, promptText };
}
