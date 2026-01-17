"""
Tests for authentication routes
"""
import pytest


def test_register_success(client):
    """Test successful user registration"""
    response = client.post('/api/auth/register', json={
        'username': 'newuser',
        'pin': '5678'
    })
    
    assert response.status_code == 201
    data = response.get_json()
    assert data['success'] is True
    assert data['user']['username'] == 'newuser'
    assert 'id' in data['user']


def test_register_duplicate(client):
    """Test registration with duplicate username"""
    # Register first user
    client.post('/api/auth/register', json={
        'username': 'duplicate',
        'pin': '1234'
    })
    
    # Try to register again
    response = client.post('/api/auth/register', json={
        'username': 'duplicate',
        'pin': '5678'
    })
    
    assert response.status_code == 409
    data = response.get_json()
    assert 'error' in data


def test_register_invalid_pin(client):
    """Test registration with invalid PIN format"""
    # Too short
    response = client.post('/api/auth/register', json={
        'username': 'user1',
        'pin': '123'
    })
    assert response.status_code == 400
    
    # Too long
    response = client.post('/api/auth/register', json={
        'username': 'user2',
        'pin': '1234567'
    })
    assert response.status_code == 400
    
    # Non-numeric
    response = client.post('/api/auth/register', json={
        'username': 'user3',
        'pin': 'abcd'
    })
    assert response.status_code == 400


def test_register_invalid_username(client):
    """Test registration with invalid username"""
    # Too short
    response = client.post('/api/auth/register', json={
        'username': 'ab',
        'pin': '1234'
    })
    assert response.status_code == 400
    
    # Too long
    response = client.post('/api/auth/register', json={
        'username': 'a' * 21,
        'pin': '1234'
    })
    assert response.status_code == 400


def test_login_success(client):
    """Test successful login"""
    # Register user
    client.post('/api/auth/register', json={
        'username': 'loginuser',
        'pin': '1234'
    })
    
    # Login
    response = client.post('/api/auth/login', json={
        'username': 'loginuser',
        'pin': '1234'
    })
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['user']['username'] == 'loginuser'


def test_login_invalid_credentials(client):
    """Test login with invalid credentials"""
    # Register user
    client.post('/api/auth/register', json={
        'username': 'validuser',
        'pin': '1234'
    })
    
    # Wrong PIN
    response = client.post('/api/auth/login', json={
        'username': 'validuser',
        'pin': '9999'
    })
    assert response.status_code == 401
    
    # Wrong username
    response = client.post('/api/auth/login', json={
        'username': 'wronguser',
        'pin': '1234'
    })
    assert response.status_code == 401


def test_logout(client):
    """Test logout"""
    # Register and login
    client.post('/api/auth/register', json={
        'username': 'logoutuser',
        'pin': '1234'
    })
    client.post('/api/auth/login', json={
        'username': 'logoutuser',
        'pin': '1234'
    })
    
    # Logout
    response = client.post('/api/auth/logout')
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_status_authenticated(client):
    """Test status endpoint when authenticated"""
    # Register and login
    client.post('/api/auth/register', json={
        'username': 'statususer',
        'pin': '1234'
    })
    client.post('/api/auth/login', json={
        'username': 'statususer',
        'pin': '1234'
    })
    
    # Check status
    response = client.get('/api/auth/status')
    assert response.status_code == 200
    data = response.get_json()
    assert data['authenticated'] is True
    assert data['user']['username'] == 'statususer'


def test_status_unauthenticated(client):
    """Test status endpoint when not authenticated"""
    response = client.get('/api/auth/status')
    assert response.status_code == 200
    data = response.get_json()
    assert data['authenticated'] is False
