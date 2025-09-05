import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';

// --- Type Definition for an Event ---
type EventType = {
    id: string;
    name: string;
    url: string;
    images: { ratio: string; url: string; }[];
    dates: { start: { localDate: string; } };
    _embedded?: {
        venues: { name: string; }[];
    };
};

// --- Type for Pagination Info ---
type PageInfo = {
    totalPages: number;
    number: number; // Current page number (0-indexed)
};

// --- EventCard Component ---
const EventCard = ({ event, onSave, onUnsave, isSaved }: { event: EventType, onSave: (event: EventType) => void, onUnsave: (eventId: string) => void, isSaved: boolean }) => {
    const imageUrl = event.images?.find(img => img.ratio === '16_9')?.url || event.images?.[0]?.url || 'https://placehold.co/600x400/e2e8f0/4a5568?text=No+Image';
    const eventDate = new Date(event.dates.start.localDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const venueName = event._embedded?.venues[0]?.name || 'Venue TBD';

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl flex flex-col transition-all duration-300 transform hover:-translate-y-1">
            <div className="relative w-full h-48">
                <Image
                    src={imageUrl}
                    alt={event.name}
                    layout="fill"
                    objectFit="cover"
                    onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/e2e8f0/4a5568?text=No+Image'; }}
                />
            </div>
            <div className="p-5 flex-grow flex flex-col">
                <h3 className="font-bold text-xl mb-2 truncate text-gray-900 dark:text-white" title={event.name}>{event.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{eventDate}</p>
                <p className="text-gray-700 dark:text-gray-300 text-sm font-medium truncate" title={venueName}>{venueName}</p>
                <div className="mt-auto pt-4 flex items-center justify-between">
                    <a href={event.url} target="_blank" rel="noopener noreferrer" className="inline-block bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-blue-600 transition-colors duration-300">
                        Tickets
                    </a>
                    <button
                        onClick={() => isSaved ? onUnsave(event.id) : onSave(event)}
                        className={`relative z-10 text-sm font-semibold px-4 py-2 rounded-full transition-colors duration-300 ${isSaved ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                    >
                        {isSaved ? 'Unsave' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Home Page Component ---
export default function Home() {
    const { data: session, status } = useSession();
    const [view, setView] = useState('search');
    const [searchEvents, setSearchEvents] = useState<EventType[]>([]);
    const [savedEvents, setSavedEvents] = useState<EventType[]>([]);
    const [city, setCity] = useState('Philadelphia');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [pageInfo, setPageInfo] = useState<PageInfo>({ totalPages: 0, number: 0 });
    const [currentPage, setCurrentPage] = useState(0);

    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const searchWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (city.length < 3 || !isInputFocused) {
            setSuggestions([]);
            return;
        }

        const fetchSuggestions = async () => {
            const res = await fetch(`/api/cities?text=${city}`);
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data);
            }
        };

        const debounceTimer = setTimeout(() => {
            fetchSuggestions();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [city, isInputFocused]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
                setIsInputFocused(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [searchWrapperRef]);


    const fetchSavedEvents = useCallback(async () => {
        if (session) {
            const res = await fetch('/api/saved');
            if (res.ok) {
                const data = await res.json();
                setSavedEvents(data);
            }
        }
    }, [session]);

    useEffect(() => {
        fetchSavedEvents();
    }, [fetchSavedEvents]);

    const handleSearch = async (cityToSearch: string, page = 0) => {
        if (!cityToSearch) {
            setMessage("Please enter a city.");
            return;
        }
        setLoading(true);
        setMessage('');
        setSearchEvents([]);
        setCurrentPage(page);
        setSuggestions([]);

        const res = await fetch(`/api/search?city=${cityToSearch}&page=${page}`);
        const data = await res.json();

        setLoading(false);

        if (data.events && data.events.length > 0) {
            setSearchEvents(data.events);
            setPageInfo(data.pageInfo);
        } else {
            setMessage(`No events found for "${cityToSearch}".`);
            setSearchEvents([]);
            setPageInfo({ totalPages: 0, number: 0 });
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setCity(suggestion);
        setIsInputFocused(false);
        handleSearch(suggestion, 0);
    };

    const handleSave = async (eventData: EventType) => {
        const originalSavedEvents = savedEvents;
        setSavedEvents(prev => [...prev, eventData]);

        try {
            const res = await fetch('/api/saved', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventData }),
            });

            if (!res.ok) {
                setMessage("Error: Could not save event.");
                setSavedEvents(originalSavedEvents);
            }
        } catch (error) {
            console.error("Failed to save event:", error);
            setMessage("Error: Could not save event.");
            setSavedEvents(originalSavedEvents);
        }
    };

    const handleUnsave = async (eventId: string) => {
        const originalSavedEvents = savedEvents;
        setSavedEvents(prev => prev.filter(event => event.id !== eventId));

        try {
            const res = await fetch('/api/saved', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId }),
            });

            if (!res.ok) {
                setMessage("Error: Could not unsave event.");
                setSavedEvents(originalSavedEvents);
            }
        } catch (error) {
            console.error("Failed to unsave event:", error);
            setMessage("Error: Could not unsave event.");
            setSavedEvents(originalSavedEvents);
        }
    };

    const isEventSaved = (eventId: string) => savedEvents.some(event => event.id === eventId);
    const eventsToDisplay = view === 'search' ? searchEvents : savedEvents;

    if (status === 'loading') {
        return <div className="text-center p-10">Loading session...</div>;
    }

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 text-center">
                    <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-2">ShowGo 🎤</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">Find and save upcoming events in your city.</p>
                    <button
                        onClick={() => signIn('github')}
                        className="w-full inline-flex justify-center items-center bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-900 transition-transform transform hover:scale-105"
                    >
                        <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.492.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                        </svg>
                        Sign In with GitHub
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="container mx-auto p-4 md:p-8">
                <header className="flex flex-col md:flex-row justify-between items-center mb-10">
                    <div>
                        <h1 className="text-5xl font-bold text-gray-900 dark:text-white">ShowGo 🎤</h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">Welcome, {session.user.name}!</p>
                    </div>
                    <button onClick={() => signOut()} className="bg-red-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-red-600 transition-colors mt-4 md:mt-0">
                        Sign Out
                    </button>
                </header>

                <nav className="flex justify-center mb-8 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md max-w-sm mx-auto">
                    <button onClick={() => setView('search')} className={`w-1/2 text-center py-2 px-4 rounded-full font-semibold transition-colors duration-300 ${view === 'search' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>Search Events</button>
                    <button onClick={() => setView('saved')} className={`w-1/2 text-center py-2 px-4 rounded-full font-semibold transition-colors duration-300 ${view === 'saved' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>My Saved Events</button>
                </nav>

                {view === 'search' && (
                    <div ref={searchWrapperRef} className="max-w-xl mx-auto mb-8 relative">
                        <div className="flex items-center bg-white dark:bg-gray-800 rounded-full shadow-md p-2">
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                onFocus={() => setIsInputFocused(true)}
                                onKeyUp={(e) => e.key === 'Enter' && handleSearch(city, 0)}
                                placeholder="Enter a city (e.g., Philadelphia)"
                                className="w-full bg-transparent p-2 text-gray-700 dark:text-gray-200 focus:outline-none"
                                autoComplete="off"
                            />
                            <button onClick={() => handleSearch(city, 0)} disabled={loading} className="bg-blue-600 text-white rounded-full px-6 py-2 font-semibold hover:bg-blue-700 transition duration-200 disabled:bg-blue-300">
                                {loading ? '...' : 'Search'}
                            </button>
                        </div>
                        {isInputFocused && suggestions.length > 0 && (
                            <ul className="absolute z-20 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mt-2 shadow-lg max-h-60 overflow-y-auto">
                                {suggestions.map((suggestion, index) => (
                                    <li
                                        key={index}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                                    >
                                        {suggestion}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {loading && <div className="text-center text-gray-600 dark:text-gray-400 my-8">Finding events...</div>}
                {message && <div className="text-center text-red-500 my-8 font-semibold">{message}</div>}

                {!loading && eventsToDisplay.length === 0 && view === 'saved' && (
                     <div className="text-center text-gray-600 dark:text-gray-400 my-8">You haven&apos;t saved any events yet.</div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {eventsToDisplay.map(event => (
                        <EventCard
                            key={event.id}
                            event={event}
                            onSave={handleSave}
                            onUnsave={handleUnsave}
                            isSaved={isEventSaved(event.id)}
                        />
                    ))}
                </div>

                {view === 'search' && !loading && eventsToDisplay.length > 0 && (
                    <div className="flex justify-center items-center mt-10 space-x-4">
                        <button
                            onClick={() => handleSearch(city, currentPage - 1)}
                            disabled={currentPage === 0}
                            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-gray-600 dark:text-gray-400">
                            Page {currentPage + 1} of {pageInfo.totalPages}
                        </span>
                        <button
                            onClick={() => handleSearch(city, currentPage + 1)}
                            disabled={currentPage + 1 >= pageInfo.totalPages}
                            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}