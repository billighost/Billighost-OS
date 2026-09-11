# Reports the real battery state from Windows, to compare against what the OS shows.
Write-Host "=== Win32_Battery ===" -ForegroundColor Cyan
Get-CimInstance Win32_Battery | Select-Object -Property `
  Name, EstimatedChargeRemaining, BatteryStatus, EstimatedRunTime, DesignVoltage |
  Format-List

Write-Host "=== BatteryStatus code meaning ===" -ForegroundColor Cyan
Write-Host "1=Discharging 2=AC/Charging 3=Fully Charged 4=Low 5=Critical 6=Charging 7=Charging+High 8=Charging+Low 9=Charging+Critical 10=Undefined 11=Partially Charged"

Write-Host "`n=== Power status ===" -ForegroundColor Cyan
$w = Get-CimInstance -ClassName BatteryStatus -Namespace root\wmi -ErrorAction SilentlyContinue
if ($w) {
  $w | Select-Object Charging, Discharging, PowerOnline, RemainingCapacity, Voltage | Format-List
} else {
  Write-Host "root\wmi BatteryStatus unavailable"
}

$full = Get-CimInstance -ClassName BatteryFullChargedCapacity -Namespace root\wmi -ErrorAction SilentlyContinue
if ($w -and $full) {
  $pct = [math]::Round(($w.RemainingCapacity / $full.FullChargedCapacity) * 100, 1)
  Write-Host "`nComputed from raw capacity: $pct %" -ForegroundColor Green
  Write-Host "  RemainingCapacity  = $($w.RemainingCapacity)"
  Write-Host "  FullChargedCapacity= $($full.FullChargedCapacity)"
}
