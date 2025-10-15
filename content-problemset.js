// Content script for problemset page
// Colors problems based on when they were last solved

// Auto-detect username from page content
function detectUsernameFromPage() {
  console.log('🔍 Looking for username on page...');
  
  // Helper to describe an element succinctly
  const describeEl = (el) => {
    if (!el) return 'null';
    const tag = el.tagName ? el.tagName.toLowerCase() : 'node';
    const id = el.id ? `#${el.id}` : '';
    const cls = el.className ? `.${String(el.className).trim().replace(/\s+/g, '.')}` : '';
    return `${tag}${id}${cls}`;
  };
  const snippet = (el) => {
    if (!el || !el.outerHTML) return 'null';
    const html = el.outerHTML.replace(/\s+/g, ' ').trim();
    return html.length > 220 ? html.slice(0, 220) + '…' : html;
  };
  
  // Direct path provided (most reliable)
  console.log('🔎 Trying explicit selector under #web-user-menu...');
  const menuRootForExplicit = document.querySelector('#web-user-menu');
  console.log('   📦 menuRoot element:', menuRootForExplicit, describeEl(menuRootForExplicit), '\n   ↪', snippet(menuRootForExplicit));
  const explicitLink = document.querySelector('#web-user-menu > div > div > div.z-base-1.relative.flex.h-full.w-full.flex-col.items-end.p-4 > div > div.flex.shrink-0.items-center.px-4.pb-4.pt-1.md\\:px-\\[1px\\] > a');
  console.log('   📍 explicitLink element:', explicitLink, describeEl(explicitLink), '\n   ↪', snippet(explicitLink));
  if (explicitLink) {
    const href = explicitLink.getAttribute('href') || '';
    const match = href.match(/\/u\/([^\/\?]+)/);
    if (match) {
      console.log(`✅ Found username using explicit path: "${match[1]}"`);
      return match[1];
    }
  }
  
  // Prefer the open user menu container only (to reduce DOM scans and requests)
  const openMenuContainer = document.querySelector('.enterTo.overflow-hidden.pointer-events-auto.opacity-100');
  console.log('🔎 openMenuContainer:', openMenuContainer, describeEl(openMenuContainer), '\n   ↪', snippet(openMenuContainer));
  if (openMenuContainer) {
    console.log('   🔎 Searching for link inside openMenuContainer...');
    const link = openMenuContainer.querySelector('a[href*="/u/"]');
    console.log('   📍 link in openMenuContainer:', link, describeEl(link), '\n   ↪', snippet(link));
    if (link) {
      const href = link.getAttribute('href') || '';
      const match = href.match(/\/u\/([^\/\?]+)/);
      if (match) {
        console.log(`✅ Found username from open menu: "${match[1]}"`);
        return match[1];
      }
    }
    console.log('⚠️ Open menu container found but no username link inside');
    // Do not return here; keep trying other locations
  }

  // Simple deep search within the menu root by id
  console.log('🔎 Searching within #web-user-menu for any /u/ link...');
  const menuIdLink = document.querySelector('#web-user-menu a[href*="/u/"]');
  console.log('   📍 menuIdLink:', menuIdLink, describeEl(menuIdLink), '\n   ↪', snippet(menuIdLink));
  if (menuIdLink) {
    const href = menuIdLink.getAttribute('href') || '';
    const match = href.match(/\/u\/([^\/\?]+)/);
    if (match) {
      console.log(`✅ Found username under #web-user-menu: "${match[1]}"`);
      return match[1];
    }
  }
  
  // Look for username in profile dropdown or navigation
  const profileSelectors = [
    '[data-testid="user-profile"]',
    '[class*="profile"]',
    '[class*="user"]',
    'a[href*="/u/"]',
    'a[href*="/profile"]',
    // More specific LeetCode selectors
    '[role="button"][aria-haspopup="menu"]',
    '[data-testid="user-menu"]',
    'button[aria-label*="user"]',
    'button[aria-label*="profile"]'
  ];
  
  console.log('📋 Checking selectors:', profileSelectors);
  
  for (const selector of profileSelectors) {
    const element = document.querySelector(selector);
    console.log(`🔍 Selector "${selector}":`, element);
    
    if (element) {
      // Try to extract username from href
      const href = element.getAttribute('href');
      console.log(`   📎 href: "${href}"`);
      
      if (href) {
        const match = href.match(/\/u\/([^\/\?]+)/);
        if (match) {
          console.log(`✅ Found username in href: "${match[1]}"`);
          return match[1];
        }
      }
      
      // Try to extract from text content
      const text = element.textContent?.trim();
      console.log(`   📝 text: "${text}"`);
      
      if (text && text.length > 0 && text.length < 50 && !text.includes(' ') && !text.includes('Profile')) {
        console.log(`✅ Found username in text: "${text}"`);
        return text;
      }
    }
  }
  
  // Look for username in any link that contains /u/
  const links = document.querySelectorAll('a[href*="/u/"]');
  console.log('🔗 Found links with /u/:', links.length);
  
  for (const link of links) {
    const href = link.getAttribute('href');
    console.log(`   🔗 Link href: "${href}"`);
    
    const match = href.match(/\/u\/([^\/\?]+)/);
    if (match) {
      console.log(`✅ Found username in link: "${match[1]}"`);
      return match[1];
    }
  }
  
  // Search inside the dropdown container where username may be nested
  console.log('🔎 Checking generic dropdown selector...');
  const dropdown = document.querySelector(
    '.enterTo.overflow-hidden.pointer-events-auto.opacity-100, [class*="enterTo"][class*="pointer-events-auto"][class*="opacity-100"]'
  );
  console.log('   📍 dropdown container:', dropdown, describeEl(dropdown), '\n   ↪', snippet(dropdown));
  if (dropdown) {
    console.log('🧭 Searching inside dropdown container for username');
    // Try links first
    const innerLink = dropdown.querySelector('a[href*="/u/"]');
    console.log('   📍 innerLink:', innerLink, describeEl(innerLink), '\n   ↪', snippet(innerLink));
    if (innerLink) {
      const href = innerLink.getAttribute('href') || '';
      const match = href.match(/\/u\/([^\/\?]+)/);
      if (match) {
        console.log(`✅ Found username in dropdown link: "${match[1]}"`);
        return match[1];
      }
    }
    // Fallback: scan text content within dropdown for username-like token
    const potentialTexts = dropdown.querySelectorAll('*');
    console.log('   🔎 Scanning text nodes in dropdown, count:', potentialTexts.length);
    for (const el of potentialTexts) {
      // Log a few representative nodes to avoid flooding
      if (Math.random() < 0.01) console.log('   🔎 Inspecting node:', el, describeEl(el), '\n   ↪', snippet(el));
      const text = el.textContent?.trim();
      if (text &&
          text.length > 2 &&
          text.length < 30 &&
          !text.includes(' ') &&
          !/Profile|User|Menu/i.test(text) &&
          /^[a-zA-Z0-9_-]+$/.test(text)) {
        console.log(`✅ Found username-like text in dropdown: "${text}"`);
        return text;
      }
    }
  }
  
  // Explicitly search the known menu root where it often renders deeply nested
  const menuRoot = document.querySelector('#web-user-menu') || document.querySelector('[id*="user-menu"]');
  console.log('🔎 menuRoot:', menuRoot, describeEl(menuRoot), '\n   ↪', snippet(menuRoot));
  if (menuRoot) {
    console.log('🧭 Searching inside #web-user-menu for username');
    const deepLink = menuRoot.querySelector('a[href*="/u/"]');
    console.log('   📍 deepLink in menuRoot:', deepLink, describeEl(deepLink), '\n   ↪', snippet(deepLink));
    if (deepLink) {
      const href = deepLink.getAttribute('href') || '';
      const match = href.match(/\/u\/([^\/\?]+)/);
      if (match) {
        console.log(`✅ Found username in #web-user-menu: "${match[1]}"`);
        return match[1];
      }
    }
    // Fallback: scan for username-like text tokens within the menu root
    const nodes = menuRoot.querySelectorAll('*');
    console.log('   🔎 Scanning text nodes in menuRoot, count:', nodes.length);
    for (const el of nodes) {
      if (Math.random() < 0.01) console.log('   🔎 Inspecting node in menuRoot:', el, describeEl(el), '\n   ↪', snippet(el));
      const text = el.textContent?.trim();
      if (text &&
          text.length > 2 &&
          text.length < 30 &&
          !text.includes(' ') &&
          !/Profile|User|Menu/i.test(text) &&
          /^[a-zA-Z0-9_-]+$/.test(text)) {
        console.log(`✅ Found username-like text in #web-user-menu: "${text}"`);
        return text;
      }
    }
  }
  
  // Broad scan: handle both "enterTo" and "leaveTo" containers regardless of visibility
  const possibleMenus = document.querySelectorAll(
    '#web-user-menu, [id*="user-menu"], [class*="enterTo"], [class*="leaveTo"]'
  );
  if (possibleMenus && possibleMenus.length > 0) {
    console.log('🧭 Scanning possible menu containers for username:', possibleMenus.length);
    for (const container of possibleMenus) {
      console.log('   📦 checking container:', container, describeEl(container), '\n   ↪', snippet(container));
      const link = container.querySelector('a[href*="/u/"]');
      console.log('   📍 link in container:', link, describeEl(link), '\n   ↪', snippet(link));
      if (link) {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/u\/([^\/\?]+)/);
        if (match) {
          console.log(`✅ Found username in menu container: "${match[1]}"`);
          return match[1];
        }
      }
      // Fallback: scan for username-like text in this container
      const nodes = container.querySelectorAll('*');
      console.log('   🔎 Scanning text nodes in container, count:', nodes.length);
      for (const el of nodes) {
        if (Math.random() < 0.01) console.log('   🔎 Inspecting node in container:', el, describeEl(el), '\n   ↪', snippet(el));
        const text = el.textContent?.trim();
        if (text &&
            text.length > 2 &&
            text.length < 30 &&
            !text.includes(' ') &&
            !/Profile|User|Menu/i.test(text) &&
            /^[a-zA-Z0-9_-]+$/.test(text)) {
          console.log(`✅ Found username-like text in menu container: "${text}"`);
          return text;
        }
      }
    }
  }
  
  // Look for any text that might be a username (no spaces, reasonable length)
  const allTextElements = document.querySelectorAll('*');
  console.log('🔍 Checking all text elements for potential usernames...');
  
  for (const element of allTextElements) {
    const text = element.textContent?.trim();
    if (text && 
        text.length > 2 && 
        text.length < 30 && 
        !text.includes(' ') && 
        !text.includes('Profile') &&
        !text.includes('User') &&
        !text.includes('Menu') &&
        /^[a-zA-Z0-9_-]+$/.test(text)) {
      console.log(`🤔 Potential username: "${text}"`);
    }
  }
  
  console.log('❌ No username found');
  return null;
}


// Try to detect username via LeetCode API (requires being on leetcode.com)
async function detectUsernameViaApi() {
  try {
    const res = await fetch('https://leetcode.com/api/problems/all/', {
      credentials: 'same-origin',
      headers: { 'x-requested-with': 'XMLHttpRequest' }
    });
    if (!res.ok) {
      console.log('❌ Username API HTTP error:', res.status);
      return null;
    }
    const data = await res.json();
    const apiUser = data?.user_name || null;
    console.log('🛰️ Username from API:', apiUser);
    return apiUser || null;
  } catch (e) {
    console.log('❌ Username API failed:', e);
    return null;
  }
}

// Smart username detection: API-only to avoid DOM scanning
async function detectUsernameSmart() {
  return await detectUsernameViaApi();
}


let problemData = [];

// Load problem data from storage
chrome.storage.local.get(['problemData', 'lastUpdated', 'username', 'totalSolved'], (result) => {
  if (result && result.problemData) {
    problemData = result.problemData;
    
    // Check if we should refresh by comparing total solved count
    console.log('🔄 Checking if total solved count changed...');
    checkTotalSolved();
    
  } else {
    // No data found, try to auto-sync
    console.log('🔄 No problem data found, attempting auto-sync...');
    autoSync();
  }
});

// Check latest submission timestamp and refresh if different
async function checkTotalSolved() {
  const username = await detectUsernameSmart();
  if (!username) {
    console.log('❌ No username found for timestamp check');
    return;
  }
  
  try {
    // Get latest submission timestamp
    const latestTimestamp = await getLatestSubmissionTimestamp(username);
    console.log('📊 Latest submission timestamp:', latestTimestamp);
    
    // Get cached latest timestamp
    chrome.storage.local.get(['latestTimestamp'], (result) => {
      const cachedTimestamp = result.latestTimestamp || 0;
      console.log('💾 Cached latest timestamp:', cachedTimestamp);
      
      if (latestTimestamp > cachedTimestamp) {
        console.log('🔄 Newer submission found! Refreshing all data...');
        fullRefresh(username);
      } else {
        console.log('✅ No new submissions, using cached data');
        // Wait for page to fully load, then apply colors
        setTimeout(() => {
          applyColors();
        }, 2000);
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking latest timestamp:', error);
    // Fall back to using cached data
    setTimeout(() => {
      applyColors();
    }, 2000);
  }
}

// Get latest submission timestamp (lightweight check)
async function getLatestSubmissionTimestamp(username) {
  // Get CSRF token from cookies
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
  
  const query = `
    query recentSubmissions($username: String!) {
      recentSubmissionList(username: $username, limit: 1) {
        timestamp
      }
    }
  `;
  
  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: headers,
    credentials: 'same-origin',
    body: JSON.stringify({
      query: query,
      variables: { username: username }
    })
  });
  
  const data = await response.json();
  
  if (data.errors) {
    throw new Error('API error: ' + JSON.stringify(data.errors));
  }
  
  const latestTimestamp = data.data?.recentSubmissionList?.[0]?.timestamp || 0;
  return latestTimestamp;
}

// Full refresh when total solved count changes
async function fullRefresh(username) {
  console.log('🔄 Full refresh: fetching all solved problems...');
  
  try {
    const result = await syncProblemsFromPage(username);
    if (result.success) {
      console.log('✅ Full refresh successful!');
      
      // Save the data with latest timestamp
      chrome.storage.local.set({
        problemData: result.problems,
        lastUpdated: Date.now(),
        username: username,
        latestTimestamp: result.latestTimestamp
      }, () => {
        console.log('💾 Full refresh data saved');
        problemData = result.problems;
        
        // Apply colors after refresh
        setTimeout(() => {
          applyColors();
        }, 1000);
      });
    } else {
      console.log('❌ Full refresh failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Full refresh error:', error);
  }
}

// Auto-sync function
async function autoSync() {
  console.log('🚀 Auto-syncing problems...');
  
  // Try to detect username
  const username = await detectUsernameSmart();
  if (!username) {
    console.log('❌ No username found for auto-sync');
    return;
  }
  
  console.log('✅ Auto-detected username:', username);
  
  // Sync problems
  try {
    const result = await syncProblemsFromPage(username);
    if (result.success) {
      console.log('✅ Auto-sync successful!');
      
      // Save the data
      chrome.storage.local.set({
        problemData: result.problems,
        lastUpdated: Date.now(),
        username: username,
        latestTimestamp: result.latestTimestamp
      }, () => {
        console.log('💾 Auto-sync data saved with username:', username);
        problemData = result.problems;
        
        // Apply colors after sync
        setTimeout(() => {
          applyColors();
        }, 1000);
      });
    } else {
      console.log('❌ Auto-sync failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Auto-sync error:', error);
  }
}

function applyColors() {
  if (problemData.length === 0) {
    return;
  }
  
  // Create a map for quick lookups
  const problemMap = new Map();
  problemData.forEach(problem => {
    problemMap.set(problem.titleSlug, problem);
  });
  
  // Initial coloring
  colorProblemRows(problemMap);
  
  // Use MutationObserver to handle dynamic content (React updates)
  const observer = new MutationObserver(() => {
    colorProblemRows(problemMap);
  });
  
  // Start observing the main content area
  const targetNode = document.querySelector('[role="rowgroup"]') || document.body;
  observer.observe(targetNode, {
    childList: true,
    subtree: true
  });
}

function colorProblemRows(problemMap) {
  // Find all problem links
  const allProblemLinks = document.querySelectorAll('a[href*="/problems/"]');
  
  // OPTIMIZATION: Only check solved problems (those with checkmarks)
  const problemLinks = Array.from(allProblemLinks).filter(link => {
    // Look for checkmark indicators in the row
    const row = link.closest('[role="row"]') || link;
    const hasCheckmark = row.querySelector('svg[data-icon="check"]') || 
                        row.querySelector('.text-green-500') ||
                        row.querySelector('[class*="text-green"]') ||
                        row.querySelector('svg[class*="text-green"]') ||
                        row.querySelector('[class*="check"]') ||
                        row.querySelector('svg[class*="check"]');
    
    return hasCheckmark;
  });
  
  console.log('🎯 Found', problemLinks.length, 'solved problems on current page');
  
  if (problemLinks.length === 0) {
    console.log('⚠️ No solved problems found on current page');
    return;
  }
  
  
  let coloredCount = 0;
  let checkedCount = 0;
  
  problemLinks.forEach((link, index) => {
    const href = link.getAttribute('href');
    const match = href.match(/\/problems\/([^\/]+)/); // Match without requiring trailing slash
    
    if (!match) return;
    
    const problemSlug = match[1];
    checkedCount++;
    
    const problemInfo = problemMap.get(problemSlug);
    
    if (!problemInfo) {
      return; // Not solved yet
    }
    
    // Calculate days since completion
    const completedDate = new Date(problemInfo.timestamp * 1000);
    const now = new Date();
    const daysSince = Math.floor((now - completedDate) / (1000 * 60 * 60 * 24));
    
    // Determine color based on freshness
    let backgroundColor, borderColor, textNote;
    
    if (daysSince <= 7) {
      backgroundColor = 'rgba(76, 175, 80, 0.2)'; // Green - Fresh
      borderColor = '#4CAF50';
      textNote = '🟢 Fresh';
    } else if (daysSince <= 30) {
      backgroundColor = 'rgba(255, 193, 7, 0.2)'; // Yellow - Good
      borderColor = '#FFC107';
      textNote = '🟡 Review soon';
    } else if (daysSince <= 90) {
      backgroundColor = 'rgba(244, 67, 54, 0.2)'; // Red - Review Soon
      borderColor = '#F44336';
      textNote = '🔴 Review needed';
    } else {
      backgroundColor = 'rgba(121, 85, 72, 0.2)'; // Brown - Rotting
      borderColor = '#795548';
      textNote = '🤎 Rotting';
    }
    
    // The <a> tag IS the row! Just color the link directly
    const row = link;
    
    // Mark that we've already colored this row
    if (row.dataset.colored === problemSlug) {
      return;
    }
    row.dataset.colored = problemSlug;
    
    // Apply styling to the row
    row.style.setProperty('background-color', backgroundColor, 'important');
    row.style.setProperty('border-left', `5px solid ${borderColor}`, 'important');
    row.style.transition = 'all 0.2s ease';
    
    coloredCount++;
    
    // Add a badge showing days since completion
    if (!link.querySelector('.freshness-indicator')) {
      const indicator = document.createElement('span');
      indicator.className = 'freshness-indicator';
      indicator.textContent = `${daysSince}d ago`;
      indicator.title = `Last solved: ${completedDate.toLocaleDateString()} (${textNote})`;
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
      
      // Find the acceptance rate element (text that ends with %)
      const percentElement = link.querySelector('[class*="text-sm"]:not(.freshness-indicator)');
      if (percentElement && percentElement.textContent.includes('%')) {
        // Insert before the percentage
        percentElement.parentElement.insertBefore(indicator, percentElement);
      } else {
        // Fallback: append to the link
        link.appendChild(indicator);
      }
    }
  });
  
}

// Listen for sync request from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'dataUpdated') {
    location.reload(); // Reload to apply new colors
  }
  
  if (request.action === 'syncProblems') {
  // Try to detect username via API if not provided
  let username = request.username;
  if (!username) {
    // Note: messages can't be async here; do a quick DOM fallback to keep behavior
    // but prefer the API in check/auto flows.
    username = null;
  }
    
    if (!username) {
      sendResponse({ success: false, error: 'Username not found on page. Please enter manually.' });
      return;
    }
    
    // Do the API call here (has access to cookies)
    syncProblemsFromPage(username).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  }
});

async function syncProblemsFromPage(username) {
  console.log('🔄 Syncing solved problems for:', username);
  
  // Get CSRF token from cookies
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
    console.log('📡 Fetching solved problems with completion dates...');
    
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
            limit: 4000  // Max LeetCode problems
          }
        }
      })
    });
    
    const data = await response.json();
    console.log('📊 API Response:', data);
    
    if (data.errors) {
      console.error('❌ API Errors:', data.errors);
      return { success: false, error: 'API error: ' + JSON.stringify(data.errors) };
    }
    
    if (!data.data?.userProgressQuestionList) {
      console.error('❌ No userProgressQuestionList in response');
      return { success: false, error: 'Invalid API response structure' };
    }
    
    const questions = data.data.userProgressQuestionList.questions || [];
    console.log('📈 Total solved problems:', questions.length);
    
    const problems = questions
      .filter(q => q.lastSubmittedAt) // Only include if we have a submission date
      .map(q => ({
        title: q.title,
        titleSlug: q.titleSlug,
        timestamp: Math.floor(new Date(q.lastSubmittedAt).getTime() / 1000),
        dateCompleted: q.lastSubmittedAt
      }));
    
    // Get the latest timestamp from all problems
    const latestTimestamp = problems.length > 0 
      ? Math.max(...problems.map(p => p.timestamp))
      : 0;
    
    console.log('✅ Synced', problems.length, 'problems with completion dates');
    console.log('📊 Latest timestamp:', latestTimestamp);
    
    return { success: true, problems: problems, latestTimestamp: latestTimestamp };
  } catch (error) {
    console.error('💥 Sync error:', error);
    return { success: false, error: error.message };
  }
}
