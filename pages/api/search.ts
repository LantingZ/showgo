import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { city, page = '0', latlong } = req.query;

  if (!city && !latlong) {
    return res.status(400).json({ message: 'A city or latlong parameter is required.' });
  }

  // Use the current time in ISO format to ensure no past events are shown.
  const startDateTime = new Date().toISOString().split('.')[0] + "Z";
  
  const apiKey = process.env.TICKETMASTER_API_KEY;
  
  let url: string;
  if (latlong) {
    url = `https://app.ticketmaster.com/discovery/v2/events.json?latlong=${latlong}&sort=date,asc&startDateTime=${startDateTime}&size=20&page=${page}&apikey=${apiKey}`;
  } else {
    url = `https://app.ticketmaster.com/discovery/v2/events.json?city=${encodeURIComponent(city as string)}&sort=date,asc&startDateTime=${startDateTime}&size=20&page=${page}&apikey=${apiKey}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Ticketmaster API Error:", errorBody);
      throw new Error('Failed to fetch from Ticketmaster API');
    }
    const data = await response.json();

    res.status(200).json({
      events: data._embedded?.events || [],
      pageInfo: data.page || { totalPages: 0, number: 0 },
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}