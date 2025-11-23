# 🚀 AI Travel Planner Setup Guide

## Required Environment Variables

Create a `.env` file in the project root with the following variables:

### Required
```bash
# Anthropic API Key (Required for AI agent)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

```bash
# Firecrawl API Key (for web scraping travel sites)
FIRECRAWL_API_KEY=your_firecrawl_api_key_here

# Notion Integration Token (for saving travel plans)
NOTION_TOKEN=your_notion_integration_token_here
```

## How to Get API Keys

### 1. Anthropic API Key (Required)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env` file

### 2. Firecrawl API Key (Optional)
1. Go to [Firecrawl](https://firecrawl.dev/)
2. Sign up for an account
3. Get your API key from the dashboard
4. Add it to your `.env` file

### 3. Notion Integration Token (Optional)
1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Give it a name like "Travel Planner"
4. Copy the Internal Integration Token
5. Add it to your `.env` file
6. Share your Notion pages/databases with the integration

## Quick Start

Open your terminal and go to the corresponding directory
```bash
cd travel_agent
```

1. **Set up environment variables** (see above)
2. **Check all dependencies are installed**
3. **Start the application**:
   ```bash
   deno task dev
   ```
4. **Open your browser** to `http://localhost:8000`

## Features Available

### With ANTHROPIC_API_KEY only:
- ✅ AI-powered travel plan generation
- ✅ Three travel modes (Flow/Moderate/Intense)
- ✅ Web interface for input and plan selection
- ✅ Basic attraction and restaurant suggestions

### With FIRECRAWL_API_KEY added:
- ✅ Real-time web scraping of travel sites
- ✅ Current attraction information and reviews
- ✅ Live restaurant data and ratings
- ✅ Enhanced attraction fetching for customization

### With NOTION_TOKEN added:
- ✅ Save travel plans directly to Notion
- ✅ Structured travel itinerary pages
- ✅ Collaborative planning capabilities
- ✅ Easy sharing and organization


## Example .env File

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Optional - uncomment and add your keys
# FIRECRAWL_API_KEY=fc-xxxxx
# NOTION_TOKEN=secret_xxxxx
```

Save this as `.env` in your project root and you're ready to go! 🌍✈️
