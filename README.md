# Niva web

Angular 20 + Angular Material front end for the Niva API (`niva-openapi.yaml`).

## Run

```bash
npm install
npm start          # http://localhost:4200
```

The API URL lives in one place: `src/environments/environment.ts` (`apiUrl`, currently `/api/v1`).
The Spring Boot API must allow CORS from `http://localhost:4200`.

## Docker

Build and run the production app at http://localhost:4200:

```bash
docker build -t niva-web .
docker run --rm -p 4200:80 niva-web
```

Nginx serves the Angular build, supports direct navigation to app routes, and proxies `/api/` requests to `http://host.docker.internal:8080` by default (the backend on your host with Docker Desktop). The request path is preserved. To use another backend, set `API_UPSTREAM` to its origin without a trailing slash:

```bash
docker run --rm -p 4200:80 -e API_UPSTREAM=http://backend:8080 --network your-network niva-web
```

For Docker Engine on Linux, add `--add-host=host.docker.internal:host-gateway` when connecting to a backend on the host. The backend must be reachable from the container. `API_UPSTREAM` is applied when the container starts.

Discovery currently serves West Bengal. Users can select a city on Home or Explore; the selection is remembered in this browser and used for both home and provider-search requests. Kolkata is the initial default. Onboarding starts with the selected city and lets providers choose their business city separately. City options are maintained in `src/app/core/city.service.ts`.

## Layout

```
src/app/
  core/      api.service.ts (every endpoint), auth.service.ts, auth.interceptor.ts, guards.ts, models.ts
  shared/    provider-card.ts, inr.pipe.ts
  pages/     one file per screen (template + logic together)
  app.ts     top bar and router outlet
  app.routes.ts
```

## Screens and routes

| Route | Screen |
|---|---|
| `/` | Home |
| `/providers` | Browse providers (filters, sort, paging) |
| `/providers/:id` | Business details and services |
| `/providers/:id/profile` | Provider social profile |
| `/book/:providerId?serviceId=` | Booking (time, details, review) |
| `/bookings` | My bookings and cart |
| `/saved`, `/profile`, `/messages/:id?`, `/assistant` | Saved, Profile, Messages, Ask Niva |
| `/login` | Email/password login and sign-up |
| `/business/onboarding`, `/business/dashboard` | Provider onboarding and dashboard |

All content routes require a signed-in user and redirect to `/login`, preserving the requested URL. The dashboard also needs the `BUSINESS` role.

The HTTP interceptor attaches the access token to API requests only. Login, registration, refresh, and password recovery are public. A protected request rejected with 401 refreshes the token pair and retries once; concurrent failures share one refresh. A failed refresh clears the session and returns to login.

Files are uploaded to the authenticated backend `POST /media/uploads` as multipart form data with `purpose` and `file` fields. The backend handles S3 storage and returns the upload ID used by onboarding. The frontend makes no direct S3 upload requests.

Password recovery starts at `/forgot-password`. Configure backend reset emails to link to the frontend `/reset-password?token=<token>` URL. Tokens expire after 15 minutes and are single-use. Successful reset clears the local session; users log in again. Both recovery APIs and pages are public. The reset form enforces password length, the 72-byte UTF-8 limit, and confirmation.
