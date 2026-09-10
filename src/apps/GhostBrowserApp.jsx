import { useState, useRef } from 'react';
import styles from './GhostBrowserApp.module.css';

const DEFAULT_HOME = 'https://en.m.wikipedia.org';

const BOOKMARKS = [
  { name: 'Wikipedia', url: 'https://en.m.wikipedia.org', icon: '🌐' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com', icon: '📰' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: '🦆' },
  { name: 'MDN Web', url: 'https://developer.mozilla.org', icon: '📚' },
  { name: 'OS Guide', url: 'about:billighost', icon: '👻' },
];

export default function GhostBrowserApp({ playClick = () => {} }) {
  const [currentUrl, setCurrentUrl] = useState(DEFAULT_HOME);
  const [inputUrl, setInputUrl] = useState(DEFAULT_HOME);
  const [history, setHistory] = useState([DEFAULT_HOME]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef(null);

  const navigateTo = (url) => {
    playClick();
    let target = url.trim();
    if (!target) return;

    if (target === 'about:billighost') {
      setCurrentUrl('about:billighost');
      setInputUrl('about:billighost');
      return;
    }

    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      if (target.includes('.') && !target.includes(' ')) {
        target = 'https://' + target;
      } else {
        // Search query
        target = `https://duckduckgo.com/?q=${encodeURIComponent(target)}`;
      }
    }

    setIsLoading(true);
    setCurrentUrl(target);
    setInputUrl(target);

    setHistory(prev => [...prev.slice(0, historyIndex + 1), target]);
    setHistoryIndex(prev => prev + 1);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      playClick();
      const prevUrl = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCurrentUrl(prevUrl);
      setInputUrl(prevUrl);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      playClick();
      const nextUrl = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCurrentUrl(nextUrl);
      setInputUrl(nextUrl);
    }
  };

  const handleRefresh = () => {
    playClick();
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigateTo(inputUrl);
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
            ◀
          </button>
          <button
            className={styles.navBtn}
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            title="Forward"
          >
            ▶
          </button>
          <button className={styles.navBtn} onClick={handleRefresh} title="Reload">
            🔄
          </button>
          <button className={styles.navBtn} onClick={() => navigateTo(DEFAULT_HOME)} title="Home">
            🏠
          </button>
        </div>

        {/* Omnibox / URL Bar */}
        <form onSubmit={handleSubmit} className={styles.omniboxForm}>
          <span className={styles.lockIcon}>🔒</span>
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
          ↗
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
            <span>{b.icon}</span> {b.name}
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
            <h1>👻 Billighost OS — Ghost Browser</h1>
            <p>Welcome to the built-in browser operating inside Billighost OS sandbox.</p>
            <div className={styles.docCard}>
              <h3>Features:</h3>
              <ul>
                <li>Integrated web search powered by DuckDuckGo</li>
                <li>Quick bookmarks for Wikipedia, MDN Web Docs, and Hacker News</li>
                <li>Live iframe renderer with instant external tab launch for frame-restricted sites</li>
              </ul>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={currentUrl}
            title="Ghost Browser Frame"
            className={styles.browserFrame}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={() => setIsLoading(false)}
          />
        )}
      </div>
    </div>
  );
}
