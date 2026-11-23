# Smart College Complaint System - Codebase Audit Report
**Target Project:** Oriental College of Technology - Smart College Complaint System  
**Date:** November 2026  
**Auditor:** Senior Full-Stack Security & Software Engineer

---

## 1. Executive Summary
An exhaustive audit of all 20 source files in the repository was conducted, including Java servlets, DAO classes, HTML pages, duplicate "- Copy" files, and CSS stylesheets. The audit revealed that the application is currently split across three disjoint architectures (Java/MySQL, LocalStorage, and incomplete Firebase client modules), contains critical security flaws (hardcoded credentials, client-side role manipulation, XSS vulnerabilities), has duplicate and orphaned files, and has broken user workflows.

Below is the itemized inventory of every bug, security vulnerability, dead code, duplicate file, and architectural flaw discovered prior to refactoring.

---

## 2. Inventory of Audited Files
| File Name | File Type | Current State / Purpose | Issues Identified |
|---|---|---|---|
| `index.html` | HTML / JS | Student Login | No Firebase Auth; uses spoofable `localStorage`; Remember Me unhandled; no viewport meta; links to `signup.html` (case mismatch with `Signup.html`). |
| `Signup.html` | HTML / Form | Student Signup | Submits via POST to `RegisterServlet` (broken on static/Firebase hosting); file case is `Signup.html` while links refer to `signup.html`. |
| `complaint.html` | HTML / JS | Complaint submission form | Mixes Firebase v12.3.0 and `localStorage`; student manually enters authority email/phone; file upload does not upload to Storage; no submit rate-limiting. |
| `complaint - Copy.html` | HTML / Markdown | Orphaned backup | Contains invalid Markdown wrapper (````html```), dead `localStorage` logic; duplicate file. |
| `dashboard.html` | HTML / JS | Student Dashboard | Polls/reads Firestore by `studentName` (not UID); XSS via feedback/complaint HTML interpolation; `prompt()` used for reopening; lacks proper route guard. |
| `authority-login.html` | HTML / JS | Authority Login | Contains a `<select id="role">` dropdown allowing clients to claim any authority role without server verification; saves to `localStorage`. |
| `authority-login - Copy.html` | HTML / JS | Orphaned backup | Non-Firebase legacy login trusting `localStorage` completely; duplicate file. |
| `authority-dashboard.html` | HTML / JS | Authority Dashboard | Reads role from `localStorage`; lacks route guard; uses `prompt()` for Reject, Forward, Comment; real-time listener incorrectly nested in `addComment()`; XSS risks. |
| `authority-dashboard - Copy.html`| HTML / JS | Orphaned backup | Reads strictly from `localStorage`; lacks Firebase integration; duplicate file. |
| `admin-dashboard.html` | HTML / JS | Admin Analytics | Completely disconnected from Firestore (reads `localStorage.getItem("complaints")`); no user management; no complaint reassignment capability. |
| `admin-dashboard - Copy.html` | HTML / JS | Orphaned backup | Older duplicate version of the admin dashboard; duplicate file. |
| `notifications.html` | HTML / JS | Notifications UI | Reads `localStorage`; mutates array using `notifications.reverse()`; severe XSS vulnerabilities (`innerHTML` interpolation); two conflicting Back buttons; no unread toggle. |
| `style.css` | CSS | Global Stylesheet | Missing responsive media queries; missing button styles; inline styles override CSS with `!important`; background image scaling distorts `oct.png`. |
| `oct.png` | Asset | Background image | Used as stretched background (`background-size: 100% 100%!important`), distorting aspect ratio. |
| `ComplaintDAO.java` | Java / JDBC | Legacy Data Access | Hardcoded category mapping diverging from client; relies on MySQL; dead code in Firebase architecture. |
| `ComplaintServlet.java` | Java / Servlet | Legacy Controller | Hardcoded dummy student ID `int studentId = 1;`; dead code in Firebase architecture. |
| `DatabaseConnection.java` | Java / JDBC | Database Config | **CRITICAL SECURITY ISSUE**: Hardcoded plaintext root password `Laxmi@123` for MySQL. |
| `LoginServlet.java` | Java / Servlet | Legacy Auth | Relies on MySQL sessions; dead code in Firebase architecture. |
| `RegisterServlet.java` | Java / Servlet | Legacy Registration| Case mismatch redirect (`signup.html?error=...`); dead code in Firebase architecture. |
| `UserDAO.java` | Java / JDBC | Legacy User DAO | Plaintext password storage query (`WHERE email = ? AND password = ?`); dead code in Firebase architecture. |
| `.vscode/settings.json` | JSON | IDE Config | References local user path `c:\Users\khushbukumari\Downloads\...` for JARs. |

---

## 3. Detailed Categorization of Issues

### 3.1 Security Vulnerabilities (High & Critical)
1. **Plaintext Database Password Exposed:**  
   `DatabaseConnection.java` line 8 exposes `private static final String PASSWORD = "Laxmi@123";`. This credential must be rotated immediately by the database administrator.
2. **Client-Side Role Authorization & Privilege Escalation:**  
   In `authority-login.html`, any user can select any role ("Admin", "Director", "Dean", "HOD", "Warden", "TG") from a dropdown `<select id="role">`. The role is stored directly in `localStorage.setItem("loggedAuthority", role)`. `authority-dashboard.html` reads this value directly, permitting trivial privilege escalation via browser DevTools or request tampering.
3. **Cross-Site Scripting (Stored XSS):**  
   - In `notifications.html`, notification content is inserted via `list.innerHTML += `<div class="notification"><p><b>${n.title}</b></p><p>${n.message}</p>...`.
   - In `dashboard.html`, complaint location, description, feedback, and student name are concatenated into `innerHTML`.
   - In `authority-dashboard.html`, activity messages and comments allow script injection if not escaped properly.
4. **Missing Firebase Security Rules:**  
   No `firestore.rules` or `storage.rules` files exist. Without rules, anyone with the Firebase config can read and overwrite the entire database.
5. **No Route Guards or Session Verification:**  
   Direct access to `dashboard.html`, `authority-dashboard.html`, and `admin-dashboard.html` is possible without authenticating against Firebase Auth.

### 3.2 Dead Code, Duplicate Files & Architecture Conflict
1. **Three Disjoint Architectures:**
   - Java Servlets + MySQL (`ComplaintServlet`, `LoginServlet`, `RegisterServlet`, `UserDAO`, `ComplaintDAO`, `DatabaseConnection`).
   - Browser `localStorage` (`admin-dashboard.html`, `notifications.html`, `index.html`).
   - Client Firebase modular scripts (`complaint.html`, `dashboard.html`, `authority-dashboard.html`).
2. **Duplicate "- Copy" Files:**
   - `admin-dashboard - Copy.html`
   - `authority-dashboard - Copy.html`
   - `authority-login - Copy.html`
   - `complaint - Copy.html` (contains literal markdown code block fences)
3. **Mismatched Firebase SDK Versions:**
   - `complaint.html` and `dashboard.html` import `https://www.gstatic.com/firebasejs/12.3.0/...`.
   - `authority-dashboard.html` and `authority-login.html` import `https://www.gstatic.com/firebasejs/11.0.2/...`.
   - Firebase config is duplicated in 4 different files with global `window.firebaseDB` leakage.

### 3.3 Functional & Business Logic Bugs
1. **Broken Student Registration:**
   `Signup.html` posts to `RegisterServlet`, which fails on Firebase static hosting. Student registration must use Firebase Authentication and create `users/{uid}` in Cloud Firestore.
2. **Student Manual Entry of Authority Contact:**
   `complaint.html` required students to manually enter the authority's email and phone number, breaking automated routing and college privacy.
3. **Inconsistent Category-to-Authority Mappings:**
   Differences between Java DAO and HTML mappings caused complaints (e.g. Infrastructure, Canteen) to route to different roles depending on the file.
4. **Missing Storage Upload:**
   The photo/video upload file input in `complaint.html` was ignored; `proofUrl` was never populated or uploaded.
5. **Array Mutation via `.reverse()`:**
   In `notifications.html`, calling `notifications.reverse()` mutates the in-memory array in-place, causing notifications to flip ordering repeatedly.
6. **Double-Back Buttons:**
   `notifications.html` features both a "Back to Dashboard" button and a `goBack()` history button.
7. **`prompt()` and `confirm()` Dialogs:**
   `authority-dashboard.html` and `dashboard.html` rely on blocking native `prompt()` dialogs for reasons, comments, and forwarding roles, which are error-prone and fail to enforce formatting on mobile devices.
8. **Real-time Listener Misplacement:**
   In `authority-dashboard.html`, the `onSnapshot` listener was placed inside the `addComment` function scope instead of initializing on page load.
9. **Admin Dashboard Disconnected:**
   `admin-dashboard.html` displays mock statistics from `localStorage` instead of querying real Firestore complaints and users.
10. **File Name Casing Mismatch:**
    `Signup.html` vs links to `signup.html` breaks on case-sensitive static file servers.

### 3.4 UI / UX & Responsiveness Flaws
1. Background image `oct.png` has `background-size: 100% 100% !important;` which distorts the aspect ratio on screens of different dimensions.
2. Missing viewport meta tags on `index.html`, `dashboard.html`, `authority-dashboard.html`, and `notifications.html`.
3. Heavy reliance on inline `!important` CSS rules rather than clean semantic CSS classes.
4. Lack of loading spinners, disabled submission states, empty state banners, and consistent status pill badges.

---

## 4. Refactoring Action Plan
1. **Archive Legacy Code:** Move all Java servlets and DAOs into `/legacy-java` with a README. Warn the user regarding rotating the exposed MySQL password. Delete all `- Copy` files.
2. **Standardize on Firebase Architecture:** Pin Firebase SDK to `11.4.0` ES modules. Create shared modules:
   - `js/firebase-config.js`
   - `js/auth.js` (Auth state, route guards, role lookup, remember-me)
   - `js/utils.js` (XSS sanitization, modals, formatting, constants)
3. **Implement Full Auth & User Management:**
   - Student signup/login with Firebase Auth + Firestore `users/{uid}`.
   - Authority login verifying stored role in `users/{uid}.role` (no dropdown).
   - Password reset and Remember Me persistence.
   - Seed script for initial authority accounts.
4. **Complaints Workflow & Routing:**
   - Deterministic ID generator (`CMP-YYYY-XXXX`).
   - Single source of truth for category-to-authority mapping.
   - Storage upload with size/type validation.
   - Atomically tracked `history[]` timeline.
5. **Dashboards & Notifications:**
   - Real-time Firestore sync with `onSnapshot`.
   - Authority actions (Accept, Comment, Reject, Forward, Resolve) with accessible HTML modals.
   - Admin analytics, charts, user management, and reassignment.
   - Auto-escalation client logic with audit logging.
   - Real-time `notifications` collection with unread counters.
6. **Security Rules & Sanitization:**
   - `firestore.rules` and `storage.rules`.
   - DOM sanitization / safe rendering.
7. **Verification:**
   - End-to-end browser testing and screenshots across all 9 required flows.
