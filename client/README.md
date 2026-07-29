# Your-Drive Frontend (React + Vite + TypeScript)

🌐 **Live Website**: [https://Your-Drive-website.netlify.app/](https://Your-Drive-website.netlify.app/)

Your-Drive is a responsive web application that connects drivers and passengers for ride-sharing services across Rwanda. This README summarizes the progress made so far on the **frontend feature branch** of the project.

## 🚀 Project Overview

Your-Drive allows users to:
- **Drivers**: Post rides, manage vehicles, and get paid.
- **Passengers**: Search, book rides, and contribute to trips.

This version focuses on a **frontend-only** implementation built using **React**, **Vite**, and **TypeScript** with mobile-first responsiveness in mind.

## ✅ Features Implemented

### 🔐 Authentication Flow
- Driver and passenger login and registration flow.
- Users are prompted to login/register before posting or booking a ride.

### 🚘 Driver-Side Features
- **Ride Posting**:
  - Fill out car details: type, color, number of seats.
  - Set starting and destination points.
  - Add mid-trip stops.
  - Specify trip terms: allow pets, smoking, alcohol, etc.
  - Choose accepted payment methods (bank, PayPal, etc.).
- **Trip Publishing**:
  - Review ride summary before posting.
  - Trigger service fee payment before ride is visible on the platform.
- **Car Management**:
  - Drivers can manage multiple cars.
  - Edit existing car details (e.g. color changes).
- **Trip History**:
  - View past rides, track coupon usage, and see user feedback.

### 🧍 Passenger-Side Features
- **Search & Filter**:
  - Search by start and end points, with real-time map view.
  - Filter rides based on date, time, location, and preferences.
- **Booking Ride**:
  - Initiate booking after logging in or registering.
  - Pay service fee before confirming the booking.
  - Receive invoice after the ride ends.
- **Trip History**:
  - Access previous bookings and see receipts.

### 💳 Payment & Subscription
- One-time trip payments or recurring subscriptions.
- Support for bank, PayPal, and more.
- Coupons awarded after every 5 rides for free service.
- Admin-configurable tax deductions based on Canadian provinces.
- Failed payment fallback logic with retry support.

### 🧾 Invoicing & Tax Logic
- Tax calculated dynamically based on trip origin (Province-specific).
- Passengers receive a breakdown invoice.
- Driver contributions treated as "cost-sharing," not business income.

### 🚨 Admin Features (Visual Implementation Stage)
- Review and approve driver-submitted trip data.
- Basic document inspection workflow (visual/manual).
- Block/blacklist misbehaving users.
- Cancel or approve posted rides.
- Set penalty rules, refund logic, and platform-wide announcements.

### 📱 UI & Responsiveness
- Mobile-first responsive layout.
- Optimized for both small and large screens.
- Clean user experience for both drivers and passengers.

---

## 📈 Bonus & Rewards Logic
- 1 coupon earned per trip completed.
- After 5 coupons, one trip (post or booking) becomes free.
- Driver/passenger rating system to reward respectful behavior.
- Promo logic based on platform engagement frequency.

---

## 🛑 Cancellation & Refund Policy (Frontend Logic Only)
- Trips can be canceled 2+ hours before scheduled time with refund.
- Late cancellations result in a penalty (1 trip cost equivalent).
- Refunds stored in account balance for future use.

---

## 🗺 Map Integration (In Progress)
- Display distance and route between selected start and end points.
- Show intermediate stops and allow user to accept or decline trip.

---

## ⚠️ Pending Tasks
- Backend integration for payments, chat, auth, and admin panel.
- Cloud deployment and performance testing.
- Final QA and testing across multiple devices.

---

## 💡 Tech Stack
- **Framework**: React + Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS (recommended for responsiveness)
- **Routing**: React Router
- **State Management**: Context API / Redux (optional)
- **Mapping**: Mapbox or Google Maps API (TBD)
- **Payment UI**: Placeholder UI for service fee flow
- **Build Tool**: Vite

---

## 👨‍💻 Developer Notes

This README reflects the current state of the **feature branch**. All business logic has been implemented on the frontend in a modular and responsive design. Admin-side UI and backend APIs will be integrated in the next development phase.


---

## 📄 License

MIT License – free to use and modify with attribution.
