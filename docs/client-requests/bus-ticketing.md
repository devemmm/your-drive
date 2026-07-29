# Bus Ticketing System – Technical Product

## 1. Overview
This system enables users to book and pay for bus tickets digitally across Rwanda (Kigali + intercity routes), using mobile money, SMS/USSD, and agent-assisted booking.

The system must support:
- Smartphone users (mobile app)
- Feature phone users (SMS/USSD)
- Physical agents at stations
- Online and offline verification

# 2. Core Modules

## 2.1 Mobile Money Payment System

### Supported Providers
- MTN Mobile Money
- Airtel Money

### Payment Flow
1. User selects trip and seat
2. User enters phone number
3. System sends MoMo payment request
4. User enters PIN on phone
5. Payment provider sends callback (webhook)
6. System confirms payment
7. Ticket is generated ONLY after confirmation

### Payment States
- pending
- success
- failed
- expired

### Rules
- Seat is locked for 2–3 minutes during payment
- If payment fails or times out → seat is released
- No ticket without confirmed payment

### Failure Handling
- If user is charged but no ticket → flag for reconciliation
- Detect duplicate transactions using transaction ID
- Retry callback verification if not received

## 2.2 Ticketing & QR Code System

### Ticket Generation
After payment success:
- Generate unique Ticket ID (UUID)
- Assign seat number
- Generate QR Code (secure, signed)

### QR Code Must Include
- Ticket ID
- Trip ID
- Timestamp
- Digital signature (anti-fraud)

### Ticket Delivery
- In-app display
- SMS (booking code or link)
- Printable format (for agents)

## 2.3 Ticket Validation (Scanner System)

### Online Mode
- Scanner app → API → validates ticket in real time

### Offline Mode (MANDATORY)
- QR contains signed data
- Scanner validates locally without internet
- Syncs data later

### Validation Rules
- First scan = valid
- Second scan = rejected (duplicate)
- Expired tickets = rejected

## 2.4 Real-Time Tracking & Scheduling

### Data Sources
- Driver mobile app (GPS)
- Operator dashboard (manual updates)
- Predefined schedules

### Bus Status
- Not started
- Boarding
- En route
- Arrived

### User Features
- View departure time
- View seat availability
- View bus status (NOT precise GPS unless reliable)

### Operator Features
- Monitor buses
- Update delays
- View occupancy

## 2.5 Seat Management System

### Rules
- Fixed seat count per bus
- Seat locked during payment (2–3 min)
- Auto-release if payment fails

### Requirements
- Prevent overbooking
- Real-time seat updates

## 2.6 Intercity & Upcountry Support

### Features
- Multi-route system (e.g., Kigali → Huye, Kigali → Musanze)
- Multiple boarding/drop-off points

### Agent System (MANDATORY)
Agents at stations must be able to:
- Book tickets for customers
- Accept cash
- Print tickets

### Printed Ticket Must Include
- QR code
- Passenger name
- Seat number
- Route details

## 2.7 SMS & USSD Booking System

### SMS Booking Flow
User sends:
KIGALI HUYE 2 15APR 08:00

System responds with:
- Available trip options

User confirms selection:
- Receives MoMo payment request
- Receives booking confirmation code

### USSD Flow
Menu-based interaction:
1. Book Ticket
2. Check Ticket

Steps:
- Select route
- Select time
- Confirm payment

### Constraints
- No complex UI
- Minimal steps only

## 2.8 User Authentication System

### Customer Authentication
- Phone number as primary ID
- OTP verification via SMS

### Rules
- OTP expires in 2–5 minutes
- Limit OTP retries

### Roles
- Customer
- Agent
- Driver
- Admin

### Security
- Encrypt sensitive data
- Maintain audit logs

# 3. Cancellation Rules 

## 3.1 Cancellation & Refund System

### Rules
- Before 30 mins → partial/full refund
- before 15 mins→ 30% refund
- ⁠no show off no refund 

### Process
- User requests cancellation
- System calculates refund
- Refund processed via MoMo or manual queue

## 3.2 Payment Reconciliation System

### Daily Checks
- Payments received vs tickets issued

### Detect
- Paid but no ticket
- Ticket without payment

### Action
- Flag for manual review
- Admin resolution dashboard

## 3.3 Agent Management System

### Features
- Agent accounts
- Commission tracking
- Sales reporting

## 3.4 Fraud Prevention System

### Must Detect
- Duplicate QR usage
- Fake confirmations
- Agent misuse

### Controls
- Secure QR signatures
- Scan logs
- Activity monitoring

## 3.5 Network Failure Strategy

### Must Handle
- No internet at boarding
- Payment delays
- API downtime

### Solutions
- Offline QR validation
- Retry mechanisms
- Local data caching

# 4. Admin Dashboard

### Features
- Manage routes and schedules
- Monitor bookings
- View payments and reconciliation
- Manage agents and drivers
- Handle refunds and disputes

# 5. Non-Functional Requirements

- High reliability (must work in low-network conditions)
- Fast response time (3 seconds for core actions)
- Scalable to national level
- Secure (no sensitive data leaks)
# 7. ⁠Passing near you feature 

# 6. Key Principle

The system must NOT depend fully on:
- Smartphones
- Internet connectivity
- Perfect user behavior

It must work in real African conditions:
- Weak networks
- Feature phones
- Cash + digital hybrid usage

## Final Note
No feature should be implemented without handling:
- Failure cases
- Offline scenarios
- Fraud risks