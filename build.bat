@echo off
setlocal
chcp 65001 >nul

echo ================================================================
echo           NoneWeb Data Analyzer - Build Script
echo ================================================================
echo.

echo [1/4] Checking environment...
where npm >nul 2>nul
if errorlevel 1 goto err_npm

where cargo >nul 2>nul
if errorlevel 1 goto err_cargo

where link >nul 2>nul
if errorlevel 1 (
    if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" (
        call "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul 2>nul
    ) else if exist "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" (
        call "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul 2>nul
    ) else if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" (
        call "%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" >nul 2>nul
    )
)

echo [OK] Node.js and Rust environments detected.
echo.

echo [2/4] Closing running instances of NoneWeb-Data-Analyzer...
taskkill /f /im NoneWeb-Data-Analyzer.exe >nul 2>nul
echo [OK] Done.
echo.

echo [3/4] Building frontend assets (npm run build)...
call npm run build
if errorlevel 1 goto err_frontend
echo [OK] Frontend built successfully.
echo.

echo [4/4] Compiling Rust release binary (cargo build --release)...
echo Please wait, this may take a few minutes on first build...
cd src-tauri
call cargo build --release
if errorlevel 1 goto err_rust
cd ..

copy /y "src-tauri\target\release\NoneWeb-Data-Analyzer.exe" "NoneWeb-Data-Analyzer.exe" >nul
if errorlevel 1 goto warn_copy

echo.
echo ================================================================
echo [SUCCESS] Build completed!
echo Executable: NoneWeb-Data-Analyzer.exe (in project root)
echo ================================================================
echo.
goto prompt_run

:warn_copy
echo [WARNING] Failed to copy NoneWeb-Data-Analyzer.exe to root folder.
echo You can find it at: src-tauri\target\release\NoneWeb-Data-Analyzer.exe
goto prompt_run

:prompt_run
set /p RUN_APP="Launch application now? (Y/N, default Y): "
if /i "%RUN_APP%"=="n" goto finish
start "" "NoneWeb-Data-Analyzer.exe"
goto finish

:err_npm
echo.
echo [ERROR] npm is not found. Please install Node.js (https://nodejs.org/).
pause
exit /b 1

:err_cargo
echo.
echo [ERROR] cargo is not found. Please install Rust (https://rustup.rs/).
pause
exit /b 1

:err_frontend
echo.
echo [ERROR] Frontend build failed (npm run build).
pause
exit /b 1

:err_rust
cd ..
echo.
echo [ERROR] Rust release build failed (cargo build --release).
pause
exit /b 1

:finish
echo.
echo Done. Press any key to exit...
pause >nul 2>nul
exit /b 0
