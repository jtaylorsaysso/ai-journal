"""
Integration test for entry management flow
Tests creating, editing, and deleting journal entries
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
    
    time.sleep(2)
    yield
    
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
def authenticated_page(browser, backend_server):
    """Create authenticated session"""
    context = browser.new_context()
    page = context.new_page()
    
    # Register and login
    page.goto('http://localhost:8080')
    page.fill('input[name="username"]', f'testuser{int(time.time())}')
    page.fill('input[name="pin"]', '1234')
    page.click('button:has-text("Register")')
    
    # Wait for main view
    expect(page.locator('#entry-list-view')).to_be_visible(timeout=5000)
    
    yield page
    
    context.close()


def test_create_entry(authenticated_page):
    """Test creating a new journal entry"""
    page = authenticated_page
    
    # Click new entry button
    page.click('button:has-text("New Entry")')
    
    # Should show editor
    expect(page.locator('#editor-view')).to_be_visible()
    
    # Select mood
    page.click('[data-mood="4"]')
    
    # Write content
    page.fill('textarea[name="content"]', 'This is my test journal entry')
    
    # Save
    page.click('button:has-text("Save")')
    
    # Should return to list view
    expect(page.locator('#entry-list-view')).to_be_visible(timeout=5000)
    
    # Entry should appear in list
    expect(page.locator('.entry-card')).to_be_visible()


def test_edit_entry(authenticated_page):
    """Test editing an existing entry"""
    page = authenticated_page
    
    # Create entry first
    page.click('button:has-text("New Entry")')
    page.click('[data-mood="3"]')
    page.fill('textarea[name="content"]', 'Original content')
    page.click('button:has-text("Save")')
    
    # Wait for list
    expect(page.locator('#entry-list-view')).to_be_visible(timeout=5000)
    
    # Click on entry to view
    page.click('.entry-card')
    
    # Click edit
    page.click('button:has-text("Edit")')
    
    # Modify content
    page.fill('textarea[name="content"]', 'Updated content')
    
    # Save
    page.click('button:has-text("Save")')
    
    # Verify update
    expect(page.locator('#entry-list-view')).to_be_visible(timeout=5000)


def test_delete_entry(authenticated_page):
    """Test deleting an entry"""
    page = authenticated_page
    
    # Create entry
    page.click('button:has-text("New Entry")')
    page.click('[data-mood="2"]')
    page.fill('textarea[name="content"]', 'Entry to delete')
    page.click('button:has-text("Save")')
    
    # Wait for list
    expect(page.locator('#entry-list-view')).to_be_visible(timeout=5000)
    
    # Click on entry
    page.click('.entry-card')
    
    # Delete
    page.click('button:has-text("Delete")')
    
    # Confirm deletion (if there's a confirmation dialog)
    # page.click('button:has-text("Confirm")')
    
    # Should return to list
    expect(page.locator('#entry-list-view')).to_be_visible(timeout=5000)
