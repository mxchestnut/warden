# Warden - Discord Pathfinder Companion Bot

**Warden** is a comprehensive Discord bot for Pathfinder 1E campaigns, integrated with PathCompanion.com. It features character proxying, dice rolling, AI-powered knowledge base, world-building tools, and advanced campaign management features.

## Features

### Core Features (Available to All)

**Character Management**
- Full integration with PathCompanion.com character sheets
- Create and manage characters via web portal
- Character avatar upload for Discord proxying
- Export and share character sheets
- Character statistics tracking

**Discord Bot Commands**
- **Character Proxying** - Speak as your character with custom avatars
- **Dice Rolling** - Roll with character stats, saves, and skills
- **Character Statistics** - Track rolls, crits, fails, and messages
- **Hall of Fame** - Star messages to showcase best roleplay moments
- **GM Tools** - Time tracking, NPC generation, music suggestions

**AI-Powered Features**
- **Knowledge Base** - AI FAQ system powered by Google Gemini 2.5 Flash
- **Semantic Search** - Ask questions about Pathfinder with `!ask`
- **Smart Learning** - Add URLs, documents, or manual entries to knowledge base
- **Feat & Spell Lookups** - Instant Pathfinder rules information

**Advanced Systems**
- **Character Memories** - Track important character moments and development
- **Character Relationships** - Define and track relationships between characters
- **World Building Lore** - Tag-based lore system with cross-channel posting
- **Prompts & Tropes** - Generate creative prompts and writing inspiration

**Web Portal**
- Secure authentication
- Rich text document editor
- Character sheet management
- Statistics dashboard and leaderboards
- Campaign management tools

---

## Tech Stack

### Backend
- **Runtime:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (Neon)
- **Authentication:** Passport.js
- **Session Store:** Redis (optional) or in-memory
- **Discord:** Discord.js v14
- **AI:** Google Gemini 2.5 Flash
- **File Storage:** AWS S3
- **Security:** Helmet, CSRF protection, rate limiting

### Frontend
- **Framework:** React + TypeScript
- **Build Tool:** Vite
- **UI:** Custom components
- **Editor:** Tiptap 3.0 (rich text)

### Infrastructure
- **Database:** Neon PostgreSQL
- **Hosting:** AWS (planned)
- **Version Control:** Git
- **Deployment:** PM2 ecosystem

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (Neon recommended)
- Discord Bot Token
- Google Gemini API Key
- (Optional) Redis for session storage
- (Optional) AWS S3 for file storage

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mxchestnut/warden.git
   cd warden
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env` and fill in:
   ```env
   NODE_ENV=development
   DATABASE_URL=your-neon-postgresql-url
   WARDEN_BOT_TOKEN=your-discord-bot-token
   GEMINI_API_KEY=your-gemini-api-key
   SESSION_SECRET=your-random-secret
   ```

4. **Run database migrations**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Install frontend dependencies** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Production Deployment

1. **Build the application**
   ```bash
   cd backend && npm run build
   cd ../frontend && npm run build
   ```

2. **Deploy with PM2**
   ```bash
   pm2 start ecosystem.config.js
   ```

---

## Configuration

### Discord Bot Setup

1. Create a bot at [Discord Developer Portal](https://discord.com/developers/applications)
2. Enable the following Privileged Gateway Intents:
   - Server Members Intent
   - Message Content Intent
3. Add bot to your server with appropriate permissions

### Database Schema

The database uses Drizzle ORM with migrations in `/backend/drizzle/`

Key tables:
- `users` - User accounts and authentication
- `characters` - Character sheets from PathCompanion
- `documents` - Rich text documents
- `knowledge_base_entries` - AI knowledge base
- `lore_entries` - World-building lore notes
- `character_memories` - Character development tracking
- `prompt_schedule` - Daily prompt scheduling

---

## Discord Bot Commands

### Character Commands
- `!register` - Link Discord account to Warden
- `!char <name>` - Select active character
- `!chars` - List your characters
- `!import` - Import from PathCompanion

### Dice Rolling
- `!roll <dice>` - Basic dice roll
- `!attack <weapon>` - Roll attack with character weapon
- `!save <type>` - Roll saving throw
- `!skill <name>` - Roll skill check

### AI & Knowledge
- `!ask <question>` - Ask the AI knowledge base
- `!learn <info>` - Add information to knowledge base
- `!learnurl <url>` - Learn from a webpage
- `!feat <name>` - Look up a feat
- `!spell <name>` - Look up a spell

### World Building
- `!lore <note> <tag>` - Add lore entry
- `!set <tag>` - Set channel lore tag
- `!memory <text>` - Add character memory
- `!prompt` - Get random RP prompt

### GM Tools
- `!time <action>` - Track campaign time
- `!npc` - Generate random NPC
- `!music <mood>` - Get music suggestions

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/user` - Get current user

### Characters
- `GET /api/characters` - List user's characters
- `POST /api/characters` - Create character
- `GET /api/characters/:id` - Get character details
- `PUT /api/characters/:id` - Update character
- `DELETE /api/characters/:id` - Delete character

### Knowledge Base
- `GET /api/knowledge-base` - Query knowledge base
- `POST /api/knowledge-base` - Add entry
- `DELETE /api/knowledge-base/:id` - Remove entry

### Lore & Memories
- `GET /api/lore/guild/:guildId` - Get guild lore
- `POST /api/lore` - Add lore entry
- `GET /api/memories` - Get character memories
- `POST /api/memories` - Add memory

---

## Security Features

- **Authentication:** Session-based with Passport.js
- **CSRF Protection:** Double-submit cookie pattern
- **Rate Limiting:** 100 requests per 15 minutes
- **Input Validation:** Express-validator
- **SQL Injection Protection:** Drizzle ORM parameterized queries
- **XSS Protection:** Helmet security headers
- **File Upload Security:** ClamAV virus scanning
- **Session Security:** HttpOnly cookies, secure in production

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

See [LICENSE](LICENSE) file.

---

## Support

- **Website:** https://warden.my
- **GitHub Issues:** https://github.com/mxchestnut/warden/issues
- **Discord:** [Join our community]

---

## Acknowledgments

- Built for the Pathfinder 1E community
- Integrates with [PathCompanion.com](https://pathcompanion.com)
- Inspired by Avrae and Carl Bot
- Powered by Google Gemini AI

---

## Roadmap

- [ ] Advanced character relationship mapping
- [ ] Campaign timeline visualization
- [ ] Multi-campaign support
- [ ] Mobile app companion
- [ ] Voice channel integration
- [ ] Custom dice macros
- [ ] Initiative tracker
- [ ] Combat log analysis

---

**Made with ❤️ for the TTRPG community**
