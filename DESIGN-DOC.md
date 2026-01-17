# AI-Assisted Journaling App - Technical Design Document

## Project Overview

**Purpose:** Build a secure, AI-assisted journaling application for mental health support, initially as a local prototype for one user, with potential to scale responsibly.

**Core Principle:** First, do no harm.

**Key Requirements:**

- Mobile-first design (primary usage on phone)
- Strong privacy and security (client-side encryption)
- Offline-capable
- AI-assisted prompts and reflection
- Easy data export/backup
- Simple, distraction-free interface

---

## Architecture Overview

### Technology Stack

**Frontend (PWA):**

- Progressive Web App (installable, offline-capable)
- Vanilla JavaScript + Tailwind CSS (or React if preferred)
- IndexedDB for local encrypted storage
- Web Crypto API for client-side encryption
- Service Worker (via Workbox) for offline support

**Backend (Flask API):**

- Python Flask for API endpoints
- Handles AI/LLM integration
- Stores encrypted entry backups (sync functionality)
- No access to plaintext user data

**AI Integration:**

- Anthropic Claude API (Sonnet 4.5)
- Server-side LLM calls (entries sent for analysis only when user explicitly requests)
- Contextual prompting based on mood and entry content

**Storage:**

- Client: IndexedDB (encrypted entries on user's device)
- Server: SQLCipher or encrypted blob storage (backup sync only)

---

## Data Flow Architecture

```
User's Phone (PWA):
├── UI Layer (journaling interface)
├── Service Worker (offline support, caching)
├── IndexedDB (encrypted local storage)
│   └── Encryption key stored in browser's secure storage
├── Web Crypto API (encrypt/decrypt operations)
└── Sync Logic (optional server sync when online)

Flask Backend:
├── REST API endpoints
├── Encrypted blob storage (server can't decrypt)
├── LLM integration endpoint (receives plaintext only when user requests AI features)
└── Rate limiting and basic auth
```

### Encryption Model

**Client-Side Encryption (Primary):**

1. Encryption key generated on first use, stored in browser's IndexedDB (persistent)
2. All entries encrypted locally before storage
3. Key never leaves user's device
4. Optional: Derive key from user passphrase for additional security

**Server Sync (Optional):**

1. Encrypted entries synced to Flask backend
2. Server stores encrypted blobs it cannot decrypt
3. Allows multi-device access (future feature)
4. User can disable sync for fully local-only operation

---

## Core Features

### Phase 1: MVP (Prototype)

#### 1. Basic Journaling

- Simple, clean text input interface
- Timestamp each entry automatically
- Save entries locally (encrypted)
- View entry history (chronological, searchable)
- Edit/delete existing entries

#### 2. AI-Assisted Prompting

- Mood check-in at entry start (optional)
- Context-aware prompts based on:
  - Current mood
  - Entry content so far
  - Patterns from previous entries
- User explicitly triggers AI features (not automatic)

#### 3. Pattern Recognition

- Simple client-side text analysis:
  - Word frequency tracking
  - Mood trends over time
  - Common themes/topics
- Optional server-side LLM analysis (user-initiated)

#### 4. Data Export/Backup

- Export all entries as JSON or plaintext
- User controls export frequency
- Monthly reminder to backup (configurable)
- Import functionality for data restoration

#### 5. Offline Support

- Full functionality without internet
- Background sync when connection available
- Clear offline/online status indicators

### Phase 2: Enhanced Features (If Scaling)

- Multi-device sync
- User accounts and authentication
- Therapist sharing (encrypted export to share with professional)
- Advanced pattern recognition
- Goal tracking
- Customizable themes/appearance
- Scheduled reflection prompts

---

## Security Implementation

### Client-Side Security

**Encryption:**

```javascript
// Entry encryption example
async function encryptEntry(plaintext, key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  
  return {
    ciphertext: encryptedData,
    iv: iv
  };
}
```

**Key Management:**

- Generate 256-bit AES key on first use
- Store in IndexedDB (persistent across sessions)
- Optional: Derive from user passphrase using PBKDF2
- Key never transmitted to server

**Storage Security:**

- All entries encrypted before IndexedDB storage
- Metadata (timestamps, mood tags) can be plaintext for indexing
- Entry content always encrypted

### Server-Side Security

**API Security:**

- HTTPS only (required for PWA)
- Simple authentication for prototype (password/PIN)
- Rate limiting on AI endpoints (prevent abuse/cost overruns)
- CORS restrictions
- Input validation on all endpoints

**Data Storage:**

- Server stores only encrypted blobs (if sync enabled)
- No plaintext entry content on server
- Audit logs for data access (future compliance requirement)

**LLM Integration:**

- Entries sent to Claude API only when user explicitly requests
- API key stored server-side only (never in client code)
- Rate limiting per user
- Clear user notification when data leaves device

---

## AI Integration Strategy

### Prompting Approach

**Evidence-Based Techniques:**

- Cognitive Behavioral Therapy (CBT) style questions
- Gratitude prompts when user reports low mood
- Cognitive reappraisal questions (reframing thoughts)
- Self-compassion exercises
- Pattern reflection ("I notice you've mentioned X several times...")

**Prompt Categories:**

1. **Mood-Sensitive Prompts:**
   - Low mood → gratitude, self-compassion focus
   - Anxious → grounding, present-moment awareness
   - Neutral → open exploration, reflection

2. **Content-Aware Prompts:**
   - Detect themes (work stress, relationships, health)
   - Ask follow-up questions specific to theme
   - Encourage deeper exploration

3. **Pattern Recognition:**
   - "Over the past week, you've mentioned sleep issues. How has that been affecting you?"
   - Gentle observation, not diagnosis

### AI Boundaries

**What AI Should NOT Do:**

- Diagnose mental health conditions
- Give medical advice
- Make confident claims about user's mental state
- Encourage harmful behaviors
- Replace professional therapy

**What AI SHOULD Do:**

- Ask thoughtful questions
- Encourage self-reflection
- Help identify patterns
- Provide supportive prompts
- Normalize seeking professional help

**Crisis Detection:**

- If entry suggests self-harm or crisis, provide resources:
  - Crisis hotline numbers
  - Encouragement to reach out to trusted person
  - Emergency services information
- Do NOT attempt AI intervention in crisis

---

## User Interface Design

### Core Principles

- **Minimal and calming:** Reduce cognitive load
- **Distraction-free:** Focus on writing, not features
- **Mobile-optimized:** Thumb-friendly tap targets
- **Accessible:** Good contrast, readable fonts, clear navigation
- **Fast:** Instant load, no waiting for "AI to think"

### Key Screens

1. **Entry Screen (Primary):**
   - Large text input area
   - Mood selector (optional, dismissible)
   - AI prompt suggestions (non-intrusive, expandable)
   - Save/Cancel actions
   - Character/word count (optional)

2. **History View:**
   - Chronological list of entries
   - Search functionality
   - Filter by date range, mood, tags
   - Entry preview (first few lines)

3. **Insights/Patterns:**
   - Simple visualizations (mood over time, word clouds)
   - Pattern summaries from AI analysis
   - Opt-in feature (not required)

4. **Settings:**
   - Export/backup options
   - Sync preferences
   - AI feature toggles
   - Theme/appearance
   - Data deletion

### Design Considerations

**Dark Mode:**

- Default option (many people journal at night)
- Easy toggle
- True black for OLED screens (battery saving)

**Typography:**

- Large, readable font (16-18px minimum)
- High contrast for accessibility
- Comfortable line spacing

**Color Palette:**

- Calming, neutral tones
- Avoid aggressive colors (bright reds, harsh whites)
- Consistent mood-color associations

---

## Compliance and Privacy Roadmap

### Prototype Phase (Current)

- No formal compliance obligations (single user, local)
- Build with best practices anyway:
  - Strong encryption
  - Minimal data collection
  - User data ownership
  - Clear privacy expectations

### Pre-Launch Checklist (If Scaling)

**Legal/Compliance:**

- [ ] Consult healthcare privacy lawyer
- [ ] Determine HIPAA applicability
- [ ] Draft privacy policy and terms of service
- [ ] Data Protection Impact Assessment (GDPR if EU users)
- [ ] Business Associate Agreements with vendors (cloud, API providers)

**Security:**

- [ ] Professional security audit / penetration testing
- [ ] Vulnerability scanning
- [ ] Incident response plan
- [ ] Data breach notification procedures
- [ ] Insurance (cyber liability, E&O)

**Clinical:**

- [ ] Therapist review and validation
- [ ] Clinical efficacy testing (if making health claims)
- [ ] Crisis response protocol review
- [ ] Content review for therapeutic soundness

**Technical:**

- [ ] Load testing
- [ ] Backup and disaster recovery testing
- [ ] Multi-device sync testing
- [ ] Accessibility audit (WCAG compliance)

---

## Development Roadmap

### Week 1-2: Foundation

- [ ] Set up Flask backend with basic REST API
- [ ] Implement SQLCipher database (for learning/fallback)
- [ ] Build PWA shell (manifest, service worker basics)
- [ ] Implement IndexedDB storage with encryption
- [ ] Basic UI (entry creation, viewing)

### Week 3-4: Core Features

- [ ] Offline functionality (service worker caching)
- [ ] Entry list/history view
- [ ] Search and filtering
- [ ] Export functionality
- [ ] Claude API integration (basic)

### Week 5-6: AI Features

- [ ] Mood tracking
- [ ] Context-aware prompting
- [ ] Pattern recognition (client-side)
- [ ] LLM-based insights (server-side, opt-in)
- [ ] Crisis detection and resource display

### Week 7-8: Polish and Testing

- [ ] UI/UX refinement
- [ ] Mobile testing (iOS and Android)
- [ ] Performance optimization
- [ ] Security review (self-audit)
- [ ] User testing with daughter-in-law
- [ ] Iteration based on feedback

### Week 9-10: Professional Review

- [ ] Therapist consultation and feedback
- [ ] Security consultation (if scaling is on table)
- [ ] Refinement based on professional input
- [ ] Documentation

---

## API Endpoints (Flask Backend)

### Entry Management

```
POST   /api/entries          - Create new entry (accepts encrypted blob)
GET    /api/entries          - List all entries (returns encrypted blobs)
GET    /api/entries/:id      - Get specific entry (encrypted)
PUT    /api/entries/:id      - Update entry (encrypted)
DELETE /api/entries/:id      - Delete entry
```

### AI Integration

```
POST   /api/ai/prompt        - Get AI-generated prompt based on context
POST   /api/ai/analyze       - Analyze entry content (receives plaintext)
POST   /api/ai/patterns      - Get pattern analysis across entries
```

### User Management (Phase 2)

```
POST   /api/auth/register    - Create account
POST   /api/auth/login       - Authenticate
POST   /api/auth/logout      - End session
GET    /api/user/profile     - Get user settings
PUT    /api/user/profile     - Update user settings
```

### Sync (Optional)

```
POST   /api/sync/push        - Upload encrypted entries to server
GET    /api/sync/pull        - Download encrypted entries from server
GET    /api/sync/status      - Check sync status
```

---

## Risk Mitigation

### Technical Risks

**Risk:** Data loss due to browser storage limits or corruption
**Mitigation:**

- Regular export reminders
- Server sync option
- Entry-level checksums to detect corruption

**Risk:** Encryption key loss (user can't access entries)
**Mitigation:**

- Clear warnings during setup
- Export encouragement
- Key recovery option (future: encrypted key backup with passphrase)

**Risk:** Poor mobile performance
**Mitigation:**

- Performance testing on target devices
- Lazy loading for entry lists
- Efficient IndexedDB queries

**Risk:** Service worker bugs causing offline issues
**Mitigation:**

- Thorough testing of offline scenarios
- Fallback to online-only mode if SW fails
- Clear error messaging

### Clinical Risks

**Risk:** AI gives harmful advice
**Mitigation:**

- Carefully designed prompts (reviewed by therapist)
- Avoid directive language
- Crisis resources always visible
- Clear disclaimers (not a replacement for therapy)

**Risk:** User becomes dependent on AI, avoids real therapy
**Mitigation:**

- Regular encouragement to seek professional help
- Frame as "support while waiting" not "replacement"
- Therapist export feature (prepare for real therapy)

**Risk:** Reinforcement of negative thought patterns
**Mitigation:**

- CBT-based reframing prompts
- Avoid pure validation without reflection
- Pattern recognition highlights rumination

### Privacy Risks

**Risk:** Data breach exposing sensitive journal entries
**Mitigation:**

- Client-side encryption (data breach gets encrypted blobs)
- Minimal server-side storage
- Security audits before scaling
- Incident response plan

**Risk:** Developer (you) accessing private entries
**Mitigation:**

- Minimize necessary access during development
- Use test data where possible
- Strict confidentiality
- Future: User-controlled encryption key (you can't decrypt)

**Risk:** Third-party services (Claude API, hosting) accessing data
**Mitigation:**

- Data sent to Claude only when user explicitly requests
- Encrypted data stored on server
- BAAs with vendors before scaling
- Review vendor security practices

---

## Success Metrics

### Prototype Phase

- **Primary:** Does daughter-in-law find it helpful?
- **Secondary:** Does she use it consistently (3+ times/week)?
- **Tertiary:** Does she feel safe using it (privacy concerns addressed)?

### If Scaling (Future)

- User retention (% still using after 1 month, 3 months)
- Entry frequency (consistent journaling habit formation)
- Export usage (users backing up their data)
- Therapist referrals/recommendations
- User-reported symptom improvement (validated surveys)
- Zero security incidents

---

## Open Questions / Decisions Needed

1. **Theming:** Light/dark mode toggle, or dark mode only?
2. **Mood tracking:** Simple (good/neutral/bad) or detailed (5-7 point scale)?
3. **AI interaction style:** Conversational or prompt-based?
4. **Server sync:** Enable by default or opt-in?
5. **Entry reminders:** Push notifications or just in-app suggestions?
6. **Data retention:** Indefinite, or encourage periodic archival/deletion?

---

## Resources and References

### Technical Documentation

- [MDN: Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN: Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [IndexedDB Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Workbox (Service Worker library)](https://developers.google.com/web/tools/workbox)
- [SQLCipher Documentation](https://www.zetetic.net/sqlcipher/)
- [Anthropic Claude API Docs](https://docs.anthropic.com/)

### Security Best Practices

- OWASP Mobile Security Guide
- NIST Cybersecurity Framework
- Web Crypto API Best Practices

### Mental Health Resources

- Crisis Text Line: Text HOME to 741741
- National Suicide Prevention Lifeline: 988
- SAMHSA National Helpline: 1-800-662-4357

### Compliance Resources

- HHS HIPAA Guidelines
- GDPR Official Text
- FTC Health Breach Notification Rule

---

## Version History

**v0.1 (Current):** Initial design document

- Architecture defined
- Technology stack selected
- Core features outlined
- Security approach established
- Development roadmap created

---

## Notes

**Remember:**

- This is a tool to support someone you care about, not a product to ship
- Security and privacy are non-negotiable
- Get professional validation before considering scale
- User control over their data is paramount
- When in doubt, ask: "First, do no harm?"

**The Vastaamo Lesson:**
Never let speed, convenience, or cost compromise security when handling people's most vulnerable thoughts. The technical implementation is trivial; the ethical responsibility is enormous.
