@echo off
echo Starting Fuji-Web Development Server...
call pnpm install --no-frozen-lockfile
call pnpm add -g rollup
call pnpm dev
pause 