import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { text } = req.query;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ message: 'Text parameter is required.' });
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&type=city&format=json&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch from Geoapify API');
    }
    const data = await response.json();

    // Extract just the city and country names to create a clean list
    const suggestions = data.results?.map((result: any) => result.formatted) || [];

    res.status(200).json(suggestions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
