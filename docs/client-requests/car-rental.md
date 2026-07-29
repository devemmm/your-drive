CAR RENTAL MARKETPLACE – TECHNICAL & PRODUCT REQUIREMENTS

OBJECTIVE
Build a controlled car rental marketplace where third-party partners (rental companies or individual car owners) list vehicles, while the platform maintains strict control over bookings, payments, pricing rules, and customer experience.

	1.	SYSTEM OVERVIEW

The system must support three main roles:
	1.	Customer (Renter)
	2.	Partner (Car Owner / Rental Company)
	3.	Admin (Platform Owner)

The platform must ensure:
	•	No double bookings
	•	Full payment control
	•	Enforced partner compliance
	•	Clear booking lifecycle tracking


	2.	CAR INVENTORY MANAGEMENT

Each car must have:
	•	Unique Car ID
	•	Owner/Partner ID
	•	Make, Model, Year
	•	Plate Number
	•	Category (Economy, SUV, Luxury, etc.)
	•	Transmission (Manual/Automatic)
	•	Fuel Type
	•	Seat Capacity
	•	(minimum 3 real images)

Car Status:
	•	Available
	•	Booked
	•	In Use
	•	Maintenance
	•	Disabled

	3.	AVAILABILITY & CALENDAR SYSTEM 

Each car must have a time-based availability calendar.

Requirements:
	•	Prevent overlapping bookings
	•	Auto-block dates once booking is confirmed
	•	Allow admin/partner to block dates (maintenance, etc.)
	•	Support hourly and daily rentals

Validation:
	•	System must reject any booking that conflicts with existing reservations

	4.	BOOKING FLOW (CUSTOMER SIDE)

Steps:
	1.	Select pickup location
	2.	Select pickup date & time
	3.	Select return date & time
	4.	Browse available cars (filtered by availability)
	5.	View car details
	6.	Confirm booking
	7.	Make payment

Display before confirmation:
	•	Total rental cost
	•	Security deposit amount
	•	Cancellation policy

	5.	PRICING SYSTEM

Each car must support:
	•	Price per day (required)
	•	Optional price per hour
	•	Long rental discounts (optional)

Platform must support:
	•	Min/max pricing rules (admin controlled)

	6.	PAYMENT SYSTEM (PLATFORM-CONTROLLED)

Rules:
	•	Customer MUST pay through platform (no direct payment to partner)
	•	Platform holds full amount
	•	Commission is deducted automatically
	•	Partner payout happens AFTER trip completion

Breakdown example:
	•	Customer pays: $100
	•	Platform commission: 20%
	•	Partner receives: $80

Support:
	•	Mobile money
	•	Card
	•	Cash (optional, but discouraged)

	7.	SECURITY DEPOSIT SYSTEM

	•	Deposit must be collected separately from rental fee
	•	Stored in system as “held amount”
	•	Not transferred to partner immediately

After trip:
	•	Admin/partner submits condition report
	•	Deposit is:
	•	Fully refunded OR
	•	Partially deducted (damage, fuel, etc.)


	8.	BOOKING STATUS (LIFECYCLE)

Each booking must have states:
	1.	Pending
	2.	Confirmed
	3.	Ongoing
	4.	Completed
	5.	Cancelled
	6.	No-show

Each state must:
	•	Update system records
	•	Trigger notifications

	9.	PICKUP & RETURN MODULE

Pickup:
	•	Capture car condition (photos + checklist)
	•	Record fuel level
	•	Confirm handover

Return:
	•	Capture new condition
	•	Compare with pickup
	•	Record damages or fuel differences
	•	Trigger deposit decision

	10.	CANCELLATION & PENALTIES SYSTEM

Cancellation rules:
	•	24 hours before → 100% refund
	•	12–24 hours → 80% refund
	•	12 hours → 50% or less

No-show:
	•	Charge up to 100% of booking

Late return:
	•	Add hourly or full-day charge

System must:
	•	Automatically calculate penalties
	•	Deduct from payment or deposit

	11.	PARTNER MANAGEMENT SYSTEM

Partner must have:
	•	Profile & verification
	•	Ability to add/edit cars
	•	Availability calendar management
	•	Booking notifications
	•	Earnings dashboard

Restrictions:
	•	Cannot override confirmed bookings
	•	Cannot receive direct payments


	12.	PARTNER PERFORMANCE & CONTROL

System must track:
	•	Cancellation rate
	•	Customer ratings
	•	Booking completion rate

Admin controls:
	•	Reduce visibility of poor performers
	•	Suspend/remove partners
	•	Apply penalties for cancellations

	13.	ANTI-BYPASS PROTECTION

Technical + operational enforcement:
	•	Hide customer phone number until booking confirmed
	•	In-app messaging only
	•	Monitor repeated cancellations (possible bypass attempt)

Optional:
	•	Flag suspicious behavior patterns


	14.	ADMIN DASHBOARD 

Admin must control:
	•	All bookings
	•	All cars
	•	All partners
	•	Payments & commissions
	•	Deposits & refunds
	•	Disputes

Admin actions:
	•	Cancel booking
	•	Block car
	•	Adjust pricing rules
	•	Penalize partner
	•	Approve/reject damage claims

	15.	NOTIFICATIONS SYSTEM

Must include:
	•	Booking confirmation
	•	Payment confirmation
	•	Pickup reminder
	•	Return reminder
	•	Cancellation alerts

Channels:
	•	Push notifications
	•	SMS fallback

	16.	REPORTING & ANALYTICS

Admin must see:
	•	Total revenue
	•	Commission earned
	•	Bookings per day
	•	Car utilization rate
	•	Top-performing partners