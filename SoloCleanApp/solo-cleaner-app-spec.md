# Solo Cleaner App — Product Spec

**Prepared for:** Tiffany Crowell
**Purpose:** Single source of truth for building the app. Every decision below was made across a full planning conversation — treat this as the build blueprint, not just a feature list.

---

## 1. Product Overview

A web app built specifically for independent solo cleaners — residential, commercial, move-in/move-out, deep clean, and post-construction — who currently cobble together 3-6 different tools (or a personal phone number, a paper notebook, and a prayer) to run their business. Built by a solo cleaner, for solo cleaners.

**This is a multi-tenant SaaS product.** Other solo cleaners will sign up and pay to use it, not just Tiffany's own business. Tiffany will run her own cleaning business through it first, as the first real tenant, to prove it out before opening it to others.

**Platform:** One responsive web app — works on phone and desktop from a single codebase. No native iOS/Android app, no app store. Every feature that initially seemed to require going native (haptic vibration, a live lock-screen timer, smartwatch taps) was redesigned to work fully in the browser instead — see Section 6.

**Build approach:** One full release, not a phased rollout to users. Internally, it still gets built in a deliberate technical order (foundation and data model first, then the core job lifecycle, then everything around it) and tested continuously — but nothing ships to real cleaners until the whole thing works end to end.

**Team support:** Some solo cleaners run with 1-2 helpers. Helpers get their own login with tightly scoped permissions (see Section 3).

---

## 2. Multi-Tenant Architecture & Data Isolation

Every cleaner who signs up gets their own fully isolated business account (a "tenant"). Every piece of data — clients, jobs, schedules, messages, payment history, notes, damage logs, room profiles — is tagged to that business and enforced at the **database level** (Postgres Row Level Security via Supabase), not just in the app's logic. This means one cleaner's business can never see another's data, even in the event of an application bug — the database itself refuses to return rows that don't belong to the logged-in account.

Tiffany's own business, used for testing, runs through the exact same isolated pathway as every future customer — no special case.

---

## 3. Roles

| Role | Sees | Can Do |
|---|---|---|
| **Owner** | Everything in their own business | Full control — pricing, clients, messages, payments, settings, helper management |
| **Helper** | Only their own assigned jobs/route for the day | Check in/out, follow pacing, log damage, run checklists. No access to pricing, other clients, the message inbox, or payments |
| **Client** | Their own bookings/history via the booking page and texts | Book, pay, message via text, e-sign waivers, review the cleaner |

Messages and payments always route through the **owner's** account, regardless of who did the job.

### 3.1 Growth Headroom

The target customer is a solo cleaner with zero to two helpers, but the data model does **not** hardcode a helper limit — a business can add a third, fifth, or tenth helper account without hitting a wall or needing to migrate to a different system. That costs nothing to build correctly from the start, so it's built that way from day one.

That said, a few things in this spec are deliberately shaped around a very small team and would start to feel like real limitations well before a business needs enterprise software, even though the app itself wouldn't break:

- **Single owner inbox/payments hub** — all client texts and payment handling route through one owner account. Fine for 1-2 helpers; a bottleneck for a larger team.
- **No dispatcher/team-lead role** — only Owner and Helper exist. A bigger operation would eventually want someone who can see and reassign the day's whole schedule without full access to pricing and finances.
- **Hours tracking, not real payroll** — the app is not becoming a payroll processor (no tax withholding, W-2 filing, or direct deposit built in-house). See Section 4.12 — real payroll gets handled by syncing to whatever payroll provider the owner already uses.

These are intentionally deferred, not forgotten — worth revisiting only if the product needs to serve larger teams down the road.

---

## 4. Core Feature Areas

### 4.1 Client-Facing Booking & Instant Quote
- Each cleaner gets a branded public booking link (their name, logo, colors) — modeled loosely on getallison.com's instant-quote pattern.
- Client picks a service type (standard, deep clean, move-in/out, post-construction, commercial).
- Client selects rooms from a **standardized room-type list** (Kitchen, Full Bath, Half Bath, Primary Bedroom, Bedroom, Living Room, Dining Room, Family Room, Laundry Room, Office, Basement, Garage, Entryway/Hallway, Stairs, Other) with simple +/- counters — not free text.
- Client picks add-ons (inside oven, inside fridge, windows, laundry, etc.) and frequency (one-time/weekly/biweekly/monthly).
- Instant price is calculated from the **owner's own** time-and-price-per-room-type table (set during business setup) — not a generic system default.
- Client picks a real open slot (buffers/drive time already factored in), enters contact info.
- First-time clients: e-sign the waiver/policy agreement and add a card on file.
- Confirmation text/email sent with date, time, price, and policies attached.
- Recurring bookings auto-populate future visits on the calendar.

### 4.2 Scheduling
- Recurring job templates (weekly/biweekly/monthly).
- Smart buffers between jobs accounting for drive time.
- "Today's route" view — jobs in order, addresses, access notes, gate/lockbox codes front and center.
- Waitlist auto-fill when a client cancels.

### 4.3 Payments & Invoicing
- **Stripe Connect** is the required payment rail (not optional — this is core infrastructure).
- Monetization: a small platform fee on every transaction across all cleaners, collected automatically via Stripe Connect — ongoing revenue rather than a one-time referral bonus. Confirm exact mechanics when setting up the Stripe Connect integration.
- One-tap invoice generated from the completed job.
- Card on file auto-charges; manual payment request sent if no card on file.
- Late-payment reminders auto-send at owner-configured intervals (e.g., day 1/3/7). After a set number of unanswered reminders, the app stops auto-nagging and instead flags the balance to the owner as "needs attention."
- Owner sees all outstanding balances in one place and manually resolves each (message client, mark paid outside the app, adjust amount, apply a late fee).
- **Late fees are always a manual owner decision** — logged in the system every time one's applied, never charged automatically.
- Owner can flag a client as "don't auto-confirm new bookings until balance is settled."
- Automatic receipt to both sides once paid. Tips built into the payment flow.
- Tax-ready income/expense summary at year-end; mileage and expense tracking logged automatically between jobs.

### 4.4 Two-Way Reviews
- After a job, the client is prompted to rate/review the cleaner — feeds a public rating shown on the booking page.
- The owner can separately rate/note the client (reliability, condition of home, pets, anything relevant) — this is **fully internal**, never visible to or searchable by the client.

### 4.5 Waivers, Policies & Insurance
- E-signed waiver/service agreement required before a client's first booking, timestamped and stored per client.
- Owner sets cancellation policy and house rules once; auto-attached to every booking confirmation.
- Owner uploads proof of insurance/bonding once; one-click share with any client on demand.
- Commercial clients: one-click share of W-9 (uploaded once at setup), insurance cert, and a service contract. Commercial bookings can optionally require the contract be e-signed before the first job confirms (same waiver mechanism, different template).
- **Commercial post-clean sign-off:** a per-commercial-client toggle ("requires sign-off after cleaning"). At job completion, if the toggle is on, the app asks "Is someone available to sign right now?" — yes → in-app signature capture attached to the job; no → skipped, but explicitly logged as "required but unavailable," never a silent gap.

### 4.6 Automated Texting (Two-Way)
- Each cleaner gets a business phone number **auto-provisioned in the background** (via a programmatic SMS provider such as Twilio) at signup — no second phone line for the cleaner to set up. Texts land as normal SMS in the client's native Messages app.
- **Reminder** text before the job (owner-configured timing).
- **"On my way"** text with ETA — fires on a **manual tap** ("heading to job"), not automatic background GPS. (iOS Safari web apps can't reliably track location in the background — confirmed during research — and manual tap also avoids battery/privacy concerns.) The ETA itself is a real calculated drive-time lookup between the two addresses at the moment of the tap, not a flat guess.
- **"Job complete"** text, which also carries the review request.
- Two-way: clients can reply (CANCEL, RESCHEDULE, a question); replies land in the **owner's in-app inbox**, never the cleaner's personal phone.
- Helper check-in/out actions trigger the same client-facing texts the owner's actions would — without helpers ever seeing the message thread.

### 4.7 Client Cancels/Reschedules by Text
- Client replies "CANCEL" (or similar) to any text thread; the app matches it to the correct upcoming job.
- Owner sets a **default** cancellation policy at setup — options: fully automatic handling, full manual review, require the client to call to reschedule instead of texting, or auto-charge a cancellation fee. **This default can be overridden per individual client.**
- Outside the notice window → can auto-process. Inside the window (where a fee might apply) → flagged to the owner to decide personally.
- Waitlist gets offered the freed slot automatically, if enabled.
- Client always gets a confirmation text either way. "RESCHEDULE" replies get offered next available times.
- Every reply appears in the owner's inbox regardless of automation — nothing happens invisibly.

### 4.8 Day-to-Day Job Tools
- Pre-departure supply checklist (before leaving the house).
- Post-job restock/repack checklist (tools, bag, supplies before leaving the property).
- Job checklists that vary by job type (standard/deep/move-out/post-construction).
- Before/after photo capture per job.

### 4.9 Room Setup & Pacing Timer (signature feature)
- Standardized room-type list (Section 4.1) is used for **both** the client's quote **and** the operational checklist — but the operational room list is a **separate, cleaner-controlled setup**, not auto-pulled from the client's quote answers.
- **First visit to a new property:** whoever arrives first — owner **or helper** — does a one-time walkthrough: picks rooms with counts, drags them into the actual cleaning order used. Pre-filled with the owner's standard time-per-room-type from their pricing settings.
- Room order is **editable anytime** afterward, not locked after the first visit.
- Every later visit reuses the saved room list/order automatically — zero repeat setup.
- After enough visits to a specific property, pacing adapts from the owner's generic baseline toward that **property's own actual historical timing** — self-correcting per address.
- **During the job**, a soft, non-punitive pacing signal nudges the cleaner room to room:
  - **Sound cue** (not vibration — iOS Safari blocks the web Vibration API entirely; sound works cross-platform with no native app needed).
  - **Lock screen notification** with tap-able buttons ("Next Room" / "+5 min") — standard Web Push notification actions, supported on iOS 16.4+ and Android, no native app required.
  - Explicitly **not** a live continuously-ticking lock-screen timer (that's Apple's native-only Live Activities/ActivityKit — ruled out).
  - **Smartwatch integration is off the table** — both Apple Watch (native watchOS/ActivityKit only) and Wear OS (cannot install PWAs at all) require native development; the sound + lock-screen-notification combo covers the same "quick glance, no need to unlock and open the app" need without it.
- Actual time-per-room is tracked passively, refining future pacing **and** feeding a pricing insight: if a cleaner is consistently running longer than quoted on a given room type, the app can flag that their pricing may be under real time spent.
- **This pacing-vs-pricing insight is owner-only** — never shown to helpers, even when a helper generated the underlying data.

### 4.10 Damage Handling
- **"Already damaged"** walkthrough log: optional, opened only when the cleaner wants to note something — not a forced prompt every job. Internal file only.
- **"Damaged during clean"** log:
  - If the **owner** is cleaning: they log it and separately decide how/when to tell the client.
  - If a **helper** is cleaning alone: logging it alerts the **owner**, who reviews and decides how to handle the client conversation. The helper never contacts the client about it directly.

### 4.11 Can't Access Property / No-Show
1. Cleaner/helper taps **"Can't Access"** on arrival.
2. Starts a wait timer — length configurable by the owner at setup (default suggestion: 15 minutes).
3. Instruction shown is **role-based**: owner on-site → "call the client" with the client's number, tap-to-dial. Helper on-site → "call the owner" with the owner's number, tap-to-dial (helpers never contact clients directly).
4. When the timer ends: two clear outcomes — **"Gained Access"** (resumes the job normally, no penalty) or **"Still No Access."**
5. "Still No Access" opens a note field pre-filled with useful context (arrival time, who was called, wait duration), fully editable, saved permanently to the client's internal file.
6. A separate **"Leaving Property"** tap timestamps actual departure, closes the job out on the route, and fires the client's no-show notification text.
7. Whether a no-show fee applies is, like every fee decision in this app, **manual and owner-only**, always logged, never automatic.
8. No-shows are noted on the client's profile so patterns become visible to the owner over time.

### 4.12 Payroll Sync
- The app is **not** a payroll processor — no tax withholding, W-2 filing, or direct deposit built in-house. It stays focused on accurately tracking hours (via helper check-in/out per job), which it already does.
- Owners can connect their existing payroll provider (Gusto, QuickBooks Payroll, Square Payroll, ADP, and others) through **Finch**, a unified payroll/HRIS API that connects to 250+ providers through one integration — meaning this app only has to build the sync logic once, and it works no matter which payroll tool a given owner already uses or switches to later.
- Once connected, hours sync automatically **shift by shift** (each check-in/check-out, not a lump total), classified as regular/overtime, matched to the right employee — so the owner isn't re-typing timesheets, and the payroll provider handles the actual pay run, tax compliance, and W-2s.
- This directly closes the "hours tracking, not real payroll" gap noted in Section 3.1 — real payroll processing lives with whichever specialist tool the owner already trusts, this app just feeds it clean, accurate data.

---

## 5. Key User Flows

### 5.1 Owner Sets Up Their Business (one-time)
1. Signs up, creates account.
2. Enters business basics — name, service area, contact info.
3. Adds branding — logo, colors.
4. Business phone number auto-provisions in the background.
5. Picks service types offered.
6. Builds the standard time-and-price-per-room-type table (drives both quoting and pacing).
7. Sets cancellation policy default, no-show wait time, and late-fee defaults.
8. Sets house rules and the waiver clients will e-sign.
9. Uploads proof of insurance/bonding, and W-9 (for commercial clients).
10. Connects Stripe for payment processing, plus their own subscription to the app.
11. Optionally invites helpers (name/phone/email → their own Helper login).
12. Optional "Recommended Tools" step — simple links to Quo (business phone/calling) and Bluevine (business banking), with Tiffany's affiliate links once secured. Stripe is not part of this step since it's required infrastructure, not a suggestion.
13. Optional "Want a professional website too?" — creates a lead for Tiffany to follow up on personally, not an automated deliverable.
14. Gets their live public booking link.

### 5.2 Client Books
1. Clicks the cleaner's booking link.
2. Lands on the branded booking page.
3. Picks service type, enters room counts, picks add-ons and frequency.
4. Gets an instant price, picks an open time slot.
5. Enters contact info; first-timers e-sign the waiver and add a card on file.
6. Gets a confirmation text/email.

### 5.3 First Visit to a New Property
Whoever shows up first — owner or helper — does the one-time room walkthrough (pick rooms, set order), pre-filled with the owner's baseline times. Saved permanently to that property's profile; editable anytime later.

### 5.4 Owner's Day-of Job
1. Opens app, sees today's route with drive times.
2. Pre-departure supply checklist.
3. Reminder text already auto-sent earlier per policy.
4. Taps "heading to job" — fires the "on my way" text with a calculated ETA.
5. Arrives; new property → room walkthrough, returning property → already loaded.
6. Optional "anything already damaged?" check.
7. Checks in, starts cleaning — sound cue + lock-screen notification pace them room to room.
8. Anything damaged during the clean: owner logs it and decides separately how/when to tell the client.
9. Marks job complete, optionally attaches photos.
10. Client auto-gets the "job complete" text with a review prompt.
11. Invoice auto-generates; card on file charges automatically, or a payment request goes out.
12. Post-job restock/repack checklist.
13. Actual room times quietly refine that property's pacing and feed the owner-only pricing insight.

### 5.5 Helper's Day-of Job
Same core loop as 5.4, with these differences: helper only sees their own assigned jobs; damage they log alerts the owner instead of the helper deciding how to notify the client; payments/invoicing happen entirely on the backend under the owner's account; check-in/out timestamps log the helper's hours for the owner's own payroll tracking (this app tracks hours worked — it is not a full payroll/tax-filing system).

### 5.6 Client Cancels/Reschedules by Text
See Section 4.7.

### 5.7 Late Payment
See Section 4.3.

### 5.8 Can't Access Property / No-Show
See Section 4.11.

### 5.9 Commercial Client Needs Paperwork
See Section 4.5 (W-9/insurance/contract one-click share, optional post-clean e-signature).

---

## 6. Why Responsive Web App (Not Native) — and What That Ruled In/Out

Every specific feature that seemed to need native app capability was checked against current (2026) platform behavior and redesigned to work in a browser instead:

| Feature idea | Native requirement found | Web-compatible resolution |
|---|---|---|
| Vibration-based pacing signal | iOS Safari blocks the web Vibration API entirely | **Sound cue** instead |
| Continuously-updating lock-screen timer | Requires Apple's native-only Live Activities (ActivityKit) | **Tap-to-advance push notification** with action buttons instead (works on iOS 16.4+ and Android) |
| Smartwatch tap to advance rooms | Apple Watch apps must be native (watchOS SDK); Wear OS cannot install PWAs at all | **Dropped** — the lock-screen notification covers the same "quick glance and tap" need |
| Live GPS-based automatic "on my way" text | iOS web apps can't reliably run in the background to track location | **Manual tap** to fire, with a calculated (not live-tracked) ETA |

Net result: the entire product, including the field/pacing experience, stays inside one responsive web app.

---

## 7. Technical Architecture (proposed)

- **Frontend:** Responsive web app, single codebase for phone + desktop.
- **Backend/database:** Supabase (Postgres, auth, storage), with Row Level Security enforcing tenant isolation at the database level.
- **Hosting:** Vercel.
- **Payments:** Stripe Connect (per-tenant connected accounts, platform fee on transactions).
- **SMS:** Twilio or similar programmatic SMS provider (auto-provisioned number per tenant).
- **Notifications:** Web Push API (notification actions for the lock-screen "next room" interaction; basic push for reminders).
- **Payroll sync:** Finch (unified API to 250+ payroll/HRIS providers — Gusto, QuickBooks Payroll, Square Payroll, ADP, etc.), one integration covering any provider an owner already uses.
- **Recommended (not integrated) external tools surfaced to cleaners:** Quo (business phone/calling), Bluevine (business banking).

---

## 8. Marketing (for the app itself, once built)

- Landing page/site + go-to-market messaging aimed at other solo cleaners.
- Tiffany's own story — ran a solo cleaning business for years, built the tool she wished existed — is the core credibility hook, more effective than generic SaaS copy.
- Demo/simulation video built around a single "hero flow" rather than a feature list: client runs the instant quote → books → gets the on-the-way text → job completes → client gets the complete text + review prompt → payment/invoice happens automatically in the background. This is what actually sells the app, because it shows the client-side experience.

---

## 9. Monetization Summary

- Cleaners pay a subscription to use the app.
- Stripe Connect platform fee — a small percentage on every transaction, collected automatically, ongoing (recommended over a one-time referral bonus).
- Possible Bluevine referral/affiliate partnership — they explicitly support this for "vertical software platforms"; apply directly through their partner program.
- Quo's referral program isn't publicly documented — needs a direct inquiry.
- Website-building add-on delivered personally by Tiffany as a separate service, surfaced as an option during signup.

---

## 10. What's Needed Before/During Build

- **Supabase account** — database/backend (can be provisioned through this session).
- **Vercel account** — hosting (can be provisioned through this session).
- **Stripe account with Connect enabled** — requires Tiffany's business/banking details; only she can create this.
- **Twilio (or similar) account** — for the texting engine.
- **Domain name** — for a professional URL once ready to launch.

## 11. Recommended Build Order (internal — not a phased release to users)

1. Multi-tenant foundation: auth, business accounts, Row Level Security data model.
2. Core job lifecycle: booking → quote → schedule → complete.
3. Payments: Stripe Connect integration, invoicing, late payment handling.
4. Texting: number provisioning, automated messages, two-way reply handling.
5. Room setup, pacing signal, checklists, damage logging.
6. Waivers, insurance/W-9 sharing, commercial e-signature.
7. Helper accounts and permissions.
8. Admin/owner dashboard polish, marketing site, demo video.
9. End-to-end testing using Tiffany's own business as the first live tenant.
10. Open signup to other solo cleaners.
