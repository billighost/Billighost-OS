import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeftIcon, ChevronRightIcon, RefreshIcon, HomeIcon,
  GlobeIcon, NewspaperIcon, DuckSearchIcon, BookIcon, GhostIcon,
  ExternalLinkIcon, LockIcon, AlertTriangleIcon, SearchIcon,
} from '../components/Icons';
import styles from './GhostBrowserApp.module.css';

const DEFAULT_HOME = 'https://en.m.wikipedia.org';

const BOOKMARKS = [
  { name: 'Wikipedia', url: 'https://en.m.wikipedia.org', icon: <GlobeIcon size={13} /> },
  { name: 'Ghost Search', url: 'about:search', icon: <SearchIcon size={13} /> },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com', isExternal: true, icon: <DuckSearchIcon size={13} /> },
  { name: 'Hacker News', url: 'https://news.ycombinator.com', isExternal: true, icon: <NewspaperIcon size={13} /> },
  { name: 'OS Guide', url: 'about:billighost', icon: <GhostIcon size={13} /> },
];

export default function GhostBrowserApp({ playClick = () => {} }) {
  const [currentUrl, setCurrentUrl] = useState(DEFAULT_HOME);
  const [inputUrl, setInputUrl] = useState(DEFAULT_HOME);
  const [history, setHistory] = useState([DEFAULT_HOME]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const iframeRef = useRef(null);
  const loadTimeoutRef = useRef(null);

  // Search State for about:search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [ddgResult, setDdgResult] = useState(null);
  const [wikiResults, setWikiResults] = useState([]);

  const isSearchPage = currentUrl.startsWith('about:search');

  // Extract query from URL if on about:search
  useEffect(() => {
    if (isSearchPage) {
      const q = new URLSearchParams(currentUrl.split('?')[1] || '').get('q') || '';
      setSearchQuery(q);
      if (q.trim()) {
        performSearch(q.trim());
      } else {
        setDdgResult(null);
        setWikiResults([]);
      }
    }
  }, [currentUrl, isSearchPage]);

  const performSearch = async (q) => {
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
  };

  const navigateTo = (url) => {
    playClick();
    let target = url.trim();
    if (!target) return;

    if (target === 'about:billighost') {
      setCurrentUrl('about:billighost');
      setInputUrl('about:billighost');
      setLoadError(false);
      return;
    }

    if (target === 'about:search' || target.startsWith('about:search?')) {
      setCurrentUrl(target);
      setInputUrl(target);
      setLoadError(false);
      setHistory(prev => [...prev.slice(0, historyIndex + 1), target]);
      setHistoryIndex(prev => prev + 1);
      return;
    }

    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      if (target.includes('.') && !target.includes(' ')) {
        target = 'https://' + target;
      } else {
        // Search query — route to native Ghost Search
        target = `about:search?q=${encodeURIComponent(target)}`;
        setCurrentUrl(target);
        setInputUrl(target);
        setLoadError(false);
        setHistory(prev => [...prev.slice(0, historyIndex + 1), target]);
        setHistoryIndex(prev => prev + 1);
        return;
      }
    }

    // Check if site is a known iframe-blocking domain
    const blockedDomains = ['duckduckgo.com', 'news.ycombinator.com', 'google.com', 'github.com', 'twitter.com', 'x.com'];
    const isKnownBlocked = blockedDomains.some(d => target.includes(d));

    setIsLoading(!isKnownBlocked);
    setLoadError(isKnownBlocked);
    setCurrentUrl(target);
    setInputUrl(target);

    setHistory(prev => [...prev.slice(0, historyIndex + 1), target]);
    setHistoryIndex(prev => prev + 1);

    if (!isKnownBlocked) {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setLoadError(true);
      }, 8000);
    }
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      playClick();
      const prevUrl = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCurrentUrl(prevUrl);
      setInputUrl(prevUrl);
      setLoadError(false);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      playClick();
      const nextUrl = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCurrentUrl(nextUrl);
      setInputUrl(nextUrl);
      setLoadError(false);
    }
  };

  const handleRefresh = () => {
    playClick();
    if (isSearchPage && searchQuery) {
      performSearch(searchQuery);
      return;
    }
    setIsLoading(true);
    setLoadError(false);
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigateTo(inputUrl);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setLoadError(false);
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
  };

  return (
    <div className={styles.browserContainer}>
      {/* Browser Chrome Navigation Bar */}
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
          <button className={styles.navBtn} onClick={() => navigateTo(DEFAULT_HOME)} title="Home">
            <HomeIcon size={14} />
          </button>
        </div>

        {/* Omnibox / URL Bar */}
        <form onSubmit={handleSubmit} className={styles.omniboxForm}>
          <span className={styles.lockIcon}><LockIcon size={12} /></span>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className={styles.omniboxInput}
            placeholder="Search the web (e.g. dog) or enter URL..."
          />
          <button type="submit" className={styles.goBtn}>Go</button>
        </form>

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

      {/* Bookmarks Bar */}
      <div className={styles.bookmarksBar}>
        {BOOKMARKS.map((b) => (
          <button
            key={b.name}
            className={styles.bookmarkBtn}
            onClick={() => {
              if (b.isExternal) {
                playClick();
                window.open(b.url, '_blank', 'noopener,noreferrer');
              } else {
                navigateTo(b.url);
              }
            }}
            title={b.isExternal ? `${b.name} (Opens in external tab due to iframe security)` : b.name}
          >
            {b.icon} {b.name} {b.isExternal && <ExternalLinkIcon size={10} />}
          </button>
        ))}
      </div>

      {/* Main Web Viewport */}
      <div className={styles.viewportArea}>
        {isLoading && (
          <div className={styles.loadIndicator}>
            <div className={styles.loadBar} />
          </div>
        )}

        {isSearchPage ? (
          <div className={styles.searchResultsArea}>
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
                {/* DuckDuckGo Instant Answer / Abstract */}
                {ddgResult && (ddgResult.Heading || ddgResult.AbstractText) && (
                  <div className={styles.instantAnswerCard}>
                    {ddgResult.Heading && <div className={styles.instantAnswerHeading}>{ddgResult.Heading}</div>}
                    {ddgResult.AbstractText && <div className={styles.instantAnswerText}>{ddgResult.AbstractText}</div>}
                  </div>
                )}

                {/* Wikipedia OpenSearch Results (all playable in-OS) */}
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

                {/* Direct External Search Escape Hatch */}
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
            <p>Welcome to the built-in browser operating inside Billighost OS sandbox.</p>
            <div className={styles.docCard}>
              <h3>Features:</h3>
              <ul>
                <li>Integrated web search powered by DuckDuckGo Instant Answers & Wikipedia</li>
                <li>Quick bookmarks for Wikipedia, DuckDuckGo, and Hacker News</li>
                <li>Live iframe renderer with instant external tab launch for frame-restricted sites</li>
              </ul>
            </div>
            <div className={styles.docCard}>
              <h3><AlertTriangleIcon size={16} /> Web Embedding Policy Notice</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Most major websites (Google, DuckDuckGo, Hacker News) configure <code>X-Frame-Options: SAMEORIGIN</code> headers to prevent clickjacking.
                Wikipedia permits iframe embedding, so all searches and Wikipedia articles open seamlessly inside Billighost OS.
                For frame-restricted sites, use the <strong>Open in New Tab</strong> button.
              </p>
            </div>
          </div>
        ) : loadError ? (
          <div className={styles.internalDoc}>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <AlertTriangleIcon size={48} color="var(--accent-warning)" />
              <h2 style={{ marginTop: '16px', fontSize: '1.1rem' }}>Page Cannot Be Embedded</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px', lineHeight: 1.6 }}>
                The website at <code>{currentUrl}</code> blocks embedded frames via security headers (<code>X-Frame-Options / frame-ancestors</code>).
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
          <iframe
            ref={iframeRef}
            src={currentUrl}
            title="Ghost Browser Frame"
            className={styles.browserFrame}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={handleIframeLoad}
          />
        )}
      </div>
    </div>
  );
}
