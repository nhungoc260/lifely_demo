// LIFELY - cầu nối gửi mail qua Gmail của bạn (Google Apps Script).
// Dán toàn bộ file này vào https://script.google.com (Dự án mới), đổi SECRET, rồi Deploy > Web app.
// SECRET phải GIỐNG HỆT biến MAIL_APPS_SCRIPT_SECRET trong .env của backend.

var SECRET = 'DOI-THANH-CHUOI-BI-MAT-DAI-CUA-BAN';

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.secret !== SECRET) {
      return out({ ok: false, error: 'unauthorized' });
    }
    if (!d.to || !d.subject || !d.body) {
      return out({ ok: false, error: 'missing fields' });
    }
    MailApp.sendEmail({
      to: d.to,
      subject: d.subject,
      body: d.body,
      name: d.fromName || 'LIFELY'
    });
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
