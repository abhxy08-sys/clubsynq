# Certificates API (server)

This small Express service exposes a single endpoint to append certificate requests to a Google Sheet.

## Environment
Copy `server/.env.example` to `server/.env` and set values:

- PORT (optional)
- ADMIN_SECRET - a strong secret shared with your frontend/server so only authorized admins can post rows
- GOOGLE_SHEET_ID - the ID of the Google Spreadsheet
- GOOGLE_SHEET_NAME - sheet/tab name (default: `certificates`)
- GOOGLE_SERVICE_ACCOUNT_JSON - entire service account JSON (single-line/escaped) or set as a secret in deployment

## Creating a Google service account
1. Go to Google Cloud Console -> IAM & Admin -> Service accounts.
2. Create a service account and grant it the role `Editor` (or at least `Sheets Editor`) for the project.
3. Create a JSON key for the service account and copy the JSON object.
4. Share the target Google Sheet with the service account's email address (the `client_email` field in the JSON) and give Editor access.
5. Put the JSON into `GOOGLE_SERVICE_ACCOUNT_JSON` in your `.env` (escape newlines) or store it in your deployment secrets.

## Endpoint
POST /api/certificates
Headers:
- x-admin-secret: <ADMIN_SECRET>

Body (JSON):
{
	"organization_id": "...",
	"organization_name": "...",
	"recipient_user_id": "...",
	"recipient_email": "...",
	"recipient_name": "...",
	"date": "YYYY-MM-DD",
	"role": "Participant",
	"reason": "..."
}

On success the endpoint returns `{ ok: true }` and the row is appended to the sheet with `status = pending` and `created_at` timestamp.

## Run

Install dependencies and start the server:

```bash
cd server
npm install
npm start
```

## Notes
- Do not store service account JSON in client-side code.
- For production, store `GOOGLE_SERVICE_ACCOUNT_JSON` as a secret in your deployment environment rather than a local `.env`.
- You can change authentication to use a more advanced approach (JWT, Supabase auth verification) if you prefer.
