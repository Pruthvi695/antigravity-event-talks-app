document.addEventListener('DOMContentLoaded', () => {
    // State management
    let state = {
        updates: [],
        filteredUpdates: [],
        selectedUpdate: null,
        activeTypeFilter: 'all',
        searchQuery: '',
        lastSynced: null
    };

    // DOM Elements
    const feedContainer = document.getElementById('feed-container');
    const emptyState = document.getElementById('empty-state');
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = refreshBtn.querySelector('.icon-refresh');
    const syncText = document.getElementById('sync-text');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const filterPills = document.querySelectorAll('.filter-pill');
    const metaCountText = document.getElementById('meta-count-text');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');

    // Tweet Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const submitTweetBtn = document.getElementById('submit-tweet-btn');
    const charProgress = document.getElementById('char-progress');
    const charCountNumber = document.getElementById('char-count-number');
    const charWarningMsg = document.getElementById('char-warning-msg');

    // Progress ring calculation constants
    const ringRadius = 14;
    const ringCircumference = 2 * Math.PI * ringRadius; // ~87.96
    charProgress.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
    charProgress.style.strokeDashoffset = ringCircumference;

    // Toast Notification System
    function showToast(message, type = 'success', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
        toast.innerHTML = `
            <i class="toast-icon" data-lucide="${iconName}"></i>
            <span>${message}</span>
            <div class="toast-progress"></div>
        `;
        
        container.appendChild(toast);
        lucide.createIcons();
        
        // Trigger transition
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Setup progress bar animation
        const progressBar = toast.querySelector('.toast-progress');
        progressBar.style.transition = `width ${duration}ms linear`;
        progressBar.style.width = '0%';
        
        // Remove toast after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 350);
        }, duration);
    }

    // Format relative time (e.g. "Last synced: 2 minutes ago")
    function getRelativeTimeString(date) {
        if (!date) return 'Never';
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        
        if (diffSecs < 10) return 'Just now';
        if (diffSecs < 60) return `${diffSecs} seconds ago`;
        
        const diffMins = Math.floor(diffSecs / 60);
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }

    // Update relative sync label periodically
    setInterval(() => {
        if (state.lastSynced) {
            syncText.textContent = `Last synced: ${getRelativeTimeString(state.lastSynced)}`;
        }
    }, 30000);

    // Fetch feed from Flask Backend
    async function fetchReleaseNotes(isRefresh = false) {
        toggleLoadingState(true);
        if (isRefresh) {
            refreshIcon.classList.add('spinning');
            refreshBtn.disabled = true;
            syncText.textContent = 'Syncing feed...';
            const statusIndicator = document.querySelector('.status-indicator');
            statusIndicator.className = 'status-indicator syncing';
        }

        try {
            const response = await fetch('/api/release-notes');
            const data = await response.json();
            
            if (data.success) {
                state.updates = data.updates;
                state.lastSynced = new Date();
                
                // Show status
                const statusIndicator = document.querySelector('.status-indicator');
                statusIndicator.className = 'status-indicator online';
                syncText.textContent = `Last synced: Just now`;
                
                if (isRefresh) {
                    showToast(`Feed updated successfully! ${data.count} items parsed.`);
                }
                
                applyFilters();
            } else {
                throw new Error(data.error || 'Failed to fetch release notes.');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showToast(`Error: ${error.message}`, 'error', 5000);
            
            // Revert status indicators
            const statusIndicator = document.querySelector('.status-indicator');
            statusIndicator.className = 'status-indicator online';
            if (state.lastSynced) {
                syncText.textContent = `Last synced: ${getRelativeTimeString(state.lastSynced)}`;
            } else {
                syncText.textContent = 'Sync failed';
            }
            
            // If we have cached updates from previous page loads, we don't completely break
            if (state.updates.length === 0) {
                renderEmptyState(true);
            }
        } finally {
            toggleLoadingState(false);
            refreshIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }

    // Toggle loading UI skeleton cards
    function toggleLoadingState(isLoading) {
        if (isLoading) {
            feedContainer.innerHTML = Array(3).fill(0).map(() => `
                <div class="skeleton-card">
                    <div class="skeleton-header">
                        <div class="skeleton-date"></div>
                        <div class="skeleton-badge"></div>
                    </div>
                    <div class="skeleton-body">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                    <div class="skeleton-footer"></div>
                </div>
            `).join('');
            emptyState.style.display = 'none';
            metaCountText.textContent = 'Loading updates...';
        }
    }

    // Filter categorization map
    function getFilterType(typeStr) {
        const cleanType = typeStr.toLowerCase();
        if (cleanType.includes('feature')) return 'feature';
        if (cleanType.includes('change')) return 'change';
        if (cleanType.includes('deprecat')) return 'deprecated';
        return 'other';
    }

    // Apply Filter Logic (type pill & keyword search text)
    function applyFilters() {
        state.filteredUpdates = state.updates.filter(update => {
            // Type filtering
            const uType = getFilterType(update.type);
            const matchesType = state.activeTypeFilter === 'all' || uType === state.activeTypeFilter;
            
            // Search text filtering
            const q = state.searchQuery.toLowerCase();
            const matchesSearch = !q || 
                update.type.toLowerCase().includes(q) || 
                update.date.toLowerCase().includes(q) || 
                update.text.toLowerCase().includes(q);
                
            return matchesType && matchesSearch;
        });
        
        renderFeed();
    }

    // Render feed updates cards into DOM
    function renderFeed() {
        feedContainer.innerHTML = '';
        
        if (state.filteredUpdates.length === 0) {
            emptyState.style.display = 'flex';
            metaCountText.textContent = 'Showing 0 updates';
            return;
        }
        
        emptyState.style.display = 'none';
        metaCountText.textContent = `Showing ${state.filteredUpdates.length} update${state.filteredUpdates.length > 1 ? 's' : ''}`;
        
        state.filteredUpdates.forEach(update => {
            const card = document.createElement('div');
            card.className = 'update-card';
            card.dataset.id = update.id;
            
            const badgeClass = getFilterType(update.type);
            
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-date-wrapper">
                        <i data-lucide="calendar" class="card-date-icon"></i>
                        <span>${update.date}</span>
                    </div>
                    <span class="badge ${badgeClass}">${update.type}</span>
                </div>
                <div class="card-body">
                    ${update.html}
                </div>
                <div class="card-actions">
                    <button class="btn btn-secondary btn-sm copy-btn" title="Copy clean text representation">
                        <i data-lucide="copy"></i>
                        <span>Copy</span>
                    </button>
                    <a href="${update.link}" target="_blank" class="btn btn-secondary btn-sm" title="View official GCP Release Notes page">
                        <i data-lucide="external-link"></i>
                        <span>Source</span>
                    </a>
                    <button class="btn btn-twitter btn-sm tweet-btn" title="Open composer and tweet this release note">
                        <i data-lucide="twitter"></i>
                        <span>Tweet</span>
                    </button>
                </div>
            `;
            
            // Copy plain text handler
            card.querySelector('.copy-btn').addEventListener('click', (e) => {
                e.preventDefault();
                navigator.clipboard.writeText(`${update.date} - ${update.type}: ${update.text}`)
                    .then(() => showToast('Release note text copied to clipboard!'))
                    .catch(err => showToast('Failed to copy text: ' + err, 'error'));
            });
            
            // Tweet trigger handler
            card.querySelector('.tweet-btn').addEventListener('click', (e) => {
                e.preventDefault();
                openTweetComposer(update);
            });
            
            feedContainer.appendChild(card);
        });
        
        // Re-run Lucide SVG generator
        lucide.createIcons();
    }

    // Modal Composition: Generate balanced tweet text & display modal
    function openTweetComposer(update) {
        state.selectedUpdate = update;
        
        // Generate prefilled optimal tweet body:
        // Handle 280 character constraints (Twitter treats all URLs as exactly 23 chars).
        const header = `BigQuery Update [${update.date}] - ${update.type}:\n`;
        const footer = `\nRead more: ${update.link}`;
        
        // 280 - header (varies) - 23 (url wrap length) - 12 (spacing overhead)
        const reservedLen = header.length + 23 + 12;
        const maxTextLen = 280 - reservedLen;
        
        let cleanedBodyText = update.text;
        if (cleanedBodyText.length > maxTextLen) {
            cleanedBodyText = cleanedBodyText.substring(0, maxTextLen - 3) + '...';
        }
        
        const fullTweetText = `${header}${cleanedBodyText}${footer}`;
        
        // Prefill modal
        tweetTextarea.value = fullTweetText;
        updateCharCounter();
        
        // Open Modal
        tweetModal.classList.add('open');
        tweetTextarea.focus();
    }

    // Close Tweet composer modal
    function closeTweetComposer() {
        tweetModal.classList.remove('open');
        state.selectedUpdate = null;
    }

    // Calculate Twitter-Specific character counts: URLs counted as 23 characters
    function calculateTwitterChars(text) {
        // Regex to match URLs
        const urlRegex = /https?:\/\/[^\s]+/g;
        let count = text.length;
        
        const matches = text.match(urlRegex);
        if (matches) {
            matches.forEach(url => {
                // Remove original URL length and replace with X's default 23 wrapper length
                count = count - url.length + 23;
            });
        }
        return count;
    }

    // Update Modal Progress circle and warning banner
    function updateCharCounter() {
        const text = tweetTextarea.value;
        const twitterCharCount = calculateTwitterChars(text);
        const charsLeft = 280 - twitterCharCount;
        
        charCountNumber.textContent = charsLeft;
        
        // Visual Styling of indicator
        if (charsLeft < 0) {
            charCountNumber.className = 'char-count-text danger';
            charWarningMsg.style.display = 'block';
            submitTweetBtn.disabled = true;
            
            // Full circle red stroke
            charProgress.style.stroke = 'var(--error)';
            setProgressPercentage(100);
        } else {
            charWarningMsg.style.display = 'none';
            submitTweetBtn.disabled = false;
            
            if (charsLeft <= 20) {
                charCountNumber.className = 'char-count-text warning';
                charProgress.style.stroke = 'var(--warning)';
            } else {
                charCountNumber.className = 'char-count-text';
                charProgress.style.stroke = 'var(--twitter-color)';
            }
            
            const pct = (twitterCharCount / 280) * 100;
            setProgressPercentage(pct);
        }
    }

    // Progress circle helper
    function setProgressPercentage(percent) {
        const offset = ringCircumference - (percent / 100 * ringCircumference);
        charProgress.style.strokeDashoffset = offset;
    }

    // X Web Intent action
    function launchTweet() {
        const tweetText = tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        closeTweetComposer();
        showToast('Redirected to Twitter composer!');
    }

    // Event Bindings
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search filter inputs
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        clearSearchBtn.style.display = state.searchQuery ? 'flex' : 'none';
        applyFilters();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFilters();
        searchInput.focus();
    });
    
    // Type Filter Pills click
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            state.activeTypeFilter = pill.dataset.type;
            applyFilters();
        });
    });
    
    // Reset Filters from Empty state
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        filterPills.forEach(p => p.classList.remove('active'));
        document.querySelector('[data-type="all"]').classList.add('active');
        state.activeTypeFilter = 'all';
        
        applyFilters();
    });

    // Close Modal triggers
    closeModalBtn.addEventListener('click', closeTweetComposer);
    cancelTweetBtn.addEventListener('click', closeTweetComposer);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetComposer();
    });

    // Handle tweet live changes
    tweetTextarea.addEventListener('input', updateCharCounter);
    submitTweetBtn.addEventListener('click', launchTweet);

    // Escape button closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('open')) {
            closeTweetComposer();
        }
    });

    // Initial load execution
    fetchReleaseNotes();
});
