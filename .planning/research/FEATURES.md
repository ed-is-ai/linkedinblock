# Features Research

**Project:** LinkedIn Blocker
**Researched:** 2026-05-25
**Confidence:** MEDIUM-HIGH (training knowledge; web tools unavailable for live verification)

---

## Table Stakes Detection

These signals must work reliably or the extension provides no value. Missing any of
these makes the tool feel broken.

---

### 1. AI Linguistic Pattern Detection (Post Content)

**Why table stakes:** The primary user complaint is AI-generated text flooding feeds.
Without this, the extension has no core value.

**Signals to implement (ordered by signal strength):**

#### High-confidence indicators (implement first)

| Signal | Description | Detection Method |
|--------|-------------|------------------|
| Listicle structure | Posts structured as "5 Things I Learned...", "3 Reasons Why...", "Here's what X taught me:" followed by numbered items | Regex on post text: `/^\s*\d+[\.\)]\s/m` with count >= 3, or headers like `Here's X things` |
| Em-dash overuse | AI (especially GPT-family) compulsively uses em-dashes (—) as clause separators at statistically abnormal rates | Count `—` occurrences per 100 words; threshold > 2 per 100 words is a strong signal |
| "Excited to announce" / "Thrilled to share" openers | Formulaic opener phrases that signal templated generation | Exact-match phrase list; these rarely appear in genuine spontaneous writing |
| Call-to-action close | Posts ending with "What do you think?", "Drop a comment below", "Follow for more" as a near-universal closing pattern | Match against known CTA phrase list at end of post (last 2 sentences) |
| Buzzword density | Overuse of: "synergy", "leverage", "game-changer", "disruptive", "innovative", "thought leader", "holistic", "paradigm shift", "actionable insights", "move the needle" | Count buzzword hits / total word count; threshold > 3 per 100 words |
| Generic inspiration without specificity | "Failure is just a stepping stone to success" type content with no named people, places, dates, or specific events | Absence of proper nouns + inspirational vocabulary = high signal |
| Perfect paragraph structure | Every paragraph is exactly 1-3 sentences. No run-ons, no fragments, no conversational asides. Clinical uniform structure. | Paragraph length variance score; low variance (< 0.3 stddev) is suspicious |
| Suspiciously clean grammar | Zero typos, zero informal punctuation, zero ellipses misuse, zero capitalisation errors across a long post | Combined: spell-check integration is overkill; instead: absence of any lowercase "i" as personal pronoun, no contractions, no sentence fragments as stylistic choice |

#### Medium-confidence indicators (include in scoring, lower weight)

| Signal | Description | Detection Method |
|--------|-------------|------------------|
| Excessive hashtag blocks | 5+ hashtags appended in a block at the end, especially generic ones (#Leadership #Motivation #Growth) | Count hashtags; block-appended pattern vs inline usage |
| "I" scarcity in first-person posts | Posts written in first person but with very few genuine "I did X" or "I saw X" constructions — lots of "One should..." or "We must..." | Ratio of "I" to total words in ostensibly personal posts |
| Post length clustering | AI posts often cluster at 150-300 words (optimal for engagement per AI training data) with no variation across an account's history | Per-account: stddev of post lengths across last N posts |
| Lack of named individuals | No "my colleague Sarah", "my manager Tom", "my friend from uni" — generic references only ("a colleague", "a mentor") | Named entity presence; proper noun density |

---

### 2. Fake / Thin Profile Detection (Profile Signals)

**Why table stakes:** AI-generated posts often come from fake accounts. Profile signals
provide account-level context that dramatically reduces false positives on content-only
detection.

**DOM-accessible signals (no API required):**

LinkedIn's feed and profile cards expose the following in the DOM without authentication
headers or API calls — they are present in the rendered HTML/React hydrated state:

| Signal | DOM Availability | Detection |
|--------|-----------------|-----------|
| Profile photo | `<img>` in post header and profile card | See AI headshot detection below |
| Connection count display | "500+ connections" or "X mutual connections" shown in connection card | Parse text; < 50 connections is a weak signal; 0 mutual connections + other signals = stronger |
| Account join date | Not always in feed DOM — visible on profile page `linkedin.com/in/[slug]/` | Requires visiting profile; flag for deferred check |
| Post frequency vs account age | Post card timestamp visible; compare to profile creation signals | Requires accumulation across sessions |
| Job title / company | Visible in post card attribution | Generic titles: "Entrepreneur | CEO | Visionary | Speaker" is an anti-pattern |
| Follower count shown | Visible on some cards | Very high followers + new account + AI content = strong signal |
| Profile completeness indicators | "Open to work" banner, featured section presence, education section | Absent education + generic bio = thin profile signal |
| Headline pattern | Shown in every post attribution | "Helping [X] achieve [Y] through [Z]" is a formulaic AI-generated bio pattern |

**AI-generated headshot detection:**

This is the highest-specificity single signal available, but also the hardest to implement
client-side without an API call to a vision model.

For v1 (heuristic only):
- Cannot reliably detect AI faces via pixel analysis in a content script (no ML model in-browser without substantial complexity)
- Use profile photo URL pattern as a weak signal: default/blank avatar = weak signal; stock-looking photo combined with other signals = note it for LLM phase
- Flag accounts with generic profile URLs for manual review rather than auto-hide

For v2 (LLM upgrade path): Send profile image URL to vision API for AI face probability score.

**Thin history indicators (DOM-accessible without leaving feed):**

- No post history visible in feed from this account (extension tracks accounts seen; new-to-feed account with high AI content score = flag)
- Headline contains 3+ role nouns separated by pipes: "CEO | Coach | Speaker | Author | Visionary"
- Bio (when visible in hover card) contains no specific company names, universities, or places

---

### 3. Bot Engagement Pattern Detection

**Why table stakes:** Engagement manipulation is the mechanism by which bot networks
amplify AI content into genuine users' feeds. Detecting it contextually upgrades confidence.

| Signal | Description | Detection |
|--------|-------------|-----------|
| Identical or near-identical comments | "Great insights! This really resonated with me." appearing verbatim or near-verbatim across multiple posts | Collect comment text per post; fuzzy string match across comments; Levenshtein distance < 10 chars on 20+ char strings |
| Comment-to-content mismatch | Comments that are generically positive but could apply to any post (do not reference the specific post content) | Generic positive phrase list: "So true!", "Couldn't agree more!", "This is gold!", "Saving this!" |
| Rapid comment velocity | Multiple comments within seconds of posting — only visible if extension can see timestamp metadata | Post timestamp vs earliest comment timestamp; < 60 seconds = bot signal |
| Reaction ratio anomaly | Posts with 500+ reactions and 2 comments, or posts with 200 comments and all comments are 3-word affirmations | Ratio of reaction count to comment count; ratio of short (< 5 word) comments to total |
| Commenter account recycling | Same set of accounts commenting on all posts from a flagged account | Extension tracks commenters per flagged account across sessions; shared commenter graph |

**DOM feasibility note:** LinkedIn renders comment text, commenter names, and reaction
counts in the DOM. Comment timestamps are often in `datetime` attributes on `<time>`
elements. Reaction counts appear as text nodes. All of these are readable by a content
script without API access.

---

## Differentiating Detection

These signals distinguish the extension from a simple keyword blocker. Implement after
table stakes are solid.

---

### 1. Per-Account Consistency Scoring

Track signals across an account's multiple posts over time (within the extension's local
memory). A single AI-pattern post might be a one-off. An account where 8 of 10 posts all
score high on AI indicators is far more likely to be an AI account.

**Value:** Dramatically reduces false positives. Converts the tool from "post filter" to
"account classifier."

**Implementation:** Rolling window of the last N posts per seen account, stored in
`chrome.storage.local`. Account-level AI probability = weighted average of post scores.

---

### 2. Temporal Pattern Detection (Posting Cadence Anomaly)

Note from PROJECT.md: "Posting frequency signals — excluded from detection (user did not
select this)." However, cadence is distinct from raw frequency. Posting at exactly the
same time every day (e.g., 08:00 ± 5 minutes for 30 days) is a bot signal. Pure volume
is excluded; pattern regularity is a differentiator.

**Recommendation:** Include cadence regularity as an optional signal, disabled by default,
since the user explicitly excluded "posting frequency" — clarify with user whether cadence
regularity is in scope.

---

### 3. Headline Formula Classifier

Beyond just counting pipe-separated roles, classify known AI bio templates:

- "Helping [audience] [achieve outcome] | [credential] | [CTA]"
- "[Role] at [generic descriptor company] | [aspiration] | [topic] enthusiast"
- "[N]x [award/recognition] | Building [vague thing] | [location]"

Build a template-matching library of these patterns. Match rate against known templates
is high-specificity.

---

### 4. Cross-Signal Correlation Score

Expose to the user in the popup not just "flagged" but which signals fired and their
individual confidence. Example popup entry:

```
@JohnVisionary — 78% AI probability
  ✓ Listicle structure (3 posts)
  ✓ Buzzword density high (avg 4.2/100w)
  ✓ Generic headline pattern
  ✓ 0 mutual connections
  ✗ Comment patterns: insufficient data
```

**Value:** This is the primary differentiator from a blunt keyword blocker. Users trust
the tool more when they understand why something was flagged. Also enables them to tune
thresholds intelligently.

---

### 5. "Suspiciously Viral" Anomaly Detection

Flag posts where reaction count is high but the account has almost no connection history
visible, or where the post text contains no information that would explain the engagement.
This catches paid promotion / bot-amplified content from otherwise-legitimate-looking accounts.

---

### 6. Commenter Network Graph (Local, Session-Based)

Over a session, build an in-memory graph of which accounts comment on which posts. Bot
networks tend to comment-cross-pollinate: Bot A comments on Bot B's posts and vice versa.
If the extension has flagged account X and sees that account Y frequently comments on X's
posts AND Y comments on other flagged accounts' posts, promote Y's suspicion score.

**Implementation complexity:** Medium-high. Requires tracking across DOM mutations.
Valuable for catching accounts that individually score borderline.

---

### 7. LLM Upgrade Path (v2 design concern, not v1 feature)

The architecture must allow swapping the heuristic scorer for an LLM call. The signal
interface should be designed so the LLM receives: post text + profile headline + engagement
summary, and returns a 0-1 probability with reasoning. Do not implement in v1 but design
the scorer interface to accommodate it.

---

## Anti-Features

Deliberately exclude these to avoid harm, ToS risk, and false positive damage.

---

### 1. Non-English Content Auto-Flagging

**Why exclude:** AI detection heuristics are tuned to English text patterns. Applying
them to Portuguese, Hindi, Arabic, or other languages will produce massive false positive
rates. Non-English posts often look "unusual" to English-trained detectors (different
punctuation norms, different rhetoric styles, different sentence structure) and would be
wrongly hidden.

**Instead:** Either scope detection to English-detected content only (use
`navigator.language` or post language attribute if present in DOM), or skip non-English
posts entirely with a neutral score.

---

### 2. Political / Ideological Content Filtering

**Why exclude:** Any attempt to flag content as "suspicious" based on its political
viewpoint, even incidentally, is a civil liberties problem, a PR disaster, and likely
beyond what heuristics can handle without massive false positives. "Generic inspiration"
heuristics could easily catch political speeches.

**Instead:** Detect structural and stylistic AI signals only. Never use content category
or sentiment as a detection signal.

---

### 3. Job Seeker Posts

**Why exclude:** Genuine job seekers often write posts that superficially resemble AI
content: "Excited to announce I'm open to new opportunities!", structured with bullet
points listing skills, with calls to action ("Please reach out!"), and buzzword-heavy
("results-driven", "passionate about", "collaborative"). These are human beings who are
copying templates or following advice — not bots. Auto-hiding their posts causes real harm.

**Instead:** The "Open to Work" banner is DOM-accessible. If present, reduce AI signal
weight significantly or require a much higher threshold before hiding.

---

### 4. Promoted / Sponsored Post Interference

**Why exclude:** LinkedIn sponsored posts may have high AI signal scores (they often ARE
machine-written ad copy), but interfering with them risks ToS violation and potentially
breaks LinkedIn's ad tracking. Advertisers paying LinkedIn expect their content to be seen.

**Instead:** Detect the "Promoted" label in the DOM (LinkedIn marks these consistently)
and exclude promoted posts from detection entirely. Score = 0, do not hide, do not flag.

---

### 5. Company Page Posts

**Why exclude:** Company pages routinely post AI-assisted marketing content — but this
is expected, disclosed (implicitly), and the account is verifiably a company, not a fake
human. Auto-hiding all company posts would remove legitimate corporate communications.

**Instead:** Detect company page type from DOM indicators (company pages have a different
follow/connect button, different header structure). Apply a much higher threshold or skip
detection entirely for verified company pages.

---

### 6. Reshares / Reposts of Genuine Content

**Why exclude:** If User A (real person) reshares a post from User B (AI account), the
reshare appears in User C's feed attributed to User A. Hiding this would penalise User A
for resharing. The reshared content might itself be original and genuine.

**Instead:** When a post is a reshare, score the original post's account, not the
resharing account. Make reshare detection explicit in the DOM traversal.

---

### 7. Frequency / Volume as a Primary Signal

**Why exclude:** Already noted in PROJECT.md as out of scope. Additionally: prolific
human writers (journalists, recruiters, community managers) post multiple times per day.
Frequency alone is a terrible signal with severe false positive risk.

**Confirmed exclude:** Do not implement post count or posting frequency as any part of
the score.

---

### 8. Reaction Count Thresholding ("Too Popular = Fake")

**Why exclude:** Some AI content gets genuinely high engagement because people find it
useful. Some niche human-written content has very low engagement. Using absolute reaction
counts as a bot signal penalises viral genuine content and ignores genuine bots with
small audiences. Only ratio anomalies (reactions vs. comment quality) should be used, not
absolute counts.

---

## Scoring Approach

**Recommendation: Weighted additive per-signal score, normalised to 0-100, displayed
as per-signal breakdown.**

### Rationale

A single opaque "bot score" is:
- Undebuggable when wrong
- Untunable by the user
- Trust-destroying when it hides something the user cares about

A per-signal breakdown with a weighted sum gives:
- Auditability ("why was this flagged?")
- Tunability (user can adjust thresholds per signal category)
- Graceful degradation (if one signal fires in isolation, score stays low)

### Signal Weight Recommendations (v1 starting values)

| Signal Category | Weight | Rationale |
|----------------|--------|-----------|
| Listicle + CTA combo | 25 | Very high specificity together |
| Buzzword density high | 15 | Medium specificity; genuine writers use some buzzwords |
| Em-dash overuse | 10 | Highly specific to GPT-family output |
| Generic headline (pipe formula) | 15 | High specificity for fake accounts |
| Zero mutual connections | 10 | Context-dependent; new genuine users also have none |
| Identical/generic comments | 15 | High specificity |
| CTA close phrase | 10 | Common in AI, less common in genuine posts |

**Total weights sum to 100. Threshold for auto-hide: 60/100 (configurable).**
**Threshold for flag-only (review queue): 35/100 (configurable).**

### Account-Level vs Post-Level Scoring

- Each post gets a post-level score (content + engagement signals).
- Each account gets an account-level score (profile signals + rolling average of post scores).
- Final action decision uses: `max(post_score, account_score)` — either the post or the
  account can independently trigger a flag.
- Auto-hide requires: post_score >= threshold AND account has been seen at least once
  (new accounts get flag-only, not auto-hide, until a second post confirms the pattern).

### Score Decay

Account scores should decay toward neutral if no new AI-signal posts are seen for N days
(suggested: 30 days). Accounts change. Avoid permanent blacklisting from a single
detection event.

---

## False Positive Risk

These are the traps most likely to cause the extension to hide genuine content.

---

### 1. Recruiters and HR Professionals

**Profile:** Post multiple times per week with structured content, use job-market
buzzwords heavily, often end posts with "DM me" CTAs, frequently write listicles
("5 interview tips"), have highly polished grammar.

**Risk:** Will score very high on content signals.

**Mitigation:** If profile headline contains "Recruiter", "Talent Acquisition",
"HR", "People & Culture" → apply a 20-point penalty to the auto-hide threshold
(require 80/100 instead of 60/100 to auto-hide).

---

### 2. Non-Native English Writers

**Profile:** May have more formal, structured, grammatically clean writing than native
speakers — because they learned formal English. Low contractions, careful sentence
structure, occasional overcorrection toward formal vocabulary.

**Risk:** Scores higher on "suspiciously clean grammar" and "low contraction use" signals.

**Mitigation:** These signals should have low individual weights. Only combination of
multiple signals should reach threshold. Do not use "absence of typos" as a positive
signal — only presence of AI-specific patterns (like em-dash overuse).

---

### 3. Motivational / Personal Development Niche Writers

**Profile:** Genuine humans who have built a following writing inspirational content.
They have learned that listicle formats, broad philosophical claims, and engagement CTAs
perform well. They do this intentionally and successfully.

**Risk:** Will trigger generic inspiration detection, CTA detection, possibly buzzword
density.

**Mitigation:** Account-level scoring helps — these accounts typically have long histories,
mutual connections, varied post lengths, and actual back-and-forth in comments (which
differ from generic "great post!" bots). The social graph signals will help differentiate.

---

### 4. New Genuine Users

**Profile:** Someone who just joined LinkedIn and has no connections, no post history,
possibly a sparse profile, and writes their first posts using LinkedIn's suggested formats
(which are template-heavy).

**Risk:** Zero connections + generic post structure + thin history = high score despite
being a real person.

**Mitigation:** New accounts should get flag-for-review, not auto-hide. Require at least
2 posts before auto-hiding. Give the user control to dismiss false positives, and ensure
dismissed accounts are remembered permanently.

---

### 5. Ghost-Written but Human-Approved Content

**Profile:** A real executive who has a ghostwriter (human or AI-assisted) producing
their LinkedIn content. The content IS AI-touched, but the person is real and the
professional relationship is legitimate.

**Risk:** This is genuinely ambiguous — the content IS AI-generated but the account is
not fake.

**Mitigation:** This is not a false positive — it is the target use case. If the user
wants to see more authentic content and less AI-assisted content, hiding ghost-written
posts is working as intended. Document this as a scope decision.

---

### 6. Corporate Training / Template Posts

**Profile:** Companies run internal campaigns where employees are asked to post specific
messages on LinkedIn (e.g., "We're hiring! [Company] is looking for X. Apply here: [link]").
These produce near-identical posts from multiple real people.

**Risk:** Identical/near-identical comment and post detection will catch coordinated
posting campaigns from real employees.

**Mitigation:** Identical post detection should apply to comments, not post body text
(which has other signals already). If the post text is identical to another seen post,
flag for review but require additional signals before auto-hiding.

---

## Signal Implementation Priority

For the first buildable milestone, implement in this order:

**Phase 1 (MVP detection engine):**
1. Buzzword density scorer
2. Listicle structure detector
3. CTA phrase matcher (open + close)
4. Em-dash frequency counter
5. Generic headline pattern matcher (pipe formula)
6. Sponsored/Promoted post exclusion
7. Company page exclusion
8. Open to Work threshold reduction

**Phase 2 (account-level intelligence):**
9. Per-account rolling score (chrome.storage.local)
10. Zero-mutual-connection signal (with decay)
11. Identical comment detection

**Phase 3 (engagement graph, LLM prep):**
12. Commenter network tracking
13. Reaction/comment ratio anomaly
14. LLM scorer interface (stub only in v1)

---

## Sources and Confidence

| Area | Confidence | Basis |
|------|------------|-------|
| AI linguistic patterns (em-dash, listicles, CTA) | HIGH | Well-documented in AI writing research; observable in GPT/Claude output characteristics |
| LinkedIn DOM accessibility | MEDIUM | Based on LinkedIn's known React rendering patterns; subject to DOM changes |
| Bot engagement patterns | MEDIUM | Research literature on social media manipulation; LinkedIn-specific patterns extrapolated |
| Scoring weights | LOW | Starting values only; require empirical calibration against real LinkedIn data |
| False positive categories | HIGH | Well-understood from content moderation literature and common sense analysis |

**Note:** Web search tools were unavailable during this research session. All findings
are based on training knowledge (cutoff: August 2025). Key claims to verify before
implementation:
- Current LinkedIn DOM structure for profile cards, comment timestamps, reaction counts
- Whether LinkedIn's CSP blocks content script access to any of these elements
- Academic literature on LinkedIn-specific bot detection (search: "LinkedIn bot detection
  heuristics", "AI-generated LinkedIn content classification")
