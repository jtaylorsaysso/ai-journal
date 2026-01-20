"""
Tests for AI routes (with mocked Ollama LLM)
"""
import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture
def mock_llm():
    """Mock LLM client"""
    with patch('routes.ai.get_llm_client') as mock:
        client = MagicMock()
        mock.return_value = client
        
        # Mock simple text generation
        client.generate.return_value = 'Mocked AI response'
        
        yield client


def test_prompt_requires_auth(client):
    """Test that prompt endpoint requires authentication"""
    response = client.post('/api/ai/prompt', json={
        'mood': 3
    })
    assert response.status_code == 401


def test_prompt_success(auth_headers, mock_llm):
    """Test successful prompt generation"""
    response = auth_headers.post('/api/ai/prompt', json={
        'mood': 3,
        'current_text': 'I have been thinking about...'
    })
    
    assert response.status_code == 200
    data = response.get_json()
    assert 'prompt' in data
    assert data['prompt'] == 'Mocked AI response'


def test_prompt_with_recent_entries(auth_headers, mock_llm):
    """Test prompt with recent entries context"""
    response = auth_headers.post('/api/ai/prompt', json={
        'mood': 2,
        'recent_entries': ['work stress', 'sleep issues']
    })
    
    assert response.status_code == 200
    data = response.get_json()
    assert 'prompt' in data


def test_analyze_requires_auth(client):
    """Test that analyze endpoint requires authentication"""
    response = client.post('/api/ai/analyze', json={
        'content': 'Test entry content'
    })
    assert response.status_code == 401


def test_analyze_success(auth_headers, mock_llm):
    """Test successful entry analysis"""
    # Mock JSON response
    mock_llm.generate.return_value = '''{
        "reflection": "You seem thoughtful today",
        "themes": ["reflection", "growth"],
        "follow_up": "What would help you move forward?",
        "crisis_detected": false
    }'''
    
    response = auth_headers.post('/api/ai/analyze', json={
        'content': 'Today was a challenging day but I learned a lot.',
        'mood': 3
    })
    
    assert response.status_code == 200
    data = response.get_json()
    assert 'analysis' in data
    assert 'reflection' in data['analysis']


def test_analyze_short_content(auth_headers):
    """Test analysis with too-short content"""
    response = auth_headers.post('/api/ai/analyze', json={
        'content': 'Short'
    })
    
    assert response.status_code == 400
    data = response.get_json()
    assert 'error' in data


def test_patterns_requires_auth(client):
    """Test that patterns endpoint requires authentication"""
    response = client.post('/api/ai/patterns', json={
        'entries': []
    })
    assert response.status_code == 401


def test_patterns_requires_minimum_entries(auth_headers):
    """Test patterns with insufficient entries"""
    response = auth_headers.post('/api/ai/patterns', json={
        'entries': [
            {'content': 'Entry 1', 'mood': 3, 'date': '2026-01-15'}
        ]
    })
    
    assert response.status_code == 400
    data = response.get_json()
    assert 'error' in data


def test_patterns_success(auth_headers, mock_llm):
    """Test successful pattern analysis"""
    # Mock JSON response
    mock_llm.generate.return_value = '''{
        "mood_trend": "improving",
        "themes": ["work", "relationships"],
        "positive_patterns": ["regular exercise"],
        "suggestions": ["continue journaling"]
    }'''
    
    response = auth_headers.post('/api/ai/patterns', json={
        'entries': [
            {'content': 'Entry 1', 'mood': 3, 'date': '2026-01-15'},
            {'content': 'Entry 2', 'mood': 4, 'date': '2026-01-16'},
            {'content': 'Entry 3', 'mood': 4, 'date': '2026-01-17'}
        ]
    })
    
    assert response.status_code == 200
    data = response.get_json()
    assert 'patterns' in data
    assert 'mood_trend' in data['patterns']
