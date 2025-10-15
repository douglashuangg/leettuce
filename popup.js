// Popup script

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  
  // Update username title
  updateUsernameTitle();
});

async function syncData() {
  const statusEl = document.getElementById('status');
  const syncButton = document.getElementById('syncButton');
  const usernameInput = document.getElementById('usernameInput');
  
  let username = usernameInput.value.trim();
  
  // If no username entered, try auto-detection
  if (!username) {
    statusEl.textContent = 'Trying to auto-detect username...';
    statusEl.className = 'status';
  }
  
  // Disable button
  syncButton.disabled = true;
  syncButton.textContent = '⏳ Syncing...';
  statusEl.textContent = 'Checking if on LeetCode...';
  statusEl.className = 'status';
  
  // Check if user is on a LeetCode tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url || !tab.url.includes('leetcode.com')) {
    statusEl.textContent = '⚠️ Please open leetcode.com first, then sync!';
    statusEl.className = 'status';
    syncButton.disabled = false;
    syncButton.textContent = '🔄 Sync Now';
    return;
  }
  
  statusEl.textContent = 'Sending sync request to LeetCode page...';
  
  try {
    // Send message to content script to do the API call (has access to cookies)
    chrome.tabs.sendMessage(tab.id, { action: 'syncProblems', username: username }, (response) => {
      if (chrome.runtime.lastError) {
        statusEl.textContent = '✗ Error: Please refresh the LeetCode page and try again.';
        statusEl.className = 'status';
        syncButton.disabled = false;
        syncButton.textContent = '🔄 Sync Now';
        return;
      }
      
      if (response && response.success) {
        chrome.storage.local.set({
          problemData: response.problems,
          lastUpdated: Date.now(),
          username: username
        }, () => {
          statusEl.textContent = `✓ Synced ${response.problems.length} problems!`;
          statusEl.className = 'status success';
          loadStats();
          syncButton.disabled = false;
          syncButton.textContent = '🔄 Sync Now';
        });
      } else {
        statusEl.textContent = '✗ ' + (response?.error || 'Failed to sync');
        statusEl.className = 'status';
        syncButton.disabled = false;
        syncButton.textContent = '🔄 Sync Now';
      }
    });
    return; // Exit early since we're using callback
  } catch (error) {
    console.error('Sync error:', error);
    statusEl.textContent = '✗ Error: ' + error.message;
    statusEl.className = 'status';
    syncButton.disabled = false;
    syncButton.textContent = '🔄 Sync Now';
  }
}

function loadStats() {
  chrome.storage.local.get(['problemData', 'lastUpdated', 'username'], (result) => {
    const problems = result.problemData || [];
    const lastUpdated = result.lastUpdated;
    const username = result.username;
    
    // Update total count
    document.getElementById('totalProblems').textContent = problems.length;
    
    // Update username title
    updateUsernameTitle();
    
    // Calculate freshness categories
    const now = Date.now();
    let fresh = 0, needReview = 0;
    
    problems.forEach(problem => {
      const daysSince = Math.floor((now - problem.timestamp * 1000) / (1000 * 60 * 60 * 24));
      if (daysSince <= 7) fresh++;
      if (daysSince >= 90) needReview++;
    });
    
    document.getElementById('fresh').textContent = fresh;
    document.getElementById('needReview').textContent = needReview;
    
    // Update last updated
    // Update status message
    if (problems.length === 0) {
      document.getElementById('status').textContent = 'No data yet. Auto-sync in progress...';
      document.getElementById('status').className = 'status';
    } else {
      document.getElementById('status').textContent = '';
      document.getElementById('status').className = 'status';
    }
  });
}

function updateUsernameTitle() {
  chrome.storage.local.get(['username'], (result) => {
    const username = result.username;
    const titleEl = document.getElementById('usernameTitle');
    
    console.log('🔍 Popup checking for username:', username);
    
    if (username) {
      titleEl.textContent = `@${username}`;
      console.log('✅ Username found:', username);
    } else {
      titleEl.textContent = 'Leettuce';
      console.log('❌ No username found in storage');
    }
  });
}

function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
  return Math.floor(seconds / 86400) + ' days ago';
}

