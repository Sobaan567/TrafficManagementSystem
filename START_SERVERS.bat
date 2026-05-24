@echo off
setlocal
cd /d "%~dp0"

echo Starting Traffic Management System servers...

if not exist "backend\logs" mkdir "backend\logs"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000" ^| findstr "LISTENING"') do (
  echo Backend already running on port 5000, PID %%a
  goto frontend
)

echo Starting backend on http://localhost:5000
start "TMS Backend" /min cmd /c "cd /d ""%~dp0backend"" && node server.js >> logs\backend.out.log 2>> logs\backend.err.log"

:frontend
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo Frontend already running on port 3000, PID %%a
  goto done
)

echo Starting frontend on http://localhost:3000
start "TMS Frontend" /min cmd /c "cd /d ""%~dp0frontend"" && npm start"

:done
echo.
echo Servers requested.
echo Backend logs: backend\logs\backend.out.log
echo Backend errors: backend\logs\backend.err.log
echo Open: http://localhost:3000
echo.
pause
