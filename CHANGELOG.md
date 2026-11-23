# Changelog: Smart College Complaint Management System Refactoring

All notable changes, fixes, security hardening, and architectural migrations completed for the Oriental College of Technology Grievance Portal are documented herein.

---

## [2.0.0] - 2026-11-23

### 🛡️ Critical Security Fixes
1. **Removed Hardcoded Credentials:**
   - Isolated and removed plaintext database credentials (`PASSWORD = "Laxmi@123"`) found in `DatabaseConnection.java`.
   - Archived legacy Java/MySQL code into `/legacy-java` and issued a critical credential rotation notice in `/legacy-java/README.md`.
2. **Eliminated Client-Side Role Spoofing:**
   - Removed the vulnerability in `authority-login.html` where users could choose any authority role (e.g., Admin, Director) from a `<select>` dropdown.
   - Enforced that user roles originate exclusively from the server-side verified Firestore document (`users/{uid}.role`).
3. **Cross-Site Scripting (Stored XSS) Prevention:**
   - Eliminated unsafe `innerHTML` interpolations in `dashboard.html`, `notifications.html`, `authority-dashboard.html`, and `admin-dashboard.html`.
   - Created centralized `escapeHTML()` and `formatDateTime()` sanitizers in `js/utils.js`.
   - Ensured all user-supplied descriptions, names, comments, feedback, and locations are rendered strictly as safe text or safely escaped DOM elements.
4. **Comprehensive Security Rules:**
   - Implemented `firestore.rules` enforcing role-based access control (RBAC):
     - Students can only create and read their own complaints (`studentUid == request.auth.uid`).
     - Authorities can only read and update complaints assigned to their verified role (or Admin for all).
     - Users are prevented from modifying their own roles.
     - Notifications are restricted strictly to the recipient (`toUid == request.auth.uid`).
   - Implemented `storage.rules` restricting upload file types (images and videos) and enforcing a 25MB maximum size limit under `complaints/{userId}/{fileName}`.
5. **Universal Route Guards:**
   - Implemented `requireAuth()` in `js/auth.js` to guard every page against unauthorized access.
   - Unauthenticated users are redirected to login (`index.html` or `authority-login.html`).
   - Students attempting to open authority pages are blocked and routed to `dashboard.html`.
   - Non-admin authorities attempting to access `admin-dashboard.html` are routed to `authority-dashboard.html`.
   - Double-submit rate limiting added to disable buttons during form processing.

---

### 🏗️ Architecture Consolidation & Cleanup
1. **Unified on Single Firebase Architecture:**
   - Standardized the entire application on pinned modular Firebase Web SDK `v11.4.0` (Firebase Auth, Cloud Firestore, Firebase Storage).
   - Removed three conflicting backend implementations (Java Servlets, LocalStorage data persistence, and mismatched Firebase scripts).
   - Created shared ES modules:
     - `js/firebase-config.js`: Centralized Firebase app, auth, db, and storage singletons.
     - `js/auth.js`: Authentication state, student registration, role lookup, Remember Me persistence, and route guards.
     - `js/utils.js`: Business rules, single-source-of-truth mappings, deterministic ID generator, accessible modal system, notifications dispatcher, and auto-escalation engine.
2. **Eliminated Orphaned & Duplicate Files:**
   - Deleted duplicate backup files: `admin-dashboard - Copy.html`, `authority-dashboard - Copy.html`, `authority-login - Copy.html`, and `complaint - Copy.html`.
   - Renamed `Signup.html` to `signup.html` to fix case-sensitivity routing bugs on static web servers.
3. **Restricted LocalStorage Scope:**
   - Removed all complaint and notification data storage from browser `localStorage`.
   - Confined `localStorage` strictly to benign UI preferences (e.g. Remember Me email preference).

---

### ⚙️ Functional & Business Logic Improvements
1. **Deterministic Complaint ID Generation:**
   - Replaced pseudo-random `CMP` + 4-digit numbers with safe, year-scoped IDs (`CMP-YYYY-XXXX`, e.g. `CMP-2026-0001`) backed by Firestore transactions.
2. **Single Source of Truth for Routing:**
   - Centralized category-to-authority mappings in `CATEGORY_AUTHORITY_MAP` (`js/utils.js`):
     - Hostel &rarr; Warden
     - Classroom &rarr; TG
     - Faculty, Lab, Academic, Infrastructure &rarr; HOD
     - Safety / Ragging &rarr; Dean
     - Library, WiFi, Canteen, Transport, Other &rarr; Admin
3. **Automated Authority Assignment:**
   - Removed student manual inputs for authority email and phone numbers in `complaint.html`.
   - Assigned authorities are dynamically mapped and routed automatically upon category selection.
4. **Firebase Storage Media Upload:**
   - Fixed file upload in `complaint.html` to stream images/videos to Firebase Storage with real-time progress bars, error handling, and saved `proofUrl`.
5. **Replaced Native `prompt()` and `confirm()` Dialogs:**
   - Developed an accessible, keyboard-trapped modal dialog system in `js/utils.js`.
   - Replaced all blocking native `prompt()` calls across dashboards for comments, rejection reasons, forwarding authorities, reopening complaints, and password resets.
6. **Enforced Rejection Justification:**
   - Formally blocked rejecting a complaint without a mandatory written justification.
7. **Fixed Array Mutation Bug in Notifications:**
   - Fixed `notifications.html` where in-place `notifications.reverse()` caused reversed array flip-flops.
   - Removed redundant double "Back" buttons in `notifications.html`, providing a single contextual Back button.
8. **Real-time Lifecycle & Notifications:**
   - Added real-time notifications written to `notifications/{id}` on every status transition, assignment, forwarding, and comment.
   - Added unread badge counts and a "Mark All as Read" batch updater.
9. **Automated Escalation Engine:**
   - Implemented client-side auto-escalation check for pending complaints exceeding 24 hours: TG/Warden &rarr; HOD &rarr; Dean &rarr; Director.
   - Flagged escalated grievances with an `Escalated` status badge and audit trail in `history[]`.
10. **Full Admin Master Control:**
    - Connected `admin-dashboard.html` to Firestore for live statistics, circular progress charts, full grievance search, authority reassignment, and student/staff user directory.

---

### 🎨 UI / UX & Responsiveness Enhancements
1. **Aspect-Ratio Fixed Background:**
   - Fixed `body` styling in `style.css` to use `background-size: cover; background-position: center;`, correcting distorted stretching of `oct.png`.
2. **Mobile-First Responsiveness:**
   - Added `<meta name="viewport" content="width=device-width, initial-scale=1.0">` across all HTML files.
   - Implemented responsive CSS flexbox and grid layouts for seamless operation from mobile viewports (375px) up to ultra-wide desktop monitors.
3. **Consistent Design System:**
   - Standardized Oriental College of Technology (OCT) branding, typography, color palettes, glassmorphism blur effects, button hierarchies, and status pill badges.
   - Added accessible form focus outlines, loading spinners, and empty-state placeholders.
