"""
Pytest configuration and fixtures for backend tests
"""
import os
import pytest
import tempfile
from app import create_app
from database.auth import init_auth_db


@pytest.fixture(scope='function')
def app():
    """Create and configure a test app instance"""
    # Use a temporary database for testing
    db_fd, db_path = tempfile.mkstemp()
    
    # Override config for testing
    test_config = {
        'TESTING': True,
        'SECRET_KEY': 'test-secret-key',
        'AUTH_DB_PATH': db_path,
        'DATABASE_URL': None,  # Force SQLite for tests
        'ANTHROPIC_API_KEY': 'test-api-key',
        'RATE_LIMIT_ENABLED': False  # Disable rate limiting in tests
    }
    
    # Temporarily override environment to prevent DATABASE_URL from being used
    old_db_url = os.environ.get('DATABASE_URL')
    if 'DATABASE_URL' in os.environ:
        del os.environ['DATABASE_URL']
    
    app = create_app('development')
    app.config.update(test_config)
    
    # Initialize the database
    with app.app_context():
        init_auth_db()
    
    yield app
    
    # Cleanup
    if old_db_url:
        os.environ['DATABASE_URL'] = old_db_url
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    """Create a test client for the app"""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create a test CLI runner"""
    return app.test_cli_runner()


@pytest.fixture
def auth_headers(client):
    """Create a logged-in session and return headers"""
    # Register and login a test user
    client.post('/api/auth/register', json={
        'username': 'testuser',
        'pin': '1234'
    })
    
    response = client.post('/api/auth/login', json={
        'username': 'testuser',
        'pin': '1234'
    })
    
    # Return client with authenticated session
    return client
