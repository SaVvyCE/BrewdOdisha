# BrewdOdisha ☕

> Discover the best cafes in Bhubaneswar — explore vibes, plan your day, and build your perfect coffee itinerary.

**Live site →** [brewdodisha.vercel.app](https://brewdodisha.vercel.app)
**Instagram →** [@brewdodisha](https://instagram.com/brewdodisha)

---

## About

BrewdOdisha is a local cafe discovery and itinerary planning web app for Bhubaneswar, Odisha. Whether you're a student hunting for a study spot, a couple looking for a cozy corner, or just chasing good coffee — BrewdOdisha helps you find your vibe.

Built as a side project by a CS undergrad at SOA University, it's part city guide, part mood board, and part day planner.

---

## Features

- **Cafe discovery** — Browse 85+ Bhubaneswar cafes filtered by mood, vibe, and location
- **BrewBot AI chatbot** — Get personalized cafe recommendations powered by the Claude API
- **AI day planner** — Generate a full cafe itinerary for your day using Claude
- **Outfit palette matcher** — Match your outfit colors to the perfect cafe vibe
- **Explore Odisha** — Local discovery beyond just cafes
- **User auth** — Sign up / log in via Supabase Auth
- **Community submissions** — Crowdsourced cafe photos and reviews via Google Forms
- **Mobile-first design** — Responsive layout with hamburger nav

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| AI | Claude API (claude-haiku-4-5) |
| Deployment | Vercel |
| Serverless | Vercel Functions (API key security) |

---

## Project Structure

```
brewdodisha/
├── index.html          # Main app entry
├── style.css           # Global styles
├── app.js              # Core logic, Supabase client, cafe rendering
├── brewbot.js          # BrewBot AI chatbot (Claude API)
├── planner.js          # AI day planner
├── api/
│   └── chat.js         # Vercel serverless function (Claude API proxy)
└── assets/
    └── logo.svg        # BrewdOdisha logo
```

---

## Getting Started

### Prerequisites

- [Supabase](https://supabase.com) account with a project set up
- [Anthropic API key](https://console.anthropic.com) for Claude
- [Vercel](https://vercel.com) account for deployment

### Local setup

```bash
# Clone the repo
git clone https://github.com/yourusername/brewdodisha.git
cd brewdodisha
```

Create a `.env` file (or set environment variables in Vercel):

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_claude_api_key
```

Open `index.html` in your browser or serve it locally:

```bash
npx serve .
```

### Deploying to Vercel

```bash
npm i -g vercel
vercel
```

Set the environment variables in your Vercel project dashboard under **Settings → Environment Variables**.

---

## Supabase Schema

```sql
create table cafes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  vibe text[],
  rating numeric,
  image_url text,
  description text,
  google_maps_url text,
  instagram_url text,
  created_at timestamp default now()
);
```

---

## Roadmap

- [ ] Cafe ratings and user reviews
- [ ] Save / bookmark cafes
- [ ] Filter by vibe tags (aesthetic, study-friendly, date spot)
- [ ] Real-time availability / open now indicator
- [ ] Nearby cafes via Geolocation API
- [ ] Admin dashboard for cafe submissions

---

## Contributing

Have a cafe to add? Fill out the [community submission form](https://forms.gle/) and we'll review it.

Found a bug or have a feature idea? Open an [issue](https://github.com/yourusername/brewdodisha/issues) or drop a message on Instagram.

---

## Author

Made with ☕ by **Aditya** — BTech CSE student at ITER, SOA University, Bhubaneswar.

[GitHub](https://github.com/yourusername) · [Instagram](https://instagram.com/brewdodisha)

---

## License

MIT License — see [LICENSE](LICENSE) for details.
