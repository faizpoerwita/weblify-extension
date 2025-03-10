@echo off
echo Starting Fuji-Web Development Server...

REM Periksa apakah pnpm terinstall
where pnpm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo pnpm tidak ditemukan. Menginstall pnpm...
    npm install -g pnpm
)

REM Install dependencies
echo Installing dependencies...
call pnpm install --no-frozen-lockfile

REM Install rollup secara global jika belum ada
where rollup >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Installing rollup globally...
    call pnpm add -g rollup
)

REM Jalankan server development
echo Starting development server...
call pnpm dev

REM Jika server berhenti, tunggu input sebelum menutup window
pause 