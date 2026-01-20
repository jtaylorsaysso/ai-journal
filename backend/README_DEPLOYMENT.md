# Deployment Guide - AI Journal

## Overview

This application uses a hybrid architecture:

- **Frontend**: Static PWA (HTML/JS/CSS)
- **Backend**: Python Flask API
- **AI**: Hybrid strategy (Ollama for local dev, Anthropic for production)

## Render.com Deployment

### 1. Web Service (Backend)

- **Runtime**: Python 3
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn 'app:create_app("production")' -w 4 -b 0.0.0.0:$PORT`

### 2. Environment Variables

Set these in the Render dashboard:

| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | Flask session key | `generate-secure-random-key` |
| `FLASK_ENV` | Environment mode | `production` |
| `ANTHROPIC_API_KEY` | **Required for Production** | `sk-ant-xxx...` |
| `ANTHROPIC_MODEL` | Model to use | `claude-3-sonnet-20240229` |
| `CORS_ORIGINS` | Allowed frontend domains | `https://your-app.onrender.com` |
| `RATE_LIMIT_ENABLED`| Enable limits | `True` |

### 3. Production vs Local AI

The app automatically switches AI backends based on configuration:

- **Local**: Uses `OLLAMA_BASE_URL` (defaults to localhost:11434)
- **Production**: Uses `ANTHROPIC_API_KEY` if configured

## Static Site (Frontend)

Can be deployed to GitHub Pages, Netlify, or Render Static Sites.

### Configuration

The frontend automatically detects the backend URL:

- If domain is `onrender.com`, it assumes backend is at `/api` on same domain (if using Render blueprint)
- Or configure `API_BASE` manually if domains differ.

## Troubleshooting

- **CORS Errors**: Check `CORS_ORIGINS` includes your frontend domain (no trailing slash)
- **AI Errors**: Verification `ANTHROPIC_API_KEY` is set in production
- **Health Check**: Visit `/health` to verify backend status
