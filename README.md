# RelevX

An AI-powered research assistant that automates recurring research and delivers curated insights straight to your inbox.

## Overview

RelevX helps product teams, analysts, and marketers stay informed by automating the research process. Instead of manually searching and reading through countless articles, you define research topics and schedules, and RelevX delivers concise, summarized briefs with cited sources.

### Key Features

- **Custom Research Projects** - Define topics with natural language descriptions and fine-tune with keywords, domain filters, and relevancy thresholds
- **Scheduled Delivery** - Set daily, weekly, or monthly research schedules with timezone-aware delivery times
- **AI-Powered Analysis** - Uses LLMs to generate search queries, filter results, analyze relevancy, cluster topics, and compile comprehensive reports
- **Source Quality Filtering** - Prioritize trusted domains, exclude unwanted sources, and filter by keywords
- **Email Delivery** - Receive beautifully formatted research reports with summaries and citations delivered to your inbox
- **Cost Optimization** - 90%+ reduction in search costs through intelligent caching, semantic deduplication, and affordable APIs (see [SEARCH_COST_OPTIMIZATION.md](./SEARCH_COST_OPTIMIZATION.md))

## Architecture

This is a pnpm monorepo with the following structure:

```
relevx/
├── apps/
│   ├── web/          # Next.js web application
│   ├── mobile/       # Expo React Native mobile app
│   └── backend/      # Fastify API server
├── packages/
│   ├── core/         # Shared business logic, types, and services
│   └── ui/           # Shared UI components
└── services/
    └── scheduler/    # Cron-based research execution service
```

### Tech Stack

**Frontend**

- Next.js 16 with React 19
- Tailwind CSS 4
- Framer Motion for animations
- Firebase Authentication

**Backend**

- Fastify with TypeScript
- Firebase Admin SDK / Firestore
- Redis for caching and rate limiting
- AWS Secrets Manager
- Stripe for billing

**Research Engine**

- OpenAI for LLM operations (query generation, relevancy analysis, report compilation)
- **Search Providers:**
  - Serper.dev API (Recommended - 80% cheaper than Brave)
  - Brave Search API
  - Multi-provider with automatic fallback
- Redis-based search result caching (50%+ cost reduction)
- Semantic query deduplication using embeddings
- Content extraction and deduplication
- Topic clustering with embeddings

**Infrastructure**

- Docker support for backend and scheduler
- pnpm workspaces for monorepo management

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm 10.25.0 or later
- Firebase project with Firestore enabled
- API keys for OpenAI and Serper.dev (or Brave Search)
- Redis instance (local or managed) for caching
- (Optional) Stripe account for billing
- (Optional) AWS account for secrets management

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd relevx
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables (see [Environment Variables](#environment-variables) below)

4. Start the development server:

   ```bash
   # Web app
   pnpm dev:web

   # Mobile app
   pnpm dev:mobile
   ```

### Environment Variables

Create `.env` files in the respective app directories with the following variables:

**Core/Backend**

```env
# Firebase
FIREBASE_SERVICE_ACCOUNT_JSON=<service-account-json>

# OpenAI
OPENAI_API_KEY=<your-openai-api-key>

# Search Provider (choose one or both for fallback)
SERPER_API_KEY=<your-serper-api-key>  # Recommended - 80% cheaper
BRAVE_SEARCH_API_KEY=<your-brave-api-key>  # Alternative/fallback

# Stripe (optional)
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>

# Redis (for caching and cost optimization)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<optional-password>
ENABLE_SEARCH_CACHE=true

# AWS (optional, for secrets management)
AWS_REGION=<aws-region>
AWS_ACCESS_KEY_ID=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>
```

**Web App**

```env
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<firebase-auth-domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<firebase-project-id>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<stripe-publishable-key>
```

## Scripts

| Script               | Description                           |
| -------------------- | ------------------------------------- |
| `pnpm dev:web`       | Start the web app in development mode |
| `pnpm dev:mobile`    | Start the mobile app with Expo        |
| `pnpm build:web`     | Build the web app for production      |
| `pnpm test:research` | Test the research engine              |
| `pnpm test:openai`   | Test OpenAI integration               |
| `pnpm test:brave`    | Test Brave Search integration         |
| `pnpm test:email`    | Test email delivery                   |
| `pnpm test:queries`  | Test query generation                 |
| `pnpm test:extract`  | Test content extraction               |

## How It Works

1. **Create a Project** - Users define a research topic with a description, set the frequency (daily/weekly/monthly), and configure delivery preferences.

2. **Scheduled Research** - The scheduler service runs every minute, checking for projects due for research execution.

3. **Research Execution**:

   - Generate search queries using LLM based on the project description
   - Check cache and semantic similarity to avoid redundant searches
   - Execute searches via Serper.dev or Brave Search API with freshness filters
   - Extract and deduplicate content from search results
   - Analyze relevancy of each result against the project description
   - Cluster related articles by topic similarity
   - Compile a comprehensive report with summaries and citations
   - Cache results for faster future searches

4. **Delivery** - Reports are delivered via email at the scheduled time with a summary, key insights, and links to original sources.

## Project Configuration

Research behavior can be customized via `research-config.yaml`:

- Search provider selection (Serper.dev, Brave, or multi-provider)
- Cache settings (TTL, popularity thresholds)
- Max iterations per research run
- Queries per iteration
- Results per query
- Relevancy thresholds
- Clustering settings
- Report format and length

For detailed cost optimization setup, see [SEARCH_COST_OPTIMIZATION.md](./SEARCH_COST_OPTIMIZATION.md).

## License
