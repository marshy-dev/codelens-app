export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, language } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'Missing code or language' });
  }

  const systemPrompt = `You are CodeLens, an expert code reviewer. Analyze the given code and return ONLY a JSON object (no markdown, no backticks, no extra text) with this exact structure:

{
  "score": <number 0-100>,
  "scoreLabel": "<one of: Excellent / Good / Needs Work / Critical Issues>",
  "summary": "<2 sentence summary of overall code quality>",
  "issues": [
    {
      "severity": "<critical|warning|info|ok>",
      "category": "<Security|Performance|Structure|Error Handling|Readability|Testability|Best Practice|Logic>",
      "title": "<short issue title>",
      "description": "<clear explanation of the problem>",
      "fix": "<concrete code fix or improvement, 1-4 lines>"
    }
  ]
}

Include 3-6 issues total. For good code, use severity "ok" for things done well. Be specific and actionable.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Review this ${language} code:\n\n${code}` }]
      })
    });

    const data = await response.json();
    console.log('Anthropic status:', response.status);
    console.log('Anthropic body:', JSON.stringify(data));

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Anthropic API error' });
    }

    if (!data.content) {
      return res.status(500).json({ error: 'No content returned from Anthropic' });
    }

    const rawText = data.content.map(b => b.text || '').join('');
    const clean = rawText.replace(/```json|```/g, '').trim();
    const review = JSON.parse(clean);

    res.status(200).json(review);
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Review failed. Please try again.' });
  }
}
