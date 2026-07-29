CHAUFFEUR SERVICE (DRIVER-ONLY) — FULL TECHNICAL SPECIFICATION

## 1. SERVICE DEFINITION

The Chauffeur Service allows a customer to request a professional driver (without a vehicle) who will drive the customer using the customer’s own car.

Primary use cases:
- Customer is intoxicated and cannot drive
- Customer is tired or unwell
- VIP/private driver need
- Elderly assistance

This is NOT ride-hailing. The system must prioritize trust, safety, and verification over speed.

## 2. USER TYPES

### 2.1 Customer
- Requests chauffeur
- Provides car
- Pays for service
- Confirms trip completion

### 2.2 Chauffeur (Driver)
- Provides driving service only
- Must be verified and approved
- Gets paid after trip completion

### 2.3 Admin
- Verifies drivers
- Handles disputes
- Manages payments and safety incidents

## 3. BOOKING FLOW (END-TO-END)

### STEP 1: Request Creation
Customer must input:

- Pickup location (required)
- Destination
- Booking type:
  - One-way trip
  - Hourly booking
- Estimated duration (if hourly)
- Car transmission:
  - Manual
  - Automatic
- Special condition:
  - Drunk assistance (yes/no)
  - VIP service (yes/no)

System must validate all required fields before proceeding.

### STEP 2: Price Calculation

System calculates and displays:

- Base fee
- Distance cost
- Time cost
- Night surcharge (if time is late)
- Waiting fee (if driver waits)

Customer must see:
- Full estimated cost BEFORE confirming
- ⁠
### STEP 3: Payment (MANDATORY BEFORE MATCHING)

- Customer pays full estimated amount upfront
- Payment goes into escrow wallet
- Booking is not created until payment is successful

### STEP 4: Driver Matching Logic

System filters drivers based on:

- Availability (online + free)
- License type matches car (manual/automatic)
- Minimum rating threshold
- Completed trips threshold
- Background check status = APPROVED

Matching priority:
→ NOT nearest driver
→ BEST qualified + reasonably close

Driver must accept within limited time (e.g. 15–30 seconds)

### STEP 5: Arrival & Verification

Upon arrival:

Customer app must display:
- Driver name
- Photo
- Rating

Verification methods:
- OTP or PIN code (customer gives driver)
OR
- Face verification (optional advanced)

OPTIONAL BUT RECOMMENDED:
- Customer uploads car condition photos before trip

Trip cannot start until verification is complete.

### STEP 6: Trip Execution

During trip:

System must provide:
- Real-time GPS tracking
- Route mapping
- Trip sharing (send link to trusted contacts)
- SOS/emergency button (customer + driver)

System monitors:
- Route deviation
- Speed anomalies

### STEP 7: Trip Completion

- Driver marks trip as complete
- Customer confirms completion

If both confirm:
→ Funds released from escrow to driver wallet 

If dispute:
→ Funds held until admin review

## 4. PAYMENT SYSTEM

### 4.1 Escrow Logic

- All payments held in escrow wallet
- Platform deducts commission (10%)
- Remaining amount goes to driver wallet

### 4.2 Driver Wallet

Driver can:
- View balance
- Withdraw funds
- See transaction history

## 5. DRIVER (CHAUFFEUR) REQUIREMENTS

### 5.1 Mandatory Verification

- National ID verification
- Valid driving license
- Selfie/face verification
- Criminal background check (REQUIRED)

Driver status must be:
→ PENDING → APPROVED → ACTIVE

Only ACTIVE drivers can receive requests.

### 5.2 Driver Profile Data

- Full name
- Photo
- Years of driving experience
- License type (manual/automatic)
- Languages spoken
- Rating
- Completed trips

## 6. SAFETY FEATURES

### Must include:

- SOS emergency button
- Live trip tracking
- Share trip feature
- Driver behavior monitoring (speed, harsh driving)

### Insurance & Liability (MUST BE DEFINED)

System must include:

- Terms defining responsibility in case of:
  - Accident
  - Car damage
  - Theft

Admin panel must allow:
- Incident reporting
- Evidence upload (photos/videos)
- ⁠
YOURDRIVE — PROTECTION, LIABILITY & RISK MANAGEMENT SPECIFICATION

# 1. LIABILITY MODEL (CORE LOGIC)

## 1.1 Roles
- Customer = Vehicle Owner
- Chauffeur = Driver (independent contractor)
- YourDrive = Technology Platform

## 1.2 Liability Rules

### A. Accident (Collision)

IF driver is at fault:
- Driver is legally responsible
- Driver must accept liability during onboarding (mandatory agreement)

IF third party is at fault:
- Liability follows traffic law (external party)

IF unclear fault:
- Case goes to admin review with evidence

PLATFORM RULE:
- YourDrive is NOT liable for accidents
- This must be enforced via Terms & Conditions + driver agreement

### B. Vehicle Damage (Non-Accident)

IF damage is proven to occur during trip:
- Driver is responsible

IF no proof:
- No liability assigned

Proof is based on:
- Pre-trip images
- Post-trip images
- Timestamp + GPS metadata

### C. Theft / Misuse

IF driver deviates from trip or disappears:
- Flag as HIGH RISK INCIDENT
- Admin can:
  - Track driver in real time
  - Share data with authorities

Driver must accept:
- Full legal responsibility
- Consent to identity disclosure to law enforcement

# 2. DRIVER AGREEMENT (MANDATORY ACCEPTANCE)

Driver must accept in-app before activation:

- I am an independent contractor
- I am responsible for damages caused during trips
- I agree to background checks
- I consent to GPS tracking during trips
- I accept penalties for misconduct or negligence
- I accept legal consequences in case of theft or criminal activity

System must store:
- Timestamp
- IP/device info
- Agreement version

# 3. CUSTOMER RISK DISCLOSURE

Before booking, show:

- “You are allowing a third-party driver to operate your vehicle”
- “YourDrive is a platform, not a transport provider”
- “Check your insurance coverage before proceeding”

User must tap:
→ “I AGREE”

Store:
- timestamp
- agreement version

# 4. EVIDENCE SYSTEM

## 4.1 Pre-Trip Capture

Before trip starts:

Customer MUST upload:
- Minimum 4 photos:
  - Front
  - Back
  - Left side
  - Right side

Optional:
- Interior

System requirements:
- Timestamp each image
- Attach GPS location
- Store securely

Trip cannot start until completed OR user explicitly skips (log skip)


## 4.2 Post-Trip Capture

After trip ends:

Customer prompted to upload same angles

Driver can also upload photos

## 4.3 Data Storage

Each trip must store:
- Pre-trip images
- Post-trip images
- Trip GPS route
- Speed logs
- Start/end timestamps

# 5. INCIDENT REPORTING SYSTEM

## 5.1 Report Types

- Accident
- Vehicle damage
- Theft / suspicious activity
- Driver misconduct
- Customer misconduct
- ⁠
## 5.2 Report Submission

Form fields:
- Incident type
- Description (text)
- Auto-filled:
  - trip ID
  - timestamp
  - GPS location

Attachments:
- Photos
- Videos
- Audio notes (optional)

## 5.3 Auto-Attached System Data

- Full trip route
- Speed data
- Driver & customer IDs

## 5.4 Incident Status Flow

- SUBMITTED
- UNDER REVIEW
- RESOLVED

Admin actions:
- Approve claim
- Reject claim
- Partial compensation
- Penalize driver/customer

# 6. PAYMENT PROTECTION SYSTEM

## 6.1 Escrow

- All trip payments held in escrow
- Funds NOT released immediately after trip if incident reported

## 6.2 Conditional Release

IF no incident:
→ Release funds to driver

IF incident reported:
→ Hold funds until resolution

## 6.3 Platform Commission

- Deduct percentage (10%) before payout

## 6.4 Driver Wallet

Driver wallet must support:
- Balance tracking
- Deductions (penalties/damages)
- Withdrawal

# 7. DRIVER RISK CONTROL

## 7.1 Risk Scoring

Track per driver:
- Cancellation rate
- Incident rate
- Customer ratings

## 7.2 Automated Actions

IF thresholds exceeded:
- Warning
- Temporary suspension
- Permanent deactivation

# 8. TRIP MONITORING SYSTEM

System must detect:

- Route deviation (off expected path)
- Long stops
- Speed violations

Trigger:
- Internal alerts
- Optional notification to customer


# 9. SECURITY & IDENTITY

## 9.1 Driver Verification (KYC)

Required:
- National ID
- Driving license
- Selfie verification
- Criminal background check

Driver status:
- PENDING
- APPROVED
- ACTIVE

## 9.2 Real-Time Tracking

- Must be ON during entire trip
- Cannot be disabled by driver

# 10. ADMIN PANEL CAPABILITIES

Admin must be able to:

- View all trips + routes
- Access evidence (images/videos)
- Review incidents
- Freeze payments
- Penalize users
- Ban drivers/customers
- Export data for legal use

# 11. TERMS & CONDITIONS (SYSTEM ENFORCEMENT)

System must enforce:

- Acceptance before usage
- Version control
- Logs of acceptance

Key clauses:
- Platform is intermediary only
- Limitation of liability
- User assumes risk
- Driver is independent contractor
- Dispute resolution process defined

# 12. CRITICAL FAILURE PREVENTION

System must NOT allow:

- Trip without driver verification
- Trip without payment
- Trip without tracking
- Trip without agreement acceptance 
- ⁠
## 7. EDGE CASE HANDLING

### 7.1 Customer is drunk

- Driver must assist (non-driving support)
- App should flag “drunk assistance” bookings

### 7.2 Cancellation Rules

Define:

- Customer cancellation fee (after driver assigned)
- Driver cancellation penalty

### 7.3 No-show handling

If customer not found:
- Driver waits X minutes
- Cancellation fee applied

CANCELLATION & NO-SHOW SYSTEM — DETAILED TECHNICAL SPECIFICATION

## 7.2 CANCELLATION RULES

### 1. CANCELLATION STATES

Every booking must have a clear state:

- REQUESTED (waiting for driver)
- ACCEPTED (driver assigned)
- DRIVER_ARRIVED
- TRIP_STARTED
- CANCELLED
- COMPLETED

Cancellation rules depend strictly on the current state.


## 2. CUSTOMER CANCELLATION LOGIC

### A. Before driver is assigned (REQUESTED)
- Customer can cancel for FREE
- Full refund from escrow

### B. After driver is assigned (ACCEPTED)

Define time window:

- Grace period: 5 minutes after driver accepts

#### If cancelled within grace period:
- Small fee 5% detection fee 2% goes to YourDrive 3% to Driver remaing to the customer 

#### If cancelled after grace period:
- Apply cancellation fee:
  - percentage (recommended: 20% of trip estimate)
  - Minimum fee enforced (e.g. $2–$5 equivalent)

Reason:
Driver has already committed time and movement.

### C. After driver arrival (DRIVER_ARRIVED)

- Customer cancellation = FULL cancellation penalty

Penalty must include:
- Driver compensation (major portion)
- Platform fee (small portion)

Recommended:
→50% of estimated fare

### D. After trip started (TRIP_STARTED)

- Customer CANNOT cancel normally
- Must trigger:
  - Emergency stop OR
  - Admin intervention

## 3. DRIVER CANCELLATION LOGIC

Driver cancellations must be STRICT to prevent abuse.

### A. Before moving (immediate cancel after accept)
- Warning logged
- No payment

### B. After moving toward pickup

- Penalty applied:
  - Rating impact
  - Monetary penalty (optional)
  - Reduced priority in future matching

### C. Frequent cancellations

System must track:

- Cancellation rate per driver

If threshold exceeded 15%
- Temporary suspension
- OR reduced visibility in matching

## 4. AUTOMATIC CANCELLATION

System must auto-cancel if:

- Driver does not move for 5minutes
- Driver does not arrive within reasonable ETA

→ Customer gets full refund
→ Driver penalized

## 7.3 NO-SHOW HANDLING

## 1. DRIVER ARRIVAL DETECTION

System marks DRIVER_ARRIVED when:

- Driver is within radius (e.g. 50–100 meters)
- Driver taps “Arrived”

Both conditions required (prevents fake arrival)

## 2. WAITING TIME RULE

- Free waiting time: 5 minutes
- Paid waiting time starts after

Waiting fee:
- Per minute rate (must be shown in pricing upfront)

## 3. CUSTOMER NO-SHOW

If customer does not appear:

### Flow:

1. Driver taps “Arrived”
2. Wait timer starts (visible to both)
3. After 5 minutes

Driver can select:
→ “Customer not found”

System actions:
- Booking marked as NO_SHOW
- Cancellation fee charged to customer

## 4. DRIVER ABUSE PREVENTION

To prevent fake no-shows:

System must require:

- GPS proof of arrival
- Optional: photo at pickup location

If disputes occur:
→ Admin reviews GPS + timestamps

## 5. CUSTOMER PROTECTION

Customer can dispute no-show if:

- Driver never arrived
- Driver was far from location

System must store:
- GPS logs
- Arrival timestamp
- Movement history

## 6. EDGE CASES

### A. Customer is drunk/unresponsive
- Driver must attempt contact:
  - Call
  - In-app message

After failed attempts:
→ proceed with NO_SHOW flow

### B. Wrong pickup location
- Customer can update location (limited times)
- Timer resets only once (to prevent abuse)

### C. Safety concern
Driver can cancel without penalty if:
- Location unsafe
- Customer threatening

Must require:
→ reason selection + optional evidence

## 7. ADMIN CONTROLS

Admin must be able to:

- Override cancellation decisions
- Refund customer manually
- Compensate driver manually
- Review GPS trip logs
- Flag abusive users/drivers

## 8. METRICS TO TRACK

- Customer cancellation rate
- Driver cancellation rate
- No-show rate
- Dispute frequency

## 9. CRITICAL DESIGN PRINCIPLES

- Rules must be automatic (not manual decisions)
- Fees must be visible BEFORE booking
- GPS must be the source of truth
- Both sides must feel protected

### 7.4 Car Damage Disputes

System must allow:
- Pre-trip photo upload
- Post-trip photo upload
- Admin dispute resolution flow

## 8. ADMIN PANEL

Admin must be able to:

- Approve/reject drivers
- View all trips
- Handle disputes
- Manage payments
- Ban/suspend users
- View incident reports

## 9. Platform must have

- Scheduled bookings
- Favorite drivers
- “Stay with me” (driver waits and returns)
- Multi-stop trips

## 10. NON-FUNCTIONAL REQUIREMENTS

- Real-time tracking must be stable
- Payment system must be secure
- Data privacy must be enforced
- System must handle high-risk scenarios reliably

## 11. SUCCESS METRICS

- Trip completion rate
- Cancellation rate
- Safety incidents
- Customer ratings
- Driver ratings