import { useState, useEffect } from 'react';

export function useBattery() {
  /*
   * Starts with level: null, NOT 100.
   *
   * navigator.getBattery() is async, so a hardcoded 100 was rendered for the
   * first few hundred milliseconds and only then corrected — a machine at 10%
   * briefly displayed "100%". Null means "not known yet", which the UI shows
   * as a placeholder instead of a confident wrong number.
   */
  const [batteryState, setBatteryState] = useState({
    supported: false,
    loading: true,
    level: null,
    charging: null,
    chargingTime: Infinity,
    dischargingTime: Infinity,
    statusText: 'Reading…',
  });

  useEffect(() => {
    let detach = null;
    let isMounted = true;

    const updateBattery = (battery) => {
      if (!isMounted) return;
      const level = Math.round((battery.level ?? 1) * 100);
      const charging = battery.charging ?? true;

      let statusText;
      if (charging) {
        statusText = level >= 99 ? 'Fully Charged' : 'Charging';
      } else if (level <= 5) {
        statusText = 'Critical';
      } else if (level <= 20) {
        statusText = 'Low Battery';
      } else {
        statusText = 'Discharging';
      }

      setBatteryState({
        supported: true,
        loading: false,
        level,
        charging,
        chargingTime: battery.chargingTime ?? Infinity,
        dischargingTime: battery.dischargingTime ?? Infinity,
        statusText,
      });
    };

    if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
      navigator.getBattery()
        .then((battery) => {
          if (!isMounted) return;
          updateBattery(battery);

          const handleLevelChange = () => updateBattery(battery);
          const handleChargingChange = () => updateBattery(battery);
          const handleChargingTimeChange = () => updateBattery(battery);
          const handleDischargingTimeChange = () => updateBattery(battery);

          battery.addEventListener('levelchange', handleLevelChange);
          battery.addEventListener('chargingchange', handleChargingChange);
          battery.addEventListener('chargingtimechange', handleChargingTimeChange);
          battery.addEventListener('dischargingtimechange', handleDischargingTimeChange);

          // Held locally rather than assigned onto the BatteryManager: that
          // object belongs to the browser and should not carry our fields.
          detach = () => {
            battery.removeEventListener('levelchange', handleLevelChange);
            battery.removeEventListener('chargingchange', handleChargingChange);
            battery.removeEventListener('chargingtimechange', handleChargingTimeChange);
            battery.removeEventListener('dischargingtimechange', handleDischargingTimeChange);
          };
        })
        .catch(() => {
          if (isMounted) {
            setBatteryState({
              supported: false,
              loading: false,
              level: null,
              charging: null,
              chargingTime: Infinity,
              dischargingTime: Infinity,
              statusText: 'AC Power',
            });
          }
        });
    } else {
      // Browser doesn't expose getBattery (Firefox, Safari, or desktop without battery)
      setBatteryState({
        supported: false,
        loading: false,
        level: null,
        charging: null,
        chargingTime: Infinity,
        dischargingTime: Infinity,
        statusText: 'AC Power',
      });
    }

    return () => {
      isMounted = false;
      if (detach) detach();
    };
  }, []);

  /*
   * Derived display values.
   *
   * `level` is null until the async read resolves and on machines with no
   * battery, so ~20 call sites would each need the same null guard. Exposing
   * formatted values keeps that logic in one place:
   *
   *   levelText  — "10%" / "AC" / "—"        for labels
   *   barWidth   — a safe 0-100 number       for gauge widths
   *   isKnown    — whether a real reading exists
   */
  const isKnown = typeof batteryState.level === 'number';

  return {
    ...batteryState,
    isKnown,
    levelText: isKnown
      ? `${batteryState.level}%`
      : (batteryState.loading ? '—' : 'AC'),
    barWidth: isKnown ? Math.max(2, Math.min(100, batteryState.level)) : 100,
    // Colour intent, so gauges do not each re-derive thresholds.
    tone: !isKnown ? 'neutral'
      : batteryState.charging ? 'good'
      : batteryState.level <= 10 ? 'critical'
      : batteryState.level <= 20 ? 'warn'
      : 'good',
  };
}
