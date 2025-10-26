// Minimal client for writing to Google Sheets from the browser using OAuth2 token client
// Usage:
// await initGoogleSheetsClient(GOOGLE_CLIENT_ID)
// await requestAccessToken()
// await appendRow(sheetId, sheetName, valuesArray)

let tokenClient = null;
let accessToken = null;

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => setTimeout(() => resolve(), 50);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function initGoogleSheetsClient(clientId) {
  if (!clientId) throw new Error('missing clientId');
  await loadGsiScript();
  if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) throw new Error('Google Identity not available');
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    callback: (resp) => {
      // callback will be set per-request
    }
  });
}

export function requestAccessToken() {
  if (!tokenClient) throw new Error('token client not initialized');
  return new Promise((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp.error) return reject(resp);
      accessToken = resp.access_token;
      resolve(resp);
    };
    // prompt: 'consent' forces account selection if needed; remove for silent refresh
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export async function appendRow(sheetId, sheetName, values) {
  if (!sheetId) throw new Error('Missing sheetId');
  if (!accessToken) {
    await requestAccessToken();
  }
  // Use A1-style range (start row 1) and quote the sheet name to handle spaces/special chars
  const safeSheetName = sheetName.replace(/'/g, "\\'");
  const quoted = `'${safeSheetName}'!A1:K`;
  // Use the alternative append endpoint (range provided in request body) to avoid path parse issues
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:append?valueInputOption=USER_ENTERED`;
  const body = { range: quoted, majorDimension: 'ROWS', values: [values] };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    // Try to include JSON error message if available
    let msg = text;
    try { const js = JSON.parse(text); msg = js.error && js.error.message ? js.error.message : text; } catch(e) {}
    throw new Error('Sheets API error: ' + res.status + ' (range=' + quoted + ') ' + msg + '\nRequest URL: ' + url);
  }
  return res.json();
}

export function clearAccessToken() {
  accessToken = null;
}
