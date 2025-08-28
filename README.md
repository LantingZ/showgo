## ShowGo
Find and save upcoming events in your city.

A full-stack web application built with Next.js that allows users to search for live events, save them to a personal list, and browse through paginated results.

## Live Demo: Link

## Tech Stack:

Framework: Next.js

Language: TypeScript

Frontend: React

Styling: Tailwind CSS

Authentication: NextAuth.js

Database: PostgreSQL (via Supabase)

ORM: Prisma

APIs: Ticketmaster Discovery API, Geoapify

## How to run the application:

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a file named .env in the root of your project and add the following variables. You will need to get API keys from Supabase, Ticketmaster, and GitHub. (Later Geoapify).

# Supabase Database Connection String
DATABASE_URL="YOUR_SUPABASE_CONNECTION_STRING"

# NextAuth.js secret (generate one with `openssl rand -base64 32`)
NEXTAUTH_SECRET="YOUR_NEXTAUTH_SECRET"
NEXTAUTH_URL="http://localhost:3000"

# GitHub OAuth App Credentials
GITHUB_ID="YOUR_GITHUB_CLIENT_ID"
GITHUB_SECRET="YOUR_GITHUB_CLIENT_SECRET"

# External API Keys
TICKETMASTER_API_KEY="YOUR_TICKETMASTER_API_KEY"
GEOAPIFY_API_KEY="YOUR_GEOAPIFY_API_KEY"

3. Run the database migration:

```bash
npx prisma migrate dev
```

5. Start the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.