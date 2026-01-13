# Setsunai

A private, end-to-end encrypted social media platform where your thoughts stay yours. Post privately, encrypt locally, and never share your data with anyone.

## Features

- **End-to-End Encryption**: All posts are encrypted client-side using AES-256-GCM before being stored. The server never sees your plaintext content.
- **6-Digit PIN Protection**: Your posts are encrypted with a key derived from your PIN using PBKDF2 with 100,000 iterations.
- **Private Feed**: View only your own posts in an infinite scroll feed. No social features, no sharing, no algorithms.
- **Magic Link Authentication**: Passwordless email authentication with secure magic links.
- **Google OAuth**: Optional Google sign-in for faster access.
- **Edit & Delete**: Full control over your posts with edit and delete functionality.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router)
- **Language**: [TypeScript](https://typescriptlang.org)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com)
- **Database**: [Upstash Redis](https://upstash.com) (serverless Redis)
- **Authentication**: Custom JWT-based auth with [jose](https://github.com/panva/jose)
- **Encryption**: Web Crypto API (AES-256-GCM + PBKDF2)
- **Email**: [Resend](https://resend.com) (optional, for magic links)
- **Deployment**: [Vercel](https://vercel.com)

## How It Works

### Encryption Flow

1. User sets a 6-digit PIN during first sign-in
2. The PIN is hashed (SHA-256) and stored server-side for verification
3. A cryptographic key is derived from the PIN using PBKDF2 (100k iterations)
4. Posts are encrypted client-side with AES-256-GCM before transmission
5. Only encrypted data + IV is stored in Redis
6. Decryption happens entirely in the browser using the PIN-derived key

### Data Storage

All data is stored in Upstash Redis with the following key patterns:

| Key Pattern | Description |
|-------------|-------------|
| `setsunai:email:{email}` | Maps email to user ID |
| `setsunai:user:{id}:data` | User profile (name, pinHash, etc.) |
| `setsunai:user:{id}:posts` | Sorted set of post IDs by timestamp |
| `setsunai:post:{id}` | Individual post (encrypted content + IV) |
| `setsunai:magic:{email}` | Magic link token (15 min TTL) |

## Self-Hosting Guide

### Prerequisites

- Node.js 18+ or Bun
- An [Upstash](https://upstash.com) account (free tier available)
- A [Resend](https://resend.com) account (optional, for email magic links)
- A [Google Cloud](https://console.cloud.google.com) project (optional, for Google OAuth)

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/alpharomercoma/setsunai.git
cd setsunai
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
# or
bun install
\`\`\`

### 3. Set Up Upstash Redis

1. Create an account at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy the REST API credentials from the database details page

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

\`\`\`env
# Required - Upstash Redis
KV_REST_API_URL=https://your-database.upstash.io
KV_REST_API_TOKEN=your-upstash-token

# Required - Auth Secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your-random-secret-key

# Optional - Resend (for email magic links)
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=Setsunai <noreply@yourdomain.com>

# Optional - Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
\`\`\`

### 5. Run the Development Server

\`\`\`bash
npm run dev
# or
bun dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Deploy to Vercel

The easiest way to deploy is with [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add your environment variables in Project Settings > Environment Variables
4. Deploy

Alternatively, use the Vercel CLI:

\`\`\`bash
npm i -g vercel
vercel
\`\`\`

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `KV_REST_API_URL` | Yes | Upstash Redis REST API URL |
| `KV_REST_API_TOKEN` | Yes | Upstash Redis REST API token |
| `AUTH_SECRET` | Yes | Secret key for JWT signing (min 32 chars) |
| `RESEND_API_KEY` | No | Resend API key for email delivery |
| `EMAIL_FROM` | No | Sender email address (default: `Setsunai <noreply@resend.dev>`) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |

### Setting Up Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Navigate to APIs & Services > Credentials
4. Create an OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
6. Copy the Client ID and Client Secret to your environment variables

## Security Considerations

- **PIN Storage**: Only the SHA-256 hash of your PIN is stored server-side
- **Encryption Keys**: Never transmitted or stored - derived client-side from your PIN
- **Post Content**: Always encrypted before leaving your browser
- **Session Tokens**: HTTP-only cookies with secure flags in production
- **No Backdoor**: Without your PIN, your posts cannot be decrypted - even by the server owner

### Important Notes

- **Lost PIN = Lost Data**: There is no PIN recovery. If you forget your PIN, your encrypted posts cannot be recovered.
- **Browser Security**: Encryption happens in your browser. Use a trusted device and keep your browser updated.
- **Open Source**: This code is open source. Audit it yourself or have someone you trust review it.

## License

MIT License - See [LICENSE](LICENSE) for details.

## Author

Created by [Alpha Romer Coma](https://www.linkedin.com/in/alpharomercoma/)

---

*Setsunai (切ない) - A Japanese word describing a feeling of longing, melancholy, or bittersweet emotion. Your private space for thoughts that need no audience.*
