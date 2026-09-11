import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { VFS } from '../services/storage/indexedDB';
import { NotificationService } from '../services/notificationService';
import {
  ChevronLeftIcon, ChevronRightIcon, RefreshIcon, HomeIcon,
  GlobeIcon, DuckSearchIcon, GhostIcon,
  ExternalLinkIcon, LockIcon, AlertTriangleIcon, SearchIcon,
  PlusIcon, BookIcon,
} from '../components/Icons';
import styles from './GhostBrowserApp.module.css';

const DEFAULT_BOOKMARKS = [
  { id: 'b1', name: 'Wikipedia', url: 'https://en.m.wikipedia.org', icon: '🌐' },
  { id: 'b2', name: 'Ghost Search', url: 'about:search', icon: '🔍' },
  { id: 'b3', name: 'DuckDuckGo', url: 'https://duckduckgo.com', isExternal: true, icon: '🦆' },
  { id: 'b4', name: 'Hacker News', url: 'https://news.ycombinator.com', isExternal: true, icon: '📰' },
  { id: 'b5', name: 'OS Guide', url: 'about:billighost', icon: '👻' },
];

export default function GhostBrowserApp({ playClick = () => {} }) {
  // 1. Multi-Tab state
  const [tabs, setTabs] = useState([
    {
      id: 'tab-1',
      title: 'Wikipedia',
      url: 'https://en.m.wikipedia.org',
      inputUrl: 'https://en.m.wikipedia.org',
      history: ['https://en.m.wikipedia.org'],
      historyIndex: 0,
      isLoading: false,
      loadError: false,
      zoom: 100,
      readerMode: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  // Bookmarks
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('billighost_browser_bookmarks');
      return saved ? JSON.parse(saved) : DEFAULT_BOOKMARKS;
    } catch {
      return DEFAULT_BOOKMARKS;
    }
  });

  // Browsing History drawer
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [fullHistory, setFullHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('billighost_browser_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Incognito Mode
  const [isIncognito, setIsIncognito] = useState(false);

  // Active Tab Helpers
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const currentUrl = activeTab.url;
  const inputUrl = activeTab.inputUrl;
  const historyIndex = activeTab.historyIndex;
  const history = activeTab.history;
  const isLoading = activeTab.isLoading;
  const loadError = activeTab.loadError;
  const zoom = activeTab.zoom;
  const readerMode = activeTab.readerMode;

  const iframeRef = useRef(null);
  const loadTimeoutRef = useRef(null);

  const isSearchPage = currentUrl.startsWith('about:search');
  const isNewTabPage = currentUrl === 'about:blank' || currentUrl === 'about:home';

  // Search State for about:search
  const searchQuery = useMemo(() => {
    if (!isSearchPage) return '';
    return new URLSearchParams(currentUrl.split('?')[1] || '').get('q') || '';
  }, [currentUrl, isSearchPage]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [ddgResult, setDdgResult] = useState(null);
  const [wikiResults, setWikiResults] = useState([]);

  // Reader Mode Text & Caching
  const [readerContent, setReaderContent] = useState(null);
  const [readerFontSize, setReaderFontSize] = useState(18);
  const [readerFontFamily, setReaderFontFamily] = useState('sans'); // 'sans' | 'serif'

  const updateActiveTab = (updater) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? updater(t) : t));
  };

  // Check if current URL is bookmarked
  const isBookmarked = useMemo(() => {
    return bookmarks.some(b => b.url === currentUrl);
  }, [bookmarks, currentUrl]);

  const performSearch = useCallback(async (q) => {
    setSearchLoading(true);
    try {
      const [ddgRes, wikiRes] = await Promise.allSettled([
        fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1`).then(r => r.json()),
        fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=8&namespace=0&format=json&origin=*`).then(r => r.json()),
      ]);

      if (ddgRes.status === 'fulfilled' && ddgRes.value) {
        setDdgResult(ddgRes.value);
      } else {
        setDdgResult(null);
      }

      if (wikiRes.status === 'fulfilled' && Array.isArray(wikiRes.value) && wikiRes.value.length >= 4) {
        const titles = wikiRes.value[1] || [];
        const snippets = wikiRes.value[2] || [];
        const urls = wikiRes.value[3] || [];
        const items = titles.map((title, i) => ({
          title,
          snippet: snippets[i] || '',
          url: urls[i] ? urls[i].replace('https://en.wikipedia.org', 'https://en.m.wikipedia.org') : '',
        }));
        setWikiResults(items);
      } else {
        setWikiResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Extract query from URL if on about:search
  useEffect(() => {
    if (isSearchPage) {
      if (searchQuery.trim()) {
        const timer = setTimeout(() => {
          performSearch(searchQuery.trim());
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [isSearchPage, searchQuery, performSearch]);

  // Record history
  const recordHistory = (url, title) => {
    if (isIncognito || url.startsWith('about:')) return;
    const newEntry = {
      id: `h-${Date.now()}`,
      url,
      title: title || url,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
    };
    setFullHistory(prev => {
      const updated = [newEntry, ...prev.slice(0, 99)];
      try { localStorage.setItem('billighost_browser_history', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const navigateTo = (url) => {
    playClick();
    let target = url.trim();
    if (!target) return;

    if (target === 'about:billighost' || target === 'about:home' || target === 'about:blank') {
      updateActiveTab(t => ({
        ...t,
        url: target,
        inputUrl: target,
        loadError: false,
        readerMode: false,
      }));
      return;
    }

    if (target === 'about:search' || target.startsWith('about:search?')) {
      updateActiveTab(t => ({
        ...t,
        url: target,
        inputUrl: target,
        loadError: false,
        readerMode: false,
        history: [...t.history.slice(0, t.historyIndex + 1), target],
        historyIndex: t.historyIndex + 1,
      }));
      return;
    }

    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      if (target.includes('.') && !target.includes(' ')) {
        target = 'https://' + target;
      } else {
        // Search query — route to native Ghost Search
        target = `about:search?q=${encodeURIComponent(target)}`;
        updateActiveTab(t => ({
          ...t,
          url: target,
          inputUrl: target,
          loadError: false,
          readerMode: false,
          history: [...t.history.slice(0, t.historyIndex + 1), target],
          historyIndex: t.historyIndex + 1,
        }));
        return;
      }
    }

    // Check if site is a known iframe-blocking domain
    const blockedDomains = ['duckduckgo.com', 'news.ycombinator.com', 'google.com', 'github.com', 'twitter.com', 'x.com'];
    const isKnownBlocked = blockedDomains.some(d => target.includes(d));

    const domainName = target.replace(/^https?:\/\//, '').split('/')[0];
    recordHistory(target, domainName);

    updateActiveTab(t => ({
      ...t,
      title: domainName,
      url: target,
      inputUrl: target,
      isLoading: !isKnownBlocked,
      loadError: isKnownBlocked,
      readerMode: false,
      history: [...t.history.slice(0, t.historyIndex + 1), target],
      historyIndex: t.historyIndex + 1,
    }));

    if (!isKnownBlocked) {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = setTimeout(() => {
        updateActiveTab(t => ({ ...t, isLoading: false, loadError: true }));
      }, 8000);
    }
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      playClick();
      const prevUrl = history[historyIndex - 1];
      updateActiveTab(t => ({
        ...t,
        historyIndex: t.historyIndex - 1,
        url: prevUrl,
        inputUrl: prevUrl,
        loadError: false,
      }));
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      playClick();
      const nextUrl = history[historyIndex + 1];
      updateActiveTab(t => ({
        ...t,
        historyIndex: t.historyIndex + 1,
        url: nextUrl,
        inputUrl: nextUrl,
        loadError: false,
      }));
    }
  };

  const handleRefresh = () => {
    playClick();
    if (isSearchPage && searchQuery) {
      performSearch(searchQuery);
      return;
    }
    updateActiveTab(t => ({ ...t, isLoading: true, loadError: false }));
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigateTo(inputUrl);
  };

  const handleIframeLoad = () => {
    updateActiveTab(t => ({ ...t, isLoading: false, loadError: false }));
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
  };

  // Tab operations
  const handleNewTab = () => {
    playClick();
    const newId = `tab-${Date.now()}`;
    const newTab = {
      id: newId,
      title: 'New Tab',
      url: 'about:home',
      inputUrl: '',
      history: ['about:home'],
      historyIndex: 0,
      isLoading: false,
      loadError: false,
      zoom: 100,
      readerMode: false,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (tabId, e) => {
    e.stopPropagation();
    playClick();
    if (tabs.length <= 1) return;
    setTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTabId === tabId) {
      const remaining = tabs.filter(t => t.id !== tabId);
      setActiveTabId(remaining[0].id);
    }
  };

  // Bookmark Toggle
  const handleToggleBookmark = () => {
    playClick();
    if (isBookmarked) {
      const updated = bookmarks.filter(b => b.url !== currentUrl);
      setBookmarks(updated);
      try { localStorage.setItem('billighost_browser_bookmarks', JSON.stringify(updated)); } catch {}
      NotificationService.send({ title: 'Bookmark Removed', message: `Removed ${activeTab.title}`, type: 'info' });
    } else {
      const newBm = {
        id: `bm-${Date.now()}`,
        name: activeTab.title || 'Page',
        url: currentUrl,
        icon: '⭐',
      };
      const updated = [...bookmarks, newBm];
      setBookmarks(updated);
      try { localStorage.setItem('billighost_browser_bookmarks', JSON.stringify(updated)); } catch {}
      NotificationService.send({ title: 'Bookmark Saved', message: `Saved ${activeTab.title} to bookmarks`, type: 'success' });
    }
  };

  // Save Page to VFS
  const handleSavePageToVFS = async () => {
    playClick();
    try {
      const pageName = (activeTab.title || 'web_page').replace(/[^a-zA-Z0-9_-]/g, '_');
      const targetPath = `/Users/User/Documents/Saved_Pages/${pageName}.html`;
      const htmlContent = `<!DOCTYPE html><html><head><title>${activeTab.title}</title></head><body><h1>${activeTab.title}</h1><p>Archived from: <a href="${currentUrl}">${currentUrl}</a></p><hr/><p>Saved inside Billighost OS VFS.</p></body></html>`;
      await VFS.createDirectory('/Users/User/Documents/Saved_Pages');
      await VFS.writeFile(targetPath, htmlContent, 'text/html');
      NotificationService.send({
        title: 'Page Saved to VFS',
        message: `Archived as ${pageName}.html in Documents/Saved_Pages`,
        type: 'success',
      });
    } catch (err) {
      NotificationService.send({ title: 'Save Failed', message: err.message, type: 'error' });
    }
  };

  // Toggle Reader Mode
  const handleToggleReaderMode = async () => {
    playClick();
    const nextReader = !readerMode;
    updateActiveTab(t => ({ ...t, readerMode: nextReader }));

    if (nextReader && !readerContent) {
      // Fetch readable text if Wikipedia
      if (currentUrl.includes('wikipedia.org')) {
        const titleMatch = currentUrl.split('/wiki/')[1];
        if (titleMatch) {
          try {
            const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${titleMatch}`);
            const data = await res.json();
            setReaderContent(data);
          } catch {}
        }
      }
    }
  };

  // Zoom controls
  const handleZoom = (delta) => {
    playClick();
    const newZoom = Math.min(200, Math.max(75, zoom + delta));
    updateActiveTab(t => ({ ...t, zoom: newZoom }));
  };

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return fullHistory;
    return fullHistory.filter(h =>
      h.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.url.toLowerCase().includes(historySearch.toLowerCase())
    );
  }, [fullHistory, historySearch]);

  return (
    <div className={`${styles.browserContainer} ${isIncognito ? styles.incognitoTheme : ''}`} data-testid="ghost-browser-app">
      {/* 1. Multi-Tab Navigation Strip */}
      <div className={styles.tabBar}>
        <div className={styles.tabList}>
          {tabs.map(t => (
            <div
              key={t.id}
              className={`${styles.tabItem} ${t.id === activeTabId ? styles.tabActive : ''}`}
              onClick={() => setActiveTabId(t.id)}
            >
              <span className={styles.tabIcon}>
                {t.isLoading ? '⏳' : t.url.includes('wikipedia') ? '🌐' : '📄'}
              </span>
              <span className={styles.tabTitle}>{t.title || 'New Tab'}</span>
              {tabs.length > 1 && (
                <button
                  className={styles.tabCloseBtn}
                  onClick={(e) => handleCloseTab(t.id, e)}
                  title="Close tab"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
          <button className={styles.addTabBtn} onClick={handleNewTab} title="New Tab">
            <PlusIcon size={12} />
          </button>
        </div>

        {/* Browser Top Controls */}
        <div className={styles.topRightControls}>
          <button
            className={`${styles.browserTopBtn} ${isIncognito ? styles.incognitoActive : ''}`}
            onClick={() => {
              playClick();
              setIsIncognito(!isIncognito);
            }}
            title={isIncognito ? 'Exit Incognito Mode' : 'Enter Incognito Private Browsing'}
          >
            🕶️ {isIncognito ? 'Private' : 'Normal'}
          </button>
          <button
            className={styles.browserTopBtn}
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            title="Browsing History"
          >
            History
          </button>
        </div>
      </div>

      {/* 2. Chrome Navigation & Omnibox Bar */}
      <div className={styles.navBar}>
        <div className={styles.navButtons}>
          <button
            className={styles.navBtn}
            onClick={handleBack}
            disabled={historyIndex === 0}
            title="Back"
          >
            <ChevronLeftIcon size={14} />
          </button>
          <button
            className={styles.navBtn}
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            title="Forward"
          >
            <ChevronRightIcon size={14} />
          </button>
          <button className={styles.navBtn} onClick={handleRefresh} title="Reload">
            <RefreshIcon size={14} />
          </button>
          <button className={styles.navBtn} onClick={() => navigateTo('about:home')} title="Home">
            <HomeIcon size={14} />
          </button>
        </div>

        {/* Omnibox / URL Form */}
        <form onSubmit={handleSubmit} className={styles.omniboxForm}>
          <span className={styles.lockIcon}>
            {currentUrl.startsWith('https://') ? <LockIcon size={12} /> : '🔍'}
          </span>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => updateActiveTab(t => ({ ...t, inputUrl: e.target.value }))}
            className={styles.omniboxInput}
            placeholder="Search the web (e.g. dog) or enter URL..."
          />
          <button
            type="button"
            className={`${styles.starBtn} ${isBookmarked ? styles.starActive : ''}`}
            onClick={handleToggleBookmark}
            title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this page'}
          >
            {isBookmarked ? '★' : '☆'}
          </button>
          <button type="submit" className={styles.goBtn}>Go</button>
        </form>

        {/* Toolbar Dials */}
        <div className={styles.rightActions}>
          <button
            className={`${styles.actionPill} ${readerMode ? styles.actionPillActive : ''}`}
            onClick={handleToggleReaderMode}
            title="Toggle Reader Mode"
          >
            <BookIcon size={13} /> Reader
          </button>
          <button
            className={styles.actionPill}
            onClick={handleSavePageToVFS}
            title="Archive Page to VFS (Documents/Saved_Pages)"
          >
            💾 Save
          </button>

          {/* Zoom controls */}
          <div className={styles.zoomGroup}>
            <button className={styles.zoomBtn} onClick={() => handleZoom(-15)} title="Zoom Out">−</button>
            <span className={styles.zoomLabel}>{zoom}%</span>
            <button className={styles.zoomBtn} onClick={() => handleZoom(15)} title="Zoom In">+</button>
          </div>

          <a
            href={currentUrl.startsWith('about:') ? 'https://duckduckgo.com' : currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalBtn}
            title="Open in external browser tab"
          >
            <ExternalLinkIcon size={14} />
          </a>
        </div>
      </div>

      {/* 3. Bookmarks Bar */}
      <div className={styles.bookmarksBar}>
        {bookmarks.map((b) => (
          <button
            key={b.id || b.name}
            className={styles.bookmarkBtn}
            onClick={() => {
              if (b.isExternal) {
                playClick();
                window.open(b.url, '_blank', 'noopener,noreferrer');
              } else {
                navigateTo(b.url);
              }
            }}
            title={b.isExternal ? `${b.name} (Opens externally due to iframe policy)` : b.name}
          >
            <span>{b.icon || '🔗'}</span>
            <span>{b.name}</span>
            {b.isExternal && <ExternalLinkIcon size={10} />}
          </button>
        ))}
      </div>

      {/* 4. History Slide-Out Drawer */}
      {showHistoryDrawer && (
        <div className={styles.historyDrawer}>
          <div className={styles.drawerHeader}>
            <span>Browsing History</span>
            <div className={styles.drawerActions}>
              <button
                className={styles.toolBtn}
                onClick={() => {
                  setFullHistory([]);
                  try { localStorage.removeItem('billighost_browser_history'); } catch {}
                }}
              >
                Clear
              </button>
              <button className={styles.toolBtn} onClick={() => setShowHistoryDrawer(false)}>
                &times;
              </button>
            </div>
          </div>
          <input
            type="text"
            className={styles.historySearchInput}
            placeholder="Search history..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
          />
          <div className={styles.historyList}>
            {filteredHistory.length === 0 ? (
              <div className={styles.emptyHistory}>No browsing history recorded.</div>
            ) : (
              filteredHistory.map(h => (
                <div
                  key={h.id}
                  className={styles.historyItem}
                  onClick={() => {
                    setShowHistoryDrawer(false);
                    navigateTo(h.url);
                  }}
                >
                  <div className={styles.historyItemTitle}>{h.title}</div>
                  <div className={styles.historyItemUrl}>{h.url}</div>
                  <div className={styles.historyItemTime}>{h.date} at {h.time}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. Main Viewport Area */}
      <div className={styles.viewportArea}>
        {isLoading && (
          <div className={styles.loadIndicator}>
            <div className={styles.loadBar} />
          </div>
        )}

        {/* Reader Mode View */}
        {readerMode ? (
          <div className={`${styles.readerContainer} ${styles['font_' + readerFontFamily]}`}>
            <div className={styles.readerBar}>
              <div className={styles.readerBarLeft}>
                <span>Reader Mode</span>
                <button
                  className={styles.toolBtn}
                  onClick={() => setReaderFontFamily(f => f === 'sans' ? 'serif' : 'sans')}
                >
                  Font: {readerFontFamily.toUpperCase()}
                </button>
                <button
                  className={styles.toolBtn}
                  onClick={() => setReaderFontSize(s => Math.max(14, s - 2))}
                >
                  A−
                </button>
                <button
                  className={styles.toolBtn}
                  onClick={() => setReaderFontSize(s => Math.min(28, s + 2))}
                >
                  A+
                </button>
              </div>
              <button className={styles.toolBtn} onClick={() => updateActiveTab(t => ({ ...t, readerMode: false }))}>
                Exit Reader
              </button>
            </div>

            <div className={styles.readerContent} style={{ fontSize: `${readerFontSize}px` }}>
              {readerContent ? (
                <>
                  <h1 className={styles.readerTitle}>{readerContent.title}</h1>
                  {readerContent.description && <p className={styles.readerSub}>{readerContent.description}</p>}
                  <hr className={styles.readerDivider} />
                  <div className={styles.readerParagraphs}>
                    {readerContent.extract}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <h3>Article Reader View</h3>
                  <p>Displaying distraction-free article text. Original link: <a href={currentUrl} target="_blank" rel="noreferrer">{currentUrl}</a></p>
                </div>
              )}
            </div>
          </div>
        ) : isNewTabPage ? (
          /* Speed Dial New Tab Page */
          <div className={styles.speedDialPage}>
            <div className={styles.speedDialHeader}>
              <div className={styles.speedDialTime}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className={styles.speedDialGreeting}>Where would you like to explore today?</div>
            </div>

            <div className={styles.speedDialSearchRow}>
              <form onSubmit={handleSubmit} className={styles.speedDialSearchForm}>
                <SearchIcon size={18} />
                <input
                  type="text"
                  placeholder="Search the web with DuckDuckGo or enter URL..."
                  value={inputUrl}
                  onChange={(e) => updateActiveTab(t => ({ ...t, inputUrl: e.target.value }))}
                  className={styles.speedDialSearchInput}
                  autoFocus
                />
              </form>
            </div>

            <div className={styles.speedDialTilesGrid}>
              <div className={styles.speedTile} onClick={() => navigateTo('https://en.m.wikipedia.org')}>
                <span className={styles.tileIcon}>🌐</span>
                <span className={styles.tileLabel}>Wikipedia</span>
              </div>
              <div className={styles.speedTile} onClick={() => navigateTo('about:search?q=technology')}>
                <span className={styles.tileIcon}>⚡</span>
                <span className={styles.tileLabel}>Tech Search</span>
              </div>
              <div className={styles.speedTile} onClick={() => window.open('https://duckduckgo.com', '_blank')}>
                <span className={styles.tileIcon}>🦆</span>
                <span className={styles.tileLabel}>DuckDuckGo</span>
              </div>
              <div className={styles.speedTile} onClick={() => window.open('https://news.ycombinator.com', '_blank')}>
                <span className={styles.tileIcon}>📰</span>
                <span className={styles.tileLabel}>Hacker News</span>
              </div>
              <div className={styles.speedTile} onClick={() => navigateTo('about:billighost')}>
                <span className={styles.tileIcon}>👻</span>
                <span className={styles.tileLabel}>OS Guide</span>
              </div>
            </div>
          </div>
        ) : isSearchPage ? (
          /* Native Search Engine Results */
          <div className={styles.searchResultsArea} style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
            <div className={styles.searchHeaderRow}>
              <div className={styles.searchQueryTitle}>
                <SearchIcon size={20} />
                {searchQuery ? `Search results for: "${searchQuery}"` : 'Ghost Search'}
              </div>
              <div className={styles.searchEngineBadges}>
                <span className={styles.engineBadge}>
                  <DuckSearchIcon size={12} /> DuckDuckGo API
                </span>
                <span className={styles.engineBadge}>
                  <GlobeIcon size={12} /> Wikipedia In-OS
                </span>
              </div>
            </div>

            {searchLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)' }}>
                Searching DuckDuckGo & Wikipedia...
              </div>
            ) : (
              <>
                {/* Instant Answer */}
                {ddgResult && (ddgResult.Heading || ddgResult.AbstractText) && (
                  <div className={styles.instantAnswerCard}>
                    {ddgResult.Heading && <div className={styles.instantAnswerHeading}>{ddgResult.Heading}</div>}
                    {ddgResult.AbstractText && <div className={styles.instantAnswerText}>{ddgResult.AbstractText}</div>}
                  </div>
                )}

                {/* Wikipedia Results */}
                {wikiResults.length > 0 ? (
                  <div className={styles.resultsList}>
                    {wikiResults.map((item, idx) => (
                      <div
                        key={idx}
                        className={styles.resultCard}
                        onClick={() => navigateTo(item.url)}
                      >
                        <div className={styles.resultCardTitle}>{item.title}</div>
                        {item.snippet && <div className={styles.resultCardSnippet}>{item.snippet}</div>}
                        <div className={styles.resultCardUrl}>{item.url}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  searchQuery && (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-ghost)' }}>
                      No direct Wikipedia articles found. Try the external DuckDuckGo button below.
                    </div>
                  )
                )}

                {/* External escape hatch */}
                <div className={styles.searchExternalBanner}>
                  <div className={styles.searchExternalText}>
                    Search <strong>"{searchQuery}"</strong> directly on DuckDuckGo in an external tab:
                  </div>
                  <a
                    href={`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.searchExternalBtn}
                  >
                    <DuckSearchIcon size={14} /> Open DuckDuckGo
                  </a>
                </div>
              </>
            )}
          </div>
        ) : currentUrl === 'about:billighost' ? (
          <div className={styles.internalDoc}>
            <h1><GhostIcon size={28} /> Billighost OS — Ghost Browser</h1>
            <p>Welcome to the multi-tab web browser built into Billighost OS.</p>
            <div className={styles.docCard}>
              <h3>Features:</h3>
              <ul>
                <li>Multi-Tab Browsing Architecture with instant tab switching and closing</li>
                <li>Distraction-Free Reader View with customizable serif/sans typography</li>
                <li>Integrated DuckDuckGo Instant Answers & Wikipedia search</li>
                <li>Bookmarks & Browsing History drawers</li>
                <li>Incognito Private Mode</li>
                <li>One-click HTML page archiving to VFS</li>
              </ul>
            </div>
          </div>
        ) : loadError ? (
          <div className={styles.internalDoc}>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <AlertTriangleIcon size={48} color="var(--accent-warning, #fbbf24)" />
              <h2 style={{ marginTop: '16px', fontSize: '1.1rem' }}>Page Cannot Be Embedded</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px', lineHeight: 1.6 }}>
                The website at <code>{currentUrl}</code> blocks embedded frames via security headers (<code>X-Frame-Options</code>).
              </p>
              <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.errorExtBtn}
                >
                  <ExternalLinkIcon size={14} /> Open in New Tab
                </a>
                <button
                  className={styles.errorRetryBtn}
                  onClick={handleRefresh}
                >
                  <RefreshIcon size={14} /> Retry
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            <iframe
              ref={iframeRef}
              src={currentUrl}
              title="Ghost Browser Frame"
              className={styles.browserFrame}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onLoad={handleIframeLoad}
              style={{
                width: `${(100 / zoom) * 100}%`,
                height: `${(100 / zoom) * 100}%`,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
