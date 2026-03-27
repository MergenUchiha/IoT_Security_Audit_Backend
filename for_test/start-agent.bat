@echo off
chcp 65001 >nul
title IoT Log Agent

set DEVICE_ID=e1c007df-2cdf-48a3-9c77-c5fd270e8e07
set API_URL=http://localhost:5005

echo Device ID : %DEVICE_ID%
echo API URL   : %API_URL%
echo.

powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0iot-log-agent.ps1" ^
    -DeviceId "%DEVICE_ID%" ^
    -ApiUrl "%API_URL%" ^
    -PollIntervalSec 3 ^
    -InitialMinutes 60

pause