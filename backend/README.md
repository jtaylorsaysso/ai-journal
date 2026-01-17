# AI Journal Backend

Flask backend for AI-assisted journaling with Claude API integration.

## Setup

1. Create virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

1. Install dependencies:

```bash
pip install -r requirements.txt
```

1. Configure environment:

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

1. Run development server:

```bash
python app.py
```

Server will run on `http://localhost:5000`

## API Endpoints

### Health Check

```
GET /health
```

### AI Prompting

```
POST /api/ai/prompt
Content-Type: application/json

{
  "mood": 3,
  "recent_entries": ["theme1", "theme2"],
  "current_text": "I've been thinking about..."
}
```

### Entry Analysis

```
POST /api/ai/analyze
Content-Type: application/json

{
  "content": "Today was a challenging day...",
  "mood": 2
}
```

### Pattern Analysis

```
POST /api/ai/patterns
Content-Type: application/json

{
  "entries": [
    {"content": "...", "mood": 3, "date": "2026-01-15"},
    {"content": "...", "mood": 4, "date": "2026-01-16"}
  ]
}
```

## Rate Limiting

- 50 requests per hour per IP (configurable)
- Disabled in development by default

## Security Notes

- Never commit `.env` file
- Use strong `SECRET_KEY` in production
- Configure CORS origins appropriately
- Monitor API usage to prevent cost overruns
