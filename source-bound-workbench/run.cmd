@echo off
cd /d "%~dp0"
python -B run.py suite
echo.
echo To open the local website: python -B run.py serve
pause
