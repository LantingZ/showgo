import type { NextApiRequest, NextApiResponse } from 'next';

// Define a specific type for the Geoapify place feature
interface GeoapifyPlace {
  properties: {
    name: string;
    address_line2: string;
  };
}

const fetchPlaces = async (category: string, lat: string, lon: string, apiKey: string) => {
  const url = `https://api.geoapify.com/v2/places?categories=${category}&filter=circle:${lon},${lat},2000&bias=proximity:${lon},${lat}&limit=3&apiKey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  // Use the GeoapifyPlace type for the 'place' parameter
  return data.features.map((place: GeoapifyPlace) => ({
    name: place.properties.name,
    address: place.properties.address_line2,
  }));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon } = req.query;

  if (!lat || !lon || typeof lat !== 'string' || typeof lon !== 'string') {
    return res.status(400).json({ message: 'Latitude and longitude are required.' });
  }

  const apiKey = process.env.GEOAPIFY_API_KEY as string;

  try {
    const [restaurants, bars] = await Promise.all([
      fetchPlaces('catering.restaurant', lat, lon, apiKey),
      fetchPlaces('entertainment.bar,entertainment.pub', lat, lon, apiKey),
    ]);

    res.status(200).json({ restaurants, bars });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}