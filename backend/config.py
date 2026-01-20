"""
Configuration for AI Journal Flask Backend
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database - PostgreSQL in production, SQLite in development
    DATABASE_URL = os.environ.get('DATABASE_URL')
    
    # CORS settings
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:8420').split(',')
    
    # Ollama LLM Settings
    OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434')
    OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'phi3:mini')
    OLLAMA_TIMEOUT = int(os.environ.get('OLLAMA_TIMEOUT', '60'))
    OLLAMA_MAX_RETRIES = int(os.environ.get('OLLAMA_MAX_RETRIES', '3'))
    OLLAMA_RETRY_DELAY = float(os.environ.get('OLLAMA_RETRY_DELAY', '1.0'))
    
    # Anthropic API (legacy, not used with Ollama)
    ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
    ANTHROPIC_MODEL = os.environ.get('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')
    
    # Rate limiting
    RATE_LIMIT_ENABLED = os.environ.get('RATE_LIMIT_ENABLED', 'True').lower() == 'true'
    MAX_REQUESTS_PER_HOUR = int(os.environ.get('MAX_REQUESTS_PER_HOUR', '50'))
    
    # AI prompting settings
    MAX_PROMPT_TOKENS = int(os.environ.get('MAX_PROMPT_TOKENS', '1000'))
    MAX_RESPONSE_TOKENS = int(os.environ.get('MAX_RESPONSE_TOKENS', '500'))
    
    # Authentication
    AUTH_DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'auth.db')
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 86400  # 24 hours in seconds

    # Development-specific CORS (allow all origins for LAN testing)
    ALLOW_ALL_ORIGINS = os.environ.get('ALLOW_ALL_ORIGINS', 'False').lower() == 'true'


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    SESSION_COOKIE_SECURE = False  # Allow HTTP in development


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = True  # Require HTTPS in production
    SESSION_COOKIE_SAMESITE = 'None'  # Cross-site cookies for API


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

