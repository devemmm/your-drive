# Render Deployment Configuration

## Environment Variables Required in Render Dashboard:
- `NODE_ENV=production`
- `NODE_OPTIONS=--max-old-space-size=4096`
- `DATABASE_URL` (your PostgreSQL connection string)
- All other environment variables from your `.env` file

## Build & Start Commands:
- **Build Command**: `npm run build:deploy && prisma migrate deploy`
- **Start Command**: `npm start`

## Important Notes:
1. The server listens on `0.0.0.0` to allow Render to detect the port
2. Memory limit is increased to 4GB via NODE_OPTIONS
3. Migrations run during build, not seed (seed should be run manually if needed)
4. The server uses the compiled TypeScript output from `dist/` folder
