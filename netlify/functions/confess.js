exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const { confession, name, sex, religion, priest, source, systemPrompt } = body;

    if (!confession || !name) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const sexLabel = sex === 'male' ? 'мужчина' : 'женщина';
    const ip = event.headers['x-forwarded-for']?.split(',')[0].trim()
        || event.headers['client-ip']
        || '';

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
                messages: [{
                    role: 'user',
                    content: `Имя кающегося: ${name}\nПол: ${sexLabel}\nГрех: ${confession}`
                }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Anthropic API error:', errText);
            return { statusCode: 500, body: JSON.stringify({ error: 'ОШИБКА СВЯЗИ С НЕБЕСАМИ' }) };
        }

        const data = await response.json();
        const absolution = data.content?.[0]?.text ?? 'ОШИБКА ОБРАБОТКИ ГРЕХА';
        let recordId = null;

        // Log to Airtable before returning
        try {
            const atRes = await fetch(`https://api.airtable.com/v0/appqHfWHpvJWFUxa7/tblYqGYqwQy8666gA`, {
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
            if (!atRes.ok) {
                console.error('Airtable error:', await atRes.text());
            } else {
                const atData = await atRes.json();
                recordId = atData.records?.[0]?.id || null;
            }
        } catch (err) {
            console.error('Airtable log error:', err);
        }

        return { statusCode: 200, body: JSON.stringify({ absolution, usage: data.usage, recordId }) };
    } catch (err) {
        console.error('Server error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'КРИТИЧЕСКАЯ ОШИБКА СИСТЕМЫ' }) };
    }
};
