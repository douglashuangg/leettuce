// Background service worker for LeetCode Problem Freshness

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('LeetCode Problem Freshness installed!');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveProgress') {
    // Save the scraped progress data
    chrome.storage.local.set({
      problemData: request.data,
      lastUpdated: Date.now()
    }, () => {
      console.log('Progress data saved:', request.data.length, 'problems');
      sendResponse({ success: true });
    });
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'getProgress') {
    // Retrieve progress data
    chrome.storage.local.get(['problemData', 'lastUpdated'], (result) => {
      sendResponse({
        data: result.problemData || [],
        lastUpdated: result.lastUpdated || null
      });
    });
    return true; // Will respond asynchronously
  }
});

