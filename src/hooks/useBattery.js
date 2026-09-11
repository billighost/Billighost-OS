import { useState, useEffect } from 'react';

export function useBattery() {
  const [batteryState, setBatteryState] = useState({
    supported: false,
    loading: true,
    level: 100, // percentage 0 - 100
    charging: true,
    chargingTime: Infinity,
    dischargingTime: Infinity,
    statusText: 'AC Connected',
  });

  useEffect(() => {
    let batteryInstance = null;
    let isMounted = true;

    const updateBattery = (battery) => {
      if (!isMounted) return;
      const level = Math.round((battery.level ?? 1) * 100);
      const charging = battery.charging ?? true;
      let statusText = charging ? 'Charging' : 'Discharging';
      if (charging && level === 100) statusText = 'Fully Charged';

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
          batteryInstance = battery;
          updateBattery(battery);

          const handleLevelChange = () => updateBattery(battery);
          const handleChargingChange = () => updateBattery(battery);
          const handleChargingTimeChange = () => updateBattery(battery);
          const handleDischargingTimeChange = () => updateBattery(battery);

          battery.addEventListener('levelchange', handleLevelChange);
          battery.addEventListener('chargingchange', handleChargingChange);
          battery.addEventListener('chargingtimechange', handleChargingTimeChange);
          battery.addEventListener('dischargingtimechange', handleDischargingTimeChange);

          batteryInstance._cleanup = () => {
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
              level: 100,
              charging: true,
              chargingTime: Infinity,
              dischargingTime: Infinity,
              statusText: 'AC Power (Connected)',
            });
          }
        });
    } else {
      // Browser doesn't expose getBattery (Firefox, Safari, or desktop without battery)
      setBatteryState({
        supported: false,
        loading: false,
        level: 100,
        charging: true,
        chargingTime: Infinity,
        dischargingTime: Infinity,
        statusText: 'AC Power (Connected)',
      });
    }

    return () => {
      isMounted = false;
      if (batteryInstance && batteryInstance._cleanup) {
        batteryInstance._cleanup();
      }
    };
  }, []);

  return batteryState;
}
