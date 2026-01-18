"""
Tests for database module
"""
import pytest
from database.auth import create_user, verify_user, get_user_by_id


def test_create_user(app):
    """Test creating a new user"""
    with app.app_context():
        result = create_user('dbuser', '1234')
        
        assert result is not None
        assert result['username'] == 'dbuser'
        assert 'id' in result
        assert 'created_at' in result


def test_create_duplicate_user(app):
    """Test creating duplicate user returns None"""
    with app.app_context():
        create_user('duplicate', '1234')
        result = create_user('duplicate', '5678')
        
        assert result is None


def test_create_user_invalid_pin(app):
    """Test creating user with invalid PIN raises ValueError"""
    with app.app_context():
        # Too short
        with pytest.raises(ValueError, match='4-6 digits'):
            create_user('user1', '123')
        
        # Too long
        with pytest.raises(ValueError, match='4-6 digits'):
            create_user('user2', '1234567')
        
        # Non-numeric
        with pytest.raises(ValueError, match='4-6 digits'):
            create_user('user3', 'abcd')


def test_create_user_invalid_username(app):
    """Test creating user with invalid username raises ValueError"""
    with app.app_context():
        # Too short
        with pytest.raises(ValueError, match='3-20 characters'):
            create_user('ab', '1234')
        
        # Too long
        with pytest.raises(ValueError, match='3-20 characters'):
            create_user('a' * 21, '1234')
        
        # Invalid characters
        with pytest.raises(ValueError, match='alphanumeric'):
            create_user('user@name', '1234')


def test_verify_user_valid(app):
    """Test verifying user with valid credentials"""
    with app.app_context():
        create_user('verifyuser', '1234')
        user = verify_user('verifyuser', '1234')
        
        assert user is not None
        assert user.username == 'verifyuser'
        assert user.is_authenticated is True


def test_verify_user_invalid_pin(app):
    """Test verifying user with invalid PIN"""
    with app.app_context():
        create_user('pinuser', '1234')
        user = verify_user('pinuser', '9999')
        
        assert user is None


def test_verify_user_nonexistent(app):
    """Test verifying nonexistent user"""
    with app.app_context():
        user = verify_user('nonexistent', '1234')
        
        assert user is None


def test_get_user_by_id(app):
    """Test getting user by ID"""
    with app.app_context():
        result = create_user('iduser', '1234')
        user = get_user_by_id(result['id'])
        
        assert user is not None
        assert user.id == result['id']
        assert user.username == 'iduser'


def test_get_user_by_invalid_id(app):
    """Test getting user with invalid ID"""
    with app.app_context():
        user = get_user_by_id(99999)
        
        assert user is None
