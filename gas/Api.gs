// ====== API JSON untuk PWA ======
// Tambah fail ini (Api.gs) dalam projek Apps Script yang sama dengan Code.gs.
// Kemudian: Deploy > Manage deployments > Edit > New version.
// Execute as: Me | Who has access: Anyone

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'info';
    if (action === 'info') return json_({ok: true, data: getBankInfo()});
    return json_({ok: true, message: 'KKQ API'});
  } catch (err) {
    return json_({ok: false, error: String(err.message || err)});
  }
}

// PWA hantar POST dengan Content-Type text/plain (elak preflight CORS)
function doPost(e) {
  try {
    const p = JSON.parse(e.postData.contents);
    if (p.action === 'generate') return json_({ok: true, data: generateDoc(p)});
    return json_({ok: false, error: 'Tindakan tidak dikenali'});
  } catch (err) {
    return json_({ok: false, error: String(err.message || err)});
  }
}
