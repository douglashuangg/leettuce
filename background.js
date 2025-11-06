// Background service worker for LeetCode Problem Freshness

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  // Extension installed
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveProgress') {
    // Save the scraped progress data
    chrome.storage.local.set({
      problemData: request.data,
      lastUpdated: Date.now()
    }, () => {
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

