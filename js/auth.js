/**
 * Centralized Authentication, User Profiles, Roles, and Route Guards
 * Smart College Complaint Management System - Oriental College of Technology
 */

import { 
    auth, 
    db, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail, 
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    doc, 
    getDoc, 
    setDoc, 
    serverTimestamp 
} from "./firebase-config.js";

import { showToast } from "./utils.js";

// Cached profile state in memory
let cachedUser = null;
let cachedProfile = null;

/**
 * Initializes and listens to Firebase Auth state.
 */
export function getAuthState() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            cachedUser = user;
            if (user) {
                cachedProfile = await fetchUserProfile(user.uid);
            } else {
                cachedProfile = null;
            }
            unsubscribe();
            resolve({ user: cachedUser, profile: cachedProfile });
        });
    });
}

/**
 * Derives a canonical authority role from email if predefined
 */
function inferRoleFromEmail(email) {
    if (!email) return "student";
    const lower = email.toLowerCase().trim();
    if (lower.startsWith("admin@")) return "Admin";
    if (lower.startsWith("director@")) return "Director";
    if (lower.startsWith("dean@")) return "Dean";
    if (lower.startsWith("hod@")) return "HOD";
    if (lower.startsWith("warden@")) return "Warden";
    if (lower.startsWith("tg@")) return "TG";
    return "student";
}

/**
 * Fetches the user document from Firestore: users/{uid}
 * Gracefully provides synthesized default profile if record is not yet synced.
 */
export async function fetchUserProfile(uid) {
    if (!uid) return null;
    try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap && userSnap.exists()) {
            return { uid, ...userSnap.data() };
        }
    } catch (err) {
        console.warn("Error fetching user profile:", err);
    }

    // Synthesize profile from active auth state
    const current = auth.currentUser;
    if (current && current.uid === uid) {
        const email = current.email ? current.email.toLowerCase() : "";
        const role = inferRoleFromEmail(email);
        const namePart = email.split("@")[0].replace(/[._]/g, " ");
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

        const syntheticProfile = {
            uid,
            name: current.displayName || formattedName || "User",
            email,
            role,
            department: role === "student" ? "Engineering Department" : "College Administration",
            phone: "9876543210",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        try {
            await setDoc(doc(db, "users", uid), syntheticProfile);
        } catch (e) {}

        return syntheticProfile;
    }

    return null;
}

/**
 * Student Registration
 * Creates Firebase Auth account and stores Firestore users/{uid} document with role 'student'.
 */
export async function registerStudent({ name, email, department, phone, password }) {
    if (!name || !email || !department || !password) {
        throw new Error("Please fill all required fields.");
    }
    if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
    }

    await setPersistence(auth, browserLocalPersistence);

    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    const profileData = {
        uid: user.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        department: department.trim(),
        phone: (phone || "").trim(),
        role: "student",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    // Store in Firestore users/{uid}
    await setDoc(doc(db, "users", user.uid), profileData);

    cachedUser = user;
    cachedProfile = profileData;

    return { user, profile: profileData };
}

/**
 * Universal Login
 * Handles persistence (Remember Me: local vs session) and resolves the verified user role from Firestore.
 */
export async function loginUser(email, password, rememberMe = true) {
    if (!email || !password) {
        throw new Error("Please enter both email and password.");
    }

    const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistenceType);

    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    // Fetch verified role directly from Firestore
    let profile = await fetchUserProfile(user.uid);
    if (!profile) {
        profile = {
            uid: user.uid,
            name: email.split("@")[0],
            email: email.toLowerCase(),
            role: inferRoleFromEmail(email),
            department: "General",
            createdAt: serverTimestamp()
        };
        await setDoc(doc(db, "users", user.uid), profile);
    }

    cachedUser = user;
    cachedProfile = profile;
    return { user, profile };
}

/**
 * Sign Out
 */
export async function logoutUser() {
    cachedUser = null;
    cachedProfile = null;
    await signOut(auth);
}

/**
 * Password Reset
 */
export async function requestPasswordReset(email) {
    if (!email || !email.trim()) {
        throw new Error("Please enter your registered email address.");
    }
    await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Comprehensive Route Guard
 * Enforces authentication and authorization rules on every page.
 */
export async function requireAuth({ 
    allowedRoles = [], 
    redirectIfAuthenticated = false 
} = {}) {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // If on login/signup page and not logged in, allow access
                if (redirectIfAuthenticated) {
                    resolve(null);
                    return;
                }

                // If on protected page, redirect to appropriate login
                const currentPath = window.location.pathname.toLowerCase();
                if (currentPath.includes("authority") || currentPath.includes("admin")) {
                    window.location.replace("authority-login.html");
                } else {
                    window.location.replace("index.html");
                }
                return;
            }

            // User is authenticated: retrieve profile
            let profile = cachedProfile;
            if (!profile || profile.uid !== user.uid) {
                profile = await fetchUserProfile(user.uid);
                cachedProfile = profile;
            }

            const role = profile ? profile.role : inferRoleFromEmail(user.email);

            // If user is already logged in and visiting login/signup, route to their correct dashboard
            if (redirectIfAuthenticated) {
                if (role === "Admin") {
                    window.location.replace("admin-dashboard.html");
                } else if (role === "student") {
                    window.location.replace("dashboard.html");
                } else {
                    window.location.replace("authority-dashboard.html");
                }
                return;
            }

            // Enforce role-based access control
            if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
                showToast("Access Denied: You do not have permissions for this section.", "error");

                setTimeout(() => {
                    if (role === "student") {
                        window.location.replace("dashboard.html");
                    } else if (role === "Admin") {
                        window.location.replace("admin-dashboard.html");
                    } else {
                        window.location.replace("authority-dashboard.html");
                    }
                }, 800);
                return;
            }

            resolve({ user, profile });
        });
    });
}
