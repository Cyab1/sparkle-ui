# MK Two Rivers Fitness Hub

A full-stack gym management progressive web app for MK Two Rivers Fitness, Ruimsig, Johannesburg.

> 🏋️ **Live app:** https://gym-pro-20ee6.web.app  
> 🛡️ **Admin panel:** https://gym-pro-20ee6.web.app/#admin

---

## Tech Stack

| Layer          | Technology                                              |
| -------------- | ------------------------------------------------------- |
| Frontend       | React + TypeScript + Vite                               |
| Styling        | Tailwind CSS + Framer Motion + shadcn/ui                |
| Fonts          | University (display) + Lato (body) + Material Symbols   |
| Authentication | Firebase Auth (email/password)                          |
| Database       | Firebase Realtime Database (europe-west1)               |
| AI Features    | Claude AI / Anthropic (Workout, Nutrition, InBody, BMR) |
| Payments       | PayFast (South Africa) — sandbox, ready to go live      |
| Hosting        | Firebase Hosting                                        |

---

## Pages & Features

### Free (Basic tier — all members)
| Page            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| Dashboard       | Stats, membership badge, loyalty rewards, activity summary   |
| Class Booking   | Colour-coded classes, live spot counter, see who's booked    |
| Check-In        | GPS check-in — exact 20m radius from 29 Peter Rd, Ruimsig   |
| Gallery         | Photo gallery filterable by category                         |
| News & Events   | Gym news and upcoming events                                 |
| Membership      | View & upgrade plans via PayFast                             |
| Account         | Profile, password reset, sign out, activity summary          |
| About Us        | Gym story, values, coach profiles, location & hours          |
| Contact         | Contact form, address, Instagram, hours + app feedback       |
| Advertise       | Ad packages (Starter/Growth/Premium) + enquiry form          |
| Terms & Conditions | South African law, PayFast, cancellation policy            |
| Privacy Policy  | POPIA compliant — Firebase, PayFast, Claude AI               |

### Silver tier — R19/mo or R199/yr
| Page            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| PR Logbook      | Log personal records by category, name auto-fills from profile |
| Leaderboard     | Gym-wide rankings + personal stats                           |
| Community       | Member community (chat pending — Natchel backend)            |
| Notifications   | Push notifications                                           |

### Gold tier — R49/mo or R499/yr
| Page            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| AI Workout      | AI-generated workout plans (Claude AI)                       |
| Nutrition Coach | AI meal plans tailored to goals (Claude AI)                  |
| BMR Calculator  | Basal metabolic rate + TDEE calculator                       |
| InBody Analysis | Manual entry + AI body composition analysis                  |
| Progress Tracker| Weight logging + trend charts                                |

---

## Getting Started

```sh
# 1. Clone
git clone https://github.com/Cyab1/sparkle-ui.git
cd sparkle-ui

# 2. Install dependencies
npm install

# 3. Add environment variables
# Create .env in project root:
VITE_ANTHROPIC_API_KEY=your_claude_api_key_here

# 4. Run locally
npm run dev
```

Open **http://localhost:8080**

---

## Environment Variables

```env
VITE_ANTHROPIC_API_KEY=your_claude_api_key_here
```

Get your key at **console.anthropic.com** → API Keys

---

## Firebase Setup

Already configured in `src/lib/firebase.ts` — connected to project `gym-pro-20ee6`.

Enable in Firebase Console:
- ✅ Authentication → Email/Password → Enabled
- ✅ Realtime Database → Created (europe-west1)

### Realtime Database Rules

```json
{
  "rules": {
    "mk2_users": {
      "$uid": {
        ".read":  "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "class_bookings": {
      "$classKey": {
        ".read": "auth != null",
        "$uid": { ".write": "auth != null && auth.uid === $uid" }
      }
    },
    "pr_logbook": {
      ".read":  "auth != null",
      ".write": "auth != null"
    },
    "app_feedback": {
      ".read":  "auth != null",
      ".write": "auth != null"
    },
    "ad_enquiries": {
      ".read":  "auth != null",
      ".write": "auth != null"
    },
    "admin_classes": {
      ".read":  "auth != null",
      ".write": "auth != null"
    },
    "admin_gallery": {
      ".read":  "auth != null",
      ".write": "auth != null"
    },
    "admin_news": {
      ".read":  "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### Database Structure

```
gym-pro-20ee6-default-rtdb/
├── mk2_users/{uid}/          ← member profiles + membership tier
├── class_bookings/{class_day}/{uid}/  ← who booked which class
├── pr_logbook/{timestamp}/   ← personal records
├── app_feedback/{id}/        ← member app feedback
├── ad_enquiries/{id}/        ← advertising enquiries
├── admin_classes/{id}/       ← gym class schedule
├── admin_gallery/{id}/       ← gallery items
└── admin_news/{id}/          ← news & events
```

---

## Membership Tiers

| Tier   | Price          | Access                                              |
| ------ | -------------- | --------------------------------------------------- |
| Basic  | Free           | Dashboard, Classes, Check-In, Gallery, News, About  |
| Silver | R19/mo · R199/yr | + PR Logbook, Leaderboard, Community, Notifications |
| Gold   | R49/mo · R499/yr | + AI Workout, Nutrition, BMR, InBody, Progress    |

Tier stored at `mk2_users/{uid}/membership` in Firebase.

---

## Admin Panel

Access at: **https://gym-pro-20ee6.web.app/#admin**  
Local: **http://localhost:8080/#admin**

Password: `MK2R@2026` *(change in `src/pages/Admin.tsx` line 7)*

| Tab              | What the admin can do                              |
| ---------------- | -------------------------------------------------- |
| 👥 Members       | View all users, search, change membership tier     |
| 📅 Classes       | Add, edit, delete classes and coaches              |
| 📸 Gallery       | Add gallery items with image URL or emoji          |
| 📢 News & Events | Publish and delete posts                           |
| 📣 Ad Enquiries  | View, status-track and reply to ad enquiries       |
| 💬 Feedback      | View app feedback, ratings and filter by type      |
| 📱 Instagram     | Step-by-step Meta API approval guide               |

---

## Geolocation Check-In

- Gym coordinates: **-26.0728838, 27.8876158** (29 Peter Rd, Ruimsig)
- Radius: **20 metres exact**
- GPS: `enableHighAccuracy: true`, `maximumAge: 0` (no cached position)
- Configured in `src/hooks/useGeolocation.ts`

---

## PayFast Payments

Currently on **sandbox**. To go live:

1. Replace `merchant_id` + `merchant_key` in `src/pages/Membership.tsx`
2. Change form action to `https://www.payfast.co.za/eng/process`
3. Set real `notify_url` webhook → needs Firebase Cloud Function (pending)
4. The Cloud Function will auto-update `mk2_users/{uid}/membership` after payment

> ⚠️ **Important:** PayFast notify webhook requires Firebase Functions access.  
> Firebase Editor access needed — contact project owner (boss account).

---

## Pending Features

| Feature             | Status              | Waiting on             |
| ------------------- | ------------------- | ---------------------- |
| PayFast auto-upgrade| ⏳ In progress      | Firebase Functions access (boss) |
| Octiv class schedule| ⏳ Pending          | Ashia — Octiv backend details |
| Community chat      | ⏳ Pending          | Natchel — chat backend details |

---

## Deployment

### Deploy to Firebase Hosting

```sh
# Build
npm run build

# Deploy
firebase deploy --only hosting
```

Add to `package.json` for one-command deploy:
```json
"scripts": {
  "deploy": "npm run build && firebase deploy --only hosting"
}
```

Then just run:
```sh
npm run deploy
```

### Other options

| Option           | How                                         |
| ---------------- | ------------------------------------------- |
| Firebase Hosting | `npm run build` → `firebase deploy`         |
| Vercel           | Connect GitHub → auto-deploys on every push |
| Netlify          | Connect GitHub → auto-deploys on every push |

---

## Folder Structure

```
src/
├── lib/
│   ├── firebase.ts          ← 🔒 DO NOT MODIFY
│   ├── claude.ts            ← 🔒 DO NOT MODIFY (AI helper)
│   └── constants.ts         ← Shared constants (goals, levels, colors)
├── context/
│   └── AuthContext.tsx      ← 🔒 DO NOT MODIFY
├── hooks/
│   ├── useBreakpoint.ts     ← Responsive breakpoints
│   └── useGeolocation.ts    ← Gym proximity detection (20m radius)
├── components/
│   ├── layout/Layout.tsx    ← Nav, bottom bar, More drawer, ThemeToggle
│   ├── MembershipGate.tsx   ← Soft-lock gate (Basic/Silver/Gold)
│   └── shared/
│       ├── OfflineBanner.tsx ← Firebase connection detector
│       ├── ThemeToggle.tsx  ← Dark/light mode toggle
│       ├── Toast.tsx        ← Toast notifications
│       ├── Btn.tsx          ← Button component
│       ├── Tag.tsx          ← Tag/badge component
│       └── PageTitle.tsx    ← Page heading component
└── pages/                   ← ✅ Safe to edit
    ├── AuthScreen.tsx       ← Login + register + forgot password
    ├── Dashboard.tsx        ← Home page
    ├── ClassBooking.tsx     ← Class schedule + bookings
    ├── CheckIn.tsx          ← GPS check-in
    ├── WorkoutPlanner.tsx   ← AI workout (Gold)
    ├── NutritionCoach.tsx   ← AI nutrition (Gold)
    ├── BMR.tsx              ← BMR calculator (Gold)
    ├── Inbody.tsx           ← InBody assessment (Gold)
    ├── ProgressTracker.tsx  ← Progress (Gold)
    ├── PRLogbook.tsx        ← PR tracking (Silver)
    ├── Leaderboard.tsx      ← Rankings (Silver)
    ├── Community.tsx        ← Community (Silver)
    ├── Notifications.tsx    ← Notifications (Silver)
    ├── Membership.tsx       ← Plans + PayFast
    ├── Gallery.tsx          ← Photo gallery
    ├── NewsEvents.tsx       ← News & events
    ├── Account.tsx          ← Profile + sign out
    ├── AboutUs.tsx          ← About MK Two Rivers
    ├── Contact.tsx          ← Contact + feedback form
    ├── Advertise.tsx        ← Advertising packages + enquiry
    ├── Terms.tsx            ← Terms & Conditions (SA law)
    ├── Privacy.tsx          ← Privacy Policy (POPIA)
    └── Admin.tsx            ← Admin portal (/#admin)
```

---

## Loyalty Rewards

| Tier   | Points Required | Benefit         |
| ------ | --------------- | --------------- |
| Bronze | 0 pts           | Standard rate   |
| Silver | 200 pts         | 10% off classes |
| Gold   | 500 pts         | 20% off classes |

Daily check-in = **+10 points**

> Note: Loyalty rewards (Bronze/Silver/Gold points-based) are separate from  
> membership tiers (Basic/Silver/Gold subscription-based).

---

## Instagram

Real Instagram: [@mktworiversfitness](https://www.instagram.com/mktworiversfitness/)

Auto-sync pending Meta API approval. Follow the step-by-step guide in Admin → 📱 Instagram tab.

---

## Development Workflow

```
GitHub (source of truth)
    ↕
VS Code (logic + features)    →    npm run deploy    →    Firebase Hosting (live)
    ↕
Lovable (UI design only)
```

- **Logic + features** → edit in VS Code, push to GitHub, deploy
- **UI design** → use Lovable, edit `pages/` and `components/` only
- **Never let Lovable touch** → `firebase.ts`, `claude.ts`, `AuthContext.tsx`

---

## Key Contacts

| Role             | Contact        | Responsible for                    |
| ---------------- | -------------- | ---------------------------------- |
| Developer        | You            | App development + deployment       |
| Project owner    | Boss           | Firebase project access + PayFast  |
| Octiv backend    | Ashia          | Class schedule API details         |
| Chat backend     | Natchel        | Community chat backend             |

---

*MK Two Rivers Fitness · 29 Peter Rd, Tres Jolie AH, Roodepoort · Ruimsig, Johannesburg*  
*Built with React + Firebase + Claude AI · March 2026*