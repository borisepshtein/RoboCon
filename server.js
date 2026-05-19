require('dotenv').config();
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

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

app.post('/api/log-emails', (req, res) => {
    const { recordId, emails } = req.body;

    if (!recordId || !emails) {
        return res.status(400).send('Missing recordId or emails');
    }

    updateEmails.run({ emails, id: recordId });
    res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`RoboCon running on port ${PORT}`));
