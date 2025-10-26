require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me';
const SHEET_ID = process.env.GOOGLE_SHEET_ID; // required
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'certificates';

if (!SHEET_ID) {
	console.warn('GOOGLE_SHEET_ID not set. The /api/certificates endpoint will fail until configured.');
}

function getSheetsClient() {
	const creds = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
	if (!creds) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
	const key = typeof creds === 'string' ? JSON.parse(creds) : creds;
	const auth = new google.auth.GoogleAuth({
		credentials: key,
		scopes: ['https://www.googleapis.com/auth/spreadsheets']
	});
	return google.sheets({ version: 'v4', auth });
}

// POST /api/certificates
// Expects JSON body with fields: organization_id, organization_name, recipient_user_id, recipient_email, recipient_name, date, role, reason
// Requires header: x-admin-secret: <ADMIN_SECRET>
app.post('/api/certificates', async (req, res) => {
	try {
		const secret = req.headers['x-admin-secret'];
		if (!secret || secret !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });

		const payload = req.body || {};
		const required = ['organization_name', 'recipient_name', 'date'];
		for (const k of required) if (!payload[k]) return res.status(400).json({ error: 'Missing ' + k });

		const row = [
			payload.organization_id || '',
			payload.organization_name || '',
			payload.recipient_user_id || '',
			payload.recipient_email || '',
			payload.recipient_name || '',
			payload.date || '',
			payload.role || '',
			payload.reason || '',
			'pending',
			new Date().toISOString(),
			''
		];

		if (!SHEET_ID) return res.status(500).json({ error: 'Sheet ID not configured' });

		const sheets = getSheetsClient();
		// Append row
		await sheets.spreadsheets.values.append({
			spreadsheetId: SHEET_ID,
			range: `${SHEET_NAME}!A:K`,
			valueInputOption: 'USER_ENTERED',
			requestBody: { values: [row] }
		});

		return res.json({ ok: true });
	} catch (err) {
		console.error('Error in /api/certificates', err.message || err);
		return res.status(500).json({ error: String(err.message || err) });
	}
});

app.listen(PORT, () => console.log(`Certificates API listening on ${PORT}`));

module.exports = app;
