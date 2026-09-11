import { useState, useEffect, useCallback, useRef } from 'react';
import { NotificationService } from '../services/notificationService';
import styles from './CalculatorApp.module.css';

const CONVERSION_CATEGORIES = {
  data: {
    name: 'Digital Storage',
    units: ['Bytes', 'KB', 'MB', 'GB', 'TB'],
    rates: [1, 1024, 1048576, 1073741824, 1099511627776],
  },
  length: {
    name: 'Length',
    units: ['Meters', 'Kilometers', 'Feet', 'Inches', 'Miles'],
    rates: [1, 1000, 0.3048, 0.0254, 1609.34],
  },
  weight: {
    name: 'Weight / Mass',
    units: ['Grams', 'Kilograms', 'Pounds', 'Ounces'],
    rates: [1, 1000, 453.592, 28.3495],
  },
};

export default function CalculatorApp({ playClick = () => {} }) {
  // Mode: 'standard' | 'scientific' | 'programmer' | 'converter' | 'grapher'
  const [calcMode, setCalcMode] = useState('standard');
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [history, setHistory] = useState([]);
  const [memory, setMemory] = useState(0);
  const [hasMemory, setHasMemory] = useState(false);
  const [angleMode, setAngleMode] = useState('deg'); // 'deg' | 'rad'

  // Programmer Mode base
  const [progBase, setProgBase] = useState('DEC'); // 'HEX' | 'DEC' | 'OCT' | 'BIN'
  const [progWordSize, setProgWordSize] = useState(32); // 8, 16, 32, 64

  // Converter Mode state
  const [convCategory, setConvCategory] = useState('data');
  const [convFromUnit, setConvFromUnit] = useState(0);
  const [convToUnit, setConvToUnit] = useState(2);
  const [convInput, setConvInput] = useState('1024');

  // Grapher state
  const graphCanvasRef = useRef(null);
  const [graphFunc, setGraphFunc] = useState('sin(x)');

  // Safely evaluate math expression without Function/eval injection
  const evaluateExpression = useCallback((expr) => {
    // Replace visual tokens
    let sanitized = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/\^/g, '**');

    // Only allow numbers, math operators, parens, decimal points, spaces
    if (!/^[0-9+\-*/().\s*%]+$/.test(sanitized)) {
      throw new Error('Invalid expression');
    }

    // eslint-disable-next-line no-new-func
    const result = Function(`'use strict'; return (${sanitized})`)();
    if (!isFinite(result) || isNaN(result)) throw new Error('Math Error');
    return Math.round(result * 100000000) / 100000000;
  }, []);

  const handleDigit = useCallback((d) => {
    playClick();
    setDisplay(prev => {
      if (prev === '0' || prev === 'Error' || prev === 'Math Error') return d;
      return prev + d;
    });
  }, [playClick]);

  const handleOperator = useCallback((op) => {
    playClick();
    if (equation && !equation.endsWith(' ')) {
      try {
        const partial = evaluateExpression(equation + display);
        setEquation(`${partial} ${op} `);
        setDisplay('0');
        return;
      } catch {
        // Fallback
      }
    }
    setEquation(`${display} ${op} `);
    setDisplay('0');
  }, [display, equation, evaluateExpression, playClick]);

  const handleClear = useCallback(() => {
    playClick();
    setDisplay('0');
    setEquation('');
  }, [playClick]);

  const handleBackspace = useCallback(() => {
    playClick();
    setDisplay(prev => {
      if (prev.length <= 1 || prev === 'Error') return '0';
      return prev.slice(0, -1);
    });
  }, [playClick]);

  const handleEqual = useCallback(() => {
    playClick();
    if (!equation) return;
    try {
      const fullExpr = equation + display;
      const rounded = evaluateExpression(fullExpr);
      setHistory(prev => [{ expr: fullExpr, res: rounded }, ...prev.slice(0, 14)]);
      setDisplay(rounded.toString());
      setEquation('');
    } catch {
      setDisplay('Error');
    }
  }, [display, equation, evaluateExpression, playClick]);

  // Scientific functions
  const handleScientific = useCallback((func) => {
    playClick();
    const val = parseFloat(display);
    if (isNaN(val)) return;

    let res = 0;
    const rad = angleMode === 'deg' ? (val * Math.PI) / 180 : val;

    switch (func) {
      case 'sin': res = Math.sin(rad); break;
      case 'cos': res = Math.cos(rad); break;
      case 'tan': res = Math.tan(rad); break;
      case 'asin': res = Math.asin(val); if (angleMode === 'deg') res = (res * 180) / Math.PI; break;
      case 'acos': res = Math.acos(val); if (angleMode === 'deg') res = (res * 180) / Math.PI; break;
      case 'atan': res = Math.atan(val); if (angleMode === 'deg') res = (res * 180) / Math.PI; break;
      case 'sqrt': res = Math.sqrt(val); break;
      case 'cbrt': res = Math.cbrt(val); break;
      case 'sqr': res = val * val; break;
      case 'cube': res = val * val * val; break;
      case 'log': res = Math.log10(val); break;
      case 'ln': res = Math.log(val); break;
      case 'abs': res = Math.abs(val); break;
      case 'inv': res = val !== 0 ? 1 / val : 'Error'; break;
      case 'fact': {
        if (val < 0 || val > 120) { res = 'Error'; break; }
        let f = 1;
        for (let i = 2; i <= Math.floor(val); i++) f *= i;
        res = f;
        break;
      }
      case 'pi': res = Math.PI; break;
      case 'e': res = Math.E; break;
      default: return;
    }

    if (res === 'Error' || isNaN(res) || !isFinite(res)) {
      setDisplay('Math Error');
      return;
    }

    const rounded = Math.round(res * 100000000) / 100000000;
    setHistory(prev => [{ expr: `${func}(${val})`, res: rounded }, ...prev.slice(0, 14)]);
    setDisplay(rounded.toString());
  }, [display, angleMode, playClick]);

  // Memory operations
  const handleMemory = (op) => {
    playClick();
    const val = parseFloat(display) || 0;
    if (op === 'MC') {
      setMemory(0);
      setHasMemory(false);
    } else if (op === 'MR') {
      setDisplay(memory.toString());
    } else if (op === 'M+') {
      const next = memory + val;
      setMemory(next);
      setHasMemory(true);
    } else if (op === 'M-') {
      const next = memory - val;
      setMemory(next);
      setHasMemory(true);
    } else if (op === 'MS') {
      setMemory(val);
      setHasMemory(true);
    }
  };

  // Copy result
  const handleCopy = () => {
    playClick();
    navigator.clipboard.writeText(display);
    NotificationService.send({
      title: 'Copied to Clipboard',
      message: `${display} copied`,
      type: 'info',
    });
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === '.') {
        setDisplay(prev => (prev.includes('.') ? prev : prev + '.'));
      } else if (e.key === '+') {
        handleOperator('+');
      } else if (e.key === '-') {
        handleOperator('−');
      } else if (e.key === '*') {
        handleOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEqual();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        handleClear();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === '(' || e.key === ')') {
        setDisplay(prev => (prev === '0' ? e.key : prev + e.key));
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClear, handleDigit, handleEqual, handleOperator, handleBackspace]);

  // Programmer mode helpers
  const currentNum = parseInt(display, 10) || 0;
  const hexVal = (currentNum >>> 0).toString(16).toUpperCase();
  const decVal = currentNum.toString(10);
  const octVal = (currentNum >>> 0).toString(8);
  const binVal = (currentNum >>> 0).toString(2).padStart(progWordSize === 8 ? 8 : (progWordSize === 16 ? 16 : 32), '0');

  const handleBitwise = (op) => {
    playClick();
    const val = parseInt(display, 10) || 0;
    if (op === 'NOT') {
      const res = ~val;
      setDisplay(res.toString());
    } else if (op === 'LSH') {
      const res = val << 1;
      setDisplay(res.toString());
    } else if (op === 'RSH') {
      const res = val >> 1;
      setDisplay(res.toString());
    } else {
      handleOperator(op);
    }
  };

  // Render Grapher Canvas
  useEffect(() => {
    if (calcMode !== 'grapher') return;
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = '#0a0c12';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#7eb8ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

    // Plot Curve
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();

    const scaleX = 25; // 25px per unit
    const scaleY = 35; // 35px per unit
    const originX = width / 2;
    const originY = height / 2;

    let first = true;
    for (let px = 0; px < width; px += 2) {
      const x = (px - originX) / scaleX;
      let y = 0;

      try {
        if (graphFunc === 'sin(x)') y = Math.sin(x);
        else if (graphFunc === 'cos(x)') y = Math.cos(x);
        else if (graphFunc === 'tan(x)') y = Math.tan(x);
        else if (graphFunc === 'x^2') y = x * x;
        else if (graphFunc === 'x^3') y = x * x * x;
        else if (graphFunc === 'sqrt(x)') y = x >= 0 ? Math.sqrt(x) : NaN;
        else if (graphFunc === '1/x') y = x !== 0 ? 1 / x : NaN;
        else y = Math.sin(x);
      } catch {
        y = 0;
      }

      if (!isNaN(y) && isFinite(y)) {
        const py = originY - y * scaleY;
        if (first) {
          ctx.moveTo(px, py);
          first = false;
        } else {
          ctx.lineTo(px, py);
        }
      } else {
        first = true;
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [calcMode, graphFunc]);

  // Converter calculation
  const cat = CONVERSION_CATEGORIES[convCategory];
  const inputNum = parseFloat(convInput) || 0;
  const inBase = inputNum * cat.rates[convFromUnit];
  const convertedResult = inBase / cat.rates[convToUnit];

  return (
    <div className={styles.calculatorLayout} data-testid="calculator-app">
      {/* Top Header Mode Bar */}
      <div className={styles.headerBar}>
        <div className={styles.modeTabs}>
          <button
            className={`${styles.tabBtn} ${calcMode === 'standard' ? styles.tabBtnActive : ''}`}
            onClick={() => { playClick(); setCalcMode('standard'); }}
          >
            Standard
          </button>
          <button
            className={`${styles.tabBtn} ${calcMode === 'scientific' ? styles.tabBtnActive : ''}`}
            onClick={() => { playClick(); setCalcMode('scientific'); }}
          >
            Scientific
          </button>
          <button
            className={`${styles.tabBtn} ${calcMode === 'programmer' ? styles.tabBtnActive : ''}`}
            onClick={() => { playClick(); setCalcMode('programmer'); }}
          >
            Programmer
          </button>
          <button
            className={`${styles.tabBtn} ${calcMode === 'converter' ? styles.tabBtnActive : ''}`}
            onClick={() => { playClick(); setCalcMode('converter'); }}
          >
            Converter
          </button>
          <button
            className={`${styles.tabBtn} ${calcMode === 'grapher' ? styles.tabBtnActive : ''}`}
            onClick={() => { playClick(); setCalcMode('grapher'); }}
          >
            Grapher
          </button>
        </div>

        {calcMode === 'scientific' && (
          <button
            className={styles.angleToggleBtn}
            onClick={() => { playClick(); setAngleMode(a => a === 'deg' ? 'rad' : 'deg'); }}
            title="Toggle Degrees / Radians"
          >
            {angleMode.toUpperCase()}
          </button>
        )}
      </div>

      <div className={styles.mainCalc}>
        {/* Screen Display (Standard, Scientific, Programmer) */}
        {['standard', 'scientific', 'programmer'].includes(calcMode) && (
          <div className={styles.screen}>
            <div className={styles.screenTopRow}>
              <div className={styles.memoryBadge}>{hasMemory ? 'M' : ''}</div>
              <div className={styles.equationLine}>{equation}</div>
            </div>
            <div className={styles.resultRow}>
              <button className={styles.copyBtn} onClick={handleCopy} title="Copy result">
                📋
              </button>
              <div className={styles.resultLine}>{display}</div>
            </div>
          </div>
        )}

        {/* PROGRAMMER BASE MONITOR */}
        {calcMode === 'programmer' && (
          <div className={styles.programmerBases}>
            <div
              className={`${styles.baseRow} ${progBase === 'HEX' ? styles.baseRowActive : ''}`}
              onClick={() => setProgBase('HEX')}
            >
              <span className={styles.baseTag}>HEX</span>
              <span className={styles.baseVal}>{hexVal}</span>
            </div>
            <div
              className={`${styles.baseRow} ${progBase === 'DEC' ? styles.baseRowActive : ''}`}
              onClick={() => setProgBase('DEC')}
            >
              <span className={styles.baseTag}>DEC</span>
              <span className={styles.baseVal}>{decVal}</span>
            </div>
            <div
              className={`${styles.baseRow} ${progBase === 'OCT' ? styles.baseRowActive : ''}`}
              onClick={() => setProgBase('OCT')}
            >
              <span className={styles.baseTag}>OCT</span>
              <span className={styles.baseVal}>{octVal}</span>
            </div>
            <div
              className={`${styles.baseRow} ${progBase === 'BIN' ? styles.baseRowActive : ''}`}
              onClick={() => setProgBase('BIN')}
            >
              <span className={styles.baseTag}>BIN</span>
              <span className={styles.baseValBin}>{binVal}</span>
            </div>
          </div>
        )}

        {/* MEMORY ROW (Standard & Scientific) */}
        {['standard', 'scientific'].includes(calcMode) && (
          <div className={styles.memoryRow}>
            <button className={styles.memBtn} onClick={() => handleMemory('MC')} disabled={!hasMemory}>MC</button>
            <button className={styles.memBtn} onClick={() => handleMemory('MR')} disabled={!hasMemory}>MR</button>
            <button className={styles.memBtn} onClick={() => handleMemory('M+')}>M+</button>
            <button className={styles.memBtn} onClick={() => handleMemory('M-')}>M-</button>
            <button className={styles.memBtn} onClick={() => handleMemory('MS')}>MS</button>
          </div>
        )}

        {/* STANDARD & SCIENTIFIC KEYPAD */}
        {['standard', 'scientific'].includes(calcMode) && (
          <div className={`${styles.keypad} ${calcMode === 'scientific' ? styles.keypadSci : ''}`}>
            {calcMode === 'scientific' && (
              <>
                <button className={styles.sciBtn} onClick={() => handleScientific('sin')}>sin</button>
                <button className={styles.sciBtn} onClick={() => handleScientific('cos')}>cos</button>
                <button className={styles.sciBtn} onClick={() => handleScientific('tan')}>tan</button>
                <button className={styles.sciBtn} onClick={() => handleScientific('sqrt')}>√</button>
                <button className={styles.sciBtn} onClick={() => handleScientific('sqr')}>x²</button>

                <button className={styles.sciBtn} onClick={() => handleScientific('asin')}>sin⁻¹</button>
                <button className={styles.sciBtn} onClick={() => handleScientific('acos')}>cos⁻¹</button>
                <button className={styles.sciBtn} onClick={() => handleScientific('atan')}>tan⁻¹</button>
                <button className={styles.sciBtn} onClick={() => handleScientific('cbrt')}>∛</button>
                <button className={styles.sciBtn} onClick={() => handleScientific('cube')}>x³</button>

                <button className={styles.sciBtn} onClick={() => handleScientific('ln')}>ln</button>
                <button className={styles.sciBtn} onClick={() => handleScientific('log')}>log</button>
                <button className={styles.sciBtn} onClick={() => handleScientific('fact')}>n!</button>
                <button className={styles.sciBtn} onClick={() => handleScientific('pi')}>π</button>
                <button className={styles.sciBtn} onClick={() => handleScientific('e')}>e</button>
              </>
            )}

            <button className={`${styles.btn} ${styles.btnOp}`} onClick={handleClear}>C</button>
            <button className={`${styles.btn} ${styles.btnOp}`} onClick={handleBackspace}>⌫</button>
            <button className={`${styles.btn} ${styles.btnOp}`} onClick={() => setDisplay(prev => (prev.startsWith('-') ? prev.slice(1) : '-' + prev))}>±</button>
            <button className={`${styles.btn} ${styles.btnAction}`} onClick={() => handleOperator('÷')}>÷</button>

            <button className={styles.btn} onClick={() => handleDigit('7')}>7</button>
            <button className={styles.btn} onClick={() => handleDigit('8')}>8</button>
            <button className={styles.btn} onClick={() => handleDigit('9')}>9</button>
            <button className={`${styles.btn} ${styles.btnAction}`} onClick={() => handleOperator('×')}>×</button>

            <button className={styles.btn} onClick={() => handleDigit('4')}>4</button>
            <button className={styles.btn} onClick={() => handleDigit('5')}>5</button>
            <button className={styles.btn} onClick={() => handleDigit('6')}>6</button>
            <button className={`${styles.btn} ${styles.btnAction}`} onClick={() => handleOperator('−')}>−</button>

            <button className={styles.btn} onClick={() => handleDigit('1')}>1</button>
            <button className={styles.btn} onClick={() => handleDigit('2')}>2</button>
            <button className={styles.btn} onClick={() => handleDigit('3')}>3</button>
            <button className={`${styles.btn} ${styles.btnAction}`} onClick={() => handleOperator('+')}>+</button>

            <button className={`${styles.btn} ${styles.btnZero}`} onClick={() => handleDigit('0')}>0</button>
            <button className={styles.btn} onClick={() => setDisplay(prev => (prev.includes('.') ? prev : prev + '.'))}>.</button>
            <button className={`${styles.btn} ${styles.btnEqual}`} onClick={handleEqual} data-testid="calc-equal-btn">=</button>
          </div>
        )}

        {/* PROGRAMMER KEYPAD */}
        {calcMode === 'programmer' && (
          <div className={styles.progKeypad}>
            <div className={styles.progOpsRow}>
              <button className={styles.progOpBtn} onClick={() => handleBitwise('&')}>AND</button>
              <button className={styles.progOpBtn} onClick={() => handleBitwise('|')}>OR</button>
              <button className={styles.progOpBtn} onClick={() => handleBitwise('^')}>XOR</button>
              <button className={styles.progOpBtn} onClick={() => handleBitwise('NOT')}>NOT</button>
              <button className={styles.progOpBtn} onClick={() => handleBitwise('LSH')}>LSH</button>
              <button className={styles.progOpBtn} onClick={() => handleBitwise('RSH')}>RSH</button>
              <button
                className={styles.progOpBtn}
                onClick={() => setProgWordSize(w => w === 32 ? 64 : (w === 64 ? 8 : (w === 8 ? 16 : 32)))}
              >
                {progWordSize}b
              </button>
            </div>

            <div className={styles.keypad}>
              <button className={`${styles.btn} ${styles.btnOp}`} onClick={handleClear}>C</button>
              <button className={`${styles.btn} ${styles.btnOp}`} onClick={handleBackspace}>⌫</button>
              <button className={`${styles.btn} ${styles.btnOp}`} onClick={() => handleOperator('%')}>MOD</button>
              <button className={`${styles.btn} ${styles.btnAction}`} onClick={() => handleOperator('÷')}>÷</button>

              <button className={styles.btn} onClick={() => handleDigit('7')}>7</button>
              <button className={styles.btn} onClick={() => handleDigit('8')}>8</button>
              <button className={styles.btn} onClick={() => handleDigit('9')}>9</button>
              <button className={`${styles.btn} ${styles.btnAction}`} onClick={() => handleOperator('×')}>×</button>

              <button className={styles.btn} onClick={() => handleDigit('4')}>4</button>
              <button className={styles.btn} onClick={() => handleDigit('5')}>5</button>
              <button className={styles.btn} onClick={() => handleDigit('6')}>6</button>
              <button className={`${styles.btn} ${styles.btnAction}`} onClick={() => handleOperator('−')}>−</button>

              <button className={styles.btn} onClick={() => handleDigit('1')}>1</button>
              <button className={styles.btn} onClick={() => handleDigit('2')}>2</button>
              <button className={styles.btn} onClick={() => handleDigit('3')}>3</button>
              <button className={`${styles.btn} ${styles.btnAction}`} onClick={() => handleOperator('+')}>+</button>

              <button className={`${styles.btn} ${styles.btnZero}`} onClick={() => handleDigit('0')}>0</button>
              <button className={`${styles.btn} ${styles.btnEqual}`} onClick={handleEqual}>=</button>
            </div>
          </div>
        )}

        {/* CONVERTER TAB */}
        {calcMode === 'converter' && (
          <div className={styles.converterPane}>
            <div className={styles.convCategoryRow}>
              {Object.keys(CONVERSION_CATEGORIES).map(k => (
                <button
                  key={k}
                  className={`${styles.catBtn} ${convCategory === k ? styles.catBtnActive : ''}`}
                  onClick={() => {
                    setConvCategory(k);
                    setConvFromUnit(0);
                    setConvToUnit(1);
                  }}
                >
                  {CONVERSION_CATEGORIES[k].name}
                </button>
              ))}
            </div>

            <div className={styles.converterBox}>
              <div className={styles.convField}>
                <label className={styles.convLabel}>From</label>
                <input
                  type="number"
                  value={convInput}
                  onChange={(e) => setConvInput(e.target.value)}
                  className={styles.convInputField}
                />
                <select
                  value={convFromUnit}
                  onChange={(e) => setConvFromUnit(parseInt(e.target.value, 10))}
                  className={styles.convSelect}
                >
                  {cat.units.map((u, i) => (
                    <option key={u} value={i}>{u}</option>
                  ))}
                </select>
              </div>

              <div className={styles.convArrow}>⇅</div>

              <div className={styles.convField}>
                <label className={styles.convLabel}>To (Result)</label>
                <div className={styles.convResultField}>
                  {isNaN(convertedResult) ? '0' : Math.round(convertedResult * 10000) / 10000}
                </div>
                <select
                  value={convToUnit}
                  onChange={(e) => setConvToUnit(parseInt(e.target.value, 10))}
                  className={styles.convSelect}
                >
                  {cat.units.map((u, i) => (
                    <option key={u} value={i}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* GRAPHER TAB */}
        {calcMode === 'grapher' && (
          <div className={styles.grapherPane}>
            <div className={styles.grapherHeader}>
              <span className={styles.grapherLabel}>Function y =</span>
              <div className={styles.graphButtons}>
                {['sin(x)', 'cos(x)', 'tan(x)', 'x^2', 'x^3', 'sqrt(x)', '1/x'].map(fn => (
                  <button
                    key={fn}
                    className={`${styles.graphBtn} ${graphFunc === fn ? styles.graphBtnActive : ''}`}
                    onClick={() => setGraphFunc(fn)}
                  >
                    {fn}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.canvasWrapper}>
              <canvas ref={graphCanvasRef} width={420} height={220} className={styles.graphCanvas} />
            </div>
          </div>
        )}
      </div>

      {/* History Tape Sidebar */}
      <div className={styles.historySidebar}>
        <div className={styles.historyHeader}>
          <span>Calculation Tape</span>
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
            <div className={styles.emptyHistory}>No calculations recorded</div>
          )}
        </div>
      </div>
    </div>
  );
}
