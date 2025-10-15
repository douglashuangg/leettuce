// Content script for leetcode.com/progress page
// Scrapes solved problems and their completion dates

console.log('LeetCode Progress Scraper loaded');

// Send progress updates
function sendProgress(message) {
  chrome.runtime.sendMessage({
    action: 'scrapingProgress',
    message: message
  });
}

// Function to scrape progress data from the page
function scrapeProgressData() {
  console.log('Attempting to scrape progress...');
  sendProgress('Starting data scrape...');
  
  // Use the GraphQL API approach
  fetchProgressViaAPI();
}

async function fetchProgressViaAPI() {
  console.log('Fetching progress via LeetCode API...');
  sendProgress('Finding your username...');
  
  // Get the current user from the page
  const username = getCurrentUsername();
  
  if (!username) {
    console.error('Could not determine username');
    showNotification('Please make sure you are logged in to LeetCode');
    chrome.runtime.sendMessage({
      action: 'scrapingComplete',
      success: false,
      error: 'Username not found'
    });
    return;
  }
  
  console.log('Found username:', username);
  sendProgress(`Found username: ${username}`);
  
  // Fetch recent submissions (up to 100)
  sendProgress('Fetching submissions from LeetCode API...');
  
  const query = `
    query recentSubmissions($username: String!, $limit: Int!) {
      recentSubmissionList(username: $username, limit: $limit) {
        title
        titleSlug
        timestamp
        statusDisplay
        lang
      }
    }
  `;
  
  try {
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: { 
          username: username,
          limit: 100
        }
      })
    });
    
    sendProgress('Processing submission data...');
    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      chrome.runtime.sendMessage({
        action: 'scrapingComplete',
        success: false,
        error: 'GraphQL error'
      });
      return;
    }
    
    if (!data.data.recentSubmissionList) {
      console.error('No submission data found');
      chrome.runtime.sendMessage({
        action: 'scrapingComplete',
        success: false,
        error: 'No submissions found'
      });
      return;
    }
    
    sendProgress('Filtering accepted submissions...');
    
    // Process submissions - keep only the most recent accepted solution for each problem
    const acceptedProblems = new Map();
    data.data.recentSubmissionList.forEach(sub => {
      if (sub.statusDisplay === 'Accepted') {
        const existing = acceptedProblems.get(sub.titleSlug);
        if (!existing || parseInt(sub.timestamp) > parseInt(existing.timestamp)) {
          acceptedProblems.set(sub.titleSlug, {
            title: sub.title,
            titleSlug: sub.titleSlug,
            timestamp: parseInt(sub.timestamp),
            lang: sub.lang,
            dateCompleted: new Date(parseInt(sub.timestamp) * 1000).toISOString()
          });
        }
      }
    });
    
    const problemsArray = Array.from(acceptedProblems.values());
    console.log('Found', problemsArray.length, 'accepted problems');
    
    sendProgress(`Saving ${problemsArray.length} problems to storage...`);
    
    // Save to storage
    chrome.runtime.sendMessage({
      action: 'saveProgress',
      data: problemsArray
    }, (response) => {
      if (response && response.success) {
        showNotification(`✓ Successfully synced ${problemsArray.length} problems!`);
        chrome.runtime.sendMessage({
          action: 'scrapingComplete',
          success: true,
          count: problemsArray.length
        });
      }
    });
    
  } catch (error) {
    console.error('Error fetching progress:', error);
    showNotification('✗ Error loading progress. Please refresh and try again.');
    chrome.runtime.sendMessage({
      action: 'scrapingComplete',
      success: false,
      error: error.message
    });
  }
}

function getCurrentUsername() {
  // Try to get username from the page
  // Method 1: From URL
  const urlMatch = window.location.pathname.match(/\/progress\/([^\/]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  
  // Method 2: From user menu/avatar
  const userAvatar = document.querySelector('[data-cypress="avatar"]');
  if (userAvatar) {
    const username = userAvatar.getAttribute('alt');
    if (username) return username;
  }
  
  // Method 3: From any visible username elements
  const usernameElement = document.querySelector('.username, [class*="username"]');
  if (usernameElement) {
    return usernameElement.textContent.trim();
  }
  
  return null;
}

function showNotification(message) {
  // Create a floating notification
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #2e7d32;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-size: 14px;
    font-weight: 600;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Auto-run when page loads
setTimeout(scrapeProgressData, 2000);

