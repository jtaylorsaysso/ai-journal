"""
AI Integration Routes - Claude API for prompting and analysis
"""
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required
from anthropic import Anthropic
from functools import wraps
import time

ai_bp = Blueprint('ai', __name__)

# Simple in-memory rate limiting (for production, use Redis)
request_counts = {}


def rate_limit(f):
    """Rate limiting decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_app.config['RATE_LIMIT_ENABLED']:
            return f(*args, **kwargs)
        
        # Simple IP-based rate limiting
        client_ip = request.remote_addr
        current_time = time.time()
        hour_ago = current_time - 3600
        
        # Clean old entries
        if client_ip in request_counts:
            request_counts[client_ip] = [t for t in request_counts[client_ip] if t > hour_ago]
        else:
            request_counts[client_ip] = []
        
        # Check limit
        if len(request_counts[client_ip]) >= current_app.config['MAX_REQUESTS_PER_HOUR']:
            return jsonify({'error': 'Rate limit exceeded. Please try again later.'}), 429
        
        # Record request
        request_counts[client_ip].append(current_time)
        
        return f(*args, **kwargs)
    return decorated_function


def get_anthropic_client():
    """Get configured Anthropic client"""
    api_key = current_app.config['ANTHROPIC_API_KEY']
    if not api_key:
        raise ValueError('ANTHROPIC_API_KEY not configured')
    return Anthropic(api_key=api_key)


@ai_bp.route('/prompt', methods=['POST'])
@login_required
@rate_limit
def get_prompt():
    """
    Generate AI-assisted journaling prompt based on context
    
    Request body:
    {
        "mood": 1-5 (optional),
        "recent_entries": ["entry1", "entry2"] (optional, max 3),
        "current_text": "partial entry text" (optional)
    }
    """
    try:
        data = request.get_json()
        mood = data.get('mood')
        recent_entries = data.get('recent_entries', [])[:3]  # Limit to 3
        current_text = data.get('current_text', '')
        
        # Build context for Claude
        system_prompt = """You are a compassionate journaling assistant. Your role is to:
- Ask thoughtful, open-ended questions that encourage self-reflection
- Use evidence-based techniques from CBT and positive psychology
- Be supportive but not directive
- Never diagnose or give medical advice
- Encourage seeking professional help when appropriate

Respond with a single, thoughtful prompt or question (1-2 sentences max)."""
        
        user_context = "Generate a journaling prompt"
        
        if mood:
            mood_labels = {1: "very low", 2: "low", 3: "neutral", 4: "good", 5: "very good"}
            user_context += f" for someone feeling {mood_labels.get(mood, 'neutral')}"
        
        if current_text:
            user_context += f". They've started writing: \"{current_text[:200]}...\""
        
        if recent_entries:
            user_context += f". Recent themes: {', '.join(recent_entries[:2])}"
        
        # Call Claude API
        client = get_anthropic_client()
        message = client.messages.create(
            model=current_app.config['ANTHROPIC_MODEL'],
            max_tokens=current_app.config['MAX_RESPONSE_TOKENS'],
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_context}
            ]
        )
        
        prompt_text = message.content[0].text
        
        return jsonify({
            'prompt': prompt_text,
            'usage': {
                'input_tokens': message.usage.input_tokens,
                'output_tokens': message.usage.output_tokens
            }
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        current_app.logger.error(f'Error generating prompt: {str(e)}')
        return jsonify({'error': 'Failed to generate prompt'}), 500


@ai_bp.route('/analyze', methods=['POST'])
@login_required
@rate_limit
def analyze_entry():
    """
    Analyze a journal entry for patterns and insights
    
    Request body:
    {
        "content": "journal entry text",
        "mood": 1-5 (optional)
    }
    """
    try:
        data = request.get_json()
        content = data.get('content', '')
        mood = data.get('mood')
        
        if not content or len(content.strip()) < 10:
            return jsonify({'error': 'Entry content too short for analysis'}), 400
        
        # Limit content length
        content = content[:2000]
        
        system_prompt = """You are a compassionate journaling assistant analyzing journal entries. Provide:
1. A brief, supportive reflection (2-3 sentences)
2. Identify 1-2 themes or patterns
3. Suggest a gentle follow-up question

Be warm and non-judgmental. Never diagnose. If you detect crisis language, respond with empathy and encourage professional help.

Format your response as JSON:
{
    "reflection": "your supportive reflection",
    "themes": ["theme1", "theme2"],
    "follow_up": "a gentle question",
    "crisis_detected": false
}"""
        
        user_message = f"Analyze this journal entry:\n\n{content}"
        if mood:
            user_message += f"\n\nReported mood: {mood}/5"
        
        # Call Claude API
        client = get_anthropic_client()
        message = client.messages.create(
            model=current_app.config['ANTHROPIC_MODEL'],
            max_tokens=current_app.config['MAX_RESPONSE_TOKENS'],
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_message}
            ]
        )
        
        # Parse response
        import json
        try:
            analysis = json.loads(message.content[0].text)
        except json.JSONDecodeError:
            # Fallback if Claude doesn't return valid JSON
            analysis = {
                "reflection": message.content[0].text,
                "themes": [],
                "follow_up": "",
                "crisis_detected": False
            }
        
        return jsonify({
            'analysis': analysis,
            'usage': {
                'input_tokens': message.usage.input_tokens,
                'output_tokens': message.usage.output_tokens
            }
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        current_app.logger.error(f'Error analyzing entry: {str(e)}')
        return jsonify({'error': 'Failed to analyze entry'}), 500


@ai_bp.route('/patterns', methods=['POST'])
@login_required
@rate_limit
def analyze_patterns():
    """
    Analyze patterns across multiple entries
    
    Request body:
    {
        "entries": [
            {"content": "text", "mood": 1-5, "date": "ISO date"},
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        entries = data.get('entries', [])
        
        if len(entries) < 3:
            return jsonify({'error': 'Need at least 3 entries for pattern analysis'}), 400
        
        # Limit to last 10 entries
        entries = entries[-10:]
        
        # Build summary for Claude
        entry_summaries = []
        for i, entry in enumerate(entries, 1):
            summary = f"Entry {i} (mood: {entry.get('mood', 'N/A')}/5): {entry['content'][:150]}..."
            entry_summaries.append(summary)
        
        system_prompt = """You are analyzing journal entries to identify helpful patterns. Provide:
1. Overall mood trend (improving/stable/declining)
2. 2-3 recurring themes or topics
3. Positive patterns to reinforce
4. Gentle suggestions for growth

Be encouraging and constructive. Focus on strengths and progress.

Format as JSON:
{
    "mood_trend": "description",
    "themes": ["theme1", "theme2"],
    "positive_patterns": ["pattern1"],
    "suggestions": ["suggestion1"]
}"""
        
        user_message = "Analyze these journal entries for patterns:\n\n" + "\n\n".join(entry_summaries)
        
        # Call Claude API
        client = get_anthropic_client()
        message = client.messages.create(
            model=current_app.config['ANTHROPIC_MODEL'],
            max_tokens=current_app.config['MAX_RESPONSE_TOKENS'],
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_message}
            ]
        )
        
        # Parse response
        import json
        try:
            patterns = json.loads(message.content[0].text)
        except json.JSONDecodeError:
            patterns = {
                "mood_trend": "Unable to determine",
                "themes": [],
                "positive_patterns": [],
                "suggestions": []
            }
        
        return jsonify({
            'patterns': patterns,
            'usage': {
                'input_tokens': message.usage.input_tokens,
                'output_tokens': message.usage.output_tokens
            }
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        current_app.logger.error(f'Error analyzing patterns: {str(e)}')
        return jsonify({'error': 'Failed to analyze patterns'}), 500
