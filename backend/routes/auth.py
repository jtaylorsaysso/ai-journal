"""
Authentication Routes
Handles user registration, login, logout, and status checks
"""
from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from database.auth import create_user, verify_user


auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username', '').strip()
    pin = data.get('pin', '').strip()
    
    if not username or not pin:
        return jsonify({'error': 'Username and PIN are required'}), 400
    
    try:
        user_data = create_user(username, pin)
        
        if user_data is None:
            return jsonify({'error': 'Username already exists'}), 409
        
        # Auto-login after registration
        user = verify_user(username, pin)
        if user:
            login_user(user, remember=True)
            session.permanent = True
        
        return jsonify({
            'success': True,
            'user': {
                'id': user_data['id'],
                'username': user_data['username']
            }
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': 'Registration failed'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login with username and PIN"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username', '').strip()
    pin = data.get('pin', '').strip()
    
    if not username or not pin:
        return jsonify({'error': 'Username and PIN are required'}), 400
    
    user = verify_user(username, pin)
    
    if user is None:
        return jsonify({'error': 'Invalid username or PIN'}), 401
    
    login_user(user, remember=True)
    session.permanent = True
    
    return jsonify({
        'success': True,
        'user': {
            'id': user.id,
            'username': user.username
        }
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout current user"""
    logout_user()
    return jsonify({'success': True}), 200


@auth_bp.route('/status', methods=['GET'])
def status():
    """Check authentication status"""
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username
            }
        }), 200
    else:
        return jsonify({'authenticated': False}), 200
