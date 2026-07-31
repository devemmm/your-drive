# Postman Collection

Auto-generated from the live OpenAPI spec (`server/src/config/swagger.ts`,
itself built from the JSDoc comments in `server/src/docs/**/*.ts`). 161
endpoints across 24 tags/folders (Public, Authentication, Onboarding, Admin,
Ride Management, D2D Rides, Car Rentals, Chauffeur Services, etc.).

## Import

1. Postman → **Import** → drag in both files:
   - `your-drive.postman_collection.json`
   - `your-drive.postman_environment.json`
2. Select the **"Your-Drive - Production"** environment (top-right dropdown).

## Auth

- `login` and `register` requests need no token, and both have a **test
  script** that automatically captures the returned JWT into the
  `bearerToken` environment variable on a successful response.
- Every other request that requires auth already references
  `{{bearerToken}}` as a Bearer token — once you've run login/register once,
  everything else just works.

## Variables

| Variable | Default | Notes |
|---|---|---|
| `baseUrl` | `https://api.yourdrive.rw` | Change to `http://localhost:3003` for local dev |
| `bearerToken` | (empty) | Auto-filled after login/register; can also be set manually |

## Regenerating after API changes

The collection is a point-in-time snapshot, not live-synced. To regenerate
after adding/changing endpoints:

```bash
cd server
npm ci
npm run build
BACKEND_URL=https://api.yourdrive.rw PORT=3003 node -e "
  const { swaggerSpec } = require('./dist/config/swagger');
  require('fs').writeFileSync('/tmp/openapi-spec.json', JSON.stringify(swaggerSpec));
"
npx openapi-to-postmanv2 -s /tmp/openapi-spec.json -o docs/postman/your-drive.postman_collection.json -p -O folderStrategy=Tags
```

Note: this only pulls in endpoints that have JSDoc `@openapi`/`@swagger`
annotations in `src/docs/`. Routes without doc comments won't appear here
even if they exist in the app.
