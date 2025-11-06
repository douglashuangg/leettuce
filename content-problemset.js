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

// Simple URL change detection
let currentUrl = location.href;
setInterval(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    if (currentUrl.includes('/problemset/') || currentUrl.includes('/problems/')) {
      setTimeout(() => autoSync(), 1500);
    }
  }
        }, 1000);

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

// Detect if page is in dark mode
function isDarkMode() {
  // Check prefers-color-scheme media query
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return true;
  }
  
  // Check for LeetCode dark mode indicators
  // LeetCode uses data-theme attribute or dark class
  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    return true;
  }
  if (document.documentElement.classList.contains('dark')) {
    return true;
  }
  
  // Check computed background color as fallback
  const bgColor = window.getComputedStyle(document.body).backgroundColor;
  const rgb = bgColor.match(/\d+/g);
  if (rgb && rgb.length >= 3) {
    const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
    return brightness < 128; // Dark if average RGB < 128
  }
  
  return false;
}

// Darken a hex color for better contrast
function darkenColor(hex, percent = 20) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.floor((num >> 16) * (100 - percent) / 100));
  const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (100 - percent) / 100));
  const b = Math.max(0, Math.floor((num & 0x0000FF) * (100 - percent) / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Get colors based on freshness and theme
function getColorsForTheme(daysSince, isDark) {
  if (isDark) {
    // Dark mode colors - gradients with solid colors (not peachy)
    if (daysSince <= 7) {
      return {
        backgroundColor: 'linear-gradient(90deg, rgba(56, 142, 60, 0.4) 0%, rgba(76, 175, 80, 0.1) 100%)',
        borderColor: '#66BB6A'
      };
    } else if (daysSince <= 30) {
      return {
        backgroundColor: 'linear-gradient(90deg, rgba(255, 183, 77, 0.3) 0%, rgba(255, 193, 7, 0.1) 100%)',
        borderColor: '#FFB74D'
      };
    } else if (daysSince <= 90) {
      return {
        backgroundColor: 'linear-gradient(90deg, rgba(183, 28, 28, 0.3) 0%, rgba(239, 83, 80, 0.1) 100%)',
        borderColor: '#E57373'
      };
    } else {
      return {
        backgroundColor: 'linear-gradient(90deg, rgba(121, 85, 72, 0.4) 0%, rgba(121, 85, 72, 0.1) 100%)',
        borderColor: '#795548'
      };
    }
  } else {
    // Light mode colors - original colors
    if (daysSince <= 7) {
      return {
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderColor: '#4CAF50'
      };
    } else if (daysSince <= 30) {
      return {
        backgroundColor: 'rgba(255, 193, 7, 0.2)',
        borderColor: '#FFC107'
      };
    } else if (daysSince <= 90) {
      return {
        backgroundColor: 'rgba(185, 28, 28, 0.2)',
        borderColor: '#B91C1C'
      };
    } else {
      return {
        backgroundColor: 'rgba(141, 110, 99, 0.2)',
        borderColor: '#8D6E63'
      };
    }
  }
}

function applyColors() {
  if (problemData.length === 0) return;
  
  const problemMap = new Map();
  problemData.forEach(problem => {
    problemMap.set(problem.titleSlug, problem);
  });
  
  colorProblemRows(problemMap);
  
  // Simple observer for dynamic content
  const observer = new MutationObserver(() => colorProblemRows(problemMap));
  observer.observe(document.body, { childList: true, subtree: true });
}

function colorProblemRows(problemMap) {
  const problemLinks = document.querySelectorAll('a[href*="/problems/"]:not([href*="envType=daily-question"])');
  
  // Get current problem slug from URL
  const currentUrl = window.location.href;
  const currentMatch = currentUrl.match(/\/problems\/([^\/]+)/);
  const currentProblemSlug = currentMatch ? currentMatch[1] : null;
  
  problemLinks.forEach(link => {
    const href = link.getAttribute('href');
    const match = href.match(/\/problems\/([^\/]+)/);
    if (!match) return;
    
    const problemSlug = match[1];
    
    // Don't color the current problem if we're on the problem page
    if (currentProblemSlug && problemSlug === currentProblemSlug) {
      return;
    }
    
    const problemInfo = problemMap.get(problemSlug);
    if (!problemInfo) return;
    
    // Calculate days since completion
    const completedDate = new Date(problemInfo.timestamp * 1000);
    const now = new Date();
    const daysSince = Math.floor((now - completedDate) / (1000 * 60 * 60 * 24));
    
    // Determine color based on freshness and theme
    const isDark = isDarkMode();
    const colors = getColorsForTheme(daysSince, isDark);
    const backgroundColor = colors.backgroundColor;
    const borderColor = colors.borderColor;
    
    // Find the appropriate parent container based on page type
    let parentRow;
    
    // For study plan pages - target the outer container with border-b
    if (link.closest('div[class*="border-b"]')) {
      parentRow = link.closest('div[class*="border-b"]');
    }
    // For problemset pages - color the link itself (original behavior)
    else if (window.location.href.includes('/problemset/')) {
      parentRow = link; // Color the link directly
    }
    // Fallback for other pages
    else {
      parentRow = link.closest('div[class*="item"]') ||
                  link.closest('div[class*="card"]') ||
                  link.closest('div[class*="problem"]') ||
                  link.parentElement?.parentElement ||
                  link.parentElement;
    }
    
    // Apply styling to the parent container (whole div)
    if (parentRow) {
      // Always update colors (in case theme changed or extension was reloaded)
      parentRow.dataset.colored = problemSlug;
      
      // Check if backgroundColor is a gradient
      if (backgroundColor.includes('gradient')) {
        parentRow.style.setProperty('background-image', backgroundColor, 'important');
        parentRow.style.setProperty('background-color', 'transparent', 'important');
      } else {
        parentRow.style.setProperty('background-color', backgroundColor, 'important');
        parentRow.style.setProperty('background-image', 'none', 'important');
      }
      
      parentRow.style.setProperty('border-left', `5px solid ${borderColor}`, 'important');
      parentRow.style.transition = 'all 0.2s ease';
      
      // Add or update freshness indicator to the link
      let indicator = link.querySelector('.freshness-indicator');
      const darkerBorderColor = darkenColor(borderColor, 30);
      if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'freshness-indicator';
        indicator.textContent = `${daysSince}d ago`;
        indicator.title = `Last solved: ${completedDate.toLocaleDateString()}`;
        indicator.style.cssText = `
          display: inline-block;
          font-size: 11px;
          padding: 3px 8px;
          margin-right: 8px;
          background: ${darkerBorderColor};
          color: white;
          border-radius: 10px;
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        `;
      
        // For study plan pages, place indicator to the right of the title
        if (window.location.href.includes('/study-plan/') || link.closest('div[class*="border-b"]')) {
          // Find the title div in the parent container
          const parentContainer = link.closest('div[class*="flex"]') || link.parentElement;
          const titleDiv = parentContainer.querySelector('div[class*="text-body"]');
          
          if (titleDiv) {
            // Insert right after the title div
            titleDiv.parentElement.insertBefore(indicator, titleDiv.nextSibling);
          } else {
            link.appendChild(indicator);
          }
        } else {
          // For problemset pages, use the original logic
      const percentElement = link.querySelector('[class*="text-sm"]:not(.freshness-indicator)');
      if (percentElement && percentElement.textContent.includes('%')) {
        percentElement.parentElement.insertBefore(indicator, percentElement);
      } else {
        link.appendChild(indicator);
          }
        }
      } else {
        // Update existing indicator with new colors (darker for better text readability)
        const darkerBorderColor = darkenColor(borderColor, 30);
        indicator.style.setProperty('background', darkerBorderColor, 'important');
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