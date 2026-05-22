# Content Approval App

A simple approval workflow tool for social media teams — create drafts, get them reviewed and edited by a manager, and post when approved.

## Workflow

1. **Creator** writes a draft (text + image) for LinkedIn or Instagram
2. **CEO/Manager** reviews, edits inline, and either approves or requests changes
3. **Creator** copies the approved content and posts manually

---

## Firebase Setup (Required)

### 1. Create a Firebase Project
Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add Project** → name it → disable Google Analytics (optional) → **Create Project**.

### 2. Enable Authentication
- **Authentication** → **Sign-in method** → enable **Google**
- Under **Authorized domains**, add your GitHub Pages domain (e.g., `yourusername.github.io`)

### 3. Enable Firestore
- **Firestore Database** → **Create database** → **Start in test mode** → choose a region → **Enable**

### 4. Enable Storage
- **Storage** → **Get started** → **Start in test mode** → **Enable**

### 5. Get Your Config
- **Project Settings** (gear icon) → scroll to **Your apps** → click **Web** (`</>`) icon
- Register the app, copy the `firebaseConfig` object

### 6. Add Authorized Emails
In `app.js`, update these arrays with the actual emails:

```javascript
const CREATOR_EMAILS = ["venkat@yourdomain.com", "sai@yourdomain.com"]; // whoever creates drafts
const REVIEWER_EMAILS = ["ceo@yourdomain.com"]; // whoever reviews & approves
```

### 7. Add Firebase Config
In `app.js`, replace the placeholder config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

---

## GitHub Pages Hosting

1. Create a **new GitHub repository** (public or private)
2. Push all files to `main` branch:
   ```
   git init
   git add index.html style.css app.js
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
3. Go to **Settings** → **Pages** → **Source**: `main` branch → **Save**
4. Your site will be live at: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

> For a private repo, add the GitHub Pages URL to Firebase **Authorized domains** in Authentication settings.

---

## Project Structure

```
├── index.html   — App shell and modals
├── style.css    — Clean, professional styling
├── app.js       — All logic (Firebase, auth, drafts, review)
└── README.md    — This file
```

---

## Role Access

| Email | Role |
|---|---|
| Venkat's email | Creator — creates & resubmits drafts |
| CEO's email | Reviewer — edits, approves, requests changes |

Both log in with Google. The app shows different views based on role.

---

## Features

- ✅ Draft posts with text + image (LinkedIn / Instagram)
- ✅ Submit for review
- ✅ CEO edits content inline before approving
- ✅ Approve or Request Changes with feedback
- ✅ Real-time sync between both users
- ✅ Status tracking (Pending / Approved / Needs Changes)
- ✅ Image upload to Firebase Storage
- ✅ Clean, professional UI — no clutter
