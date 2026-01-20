# AI Journal Backend

Flask backend for AI-assisted journaling with **Ollama** local LLM integration.

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
# Edit .env - Ollama settings are pre-configured for localhost
```

1. **Ensure Ollama is running**:

```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# If not installed, visit: https://ollama. com
# Pull the default model
ollama pull phi3:mini
```

1. Run development server:

```bash
python app.py
```

Server will run on `http://localhost:5000`

## API Endpoints

> **Note**: AI endpoints now use **Ollama** for local LLM inference instead of Anthropic Claude.

### Health Check

```
GET /health
```

### Authentication

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/status
```

### AI Prompting (Ollama)

```
POST /api/ai/prompt
Content-Type: application/json

{
  "mood": 3,
  "recent_entries": ["theme1", "theme2"],
  "current_text": "I've been thinking about..."
}
```

### Entry Analysis (Ollama)

```
POST /api/ai/analyze
Content-Type: application/json

{
  "content": "Today was a challenging day...",
  "mood": 2
}
```

### Pattern Analysis (Ollama)

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

## Ollama Configuration

Default model: **phi3:mini** (3.8B parameters)

Available models on your system:

- `phi3:mini` (recommended) - Best balance
- `granite3.2:2b` - Faster alternative
- `qwen2.5:1.5b` - Fastest, for testing

To change model, update `.env`:

```bash
OLLAMA_MODEL=granite3.2:2b
```

## Rate Limiting

- 20 requests per hour per IP (configurable)
- Disabled in development by default

## Security Notes

- Never commit `.env` file
- Use strong `SECRET_KEY` in production
- Configure CORS origins appropriately
