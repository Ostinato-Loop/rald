# WHY USERS LEAVE RALD
## Sprint 02 — Trust & Retention
**Date:** 2026-06-04  
**Author:** LILCKY STUDIO LIMITED  

---

## Purpose

Rank every reason a user might leave RALD by time horizon and severity. Provide honest, actionable fixes.

---

## Within 5 Minutes

### CRITICAL

**C1. They see fake communities with 24,500 members they cannot join.**  
The Communities page showed 6 invented communities with made-up member counts. A user who discovers the communities are fake loses all trust immediately.  
**Status:** FIXED in Sprint 02.

**C2. They see a fake call history with names they have never talked to.**  
The Calls page showed 5 fake call entries. A user who sees "Adaeze Okafor — Today, 12:01" when they have never made a call is confused or alarmed.  
**Status:** FIXED in Sprint 02.

**C3. The app thinks they are in Lagos when they are in Nairobi.**  
The Feed header showed "Lagos · Nigeria" for every user. A misplaced location chip in the first 5 seconds destroys the perception of a personalised product.  
**Status:** FIXED in Sprint 02.

**C4. Messenger shows an empty chat list with no guidance.**  
A new user who completes onboarding and sees a blank Messenger has no next action. They close the app.  
**Status:** Open — Sprint 03.

### HIGH

**H1. CORS blocks requests from chat.rald.cloud.**  
The Messenger Worker's CORS list was missing `chat.rald.cloud`. Every request from the Messenger frontend in production would be blocked. No messages, no auth — total failure.  
**Status:** FIXED in Sprint 02.

**H2. The search button in Loop does nothing.**  
`onClick={() => {}}` — dead button. A user who wants to find someone taps search and nothing happens.  
**Status:** Open — Sprint 03.

---

## Within 1 Hour

### HIGH

**H3. They cannot find anyone they know.**  
People discovery only works in Messenger. Loop has no people search. If someone signed up from a friend's invite and opens Loop first, they cannot find that friend.  
**Status:** Partial (Messenger works). Loop fix: Sprint 03.

**H4. Their calls do not work.**  
The TRTC voice/video infrastructure is integrated but call history and audio rooms showed fake data until Sprint 02. Users may attempt real calls and encounter unbuilt flows.  
**Status:** Honest empty state deployed. Call infrastructure audit deferred to Sprint 03.

**H5. They lose their session.**  
JWT expires → silent redirect to Profiles login. On poor networks, the token exchange may fail, leaving users in a redirect loop.  
**Status:** Open — Sprint 03 (token refresh).

### MEDIUM

**M1. "For you" feed is empty.**  
Users who join before there are active rooms see an empty live strip and a "coming soon" discussions panel. Nothing to read, nothing to join.  
**Status:** Honest empty state is better than fake data. Rooms content depends on organic growth.

**M2. The communities they expect do not exist.**  
A user who signed up because of "AfroDevs Collective" or "Lagos Tech Circle" (from any pre-launch marketing) arrives to find no communities at all.  
**Status:** Honest empty state deployed. Community backend: Sprint 04.

---

## Within 24 Hours

### HIGH

**H6. No notifications pull them back.**  
If someone messages them while they are offline, they receive no push notification. The app is silent. They forget it exists.  
**Status:** Open — Sprint 03 (server-side push delivery).

**H7. Nothing happens to their account while they are gone.**  
The app has no daily digest, no "5 people went live in your communities", no missed-message badge on the app icon. There is no external trigger to return.  
**Status:** Open — Sprint 03/04 push strategy.

### MEDIUM

**M3. Profile feels empty.**  
A user who signed up with just a username has no avatar, no bio, no followers, no following. Their identity card looks abandoned compared to WhatsApp or Telegram.  
**Status:** Open — onboarding improvements in Sprint 03.

---

## Within 7 Days

### HIGH

**H8. Nobody they know is on the platform.**  
Without a strong invite mechanism, network effects cannot build. If a user cannot find 3 people they know within 7 days, retention drops sharply.  
**Status:** Open — invite feature: Sprint 03.

**H9. They tried to message someone and the message felt risky.**  
No E2E encryption. No disclosure to users that messages are stored in plaintext. Users in sensitive contexts (civic, political) will leave once they realise this.  
**Status:** Open — requires architectural decision + disclosure before Sprint 05.

### MEDIUM

**M4. Loop rooms are sparse.**  
If there are fewer than 10 active rooms at the user's usual access time, Loop feels dead. Audio-room platforms live and die by having something to listen to at any given moment.  
**Status:** Open — depends on organic room creation and creator programme.

---

## Within 30 Days

### HIGH

**H10. There is no relationship graph.**  
After 30 days of using the app, a loyal user still cannot see who follows them, who they follow, or mutual connections. There is no graph to get attached to.  
**Status:** Open — Sprint 03/04 (relationship persistence).

**H11. Payments do not exist.**  
Creators who could monetise their rooms (tipping, subscriptions, tickets) find no payment layer. PayRALD is in development but not integrated.  
**Status:** Open — PayRALD: Sprint 05+.

### MEDIUM

**M5. No moderation tools.**  
As rooms grow, moderators need muting, kicking, and reporting tools. Without these, popular rooms become hostile and the host leaves.  
**Status:** Open — Loop moderation: Sprint 04.

---

## Priority Matrix

| # | Risk | Time Horizon | Severity | Status |
|---|------|-------------|----------|--------|
| C1 | Fake communities | 5 min | Critical | Fixed |
| C2 | Fake call history | 5 min | Critical | Fixed |
| C3 | Wrong location chip | 5 min | Critical | Fixed |
| H1 | CORS blocks Messenger frontend | 5 min | Critical | Fixed |
| H2 | Dead search button in Loop | 1 hour | High | Sprint 03 |
| H3 | No people search in Loop | 1 hour | High | Sprint 03 |
| H6 | No push notifications | 24 hours | High | Sprint 03 |
| H8 | No invite mechanism | 7 days | High | Sprint 03 |
| H9 | No E2E encryption disclosure | 7 days | High | Sprint 04 |
| H10 | No relationship graph | 30 days | High | Sprint 03/04 |
| M1 | Empty feed on first visit | 1 hour | Medium | Content growth |
| M4 | Sparse rooms | 30 days | Medium | Creator programme |

---

## What Would Make Users Stay

1. **A message from someone they know within 10 minutes of signup.** Invite flow + contact matching.
2. **A live room on a topic they care about.** Room discovery by interest.
3. **A notification that pulls them back.** Push delivery for new messages.
4. **A connection they can point to.** Relationship graph.
5. **Something they cannot get elsewhere.** Loop audio rooms with African regional context.

---

*WHY_USERS_LEAVE_RALD.md — Sprint 02 Trust & Retention — LILCKY STUDIO LIMITED*
