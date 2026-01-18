"""
Authentication Database Module
Handles user storage and authentication with PIN
Supports both SQLite (development) and PostgreSQL (production)
"""
import os
from datetime import datetime
from urllib.parse import urlparse
from werkzeug.security import generate_password_hash, check_password_hash
from typing import Optional, Dict
from flask import current_app


class User:
    """User model for Flask-Login"""
    def __init__(self, user_id: int, username: str):
        self.id = user_id
        self.username = username
        self.is_authenticated = True
        self.is_active = True
        self.is_anonymous = False
    
    def get_id(self):
        return str(self.id)


def _get_database_url() -> Optional[str]:
    """Get DATABASE_URL from config or environment"""
    try:
        return current_app.config.get('DATABASE_URL')
    except RuntimeError:
        # Outside of application context
        return os.environ.get('DATABASE_URL')


def _is_postgres() -> bool:
    """Check if using PostgreSQL"""
    db_url = _get_database_url()
    return db_url is not None and ('postgres' in db_url)


def _get_sqlite_path() -> str:
    """Get the SQLite database file path"""
    try:
        # Try to get path from app config (for testing)
        path = current_app.config.get('AUTH_DB_PATH')
        if path:
            return path
    except RuntimeError:
        # Outside of application context
        pass
    
    # Default path for development
    db_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
    os.makedirs(db_dir, exist_ok=True)
    return os.path.join(db_dir, 'auth.db')


def _get_connection():
    """Get database connection based on environment"""
    if _is_postgres():
        import psycopg2
        db_url = _get_database_url()
        # Handle Render's postgres:// vs postgresql:// URL format
        if db_url.startswith('postgres://'):
            db_url = db_url.replace('postgres://', 'postgresql://', 1)
        return psycopg2.connect(db_url)
    else:
        import sqlite3
        return sqlite3.connect(_get_sqlite_path())


def _get_placeholder() -> str:
    """Get SQL placeholder based on database type"""
    return '%s' if _is_postgres() else '?'


def init_auth_db():
    """Initialize the authentication database"""
    conn = _get_connection()
    cursor = conn.cursor()
    
    if _is_postgres():
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                pin_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        ''')
    else:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                pin_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        ''')
    
    conn.commit()
    conn.close()
    
    db_type = 'PostgreSQL' if _is_postgres() else 'SQLite'
    print(f"Auth database initialized ({db_type})")


def create_user(username: str, pin: str) -> Optional[Dict]:
    """
    Create a new user with username and PIN
    
    Args:
        username: Unique username (alphanumeric)
        pin: 4-6 digit PIN
    
    Returns:
        User dict if successful, None if username already exists
    """
    # Validate PIN format
    if not pin.isdigit() or len(pin) < 4 or len(pin) > 6:
        raise ValueError("PIN must be 4-6 digits")
    
    # Validate username
    if not username.replace('_', '').replace('-', '').isalnum():
        raise ValueError("Username must be alphanumeric (with optional _ or -)")
    
    if len(username) < 3 or len(username) > 20:
        raise ValueError("Username must be 3-20 characters")
    
    conn = _get_connection()
    cursor = conn.cursor()
    ph = _get_placeholder()
    
    try:
        pin_hash = generate_password_hash(pin, method='pbkdf2:sha256')
        created_at = datetime.utcnow().isoformat()
        
        if _is_postgres():
            cursor.execute(
                f'INSERT INTO users (username, pin_hash, created_at) VALUES ({ph}, {ph}, {ph}) RETURNING id',
                (username, pin_hash, created_at)
            )
            user_id = cursor.fetchone()[0]
        else:
            cursor.execute(
                f'INSERT INTO users (username, pin_hash, created_at) VALUES ({ph}, {ph}, {ph})',
                (username, pin_hash, created_at)
            )
            user_id = cursor.lastrowid
        
        conn.commit()
        
        return {
            'id': user_id,
            'username': username,
            'created_at': created_at
        }
    except Exception as e:
        # Username already exists or other error
        conn.rollback()
        if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
            return None
        raise
    finally:
        conn.close()


def verify_user(username: str, pin: str) -> Optional[User]:
    """
    Verify user credentials
    
    Args:
        username: Username to verify
        pin: PIN to verify
    
    Returns:
        User object if credentials are valid, None otherwise
    """
    conn = _get_connection()
    cursor = conn.cursor()
    ph = _get_placeholder()
    
    cursor.execute(
        f'SELECT id, username, pin_hash FROM users WHERE username = {ph}',
        (username,)
    )
    row = cursor.fetchone()
    conn.close()
    
    if row and check_password_hash(row[2], pin):
        return User(user_id=row[0], username=row[1])
    
    return None


def get_user_by_id(user_id: int) -> Optional[User]:
    """
    Get user by ID (for Flask-Login user_loader)
    
    Args:
        user_id: User ID
    
    Returns:
        User object if found, None otherwise
    """
    conn = _get_connection()
    cursor = conn.cursor()
    ph = _get_placeholder()
    
    cursor.execute(
        f'SELECT id, username FROM users WHERE id = {ph}',
        (user_id,)
    )
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return User(user_id=row[0], username=row[1])
    
    return None
