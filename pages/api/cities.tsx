import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { text } = req.query;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ message: 'Text parameter is required.' });
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'Geoapify API key not configured.' });
  }

  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
    text
  )}&type=city&format=json&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch from Geoapify API');
    }
    const data = await response.json();
    
    // Extract city and state names, ensuring no duplicates
    const suggestions = data.results
      ? Array.from(new Set(data.results.map((item: any) => `${item.city}, ${item.state}`)))
      : [];

    res.status(200).json(suggestions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}