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

    const ip = event.headers['x-forwarded-for']?.split(',')[0].trim()
        || event.headers['client-ip']
        || '';

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
                        Name:        body.name        || 'N/A',
                        Sex:         body.sex         || 'N/A',
                        Religion:    body.religion    || 'N/A',
                        Priest:      body.priest      || 'N/A',
                        Confession:  'N/A',
                        Absolution:  'N/A',
                        Timestamp:   new Date().toISOString().slice(0, 10),
                        IP:          ip,
                        Source:      body.source      || 'N/A',
                        FinalScreen: body.finalScreen || 'N/A',
                    }
                }]
            })
        });
        if (!atRes.ok) console.error('Airtable abandon error:', await atRes.text());
    } catch (err) {
        console.error('Abandon log error:', err);
    }

    return { statusCode: 200, body: 'ok' };
};
