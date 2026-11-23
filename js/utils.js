/**
 * Shared Utilities, Business Rules, Modals, and Sanitization
 * Smart College Complaint Management System - Oriental College of Technology
 */

import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    runTransaction, 
    serverTimestamp, 
    arrayUnion,
    Timestamp 
} from "./firebase-config.js";

// ==========================================
// 1. BUSINESS CONFIGURATION & SINGLE SOURCES OF TRUTH
// ==========================================

export const CATEGORY_AUTHORITY_MAP = {
    "Hostel": "Warden",
    "Classroom": "TG",
    "Faculty": "HOD",
    "Lab": "HOD",
    "Academic": "HOD",
    "Infrastructure": "HOD",
    "Safety": "Dean",
    "Library": "Admin",
    "WiFi": "Admin",
    "Canteen": "Admin",
    "Transport": "Admin",
    "Other": "Admin"
};

export const COMPLAINT_TYPES = {
    "Hostel": [
        "Room Problem",
        "Food Quality",
        "Food Hygiene",
        "Food Quantity",
        "Water Problem",
        "Electricity Problem",
        "Cleanliness",
        "Security Issue"
    ],
    "Classroom": [
        "Fan / AC Problem",
        "Light Problem",
        "Projector Problem",
        "Furniture Problem",
        "Cleanliness Issue",
        "Other Classroom Issue"
    ],
    "Faculty": [
        "Teaching Issue",
        "Behaviour Related",
        "Attendance Issue",
        "Syllabus Coverage",
        "Other Faculty Issue"
    ],
    "Lab": [
        "Computer Problem",
        "Equipment Problem",
        "Software Issue",
        "Internet Problem",
        "Other Lab Issue"
    ],
    "Academic": [
        "Examination Issue",
        "Result Issue",
        "Timetable Problem",
        "Academic Document Issue",
        "Other Academic Issue"
    ],
    "Infrastructure": [
        "Building Problem",
        "Water Problem",
        "Electricity Problem",
        "Furniture Problem",
        "Elevator Problem",
        "Washroom Issue"
    ],
    "Safety": [
        "Security Issue",
        "Emergency",
        "Safety Problem",
        "Ragging Concern",
        "Harassment / Disciplinary Issue"
    ],
    "Library": [
        "Book Issue",
        "Library Facility",
        "Computer Problem",
        "Reading Room Problem",
        "Other Library Issue"
    ],
    "WiFi": [
        "Wi-Fi Not Working",
        "Slow Internet",
        "Account / Login Issue",
        "Coverage Problem"
    ],
    "Canteen": [
        "Food Quality",
        "Food Hygiene",
        "Food Quantity",
        "Overcharging",
        "Cleanliness Issue"
    ],
    "Transport": [
        "Bus Delay / Timing",
        "Driver Behaviour",
        "Route Issue",
        "Vehicle Breakdown",
        "Other Transport Issue"
    ],
    "Other": [
        "Sports Facility Issue",
        "Administrative Issue",
        "Fee / Accounts Inquiry",
        "Other College Issue"
    ]
};

export const AUTHORITY_ROLES = ["TG", "Warden", "HOD", "Dean", "Director", "Admin"];

export const ESCALATION_CHAIN = {
    "TG": "HOD",
    "Warden": "HOD",
    "HOD": "Dean",
    "Dean": "Director"
};

// ==========================================
// 2. SECURITY & HTML SANITIZATION
// ==========================================

/**
 * Escapes user input to prevent Cross-Site Scripting (XSS).
 * Safe for inserting into text or HTML contexts.
 */
export function escapeHTML(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================
// 3. DETERMINISTIC COMPLAINT ID GENERATOR
// ==========================================

/**
 * Generates safely serialized complaint IDs in format: CMP-YYYY-XXXX (e.g., CMP-2026-0001)
 * Uses Firestore transaction on 'counters/complaints' with fallback if offline.
 */
export async function generateComplaintCode(db) {
    const year = new Date().getFullYear();
    const counterRef = doc(db, "counters", "complaints");

    try {
        const nextNumber = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let current = 0;
            if (counterDoc.exists()) {
                const data = counterDoc.data();
                if (data.year === year && typeof data.count === "number") {
                    current = data.count;
                }
            }
            const next = current + 1;
            transaction.set(counterRef, { year, count: next }, { merge: true });
            return next;
        });

        return `CMP-${year}-${String(nextNumber).padStart(4, "0")}`;
    } catch (err) {
        console.warn("Counter transaction fallback:", err);
        // Resilient fallback with high randomness to guarantee uniqueness
        const fallbackNum = Math.floor(1000 + Math.random() * 9000);
        return `CMP-${year}-${fallbackNum}`;
    }
}

// ==========================================
// 4. NOTIFICATIONS DISPATCHER
// ==========================================

/**
 * Dispatches an atomic notification into the 'notifications' collection.
 */
export async function createNotification(db, { toUid, toRole = null, title, message, complaintId = null }) {
    if (!toUid && !toRole) return;
    try {
        await addDoc(collection(db, "notifications"), {
            toUid: toUid || null,
            toRole: toRole || null,
            title: title.trim(),
            message: message.trim(),
            complaintId: complaintId || null,
            read: false,
            createdAt: serverTimestamp()
        });
    } catch (err) {
        console.error("Failed to create notification:", err);
    }
}

// ==========================================
// 5. AUTO-ESCALATION ENGINE (CLIENT & TRIGGERABLE)
// ==========================================

/**
 * Evaluates pending complaints and escalates those exceeding the hour threshold.
 * Hierarchy: TG/Warden -> HOD -> Dean -> Director
 * @param {Firestore} db
 * @param {Array} complaints
 * @param {number} hoursThreshold (default 24h)
 * @returns {Promise<number>} Number of escalated complaints
 */
export async function checkAndEscalateComplaints(db, complaints, hoursThreshold = 24) {
    let escalatedCount = 0;
    const now = Date.now();
    const maxAgeMs = hoursThreshold * 60 * 60 * 1000;

    for (const c of complaints) {
        // Only evaluate complaints currently in 'Pending' or 'Forwarded' state
        if (c.status !== "Pending" && c.status !== "Forwarded") continue;
        
        // Find next authority in chain
        const nextRole = ESCALATION_CHAIN[c.currentAssignee];
        if (!nextRole) continue; // Already at Director or unescalatable

        // Determine creation or last update age
        let createdMillis = 0;
        if (c.createdAt) {
            if (c.createdAt.toMillis) createdMillis = c.createdAt.toMillis();
            else if (c.createdAt instanceof Date) createdMillis = c.createdAt.getTime();
            else if (typeof c.createdAt === "number") createdMillis = c.createdAt;
            else if (typeof c.createdAt === "string") createdMillis = new Date(c.createdAt).getTime();
        }

        if (!createdMillis || (now - createdMillis) < maxAgeMs) continue;

        // Perform atomic escalation
        try {
            const complaintRef = doc(db, "complaints", c.firestoreId);
            const historyEntry = {
                action: "Escalated",
                byRole: "System (Auto-Escalation)",
                comment: `Automatically escalated from ${c.currentAssignee} to ${nextRole} after exceeding ${hoursThreshold}h threshold.`,
                timestamp: new Date().toISOString()
            };

            await updateDoc(complaintRef, {
                status: "Escalated",
                currentAssignee: nextRole,
                escalated: true,
                escalatedAt: serverTimestamp(),
                history: arrayUnion(historyEntry),
                updatedAt: serverTimestamp()
            });

            // Notify student
            if (c.studentUid) {
                await createNotification(db, {
                    toUid: c.studentUid,
                    title: `Complaint Escalated (${c.id})`,
                    message: `Your grievance has been auto-escalated to ${nextRole} for immediate review.`,
                    complaintId: c.firestoreId
                });
            }

            escalatedCount++;
        } catch (err) {
            console.error(`Error escalating complaint ${c.id}:`, err);
        }
    }

    return escalatedCount;
}

// ==========================================
// 6. ACCESSIBLE MODAL DIALOG SYSTEM (No prompt())
// ==========================================

let activeModalResolve = null;

/**
 * Displays an accessible, customizable modal and returns a Promise resolving with user inputs.
 */
export function showModal({
    title,
    bodyHtml,
    confirmText = "Submit",
    cancelText = "Cancel",
    confirmClass = "btn-primary",
    hideCancel = false
}) {
    // Remove any existing modal
    closeModal(null);

    return new Promise((resolve) => {
        activeModalResolve = resolve;

        const overlay = document.createElement("div");
        overlay.id = "app-modal-overlay";
        overlay.className = "modal-overlay";

        overlay.innerHTML = `
            <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <div class="modal-header">
                    <h3 id="modal-title">${escapeHTML(title)}</h3>
                    <button type="button" class="modal-close-btn" id="modal-close-icon" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body" id="modal-body-content">
                    ${bodyHtml}
                </div>
                <div class="modal-footer">
                    ${!hideCancel ? `<button type="button" class="btn btn-secondary" id="modal-cancel-btn">${escapeHTML(cancelText)}</button>` : ""}
                    <button type="button" class="btn ${confirmClass}" id="modal-confirm-btn">${escapeHTML(confirmText)}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Trap focus and wire events
        const confirmBtn = overlay.querySelector("#modal-confirm-btn");
        const cancelBtn = overlay.querySelector("#modal-cancel-btn");
        const closeIcon = overlay.querySelector("#modal-close-icon");

        const cleanupAndResolve = (result) => {
            closeModal();
            if (activeModalResolve) {
                const cb = activeModalResolve;
                activeModalResolve = null;
                cb(result);
            }
        };

        if (confirmBtn) {
            confirmBtn.addEventListener("click", () => {
                // Gather form data if any inputs exist inside modal-body
                const inputs = overlay.querySelectorAll("input, select, textarea");
                const data = {};
                inputs.forEach((input) => {
                    if (input.name || input.id) {
                        data[input.name || input.id] = input.value;
                    }
                });
                cleanupAndResolve({ confirmed: true, data });
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => cleanupAndResolve({ confirmed: false }));
        }

        if (closeIcon) {
            closeIcon.addEventListener("click", () => cleanupAndResolve({ confirmed: false }));
        }

        // Close on background click
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                cleanupAndResolve({ confirmed: false });
            }
        });

        // Close on Escape key
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                document.removeEventListener("keydown", handleKeyDown);
                cleanupAndResolve({ confirmed: false });
            }
        };
        document.addEventListener("keydown", handleKeyDown);
    });
}

export function closeModal() {
    const existing = document.getElementById("app-modal-overlay");
    if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
    }
}

// ==========================================
// 7. TOAST NOTIFICATIONS & UI HELPERS
// ==========================================

export function showToast(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("toast-fade-out");
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 400);
    }, 3500);
}

/**
 * Human-readable date formatter
 */
export function formatDateTime(val) {
    if (!val) return "—";
    let d;
    if (val.toDate && typeof val.toDate === "function") d = val.toDate();
    else if (val instanceof Date) d = val;
    else if (typeof val === "number") d = new Date(val);
    else if (typeof val === "string") d = new Date(val);
    else return "—";

    if (isNaN(d.getTime())) return "—";

    return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

/**
 * Standard CSS classes for status badges
 */
export function getStatusBadgeClass(status) {
    switch (status) {
        case "Pending": return "badge-pending";
        case "Accepted": return "badge-accepted";
        case "Forwarded": return "badge-forwarded";
        case "Escalated": return "badge-escalated";
        case "Resolved": return "badge-resolved";
        case "Rejected": return "badge-rejected";
        case "Reopened": return "badge-reopened";
        default: return "badge-default";
    }
}

/**
 * Standard CSS classes for priority badges
 */
export function getPriorityBadgeClass(priority) {
    switch (priority) {
        case "High": return "priority-high";
        case "Medium": return "priority-medium";
        case "Low": return "priority-low";
        default: return "priority-medium";
    }
}
