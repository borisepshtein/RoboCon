exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        return { statusCode: 400, body: 'Invalid JSON' };
    }

    const { recordId, emails } = body;
    if (!recordId || !emails) {
        return { statusCode: 400, body: 'Missing recordId or emails' };
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

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
