require('dotenv').config();
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');

const mailer = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

function buildEmailHtml(senderName, lang) {
    const isRu = lang === 'ru';
    const title      = isRu ? 'РобоИсповедник 3000'              : 'RoboConfessor 3000';
    const subtitle   = isRu ? 'Цифровое отпущение грехов'         : 'Digital Absolution Services™';
    const tag        = isRu ? '⚡ ВХОДЯЩАЯ ПЕРЕДАЧА ⚡'           : '⚡ INCOMING TRANSMISSION ⚡';
    const line1      = isRu
        ? `Твой друг <strong style="color:#c9a84c;">${senderName}</strong> только что исповедался роботу-священнику и вышел живым.`
        : `Your friend <strong style="color:#c9a84c;">${senderName}</strong> just confessed their sins to a robot priest and survived.`;
    const line2      = isRu ? 'Отпущен. Расслаблен. Подозрительно доволен жизнью.'
                             : 'Absolved. Relieved. Suspiciously cheerful.';
    const line3      = isRu
        ? `И теперь почему-то считает, что <strong style="color:#c9a84c;">тебе</strong> тоже не помешает цифровое отпущение.`
        : `They now seem to think <strong style="color:#c9a84c;">you</strong> could use some digital absolution too.`;
    const line4      = isRu
        ? 'Мы не говорим, что твоя совесть запущена. Но когда ты последний раз её чистил, а?'
        : "We're not saying your conscience is dirty. But when was the last time you cleaned it, hmm?";
    const cta        = isRu ? '✝ Войти в исповедальню ✝' : '✝ Enter the Confessional ✝';
    const scanLabel  = isRu ? 'РЕЗУЛЬТАТ СКАНИРОВАНИЯ:' : 'SYSTEM SCAN RESULT:';
    const scan1val   = isRu ? 'КРИТИЧЕСКИЙ'   : 'CRITICAL';
    const scan2val   = isRu ? 'В ОЖИДАНИИ'    : 'PENDING';
    const scan3val   = isRu ? 'ИСПОВЕДАТЬСЯ НЕМЕДЛЕННО' : 'CONFESS IMMEDIATELY';
    const scan1key   = isRu ? 'УРОВЕНЬ_ГРЕХОВ'          : 'SIN_ACCUMULATION_LEVEL';
    const scan2key   = isRu ? 'СТАТУС_ОТПУЩЕНИЯ'        : 'ABSOLUTION_STATUS';
    const scan3key   = isRu ? 'РЕКОМЕНДУЕМОЕ_ДЕЙСТВИЕ'  : 'RECOMMENDED_ACTION';
    const footerSub  = isRu ? 'Мы не храним твои грехи. Наверное.' : 'We do not store your sins. Probably.';
    const url        = 'https://epshtein.dev/robocon/?source=the_game';

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Courier New',Courier,monospace;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#12121a;border:1px solid #2a2a3a;max-width:560px;">
      <tr>
        <td style="padding:40px 40px 28px;text-align:center;border-bottom:1px solid #5a4820;">
          <div style="font-size:48px;margin-bottom:12px;">⚙️</div>
          <h1 style="color:#c9a84c;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;margin:0 0 8px;">${title}</h1>
          <p style="color:#7a7060;font-size:11px;margin:0;letter-spacing:2px;text-transform:uppercase;">${subtitle}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px;">
          <p style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">${tag}</p>
          <p style="color:#e8dcc8;font-size:15px;line-height:1.7;margin:0 0 18px;">${line1}</p>
          <p style="color:#e8dcc8;font-size:15px;line-height:1.7;margin:0 0 18px;">${line2}</p>
          <p style="color:#e8dcc8;font-size:15px;line-height:1.7;margin:0 0 18px;">${line3}</p>
          <p style="color:#e8dcc8;font-size:15px;line-height:1.7;margin:0 0 32px;">${line4}</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:0 0 32px;">
                <a href="${url}" style="display:inline-block;background:#8b1a1a;color:#e8dcc8;text-decoration:none;font-family:'Courier New',Courier,monospace;font-size:13px;letter-spacing:2px;text-transform:uppercase;padding:16px 36px;border:1px solid #c9a84c;">${cta}</a>
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;border:1px solid #2a2a3a;">
            <tr>
              <td style="padding:16px 20px;">
                <p style="color:#7a7060;font-size:11px;margin:0 0 8px;letter-spacing:2px;">${scanLabel}</p>
                <p style="color:#c9a84c;font-size:12px;margin:0;">${scan1key}: <span style="color:#8b1a1a;">${scan1val}</span></p>
                <p style="color:#c9a84c;font-size:12px;margin:5px 0 0;">${scan2key}: <span style="color:#8b1a1a;">${scan2val}</span></p>
                <p style="color:#c9a84c;font-size:12px;margin:5px 0 0;">${scan3key}: <span style="color:#e8dcc8;">${scan3val}</span></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 40px 32px;border-top:1px solid #2a2a3a;text-align:center;">
          <p style="color:#7a7060;font-size:11px;margin:0 0 6px;">${title} — ${subtitle}</p>
          <p style="color:#5a4820;font-size:10px;margin:0;">${footerSub}</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const db = new Database(path.join(__dirname, 'sessions.db'));
db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT,
        sex         TEXT,
        religion    TEXT,
        priest      TEXT,
        source      TEXT,
        final_screen TEXT,
        confession  TEXT,
        absolution  TEXT,
        timestamp   TEXT,
        ip          TEXT,
        emails      TEXT
    )
`);

const insertSession = db.prepare(`
    INSERT INTO sessions (name, sex, religion, priest, source, final_screen, confession, absolution, timestamp, ip)
    VALUES (@name, @sex, @religion, @priest, @source, @finalScreen, @confession, @absolution, @timestamp, @ip)
`);

const updateEmails = db.prepare(`UPDATE sessions SET emails = @emails WHERE id = @id`);
const updateAbsolution = db.prepare(`UPDATE sessions SET absolution = @absolution, final_screen = 'ConfessionDone' WHERE id = @id`);

app.post('/api/confess', async (req, res) => {
    const { confession, name, sex, religion, priest, source, systemPrompt } = req.body;

    if (!confession || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sexLabel = sex === 'male' ? 'мужчина' : 'женщина';
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || '';

    const recordId = insertSession.run({
        name, sex: sexLabel, religion: religion || 'christianity',
        priest: priest || '', source: source || '',
        finalScreen: 'ConfessionDone', confession,
        absolution: '', timestamp: new Date().toISOString().slice(0, 10), ip,
    }).lastInsertRowid;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 512,
                system: systemPrompt,
                messages: [{ role: 'user', content: `Имя кающегося: ${name}\nПол: ${sexLabel}\nГрех: ${confession}` }]
            })
        });

        if (!response.ok) {
            console.error('Anthropic API error:', await response.text());
            return res.status(500).json({ error: 'ОШИБКА СВЯЗИ С НЕБЕСАМИ' });
        }

        const data = await response.json();
        const absolution = data.content?.[0]?.text ?? 'ОШИБКА ОБРАБОТКИ ГРЕХА';

        updateAbsolution.run({ absolution, id: recordId });

        res.json({ absolution, usage: data.usage, recordId });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'КРИТИЧЕСКАЯ ОШИБКА СИСТЕМЫ' });
    }
});

app.post('/api/abandon', (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || '';

    insertSession.run({
        name:        req.body.name        || 'N/A',
        sex:         req.body.sex         || 'N/A',
        religion:    req.body.religion    || 'N/A',
        priest:      req.body.priest      || 'N/A',
        source:      req.body.source      || 'N/A',
        finalScreen: req.body.finalScreen || 'N/A',
        confession: 'N/A', absolution: 'N/A',
        timestamp: new Date().toISOString().slice(0, 10), ip,
    });

    res.send('ok');
});

app.post('/api/send-invites', async (req, res) => {
    const { recordId, emails, lang, senderName } = req.body;

    if (!emails) return res.status(400).send('Missing emails');

    const list = emails.split(',').map(e => e.trim()).filter(Boolean);
    if (!list.length) return res.status(400).send('No valid emails');

    if (recordId) updateEmails.run({ emails, id: recordId });

    const isRu    = lang === 'ru';
    const subject = isRu
        ? `${senderName || 'Твой друг'} считает, что твоей душе нужна помощь ⚙️`
        : `${senderName || 'Your friend'} thinks your soul needs saving ⚙️`;
    const html = buildEmailHtml(senderName || (isRu ? 'Твой друг' : 'Your friend'), lang);

    const results = await Promise.allSettled(
        list.map(to => mailer.sendMail({
            from: `"${isRu ? 'РобоИсповедник 3000' : 'RoboConfessor 3000'}" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html,
        }))
    );

    const failed = results.filter(r => r.status === 'rejected').length;
    res.json({ ok: true, sent: list.length - failed, failed });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`RoboCon running on port ${PORT}`));
