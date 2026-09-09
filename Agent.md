# What's Done

- **Core Application Architecture:** Production-grade React 19 + Vite 8 + TypeScript + TailwindCSS + Lucide Icons + Leaflet Maps setup in `d:\tour-guide`.
- **Python FastAPI Backend (`d:\tour-guide\backend\`):**
  - Live Python API server (`main.py`, `auth.py`, `models.py`, `requirements.txt`) running on `http://127.0.0.1:8000`.
  - Clean data models: `AuthUser`, `UserProfile`, `UserPreferences`.
  - Endpoints: `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`, `POST /api/user/onboarding`, `GET /api/user/profile`.
- **Authentication & Isolated Auth Architecture (`src/auth/`):**
  - `AuthContext`: session restoration, provider authentication, and onboarding updates.
  - `authService`: API client with Bearer token headers and localStorage cache fallback for seamless offline operation.
  - `AuthGuard`: route protection forwarding unauthenticated users to `/login` and un-onboarded users to `/onboarding` (resuming `onboardingStep`).
- **Swift 30-60 Second Onboarding Flow (`src/onboarding/`):**
  - **LoginScreen (`LoginScreen.tsx`)**: Dominant `[ Continue with Google ]` CTA + Apple/Phone/Email options. Auto-prefills name, email, and avatar without asking user to re-type.
  - **OnboardingContainer (`OnboardingContainer.tsx`)**: Mobile container shell with step progress indicator (`● ● ○ ○`), thumb-friendly CTAs, and optional `Skip` support.
  - **Single-Question Visual Screens**:
    - `WelcomeScreen`: Personalized greeting (*"Welcome, Roshan 👋"*) → `[ Let's personalize ]` / *"Skip for now"*.
    - `BasicProfileScreen`: Auto-filled name confirmation.
    - `TravelStyleScreen`: Large visual selectable cards (Beaches, Foodie, Adventure, Culture, Luxury, Nightlife).
    - `TransportScreen`: Large transport icon choices (Cab, Auto, Scooter, Walk, Bus).
    - `FoodScreen`: Food preference chips (Everything, Seafood, Vegetarian, Vegan, Halal).
    - `BudgetScreen`: Visual budget tiers (`₹ Budget`, `₹₹ Moderate`, `₹₹₹ Premium`, `₹₹₹₹ Luxury`).
    - `ReadyScreen`: Celebration screen (*"You're all set, Roshan ✨"*) → Direct route to `/`.
- **Mobile-First UX/UI Overhaul & Architectural Refactor:**
  - **Travel Command Center Home (`HomePage.tsx`)**: Context-first hierarchy showing Live Trip Context Header, Current/Next Activity Hero, 1-Tap Quick Action Bar (`[ 🍽️ Food ]`, `[ 🚕 Ride ]`, `[ 📍 Map ]`, `[ 💸 + Expense ]`), Alerts, Budget Progress, and Package Discovery.
  - **Stable 4-Tab Bottom Navigation (`BottomNav.tsx`)**: Fixed 60px bar (`Home` `/`, `Trip` `/trip`, `Explore` `/explore`, `More` `/more`) with `react-router-dom` deep-linking and safe-area padding.
  - **Gesture-Enabled Bottom Sheet System (`BottomSheet.tsx`)**: Drag-down-to-dismiss threshold, touch velocity detection, backdrop blur, scroll locking, and preset height snapping (`peek`, `half`, `expanded`, `full`).
  - **Domain Context State & LocalStorage Persistence (`AppContext.tsx`)**: Persistent storage sync for active trip, bookings, expenses, notifications, and user profile across page reloads.

---

# What's Needed Next

1. **Awaiting User Review & Testing:**
   - Production bundle verified (`npm run build` succeeds cleanly in 520ms with 0 errors).
   - Python FastAPI server running at `http-[# Implementation Plan — VoyageAI OS Mobile-First Refactor & UX Overhaul

This document outlines the step-by-step engineering and product redesign plan to transform **VoyageAI OS** into a native-quality, mobile-first travel companion application.

---

## User Review Required

> [!IMPORTANT]
> **State & Routing Infrastructure Upgrade**: We will install `react-router-dom` to support real URL routing (`/`, `/trip`, `/explore`, `/more`, `/trip/itinerary`, `/trip/map`, `/trip/expenses`, `/trip/bookings`, `/trip/guide`). This enables browser history, back/forward navigation, and deep linking.
>
> **LocalStorage State Persistence**: User bookings, logged expenses, notification read statuses, and active trip preferences will be persisted in `localStorage` so state survives page reloads.
>
> **Dead Code Cleanup**:
> - Delete legacy unused CSS: `src/index.css`, `src/App.css`.
> - Refactor and integrate unreachable screens: `SavedPage`, `AIPlannerPage`, `DuringTripView`, `TripDashboard`, `StateInspectorBar`.

---

## Proposed Architectural & UX Changes

### 1. State Management Decomposition & Persistence
Split the single monolithic `AppContext.tsx` into domain-specific, modular contexts:
- **`UIContext`**: Active sheets, modals, toasts, global UI state.
- **`TripContext`**: Active trip, itinerary items, day progress, location context.
- **`BookingContext`**: Flight/hotel/cab reservations, confirmation logic, cancellation.
- **`ExpenseContext`**: Budget totals, expense logging, split-bills calculations.
- **`UserContext`**: Preferences, profile data, saved places.
- **`AssistantContext`**: AI chat history, contextual action triggers.

All mutable domain state will sync automatically with `localStorage` on change.

---

### 2. Application Shell & Mobile Navigation (`BottomNav` + `Header`)

#### [MODIFY] [App.tsx](file:///d:/tour-guide/src/App.tsx)
- Re-architect root layout into the mobile shell:
  - Top Bar: Lightweight header (contextual title + emergency action trigger + notifications).
  - Main viewport: Scroll container with bottom padding equal to bottom nav height (`var(--bottom-nav-h)`).
  - Bottom Navigation: Fixed 4-tab bar (`Home` | `Trip` | `Explore` | `More`).

#### [MODIFY] [BottomNav.tsx](file:///d:/tour-guide/src/components/layout/BottomNav.tsx)
- Upgrade to 4 stable tabs:
  1. `Home` (`/`) — Travel Command Center
  2. `Trip` (`/trip`) — Active Trip Hub (Itinerary, Map, Bookings, Expenses)
  3. `Explore` (`/explore`) — Tour Packages & Destination Discovery
  4. `More` (`/more`) — Saved Places, Profile, AI Planner, Emergency, Preferences

---

### 3. Travel Command Center (Home Screen Redesign)

#### [MODIFY] [HomePage.tsx](file:///d:/tour-guide/src/components/home/HomePage.tsx)
Redesign completely around **Current Context → What's Next → 1-Tap Actions**:
1. **Live Trip Context Header**: Greeting, Destination, Day badge, live weather.
2. **Current / Next Activity Hero**: Dominant visual card showing current stop, time, distance, and 1-tap `[ Navigate ]` or `[ Get Cab ]`.
3. **Quick Action Bar (1-Tap Shortcuts)**:
   - `[ 🍽️ Food ]` → Opens Food Discovery Bottom Sheet
   - `[ 🚕 Ride ]` → Opens Cab Booking Bottom Sheet
   - `[ 📍 Map ]` → Navigates to Map View with nearby POIs
   - `[ 💸 Expense ]` → Opens Fast 1-Tap Expense Logger Sheet
4. **Important Travel Alerts**: Contextual notification pills (e.g. weather updates, cab arrivals).
5. **Trip Progress & Budget Snapshot**: Visual progress bar + budget spent vs remaining.
6. **Curated Tour Packages**: Featured packages with transparent per-person pricing.

---

### 4. Native Mobile Bottom Sheet Primitive Upgrade

#### [MODIFY] [BottomSheet.tsx](file:///d:/tour-guide/src/components/common/BottomSheet.tsx)
- Add touch gesture mechanics:
  - Touch start / move / end drag listeners on the handle bar and sheet surface.
  - Drag-down-to-dismiss threshold & touch velocity snap.
  - Preset height snapping (`peek` = 35vh, `half` = 55vh, `expanded` = 85vh, `full` = 98vh).
  - Backdrop blur + body scroll locking during active sheet presentation.

---

### 5. Fast 1-Tap Feature Flows (Sheets & Contextual Modals)

#### [NEW] [FoodSheet.tsx](file:///d:/tour-guide/src/components/food/FoodSheet.tsx)
- Contextual restaurant discovery sheet with 1-tap filters (`All`, `Near Me`, `Seafood`, `Quick Bites`).
- 1-tap directions and cab booking triggers directly from restaurant items.

#### [MODIFY] [CabBookingModal.tsx](file:///d:/tour-guide/src/components/cabs/CabBookingModal.tsx)
- Refactor into a 3-step bottom sheet flow:
  1. Pickup & Destination preview (pre-filled from active activity).
  2. Vehicle selection (`Economy`, `Sedan`, `SUV`) with ETA & fare.
  3. 1-Tap "Confirm Ride" → simulated live dispatch screen.

#### [MODIFY] [ExpenseTracker.tsx](file:///d:/tour-guide/src/components/expenses/ExpenseTracker.tsx)
- Refactor into a fast 1-tap logger sheet:
  - Big numerical input (`₹ _____`).
  - Quick category selector pills (`Food`, `Transport`, `Stay`, `Shopping`, `Other`).
  - Single primary action `[ Save Expense ]`.
  - Advanced options (split with friends, date) hidden under collapsible "More details".

#### [NEW] [EmergencyModal.tsx](file:///d:/tour-guide/src/components/common/EmergencyModal.tsx)
- High-visibility global emergency overlay:
  - Display current coordinates & nearest police/tourist helpline.
  - 1-Tap "Call Tourist Police (112)" & "Navigate to Nearest Hospital".
  - Requires 2-step confirmation to avoid accidental activation.

---

### 6. Timeline-First Itinerary & Segmented Trip Screen

#### [MODIFY] [MyTripsPage.tsx](file:///d:/tour-guide/src/components/trips/MyTripsPage.tsx) & [TripHome.tsx](file:///d:/tour-guide/src/components/trip/TripHome.tsx)
- Compact segmented tab control at the top of the Trip screen:
  `[ Timeline ]` · `[ Map ]` · `[ Bookings ]` · `[ Expenses ]` · `[ Guide ]`
- Timeline visual hierarchy:
  - **Happening Now**: Highlighted glow border, large photo, primary CTA button (`[ Directions ]`).
  - **Up Next**: Clear text hierarchy with time countdown.
  - **Past Activities**: Muted opacity and checkmark indicators.

---

### 7. Contextual Map & Routing Abstraction Layer

#### [MODIFY] [MapView.tsx](file:///d:/tour-guide/src/components/map/MapView.tsx)
- Introduce abstraction providers for Location and Routing:
  - `LocationProvider`: Current GPS coordinates (mocked to North Goa).
  - `RoutingProvider`: Route polyline drawing capability on Leaflet map between pickup and destination.
- Selecting any map marker opens the `BottomSheet` with 1-tap `[ Directions ]` and `[ Book Cab ]` options without navigating away.

---

### 8. Contextual Travel Copilot (AI Assistant)

#### [MODIFY] [AIAssistantDrawer.tsx](file:///d:/tour-guide/src/components/ai/AIAssistantDrawer.tsx)
- Transform generic chat into an actionable travel copilot:
  - AI responses embed interactive action buttons:
    - *"Found 3 seafood spots near Baga Beach"* → renders `[ 🍽️ View Restaurants ]` button.
    - *"Your total spent today is ₹2,450"* → renders `[ 💸 View Expenses ]` button.
    - *"Cab to W Goa takes 15 mins"* → renders `[ 🚕 Book Cab ]` button.

---

### 9. Design System & CSS Cleanup

#### [MODIFY] [styles/index.css](file:///d:/tour-guide/src/styles/index.css)
- Consolidate semantic CSS tokens (`--color-bg`, `--color-surface`, `--color-primary`, `--color-text-primary`, etc.).
- Ensure touch target rules (`min-height: 48px`, `min-width: 48px`, 52px for primary CTAs).
- Add high contrast focus rings for accessibility.

#### [DELETE] `src/index.css` & `src/App.css`
- Safely remove unused legacy Vite boilerplate CSS files.

---

## Verification Plan

### Automated Build & Lint Tests
- Run `npm run build` to verify zero TypeScript or Vite bundle errors.
- Run `npx oxlint` to verify zero linting regressions.

### Manual UX & Mobile Ergonomics Verification
1. **Viewport Range Testing**: Verify responsive rendering on 320px, 375px, 390px, 430px, and 768px viewports.
2. **Tap Count Audit**:
   - Log an expense: 2 taps (Quick Action -> Enter Amount & Category -> Save).
   - Book a cab to next activity: 2 taps (Current Activity CTA -> Confirm).
   - Find food nearby: 2 taps (Quick Action -> Select Restaurant -> Details).
   - Emergency access: 1 tap from Top Bar -> Emergency Sheet.
3. **State Persistence**: Refresh page after booking a cab or adding an expense to verify data persists via `localStorage`.
4. **Navigation stability**: Verify bottom navigation remains sticky at the bottom across all views without blocking content.
://127.0.0.1:8000`.
   - Frontend React dev server running at `http://localhost:5173/`.
