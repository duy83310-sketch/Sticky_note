@echo off
title Sticky Notes
cd /d "%~dp0"
echo Dang khoi dong ung dung Sticky Notes...
start "" "%~dp0node_modules\electron\dist\electron.exe" .
exit
