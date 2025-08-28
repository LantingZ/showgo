import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { city, page = '0' } = req.query;

  if (!city || typeof city !== 'string') {
    return res.status(400).json({ message: 'City parameter is required.' });
  }

  // Date Handling
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = String(today.getUTCMonth() + 1).padStart(2, '0');
  const day = String(today.getUTCDate()).padStart(2, '0');
  const startDateTime = `${year}-${month}-${day}T00:00:00Z`;
  
  const apiKey = process.env.TICKETMASTER_API_KEY;
  
  // Pagination Implementation
  const url = `https://app.ticketmaster.com/discovery/v2/events.json?city=${encodeURIComponent(city)}&sort=date,asc&startDateTime=${startDateTime}&size=20&page=${page}&apikey=${apiKey}`;

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
