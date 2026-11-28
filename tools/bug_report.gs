// 포켓몬 조선 시간여행 · 버그 제보 받기 (Google Apps Script)
// The game's "Report a bug" panel (web/js/report.js) posts here; this mails the report, with its screen capture, to
// the account that deployed it. No address is written anywhere: the mail goes to the script's own owner.
//
// Deploy (once): script.new → paste this file → Deploy → New deployment → type "Web app" → Execute as "Me",
// Who has access "Anyone" → Deploy → authorize → copy the web app URL into web/js/report.js (ENDPOINT).
// After changing this file: Deploy → Manage deployments → edit → Version "New version" (the URL stays the same).

var PER_HOUR = 30;         // more than this in an hour and the rest are turned away (a flood must not fill the inbox)
var MAX_BODY = 6000000;    // bytes of a report at most (the capture is about 0.2 to 0.5 MB)

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || '';
    if (!raw || raw.length > MAX_BODY) return out({ ok: false, why: 'size' });
    var d = JSON.parse(raw);
    if (!d || d.app !== 'joseon-poke') return out({ ok: false, why: 'app' });
    var text = String(d.text || '').slice(0, 4000);
    if (text.replace(/\s/g, '').length < 3) return out({ ok: false, why: 'empty' });

    var cache = CacheService.getScriptCache(), key = 'n' + Math.floor(Date.now() / 3600000);
    var n = Number(cache.get(key) || 0);
    if (n >= PER_HOUR || MailApp.getRemainingDailyQuota() < 3) return out({ ok: false, why: 'busy' });
    cache.put(key, String(n + 1), 3700);

    var info = d.info && typeof d.info === 'object' ? d.info : {};
    var lines = [];
    for (var k in info) {
      var v = info[k];
      lines.push(k + ': ' + (v && typeof v === 'object' ? JSON.stringify(v) : String(v)).slice(0, 700));
    }
    var reply = String(d.reply || '').slice(0, 120);
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(reply)) reply = '';
    var body = text + '\n\n────────────\n' + (reply ? '답장 받을 주소: ' + reply + '\n' : '') + lines.join('\n').slice(0, 6000);
    var opts = { name: '조선 시간여행 버그 제보' };
    if (reply) opts.replyTo = reply;
    var m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+\/=]+)$/.exec(String(d.shot || ''));
    if (m) opts.attachments = [Utilities.newBlob(Utilities.base64Decode(m[2]), 'image/' + m[1], 'capture.' + (m[1] === 'png' ? 'png' : 'jpg'))];
    var first = text.replace(/\s+/g, ' ').slice(0, 50);
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '[조선 시간여행 제보] v' + String(info.version || '?').slice(0, 10) + ' · ' + first, body, opts);
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, why: 'error' });
  }
}

// (opening the web app's address in a browser shows this: the deployment is alive)
function doGet() { return out({ ok: true, what: 'joseon-poke bug reports' }); }

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
