// Content script for LeetCode problemset page
// Colors problems based on when they were last solved

let problemData = [];

// Simple username detection via API
async function detectUsername() {
  try {
    const res = await fetch('https://leetcode.com/api/problems/all/', {
      credentials: 'same-origin',
      headers: { 'x-requested-with': 'XMLHttpRequest' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user_name || null;
  } catch (e) {
    return null;
  }
}

// Load problem data from storage
chrome.storage.local.get(['problemData', 'lastUpdated', 'username'], (result) => {
  if (result && result.problemData) {
    problemData = result.problemData;
    applyColors();
  } else {
    autoSync();
  }
});

// Event-driven SPA navigation detection
let currentUrl = location.href;

// Override History API methods
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(history, args);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

history.replaceState = function(...args) {
  originalReplaceState.apply(history, args);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

// Listen for navigation events
window.addEventListener('popstate', () => {
  const newUrl = location.href;
  if (newUrl !== currentUrl) {
    currentUrl = newUrl;
    
    if (newUrl.includes('/problemset/') || newUrl.includes('/problems/')) {
        setTimeout(() => {
        autoSync();
      }, 1500);
    }
  }
});

// Auto-sync function
async function autoSync() {
  const username = await detectUsername();
  if (!username) return;
  
  try {
    const result = await syncProblemsFromPage(username);
    if (result.success) {
      chrome.storage.local.set({
        problemData: result.problems,
        lastUpdated: Date.now(),
        username: username,
        latestTimestamp: result.latestTimestamp
      }, () => {
        problemData = result.problems;
          applyColors();
      });
    }
  } catch (error) {
    // Auto-sync failed silently
  }
}

function applyColors() {
  if (problemData.length === 0) return;
  
  const problemMap = new Map();
  problemData.forEach(problem => {
    problemMap.set(problem.titleSlug, problem);
  });
  
  colorProblemRows(problemMap);
  
  // Use MutationObserver for dynamic content
  const observer = new MutationObserver(() => {
    colorProblemRows(problemMap);
  });
  
  const targetNode = document.querySelector('[role="rowgroup"]') || document.body;
  observer.observe(targetNode, {
    childList: true,
    subtree: true
  });
}

function colorProblemRows(problemMap) {
  const problemLinks = document.querySelectorAll('a[href*="/problems/"]');
  
  problemLinks.forEach(link => {
    const href = link.getAttribute('href');
    const match = href.match(/\/problems\/([^\/]+)/);
    if (!match) return;
    
    const problemSlug = match[1];
    const problemInfo = problemMap.get(problemSlug);
    if (!problemInfo) return;
    
    // Calculate days since completion
    const completedDate = new Date(problemInfo.timestamp * 1000);
    const now = new Date();
    const daysSince = Math.floor((now - completedDate) / (1000 * 60 * 60 * 24));
    
    // Determine color based on freshness
    let backgroundColor, borderColor;
    
    if (daysSince <= 7) {
      backgroundColor = 'rgba(76, 175, 80, 0.2)';
      borderColor = '#4CAF50';
    } else if (daysSince <= 30) {
      backgroundColor = 'rgba(255, 193, 7, 0.2)';
      borderColor = '#FFC107';
    } else if (daysSince <= 90) {
      backgroundColor = 'rgba(185, 28, 28, 0.2)';
      borderColor = '#B91C1C';
    } else {
      backgroundColor = 'rgba(141, 110, 99, 0.2)';
      borderColor = '#8D6E63';
    }
    
    // Apply styling
    if (link.dataset.colored !== problemSlug) {
      link.dataset.colored = problemSlug;
      link.style.setProperty('background-color', backgroundColor, 'important');
      link.style.setProperty('border-left', `5px solid ${borderColor}`, 'important');
      link.style.transition = 'all 0.2s ease';
      
      // Add freshness indicator
    if (!link.querySelector('.freshness-indicator')) {
      const indicator = document.createElement('span');
      indicator.className = 'freshness-indicator';
      indicator.textContent = `${daysSince}d ago`;
        indicator.title = `Last solved: ${completedDate.toLocaleDateString()}`;
      indicator.style.cssText = `
        display: inline-block;
        font-size: 11px;
        padding: 3px 8px;
        margin-right: 8px;
        background: ${borderColor};
        color: white;
        border-radius: 10px;
        font-weight: 700;
        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      `;
      
      const percentElement = link.querySelector('[class*="text-sm"]:not(.freshness-indicator)');
      if (percentElement && percentElement.textContent.includes('%')) {
        percentElement.parentElement.insertBefore(indicator, percentElement);
      } else {
        link.appendChild(indicator);
        }
      }
    }
  });
}

// Listen for sync request from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'dataUpdated') {
    location.reload();
  }
  
  if (request.action === 'syncProblems') {
  let username = request.username;
  if (!username) {
    username = null;
  }
    
    if (!username) {
      sendResponse({ success: false, error: 'Username not found on page. Please enter manually.' });
      return;
    }
    
    syncProblemsFromPage(username).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

async function syncProblemsFromPage(username) {
  const csrfToken = document.cookie.split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  
  const headers = {
    'Content-Type': 'application/json',
    'x-requested-with': 'XMLHttpRequest'
  };
  
  if (csrfToken) {
    headers['x-csrftoken'] = csrfToken;
  }
  
  try {
    const query = `
      query userProgressQuestionList($filters: UserProgressQuestionListInput) {
        userProgressQuestionList(filters: $filters) {
          totalNum
          questions {
            translatedTitle
            frontendId
            title
            titleSlug
            difficulty
            lastSubmittedAt
            numSubmitted
            questionStatus
            lastResult
            topicTags {
              name
              nameTranslated
              slug
            }
          }
        }
      }
    `;
    
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: headers,
      credentials: 'same-origin',
      body: JSON.stringify({
        query: query,
        variables: { 
          filters: {
            questionStatus: "SOLVED",
            skip: 0,
            limit: 4000
          }
        }
      })
    });
    
    const data = await response.json();
    
    if (data.errors) {
      return { success: false, error: 'API error: ' + JSON.stringify(data.errors) };
    }
    
    if (!data.data?.userProgressQuestionList) {
      return { success: false, error: 'Invalid API response structure' };
    }
    
    const questions = data.data.userProgressQuestionList.questions || [];
    
    const problems = questions
      .filter(q => q.lastSubmittedAt)
      .map(q => ({
        title: q.title,
        titleSlug: q.titleSlug,
        timestamp: Math.floor(new Date(q.lastSubmittedAt).getTime() / 1000),
        dateCompleted: q.lastSubmittedAt
      }));
    
    const latestTimestamp = problems.length > 0 
      ? Math.max(...problems.map(p => p.timestamp))
      : 0;
    
    return { success: true, problems: problems, latestTimestamp: latestTimestamp };
  } catch (error) {
    return { success: false, error: error.message };
  }
}