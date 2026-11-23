# Smart College Complaint Management System
**Oriental College of Technology (OCT)**  
*A modern, secure, and real-time grievance redressal system built with pure HTML, CSS, JavaScript (ES modules), and Google Firebase.*

---

## 📌 Project Overview
The Smart College Complaint Management System allows students of Oriental College of Technology to lodge grievances across various college departments (Hostel, Classroom, Faculty, Labs, Infrastructure, Safety, etc.), track their progress through a live timeline, receive real-time notifications, and provide satisfaction feedback once resolved.

College authorities (Teacher Guardians, Wardens, Heads of Departments, Deans, Director, and Administrators) review, investigate, comment, forward, and resolve complaints through dedicated role-based queues with automatic escalation.

---

## 🏛️ System Architecture

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|  Plain Semantic HTML5 + Responsive Mobile-First CSS + ES Module JavaScript        |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  |   Student Portal   |   |   Authority Portal    |   |   Admin Master Panel   |  |
|  |  (index / signup / |   |  (authority-login /   |   | (admin-dashboard.html) |  |
|  | dashboard / compl) |   |  authority-dashboard) |   |                        |  |
|  +--------------------+   +-----------------------+   +------------------------+  |
|             \                         |                         /                 |
|              \                        |                        /                  |
|               +-----------------------+-----------------------+                   |
|                                       |                                           |
|                  Shared Modules: firebase-config, auth, utils                     |
+---------------------------------------+-------------------------------------------+
                                        |
+---------------------------------------v-------------------------------------------+
|                              FIREBASE CLOUD BACKEND                               |
|                                                                                   |
|  +------------------------+  +--------------------------+  +-------------------+  |
|  |     Firebase Auth      |  |     Cloud Firestore      |  |  Firebase Storage |  |
|  | - Student Sign Up      |  | - users/{uid} (RBAC)     |  | - Photo/Video     |  |
|  | - Authority Login      |  | - complaints/{id}        |  |   Proof Uploads   |  |
|  | - Session Persistence  |  | - notifications/{id}     |  |   (Max 25MB)      |  |
|  | - Password Reset       |  | - counters/complaints    |  |                   |  |
|  +------------------------+  +--------------------------+  +-------------------+  |
|                                                                                   |
|  Security: Enforced by firestore.rules & storage.rules                            |
+-----------------------------------------------------------------------------------+
```

---

## 📂 Project Directory Structure

```
SmartCollegeComplaint/
├── index.html                   # Student Login & Password Reset
├── signup.html                  # Student Registration (Auth + Firestore users/{uid})
├── complaint.html               # New Grievance Submission with Media Proof Upload
├── dashboard.html               # Student Live Dashboard (Real-time tracking, feedback)
├── authority-login.html         # Authority Login (Verified Firestore RBAC, no dropdown)
├── authority-dashboard.html     # Authority Queue (Accept, Comment, Reject, Forward, Resolve)
├── admin-dashboard.html         # Admin Analytics, Reassignment & User Directory
├── notifications.html           # Real-time Notifications & Mark-as-read
├── seed.html                    # One-Time Authority Account Provisioning Tool
├── style.css                    # Unified Responsive Design System & Glassmorphism
├── firestore.rules              # Cloud Firestore Security Rules (RBAC)
├── storage.rules                # Firebase Storage Security Rules
├── server.js                    # Built-in lightweight static server for local dev
├── oct.png                      # College campus background photograph
├── AUDIT.md                     # Initial full codebase audit & vulnerability assessment
├── CHANGELOG.md                 # Itemized log of all bugs and security fixes
├── TEST_REPORT.md               # End-to-end verification report & test matrix
│
├── js/                          # Modular ES6 JavaScript
│   ├── firebase-config.js       # Pinned Firebase SDK (v11.4.0) single source of truth
│   ├── auth.js                  # Authentication, profile management, and route guards
│   └── utils.js                 # XSS escaping, accessible modals, ID generator, auto-escalation
│
└── legacy-java/                 # Archived legacy Java servlets & MySQL DAO classes
    ├── README.md                # Migration notice & database password rotation advisory
    ├── DatabaseConnection.java
    ├── ComplaintDAO.java
    ├── ComplaintServlet.java
    ├── LoginServlet.java
    ├── RegisterServlet.java
    └── UserDAO.java
```

---

## 🔒 Security Specifications

### 1. Role-Based Access Control (RBAC)
- **Student**: Can create grievances for themselves; can only read and rate their own grievances (`studentUid == request.auth.uid`). Cannot access authority or admin pages.
- **TG / Warden / HOD / Dean / Director**: Can read and update only grievances where `currentAssignee == my role`. Cannot modify their own assigned roles.
- **Admin**: Full read, update, and reassignment permissions across all complaints and view privileges for user accounts.
- Enforced on both the client (via `requireAuth()` route guards) and the database (`firestore.rules`).

### 2. Cross-Site Scripting (XSS) Hardening
- Direct interpolation into `innerHTML` is strictly prohibited.
- All user-generated text is sanitized via `escapeHTML()` and safe DOM text methods.

### 3. Automated Authority Assignment Mapping
Complaints are routed according to a strict single-source-of-truth mapping in `js/utils.js`:
| Category | Assigned Authority |
|---|---|
| Hostel | Warden |
| Classroom | Teacher Guardian (TG) |
| Faculty, Lab, Academic, Infrastructure | Head of Department (HOD) |
| Safety / Security / Ragging | Dean |
| Library, WiFi, Canteen, Transport, Other | Admin |

### 4. Auto-Escalation Hierarchy
Pending complaints exceeding 24 hours are automatically escalated:
$$\text{TG / Warden} \longrightarrow \text{HOD} \longrightarrow \text{Dean} \longrightarrow \text{Director}$$

---

## 🚀 Getting Started

### Prerequisites
- Any modern web browser (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari)
- Node.js (v18+) for local development testing

### Running Locally
1. Clone or open the repository folder:
   ```powershell
   cd c:\Users\khushbukumari\OneDrive\Desktop\SmartCollegeComplaint
   ```
2. Start the built-in HTTP server:
   ```powershell
   node server.js
   ```
3. Open your browser and navigate to:
   ```
   http://127.0.0.1:3000/
   ```

### Initial Provisioning (Seed Authorities)
To set up the default college authority accounts:
1. Navigate to: `http://127.0.0.1:3000/seed.html`
2. Click **"Run Authority Provisioning"**.
3. This creates the sample authority accounts in Firebase Auth and populates their verified roles in `users/{uid}`:
   - **TG**: `tg@oct.ac.in` / `Oct@12345`
   - **Warden**: `warden@oct.ac.in` / `Oct@12345`
   - **HOD**: `hod@oct.ac.in` / `Oct@12345`
   - **Dean**: `dean@oct.ac.in` / `Oct@12345`
   - **Director**: `director@oct.ac.in` / `Oct@12345`
   - **Admin**: `admin@oct.ac.in` / `Oct@12345`

---

## 🌐 Deploying to Firebase Hosting

To deploy this static application to production Firebase Hosting:
1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```
2. Log in to your Firebase account:
   ```bash
   firebase login
   ```
3. Initialize hosting in the project directory:
   ```bash
   firebase init
   ```
   - Select **Firestore**, **Storage**, and **Hosting**.
   - Public directory: `.` (current directory).
   - Configure as single-page app: `No`.
   - Firestore rules: `firestore.rules`.
   - Storage rules: `storage.rules`.
4. Deploy rules and hosting:
   ```bash
   firebase deploy
   ```
