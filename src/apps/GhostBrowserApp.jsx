import { useState, useRef } from 'react';
import {
  ChevronLeftIcon, ChevronRightIcon, RefreshIcon, HomeIcon,
  GlobeIcon, NewspaperIcon, DuckSearchIcon, BookIcon, GhostIcon,
  ExternalLinkIcon, LockIcon, AlertTriangleIcon,
} from '../components/Icons';
import styles from './GhostBrowserApp.module.css';

const DEFAULT_HOME = 'https://en.m.wikipedia.org';

const BOOKMARKS = [
  { name: 'Wikipedia', url: 'https://en.m.wikipedia.org', icon: <GlobeIcon size={13} /> },
  { name: 'Hacker News', url: 'https://news.ycombinator.com', icon: <NewspaperIcon size={13} /> },
  { name: 'DuckDuckGo', url: 'https://lite.duckduckgo.com/lite/', icon: <DuckSearchIcon size={13} /> },
  { name: 'MDN Web', url: 'https://developer.mozilla.org', icon: <BookIcon size={13} /> },
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

    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      if (target.includes('.') && !target.includes(' ')) {
        target = 'https://' + target;
      } else {
        // Search query — use DuckDuckGo lite for better iframe compatibility
        target = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(target)}`;
      }
    }

    setIsLoading(true);
    setLoadError(false);
    setCurrentUrl(target);
    setInputUrl(target);

    setHistory(prev => [...prev.slice(0, historyIndex + 1), target]);
    setHistoryIndex(prev => prev + 1);

    // Set a timeout to detect if the iframe fails to load
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      // If still loading after 8 seconds, show error state
      setIsLoading(false);
      setLoadError(true);
    }, 8000);
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
            placeholder="Search the web or enter URL..."
          />
          <button type="submit" className={styles.goBtn}>Go</button>
        </form>

        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.externalBtn}
          title="Open in new browser tab"
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
            onClick={() => navigateTo(b.url)}
          >
            {b.icon} {b.name}
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

        {currentUrl === 'about:billighost' ? (
          <div className={styles.internalDoc}>
            <h1><GhostIcon size={28} /> Billighost OS — Ghost Browser</h1>
            <p>Welcome to the built-in browser operating inside Billighost OS sandbox.</p>
            <div className={styles.docCard}>
              <h3>Features:</h3>
              <ul>
                <li>Integrated web search powered by DuckDuckGo Lite</li>
                <li>Quick bookmarks for Wikipedia, MDN Web Docs, and Hacker News</li>
                <li>Live iframe renderer with instant external tab launch for frame-restricted sites</li>
              </ul>
            </div>
            <div className={styles.docCard}>
              <h3><AlertTriangleIcon size={16} /> Iframe Limitation Notice</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Most websites block being embedded in iframes for security (X-Frame-Options headers).
                If a site appears blank, use the <strong>external link button</strong> in the toolbar to open it in a new browser tab.
                Wikipedia, DuckDuckGo Lite, Hacker News, and MDN are confirmed to work within the iframe.
              </p>
            </div>
          </div>
        ) : loadError ? (
          <div className={styles.internalDoc}>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <AlertTriangleIcon size={48} color="var(--accent-warning)" />
              <h2 style={{ marginTop: '16px', fontSize: '1.1rem' }}>Page Could Not Load</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px', lineHeight: 1.6 }}>
                This website blocks being embedded in the browser frame (X-Frame-Options).
                <br />This is a security restriction and cannot be bypassed.
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
