import { useState, useEffect, useCallback } from 'react';
import styles from './CalculatorApp.module.css';

export default function CalculatorApp({ playClick = () => {} }) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [history, setHistory] = useState([]);
  const [showScientific, setShowScientific] = useState(false);

  const handleDigit = useCallback((d) => {
    playClick();
    setDisplay(prev => {
      if (prev === '0' || prev === 'Error') return d;
      return prev + d;
    });
  }, [playClick]);

  const handleOperator = useCallback((op) => {
    playClick();
    setEquation(`${display} ${op} `);
    setDisplay('0');
  }, [display, playClick]);

  const handleClear = useCallback(() => {
    playClick();
    setDisplay('0');
    setEquation('');
  }, [playClick]);

  const handleEqual = useCallback(() => {
    playClick();
    if (!equation) return;
    try {
      const fullExpr = equation + display;
      // Sanitize expression
      const sanitized = fullExpr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/\^/g, '**');

      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${sanitized})`)();
      const rounded = Math.round(result * 100000000) / 100000000;
      setHistory(prev => [{ expr: fullExpr, res: rounded }, ...prev.slice(0, 8)]);
      setDisplay(rounded.toString());
      setEquation('');
    } catch {
      setDisplay('Error');
    }
  }, [display, equation, playClick]);

  const handleScientific = useCallback((func) => {
    playClick();
    const val = parseFloat(display);
    if (isNaN(val)) return;

    let res = 0;
    switch (func) {
      case 'sin': res = Math.sin(val); break;
      case 'cos': res = Math.cos(val); break;
      case 'tan': res = Math.tan(val); break;
      case 'sqrt': res = Math.sqrt(val); break;
      case 'log': res = Math.log10(val); break;
      case 'ln': res = Math.log(val); break;
      case 'pi': res = Math.PI; break;
      case 'e': res = Math.E; break;
      default: return;
    }
    const rounded = Math.round(res * 100000000) / 100000000;
    setHistory(prev => [{ expr: `${func}(${val})`, res: rounded }, ...prev.slice(0, 8)]);
    setDisplay(rounded.toString());
  }, [display, playClick]);

  // Keyboard support
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === '.') {
        setDisplay(prev => (prev.includes('.') ? prev : prev + '.'));
      } else if (e.key === '+') {
        handleOperator('+');
      } else if (e.key === '-') {
        handleOperator('-');
      } else if (e.key === '*') {
        handleOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEqual();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        handleClear();
      } else if (e.key === 'Backspace') {
        setDisplay(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClear, handleDigit, handleEqual, handleOperator]);

  return (
    <div className={styles.calculatorLayout}>
      <div className={styles.mainCalc}>
        {/* Display Screen */}
        <div className={styles.screen}>
          <div className={styles.equationLine}>{equation}</div>
          <div className={styles.resultLine}>{display}</div>
        </div>

        {/* Toggle Mode */}
        <div className={styles.modeBar}>
          <button
            className={`${styles.modeBtn} ${showScientific ? styles.modeActive : ''}`}
            onClick={() => { playClick(); setShowScientific(!showScientific); }}
          >
            {showScientific ? 'Standard Mode' : 'Scientific Mode'}
          </button>
        </div>

        {/* Keypad Grid */}
        <div className={`${styles.keypad} ${showScientific ? styles.keypadScientific : ''}`}>
          {showScientific && (
            <>
              <button className={styles.sciBtn} onClick={() => handleScientific('sin')}>sin</button>
              <button className={styles.sciBtn} onClick={() => handleScientific('cos')}>cos</button>
              <button className={styles.sciBtn} onClick={() => handleScientific('tan')}>tan</button>
              <button className={styles.sciBtn} onClick={() => handleScientific('sqrt')}>√</button>
              <button className={styles.sciBtn} onClick={() => handleScientific('log')}>log</button>
              <button className={styles.sciBtn} onClick={() => handleScientific('ln')}>ln</button>
              <button className={styles.sciBtn} onClick={() => handleScientific('pi')}>π</button>
              <button className={styles.sciBtn} onClick={() => handleScientific('e')}>e</button>
            </>
          )}

          <button className={`${styles.btn} ${styles.btnOp}`} onClick={handleClear}>C</button>
          <button className={`${styles.btn} ${styles.btnOp}`} onClick={() => setDisplay(prev => (prev.startsWith('-') ? prev.slice(1) : '-' + prev))}>±</button>
          <button className={`${styles.btn} ${styles.btnOp}`} onClick={() => handleOperator('%')}>%</button>
          <button className={`${styles.btn} ${styles.btnAction}`} onClick={() => handleOperator('÷')}>÷</button>

          <button className={styles.btn} onClick={() => handleDigit('7')}>7</button>
          <button className={styles.btn} onClick={() => handleDigit('8')}>8</button>
          <button className={styles.btn} onClick={() => handleDigit('9')}>9</button>
          <button className={`${styles.btn} ${styles.btnAction}`} onClick={() => handleOperator('×')}>×</button>

          <button className={styles.btn} onClick={() => handleDigit('4')}>4</button>
          <button className={styles.btn} onClick={() => handleDigit('5')}>5</button>
          <button className={styles.btn} onClick={() => handleDigit('6')}>6</button>
          <button className={`${styles.btn} ${styles.btnAction}`} onClick={() => handleOperator('-')}>−</button>

          <button className={styles.btn} onClick={() => handleDigit('1')}>1</button>
          <button className={styles.btn} onClick={() => handleDigit('2')}>2</button>
          <button className={styles.btn} onClick={() => handleDigit('3')}>3</button>
          <button className={`${styles.btn} ${styles.btnAction}`} onClick={() => handleOperator('+')}>+</button>

          <button className={`${styles.btn} ${styles.btnZero}`} onClick={() => handleDigit('0')}>0</button>
          <button className={styles.btn} onClick={() => setDisplay(prev => (prev.includes('.') ? prev : prev + '.'))}>.</button>
          <button className={`${styles.btn} ${styles.btnEqual}`} onClick={handleEqual}>=</button>
        </div>
      </div>

      {/* History Tape Sidebar */}
      <div className={styles.historySidebar}>
        <div className={styles.historyHeader}>
          <span>History</span>
          {history.length > 0 && (
            <button className={styles.clearHistoryBtn} onClick={() => setHistory([])}>Clear</button>
          )}
        </div>
        <div className={styles.historyList}>
          {history.map((h, i) => (
            <div
              key={i}
              className={styles.historyItem}
              onClick={() => {
                playClick();
                setDisplay(h.res.toString());
              }}
              title="Click to use result"
            >
              <div className={styles.historyExpr}>{h.expr} =</div>
              <div className={styles.historyRes}>{h.res}</div>
            </div>
          ))}
          {history.length === 0 && (
            <div className={styles.emptyHistory}>No history yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
