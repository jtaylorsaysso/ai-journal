"""
Integration test for authentication flow
Tests the full user journey: register -> login -> logout
"""
import pytest
import subprocess
import time
from playwright.sync_api import sync_playwright, expect


@pytest.fixture(scope='module')
def backend_server():
    """Start backend server for integration tests"""
    process = subprocess.Popen(
        ['python', 'app.py'],
        cwd='../backend',
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Wait for server to start
    time.sleep(2)
    
    yield
    
    # Cleanup
    process.terminate()
    process.wait()


@pytest.fixture(scope='module')
def browser():
    """Create browser instance"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        yield browser
        browser.close()


@pytest.fixture
def page(browser):
    """Create new page for each test"""
    context = browser.new_context()
    page = context.new_page()
    yield page
    context.close()


def test_registration_flow(backend_server, page):
    """Test user registration"""
    # Navigate to app
    page.goto('http://localhost:8080')
    
    # Should show auth view
    expect(page.locator('#auth-view')).to_be_visible()
    
    # Fill registration form
    page.fill('input[name="username"]', 'testuser123')
    page.fill('input[name="pin"]', '1234')
    
    # Click register
    page.click('button:has-text("Register")')
    
    # Should redirect to main app
    expect(page.locator('#entry-list-view')).to_be_visible(timeout=5000)


def test_login_flow(backend_server, page):
    """Test user login with existing account"""
    # First register a user
    page.goto('http://localhost:8080')
    page.fill('input[name="username"]', 'logintest')
    page.fill('input[name="pin"]', '5678')
    page.click('button:has-text("Register")')
    
    # Wait for redirect
    time.sleep(1)
    
    # Logout
    page.click('button:has-text("Logout")')
    
    # Should be back at auth view
    expect(page.locator('#auth-view')).to_be_visible()
    
    # Login with same credentials
    page.fill('input[name="username"]', 'logintest')
    page.fill('input[name="pin"]', '5678')
    page.click('button:has-text("Login")')
    
    # Should be logged in
    expect(page.locator('#entry-list-view')).to_be_visible(timeout=5000)


def test_logout_flow(backend_server, page):
    """Test logout functionality"""
    # Register and login
    page.goto('http://localhost:8080')
    page.fill('input[name="username"]', 'logouttest')
    page.fill('input[name="pin"]', '9999')
    page.click('button:has-text("Register")')
    
    # Wait for main view
    expect(page.locator('#entry-list-view')).to_be_visible(timeout=5000)
    
    # Logout
    page.click('button:has-text("Logout")')
    
    # Should return to auth view
    expect(page.locator('#auth-view')).to_be_visible()


def test_invalid_login(backend_server, page):
    """Test login with invalid credentials"""
    page.goto('http://localhost:8080')
    
    # Try to login with non-existent user
    page.fill('input[name="username"]', 'nonexistent')
    page.fill('input[name="pin"]', '0000')
    page.click('button:has-text("Login")')
    
    # Should show error (stay on auth view)
    expect(page.locator('#auth-view')).to_be_visible()
