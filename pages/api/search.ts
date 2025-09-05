import type { NextApiRequest, NextApiResponse } from 'next';

// Type for the Hugging Face API response
type HFSentimentResponse = {
    label: 'POSITIVE' | 'NEGATIVE';
    score: number;
}[];

// Helper function to map sentiment analysis results to a "vibe"
const mapSentimentToVibe = (sentimentResponse: HFSentimentResponse[], description: string = ''): string => {
    // Prioritize keyword matching for specific vibes
    const lowerCaseDescription = description.toLowerCase();
    if (lowerCaseDescription.includes('family') || lowerCaseDescription.includes('all ages')) {
        return '👨‍👩‍👧 Family-Friendly';
    }
    if (lowerCaseDescription.includes('concert') || lowerCaseDescription.includes('festival') || lowerCaseDescription.includes('party')) {
        return '⚡ Energetic';
    }

    // Fallback to sentiment analysis result
    if (!sentimentResponse || !sentimentResponse[0]) {
        return '🎉 General';
    }

    // Find the label with the highest score from the response
    const topClassification = sentimentResponse[0].reduce((prev, current) => (prev.score > current.score) ? prev : current);

    switch (topClassification.label) {
        case 'POSITIVE':
            return '😄 Upbeat';
        case 'NEGATIVE':
             // "Negative" sentiment can mean formal, intense, or niche, not necessarily "bad" for an event.
            return '🧐 Niche';
        default:
            return '🎉 General';
    }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { city, page = '0' } = req.query;

    if (!city || typeof city !== 'string') {
        return res.status(400).json({ message: 'City parameter is required.' });
    }

    const today = new Date();
    const startDateTime = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}T00:00:00Z`;
    
    const ticketmasterApiKey = process.env.TICKETMASTER_API_KEY;
    const hfApiKey = process.env.HUGGING_FACE_API_KEY;
    const model = "distilbert-base-uncased-finetuned-sst-2-english";

    const url = `https://app.ticketmaster.com/discovery/v2/events.json?city=${encodeURIComponent(city)}&sort=date,asc&startDateTime=${startDateTime}&size=20&page=${page}&apikey=${ticketmasterApiKey}`;

    try {
        const tmResponse = await fetch(url);
        if (!tmResponse.ok) {
            throw new Error('Failed to fetch from Ticketmaster API');
        }
        const data = await tmResponse.json();
        const events = data._embedded?.events || [];

        // If there are events and an API key is provided, perform sentiment analysis
        if (events.length > 0 && hfApiKey) {
            const analysisPromises = events.map(async (event: any) => {
                const description = event.info || event.pleaseNote || event.name;
                
                try {
                    const hfResponse = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${hfApiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ inputs: description })
                    });

                    if (!hfResponse.ok) {
                        return { ...event, vibe: '🎉 General' };
                    }
                    
                    const hfData: HFSentimentResponse[] = await hfResponse.json();
                    const vibe = mapSentimentToVibe(hfData, description);
                    return { ...event, vibe };

                } catch (error) {
                    console.error("Hugging Face API error:", error);
                    return { ...event, vibe: '🎉 General' }; // Assign a default vibe on error
                }
            });

            const eventsWithVibes = await Promise.all(analysisPromises);
            
            res.status(200).json({
                events: eventsWithVibes,
                pageInfo: data.page || { totalPages: 0, number: 0 },
            });

        } else {
            res.status(200).json({
                events,
                pageInfo: data.page || { totalPages: 0, number: 0 },
            });
        }
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}