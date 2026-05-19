const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/confess', async (req, res) => {
    const { confession, name, sex, religion, priest, source, systemPrompt } = req.body;

    if (!confession || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sexLabel = sex === 'male' ? 'мужчина' : 'женщина';
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || '';

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
        let recordId = null;

        try {
            const atRes = await fetch('https://api.airtable.com/v0/appqHfWHpvJWFUxa7/tblYqGYqwQy8666gA', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    records: [{
                        fields: {
                            Name: name,
                            Sex: sexLabel,
                            Religion: religion || 'christianity',
                            Priest: priest || '',
                            Source: source || '',
                            FinalScreen: 'ConfessionDone',
                            Confession: confession,
                            Absolution: absolution,
                            Timestamp: new Date().toISOString().slice(0, 10),
                            IP: ip,
                        }
                    }]
                })
            });
            if (atRes.ok) {
                const atData = await atRes.json();
                recordId = atData.records?.[0]?.id || null;
            } else {
                console.error('Airtable error:', await atRes.text());
            }
        } catch (err) {
            console.error('Airtable log error:', err);
        }

        res.json({ absolution, usage: data.usage, recordId });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'КРИТИЧЕСКАЯ ОШИБКА СИСТЕМЫ' });
    }
});

app.post('/api/abandon', async (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || '';

    try {
        const atRes = await fetch('https://api.airtable.com/v0/appqHfWHpvJWFUxa7/tblYqGYqwQy8666gA', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                records: [{
                    fields: {
                        Name:        req.body.name        || 'N/A',
                        Sex:         req.body.sex         || 'N/A',
                        Religion:    req.body.religion    || 'N/A',
                        Priest:      req.body.priest      || 'N/A',
                        Confession:  'N/A',
                        Absolution:  'N/A',
                        Timestamp:   new Date().toISOString().slice(0, 10),
                        IP:          ip,
                        Source:      req.body.source      || 'N/A',
                        FinalScreen: req.body.finalScreen || 'N/A',
                    }
                }]
            })
        });
        if (!atRes.ok) console.error('Airtable abandon error:', await atRes.text());
    } catch (err) {
        console.error('Abandon log error:', err);
    }

    res.send('ok');
});

app.post('/api/log-emails', async (req, res) => {
    const { recordId, emails } = req.body;

    if (!recordId || !emails) {
        return res.status(400).send('Missing recordId or emails');
    }

    try {
        const atRes = await fetch(`https://api.airtable.com/v0/appqHfWHpvJWFUxa7/tblYqGYqwQy8666gA/${recordId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields: { Emails: emails } }),
        });
        if (!atRes.ok) console.error('Airtable emails error:', await atRes.text());
    } catch (err) {
        console.error('Log emails error:', err);
    }

    res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`RoboCon running on port ${PORT}`));
