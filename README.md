# MK2 Rivers Fitness Hub

A full-stack gym management progressive web app for MK2 Rivers Fitness.

---

## Tech Stack

| Layer          | Technology                                          |
| -------------- | --------------------------------------------------- |
| Frontend       | React + TypeScript + Vite                           |
| Styling        | Tailwind CSS + Framer Motion                        |
| Authentication | Firebase Auth (email/password)                      |
| Database       | Firebase Realtime Database (europe-west1)           |
| AI Features    | OpenAI GPT-4o (Workout, Nutrition, InBody analysis) |
| Payments       | PayFast (South Africa)                              |
| UI Components  | shadcn/ui                                           |

---

## Pages

| Page              | Description                                               |
| ----------------- | --------------------------------------------------------- |
| Dashboard         | Stats, rewards tier, training log, upcoming classes       |
| Workout Planner   | AI-generated workout plans                                |
| Nutrition Coach   | AI meal plans tailored to goals                           |
| Progress Tracker  | Weight logging + trend analysis                           |
| Class Booking     | Book/cancel classes by day                                |
| Check-In          | Daily gym check-in + points                               |
| Leaderboard       | Gym-wide rankings + personal stats + competitions         |
| Notifications     | Push notifications + geolocation reminders                |
| InBody Assessment | Manual entry + file upload + AI body composition analysis |
| Membership        | PayFast payment plans (R299/R499/R799)                    |
| Community         | Member posts + likes                                      |
| Gallery           | Photo gallery filterable by category                      |
| News & Events     | Gym news and upcoming events                              |
| Account           | Profile management + sign out                             |
| Admin Panel       | Password-protected management portal (/#admin)            |

---

## Getting Started

```sh
# 1. Clone
git clone https://github.com/Cyab1/sparkle-ui.git
cd sparkle-ui

# 2. Install dependencies
npm install
npm install firebase

# 3. Add environment variables (create this file in the project root)
# .env
VITE_OPENAI_API_KEY=your_openai_key_here

# 4. Fix CSS import (src/index.css — move @import to line 1)
# @import url('https://fonts.googleapis.com/...') must come before @tailwind

# 5. Run
npm run dev
```

Open **http://localhost:8080**

---

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

Get your key at **platform.openai.com** → API Keys

---

## Firebase Setup

Already configured in `src/lib/firebase.ts` — connected to project `gym-pro-20ee6`.

Make sure these are enabled in Firebase Console:

- ✅ Authentication → Email/Password → Enabled
- ✅ Realtime Database → Created (europe-west1)

Realtime Database rules required:

```json
{
  "rules": {
    "mk2_users": {
      "$uid": { ".read": true, ".write": true }
    },
    "admin_classes": { ".read": true, ".write": true },
    "admin_gallery": { ".read": true, ".write": true },
    "admin_news": { ".read": true, ".write": true },
    "rooms": {
      "$room": { ".read": true, ".write": true }
    },
    "users": {
      "$user": { ".read": true, ".write": true }
    },
    "pr_logbook": {
      ".read": true,
      "$pr_id": { ".write": true }
    },
    "pr_logbook_compact": {
      ".read": true,
      "$pr_id": { ".write": true }
    }
  }
}
```

---

## Admin Panel

Access at: **http://localhost:8080/#admin**

Default password: `MK2Admin2026`

Change it in `src/pages/Admin.tsx` line 7.

| Section          | What the manager can do                   |
| ---------------- | ----------------------------------------- |
| 📅 Classes       | Add, edit, delete classes and coaches     |
| 📸 Gallery       | Add gallery items with image URL or emoji |
| 📢 News & Events | Publish and delete posts                  |
| 📱 Instagram     | Step-by-step Meta API approval guide      |

---

## Folder Structure

```
src/
├── lib/
│   ├── firebase.ts        ← 🔒 DO NOT MODIFY
│   ├── claude.ts          ← 🔒 DO NOT MODIFY (OpenAI helper)
│   └── constants.ts       ← Shared constants
├── context/
│   └── AuthContext.tsx    ← 🔒 DO NOT MODIFY
├── hooks/
│   ├── useBreakpoint.ts   ← Responsive breakpoints
│   └── useGeolocation.ts  ← Gym proximity detection
├── pages/                 ← ✅ Safe to restyle
└── components/            ← ✅ Safe to restyle
```

---

## Rewards System

| Tier   | Points Required | Benefit         |
| ------ | --------------- | --------------- |
| Bronze | 0 pts           | Standard rate   |
| Silver | 200 pts         | 10% off classes |
| Gold   | 500 pts         | 20% off classes |

Daily check-in = +10 points

---

## PayFast Payments

Currently on sandbox. To go live:

1. Replace merchant ID + key in `src/pages/Membership.tsx`
2. Change form action to `https://www.payfast.co.za/eng/process`
3. Set your `notify_url` webhook endpoint

---

## Instagram Auto-Sync

Pending Meta API approval. Follow the step-by-step guide in the Admin panel under 📱 Instagram tab.

---

## Deployment

| Option           | How                                        |
| ---------------- | ------------------------------------------ |
| Lovable          | Push to GitHub → Lovable auto-deploys      |
| Firebase Hosting | `npm run build` → `firebase deploy`        |
| AWS Amplify      | Connect GitHub → auto-builds on every push |

---

## Development Workflow

```
Lovable (design)  ←→  GitHub  ←→  VS Code (logic + features)
```

- **Design changes** → use Lovable, edit `pages/` and `components/`
- **Logic + new features** → edit in VS Code, push to GitHub
- **Never let Lovable touch** → `firebase.ts`, `claude.ts`, `AuthContext.tsx`
