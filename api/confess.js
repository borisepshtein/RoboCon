export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { confession, name, sex, systemPrompt } = req.body;

    if (!confession || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sexLabel = sex === 'male' ? 'мужчина' : 'женщина';

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
            console.error('Anthropic API error:', await response.text());
            return res.status(500).json({ error: 'ОШИБКА СВЯЗИ С НЕБЕСАМИ' });
        }

        const data = await response.json();
        const absolution = data.content?.[0]?.text ?? 'ОШИБКА ОБРАБОТКИ ГРЕХА';

        return res.status(200).json({ absolution });
    } catch (err) {
        console.error('Server error:', err);
        return res.status(500).json({ error: 'КРИТИЧЕСКАЯ ОШИБКА СИСТЕМЫ' });
    }
}
