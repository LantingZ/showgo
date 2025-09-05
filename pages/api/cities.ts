import type { NextApiRequest, NextApiResponse } from 'next';

// Define a type for the Geoapify feature object
interface GeoapifyFeature {
  properties: {
    formatted: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { text } = req.query;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ message: 'Text parameter is required.' });
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
    text
  )}&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch from Geoapify API');
    }
    const data = await response.json();
    
    // Use the defined type here
    const suggestions = data.features.map((feature: GeoapifyFeature) => feature.properties.formatted);
    
    res.status(200).json(suggestions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}