console.log("app.js loading...");

// ──────────────────────────────────────────────
//  SETUP – Firebase config (already injected)
// ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyATxHXeCpS2du7CEY9NFQwgWOt62qIWHXw",
  authDomain: "contentapproval-ba962.firebaseapp.com",
  projectId: "contentapproval-ba962",
  storageBucket: "contentapproval-ba962.firebasestorage.app",
  messagingSenderId: "793382978224",
  appId: "1:793382978224:web:5b073b642bd6323f86f175"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// Handle redirect result on page load
auth.getRedirectResult().catch(err => {
  if (err.code !== 'auth/cancelled-redirect') {
    console.error("Redirect result error:", err);
  }
});

// ──────────────────────────────────────────────
//  ROLE DETECTION
// ──────────────────────────────────────────────
const CREATOR_EMAILS = ["sai@getmoneybot.com"];
const REVIEWER_EMAILS = ["kahlil@getmoneybot.com", "kollivenkatsai1802@gmail.com"];

function detectRole(email) {
  if (CREATOR_EMAILS.includes(email)) return "creator";
  if (REVIEWER_EMAILS.includes(email)) return "ceo";
  return "creator";
}

// ──────────────────────────────────────────────
//  STATE
// ──────────────────────────────────────────────
let currentUser = null;
let drafts = [];
let draftsUnsubscribe = null;
let selectedPlatform = "linkedin";
let currentReviewDraftId = null;
let draftImageFile = null;
let calCurrentDate = new Date();

// ──────────────────────────────────────────────
//  AUTH
// ──────────────────────────────────────────────
function listenToAuth() {
  console.log("Setting up auth state listener...");
  auth.onAuthStateChanged((user) => {
    console.log("onAuthStateChanged fired, user:", user ? user.email : "null");
    if (user) {
      currentUser = {
        uid: user.uid,
        name: user.displayName || user.email,
        email: user.email,
        photo: user.photoURL
      };
      console.log("User detected:", currentUser.email);
      showApp();
      subscribeToDrafts();
    } else {
      console.log("No user, showing auth screen");
      showAuth();
    }
  });
}

async function handleSignIn() {
  if (auth.currentUser) {
    console.log("Already signed in as", auth.currentUser.email);
    return;
  }
  try {
    console.log("Opening popup...");
    const result = await auth.signInWithPopup(provider);
    console.log("Popup result:", result.user.email);
  } catch (err) {
    console.error("Sign-in error:", err.code, err.message);
    if (err.code === 'auth/redirect-cancelled-by-user') {
      console.log("Popup was cancelled");
    } else {
      alert("Sign-in failed: " + err.code + " - " + err.message);
    }
  }
}

async function handleSignOut() {
  await auth.signOut();
  draftsUnsubscribe = null;
}

// ──────────────────────────────────────────────
//  UI NAVIGATION
// ──────────────────────────────────────────────
function showAuth() {
  console.log("Showing auth screen");
  document.getElementById("auth-screen").classList.add("active");
  document.getElementById("auth-screen").style.display = "flex";
  document.getElementById("app-screen").classList.remove("active");
  document.getElementById("app-screen").style.display = "none";
}

function showApp() {
  console.log("showApp called! Hiding auth, showing app...");
  const authScreen = document.getElementById("auth-screen");
  const appScreen = document.getElementById("app-screen");
  authScreen.classList.remove("active");
  authScreen.style.display = "none";
  authScreen.style.cssText = "display: none !important";
  appScreen.classList.add("active");
  appScreen.style.display = "block";
  appScreen.style.cssText = "display: block !important";
  console.log("Auth screen display:", getComputedStyle(authScreen).display);
  console.log("App screen display:", getComputedStyle(appScreen).display);

  const role = detectRole(currentUser.email);
  document.getElementById("user-name").textContent = currentUser.name;
  const roleBadge = document.getElementById("user-role");
  roleBadge.textContent = role === "creator" ? "Creator" : "CEO";
  roleBadge.className = "role-badge " + role;

  const myDraftsTab = document.querySelector('[data-tab="my-drafts"]');
  const reviewTab = document.querySelector('[data-tab="review"]');
  const calendarTab = document.querySelector('[data-tab="calendar"]');
  calendarTab.style.display = "";

  if (role === "creator") {
    myDraftsTab.style.display = "";
    reviewTab.style.display = "none";
    document.querySelector('[data-tab="my-drafts"]').click();
  } else {
    myDraftsTab.style.display = "none";
    reviewTab.style.display = "";
    document.querySelector('[data-tab="review"]').click();
  }
}

// ──────────────────────────────────────────────
//  FIREBASE DATA
// ──────────────────────────────────────────────
function subscribeToDrafts() {
  if (draftsUnsubscribe) draftsUnsubscribe();

  db.collection("drafts").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    drafts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    renderAll();
  }, (err) => {
    console.error("Firestore error:", err);
  });
}

// ──────────────────────────────────────────────
//  CREATE DRAFT
// ──────────────────────────────────────────────
async function handleCreateDraft() {
  const text = document.getElementById("draft-text").value.trim();
  const notes = document.getElementById("draft-notes").value.trim();

  if (!text) { alert("Please write some content."); return; }

  const btn = document.getElementById("submit-draft-btn");
  btn.disabled = true;
  btn.textContent = "Uploading...";

  try {
    let imageUrl = null;

    if (draftImageFile) {
      const storageRef = storage.ref(`drafts/${Date.now()}_${draftImageFile.name}`);
      const snap = await storageRef.put(draftImageFile);
      imageUrl = await snap.ref.getDownloadURL();
    }

    const scheduledAtInput = document.getElementById("draft-scheduled-at").value;
    const scheduledAt = scheduledAtInput
      ? firebase.firestore.Timestamp.fromDate(new Date(scheduledAtInput))
      : null;

    await db.collection("drafts").add({
      platform: selectedPlatform,
      text,
      notes,
      imageUrl,
      status: "pending",
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      authorUid: currentUser.uid,
      reviewedBy: null,
      reviewedByName: null,
      feedback: null,
      editedText: null,
      scheduledAt,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    closeModal("create-modal");
    resetDraftForm();
  } catch (err) {
    console.error("Error creating draft:", err);
    alert("Failed to create draft: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Submit for Review";
  }
}

function resetDraftForm() {
  document.getElementById("draft-text").value = "";
  document.getElementById("draft-notes").value = "";
  draftImageFile = null;
  document.getElementById("image-preview").src = "";
  document.getElementById("image-preview-container").classList.add("hidden");
  document.getElementById("image-placeholder").classList.remove("hidden");
  document.getElementById("char-count").textContent = "0";
  selectedPlatform = "linkedin";
  document.querySelectorAll(".platform-btn").forEach(b => b.classList.remove("active"));
  document.querySelector('.platform-btn[data-platform="linkedin"]').classList.add("active");
}

async function handleSaveEdits() {
  const editedText = document.getElementById("edited-text").value.trim();
  const scheduledAtInput = document.getElementById("review-scheduled-at").value;
  try {
    const updates = {
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (editedText) {
      updates.text = editedText;  // promote as canonical
      updates.editedText = firebase.firestore.FieldValue.delete();
    }
    if (scheduledAtInput) updates.scheduledAt = firebase.firestore.Timestamp.fromDate(new Date(scheduledAtInput));
    await db.collection("drafts").doc(currentReviewDraftId).update(updates);
    const idx = drafts.findIndex(d => d.id === currentReviewDraftId);
    if (idx !== -1) {
      drafts[idx].text = editedText || drafts[idx].text;
      drafts[idx].editedText = editedText || null;  // sync so modal preview stays fresh
      drafts[idx].updatedAt = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
    }
    // Update the modal preview left-side to reflect the new text immediately
    document.getElementById("review-text").textContent = editedText || document.getElementById("review-text").textContent;
    renderAll();
    const btn = document.getElementById("save-edits-btn");
    btn.textContent = "✓ Saved";
    setTimeout(() => { btn.textContent = "💾 Save Edits"; }, 1500);
  } catch (err) {
    alert("Error saving edits: " + err.message);
  }
}

// ──────────────────────────────────────────────
//  REVIEW DRAFT (CEO)
// ──────────────────────────────────────────────
async function handleApprove() {
  const editedText = document.getElementById("edited-text").value.trim();
  const feedback = document.getElementById("review-feedback").value.trim();

  try {
    const updates = {
      status: "approved",
      reviewedByName: currentUser.name,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (editedText) {
      updates.text = editedText;
      updates.editedText = firebase.firestore.FieldValue.delete();
    } else {
      updates.editedText = firebase.firestore.FieldValue.delete();
    }
    if (feedback) updates.feedback = feedback;
    const scheduledAtInput = document.getElementById("review-scheduled-at").value;
    if (scheduledAtInput) updates.scheduledAt = firebase.firestore.Timestamp.fromDate(new Date(scheduledAtInput));
    await db.collection("drafts").doc(currentReviewDraftId).update(updates);
    closeModal("review-modal");
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function handleRequestChanges() {
  const editedText = document.getElementById("edited-text").value.trim();
  const feedback = document.getElementById("review-feedback").value.trim();

  if (!feedback && !editedText) {
    alert("Please add feedback or edit the content before requesting changes.");
    return;
  }

  try {
    const scheduledAtInput = document.getElementById("review-scheduled-at").value;
    const updates = {
      status: "changes",
      editedText: editedText || null,
      feedback,
      reviewedByName: currentUser.name,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (scheduledAtInput) updates.scheduledAt = firebase.firestore.Timestamp.fromDate(new Date(scheduledAtInput));
    await db.collection("drafts").doc(currentReviewDraftId).update(updates);
    closeModal("review-modal");
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ──────────────────────────────────────────────
//  DELETE DRAFT
// ──────────────────────────────────────────────
async function handleDeleteDraft(draftId) {
  if (!confirm("Delete this draft? This cannot be undone.")) return;
  try {
    await db.collection("drafts").doc(draftId).delete();
  } catch (err) {
    alert("Error deleting draft: " + err.message);
  }
}

// ──────────────────────────────────────────────
//  RESUBMIT DRAFT (Creator after changes)
// ──────────────────────────────────────────────
async function handleResubmit(draftId) {
  try {
    await db.collection("drafts").doc(draftId).update({
      status: "pending",
      feedback: null,
      reviewedByName: null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ──────────────────────────────────────────────
//  RENDER
// ──────────────────────────────────────────────
function renderAll() {
  renderMyDrafts();
  renderReviewQueue();
  renderStats();
}

function renderStats() {
  const myDrafts = drafts.filter(d => d.authorEmail === currentUser.email);
  document.getElementById("stat-all").textContent = myDrafts.length;
  document.getElementById("stat-pending").textContent = myDrafts.filter(d => d.status === "pending").length;
  document.getElementById("stat-approved").textContent = myDrafts.filter(d => d.status === "approved").length;
  document.getElementById("stat-changes").textContent = myDrafts.filter(d => d.status === "changes").length;
}

function renderMyDrafts() {
  const container = document.getElementById("draft-list");
  const statusFilter = document.getElementById("filter-status").value;
  const platformFilter = document.getElementById("filter-platform").value;

  let myDrafts = drafts.filter(d => d.authorEmail === currentUser.email);

  if (statusFilter !== "all") myDrafts = myDrafts.filter(d => d.status === statusFilter);
  if (platformFilter !== "all") myDrafts = myDrafts.filter(d => d.platform === platformFilter);

  if (myDrafts.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No drafts yet. Create your first one!</p></div>';
    return;
  }

  container.innerHTML = myDrafts.map(draft => {
    const displayText = draft.editedText || draft.text;
    const time = draft.createdAt ? new Date(draft.createdAt.seconds * 1000).toLocaleDateString() : "";
    const canResubmit = draft.status === "changes";

    return `
      <div class="draft-card${draft.imageUrl ? " has-image" : ""}" data-id="${draft.id}">
        ${draft.imageUrl ? `<img class="draft-thumbnail" src="${draft.imageUrl}" alt="Thumbnail" />` : ""}
        <div class="draft-card-body">
          <div class="draft-card-header">
            <span class="platform-tag ${draft.platform}">${draft.platform === "linkedin" ? "LinkedIn" : "Instagram"}</span>
            <span class="status-badge ${draft.status}">${statusLabel(draft.status)}</span>
          </div>
          <p class="draft-preview-text">${escHtml(displayText)}</p>
          <div class="draft-meta">
            <span>${time}</span>
            ${draft.reviewedByName ? `<span>Reviewed by ${escHtml(draft.reviewedByName)}</span>` : ""}
          </div>
          ${draft.feedback ? `<div class="draft-feedback">💬 ${escHtml(draft.feedback)}</div>` : ""}
        </div>
        <div class="draft-actions">
          ${canResubmit ? `<button class="btn btn-primary btn-sm resubmit-btn">Resubmit</button>` : ""}
          <button class="btn btn-ghost btn-sm view-btn">View</button>
          <button class="btn btn-ghost btn-sm delete-btn" title="Delete">🗑</button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => openReviewModal(btn.closest(".draft-card").dataset.id));
  });
  container.querySelectorAll(".resubmit-btn").forEach(btn => {
    btn.addEventListener("click", () => handleResubmit(btn.closest(".draft-card").dataset.id));
  });
  container.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => handleDeleteDraft(btn.closest(".draft-card").dataset.id));
  });
}

function renderReviewQueue() {
  const container = document.getElementById("review-list");
  const pendingDrafts = drafts.filter(d => d.status === "pending" && d.authorEmail !== currentUser.email);
  const reviewCount = document.getElementById("review-count");

  reviewCount.textContent = `${pendingDrafts.length} pending`;
  reviewCount.className = "review-badge" + (pendingDrafts.length === 0 ? " zero" : "");

  if (pendingDrafts.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No drafts waiting for review.</p></div>';
    return;
  }

  container.innerHTML = pendingDrafts.map(draft => `
    <div class="draft-card${draft.imageUrl ? " has-image" : ""}" data-id="${draft.id}">
      ${draft.imageUrl ? `<img class="draft-thumbnail" src="${draft.imageUrl}" alt="Thumbnail" />` : ""}
      <div class="draft-card-body">
        <div class="draft-card-header">
          <span class="platform-tag ${draft.platform}">${draft.platform === "linkedin" ? "LinkedIn" : "Instagram"}</span>
          <span class="status-badge ${draft.status}">Pending Review</span>
        </div>
        <p class="draft-preview-text">${escHtml(draft.text)}</p>
        <div class="draft-meta">
          <span>By ${escHtml(draft.authorName)}</span>
          <span>${draft.createdAt ? new Date(draft.createdAt.seconds * 1000).toLocaleDateString() : ""}</span>
        </div>
        ${draft.notes ? `<div class="draft-notes-inline">📝 ${escHtml(draft.notes)}</div>` : ""}
      </div>
      <div class="draft-actions">
        <button class="btn btn-primary btn-sm review-btn">Review &amp; Edit</button>
        <button class="btn btn-ghost btn-sm delete-btn" title="Delete">🗑</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll(".review-btn").forEach(btn => {
    btn.addEventListener("click", () => openReviewModal(btn.closest(".draft-card").dataset.id));
  });
  container.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => handleDeleteDraft(btn.closest(".draft-card").dataset.id));
  });
}

function openReviewModal(draftId) {
  const draft = drafts.find(d => d.id === draftId);
  if (!draft) return;

  currentReviewDraftId = draftId;

  document.getElementById("review-platform-badge").textContent = draft.platform === "linkedin" ? "LinkedIn" : "Instagram";
  document.getElementById("review-platform-badge").className = "platform-tag " + draft.platform;

  if (draft.imageUrl) {
    document.getElementById("review-image").src = draft.imageUrl;
    document.getElementById("review-image-container").classList.remove("hidden");
  } else {
    document.getElementById("review-image-container").classList.add("hidden");
  }

  document.getElementById("review-text").textContent = draft.text;
  document.getElementById("edited-text").value = draft.editedText || draft.text;
  document.getElementById("review-notes").textContent = draft.notes || "";
  document.getElementById("review-notes-container").classList.toggle("hidden", !draft.notes);
  document.getElementById("review-author").textContent = draft.authorName;
  document.getElementById("review-feedback").value = "";

  // Set scheduled date (convert Firestore Timestamp to datetime-local format)
  const schedInput = document.getElementById("review-scheduled-at");
  if (draft.scheduledAt) {
    const d = new Date(draft.scheduledAt.seconds * 1000);
    schedInput.value = d.toISOString().slice(0, 16);
  } else {
    schedInput.value = "";
  }

  openModal("review-modal");
}

function statusLabel(status) {
  return { draft: "Draft", pending: "Pending", approved: "Approved", changes: "Changes Requested" }[status] || status;
}

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ──────────────────────────────────────────────
//  MODAL HELPERS
// ──────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
  document.body.style.overflow = "";
}

// ──────────────────────────────────────────────
//  IMAGE UPLOAD
// ──────────────────────────────────────────────
function setupImageUpload() {
  const area = document.getElementById("image-upload-area");
  const input = document.getElementById("image-input");
  const previewContainer = document.getElementById("image-preview-container");
  const placeholder = document.getElementById("image-placeholder");
  const preview = document.getElementById("image-preview");
  const removeBtn = document.getElementById("remove-image");

  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    draftImageFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.src = ev.target.result;
      previewContainer.classList.remove("hidden");
      placeholder.classList.add("hidden");
    };
    reader.readAsDataURL(file);
  });

  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    draftImageFile = null;
    input.value = "";
    previewContainer.classList.add("hidden");
    placeholder.classList.remove("hidden");
  });
}

// ──────────────────────────────────────────────
//  EVENT LISTENERS
// ──────────────────────────────────────────────
function setupEventListeners() {
  console.log("Setting up event listeners...");
  const btn = document.getElementById("google-signin-btn");
  console.log("google-signin-btn element:", btn);
  if (btn) {
    btn.addEventListener("click", handleSignIn);
    console.log("Click handler attached to signin button");
  } else {
    console.error("google-signin-btn NOT FOUND in DOM");
  }
  document.getElementById("signout-btn").addEventListener("click", handleSignOut);

  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
      if (tab.dataset.tab === "calendar") renderCalendar();
    });
  });

  document.getElementById("create-draft-btn").addEventListener("click", () => openModal("create-modal"));
  document.getElementById("submit-draft-btn").addEventListener("click", handleCreateDraft);

  document.querySelectorAll(".platform-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".platform-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedPlatform = btn.dataset.platform;
    });
  });

  document.getElementById("draft-text").addEventListener("input", (e) => {
    document.getElementById("char-count").textContent = e.target.value.length;
  });

  document.getElementById("approve-btn").addEventListener("click", handleApprove);
  document.getElementById("request-changes-btn").addEventListener("click", handleRequestChanges);
  document.getElementById("save-edits-btn").addEventListener("click", handleSaveEdits);

  document.getElementById("filter-status").addEventListener("change", renderMyDrafts);
  document.getElementById("filter-platform").addEventListener("change", renderMyDrafts);

  document.querySelectorAll(".modal-backdrop, .modal-close").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".modal").forEach(m => m.classList.remove("open"));
      document.body.style.overflow = "";
    });
  });

  setupImageUpload();
}

// ──────────────────────────────────────────────
//  INIT
// ──────────────────────────────────────────────
function init() {
  console.log("App initializing...");
  setupEventListeners();
  console.log("Event listeners set up");
  listenToAuth();
  console.log("Auth listener registered");
  setupCalendarEvents();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// ──────────────────────────────────────────────
//  CALENDAR
// ──────────────────────────────────────────────
function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  // Start from Monday of the week containing the 1st
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  for (let i = startDow - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }
  return days;
}

function getDraftsForDay(date) {
  return drafts.filter(d => {
    if (!d.scheduledAt) return false;
    const sd = new Date(d.scheduledAt.seconds * 1000);
    return sd.getFullYear() === date.getFullYear() &&
      sd.getMonth() === date.getMonth() &&
      sd.getDate() === date.getDate();
  });
}

function renderCalendar() {
  const year = calCurrentDate.getFullYear();
  const month = calCurrentDate.getMonth();
  const days = getCalendarDays(year, month);
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  document.getElementById("cal-title").textContent = monthNames[month] + " " + year;
  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";

  ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].forEach(dow => {
    const h = document.createElement("div");
    h.className = "cal-header-cell";
    h.textContent = dow;
    grid.appendChild(h);
  });

  const today = new Date();
  days.forEach(date => {
    const cell = document.createElement("div");
    const isCurrentMonth = date.getMonth() === month;
    const isToday = date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
    cell.className = "cal-day-cell" + (isCurrentMonth ? "" : " other-month") + (isToday ? " today" : "");
    cell.dataset.date = date.toISOString().split("T")[0];

    const num = document.createElement("div");
    num.className = "cal-day-number";
    num.textContent = date.getDate();
    cell.appendChild(num);

    const dayDrafts = getDraftsForDay(date);
    const dayEvents = getEventsForDay(date);
    const dots = document.createElement("div");
    dots.className = "cal-day-dots";
    dayDrafts.slice(0, 4).forEach(d => {
      const dot = document.createElement("div");
      dot.className = "cal-dot cal-dot-" + d.status;
      const icon = d.platform === "linkedin" ? "in" : "ig";
      dot.innerHTML = "<span>" + icon + " " + escHtml((d.text || "").substring(0, 18)) + "</span>";
      dot.title = (d.text || "").substring(0, 100);
      dots.appendChild(dot);
    });
    if (dayDrafts.length > 4) {
      const more = document.createElement("div");
      more.className = "cal-day-count";
      more.textContent = "+" + (dayDrafts.length - 4);
      cell.appendChild(more);
    }
    // Event markers on the calendar (different from drafts)
    if (dayEvents.length > 0) {
      const ev = document.createElement("div");
      ev.className = "cal-event-dot";
      ev.title = dayEvents.map(e => e.icon + " " + e.name).join(" · ");
      if (dayEvents.length === 1) {
        ev.textContent = dayEvents[0].icon + " " + dayEvents[0].name;
      } else {
        ev.textContent = dayEvents[0].icon + " " + dayEvents[0].name + " +" + (dayEvents.length - 1);
      }
      dots.appendChild(ev);
    }
    cell.appendChild(dots);
    cell.addEventListener("click", () => selectCalendarDay(date, dayDrafts, dayEvents));
    grid.appendChild(cell);
  });

  renderUnscheduled();
}

function selectCalendarDay(date, dayDrafts, dayEvents) {
  document.querySelectorAll(".cal-day-cell").forEach(c => c.classList.remove("selected"));
  const sel = document.querySelector('.cal-day-cell[data-date="' + date.toISOString().split("T")[0] + '"]');
  if (sel) sel.classList.add("selected");
  const container = document.getElementById("cal-day-drafts");
  const dateStr = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  let html = '<div style="margin-bottom:12px"><strong>' + dateStr + "</strong></div>";

  if (dayEvents.length > 0) {
    html += '<div style="margin-bottom:16px"><span class="cal-event-chip-title">🎯 Events</span><div style="margin-top:6px">';
    dayEvents.forEach(e => {
      html += '<div class="cal-event-chip"><span>' + e.icon + ' ' + e.name + '</span></div>';
    });
    html += '</div></div>';
  }

  if (dayDrafts.length === 0 && dayEvents.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Nothing scheduled for ' + dateStr + ".</p></div>";
    return;
  }

  html += dayDrafts.map(d => '<div class="draft-card" data-id="' + d.id + '" style="margin-bottom:8px"><div class="draft-card-body"><div class="draft-card-header"><span class="platform-tag ' + d.platform + '">' + (d.platform === "linkedin" ? "LinkedIn" : "Instagram") + '</span><span class="status-badge ' + d.status + '">' + statusLabel(d.status) + '</span></div><p class="draft-preview-text">' + escHtml(d.text || "") + '</p></div><div class="draft-actions"><button class="btn btn-ghost btn-sm view-btn">View</button></div></div>').join("");
  container.innerHTML = html;
  container.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => openReviewModal(btn.closest(".draft-card").dataset.id));
  });
}

function renderUnscheduled() {
  const unscheduled = drafts.filter(d => !d.scheduledAt);
  const container = document.getElementById("cal-unscheduled-list");
  if (unscheduled.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);font-size:.875rem">No unscheduled drafts.</p>';
    return;
  }
  container.innerHTML = unscheduled.map(d => '<div class="draft-card" data-id="' + d.id + '" style="margin-bottom:8px"><div class="draft-card-body"><div class="draft-card-header"><span class="platform-tag ' + d.platform + '">' + (d.platform === "linkedin" ? "LinkedIn" : "Instagram") + '</span><span class="status-badge ' + d.status + '">' + statusLabel(d.status) + '</span></div><p class="draft-preview-text">' + escHtml(d.text || "") + '</p></div><div class="draft-actions"><button class="btn btn-ghost btn-sm view-btn">View</button><button class="btn btn-ghost btn-sm delete-btn" title="Delete">🗑</button></div></div>').join("");
  container.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => openReviewModal(btn.closest(".draft-card").dataset.id));
  });
  container.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => handleDeleteDraft(btn.closest(".draft-card").dataset.id));
  });
}

function setupCalendarEvents() {
  document.getElementById("cal-prev").addEventListener("click", () => {
    calCurrentDate.setMonth(calCurrentDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById("cal-next").addEventListener("click", () => {
    calCurrentDate.setMonth(calCurrentDate.getMonth() + 1);
    renderCalendar();
  });
}