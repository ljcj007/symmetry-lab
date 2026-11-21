@echo off
cd /d "%~dp0"
python verify.py %*
set "REPLAY_EXIT=%ERRORLEVEL%"
if "%~1"=="" pause
exit /b %REPLAY_EXIT%
