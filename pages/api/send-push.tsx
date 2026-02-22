import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, title, body } = req.body;

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, sound: 'default', title, body }),
    });

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Push error:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}