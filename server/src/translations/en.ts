export default {
  validation: {
    // pagination
    page_positive_int: "Page must be a positive integer",
    page_size_positive_int: "Page size must be a positive integer",

    // auth (existing)
    email_required: "Please enter a valid email address",
    password_required: "Password is required",
    password_min: "Password must be at least 4 characters long",
    password_rule:
      "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a digit",
    role_invalid: "Role must be one of: {{roles}}",

    // auth extended
    firstName_string: "First name must be a string",
    firstName_required: "First name is required",
    name_required: "Name is required",
    firstName_length: "First name must be between 2 and 50 characters",
    firstName_format:
      "First name can only contain letters, hyphens, and apostrophes, and must start with a letter",
    lastName_string: "Last name must be a string",
    lastName_required: "Last name is required",
    lastName_length: "Last name must be between 2 and 50 characters",
    lastName_format:
      "Last name can only contain letters, hyphens, and apostrophes, and must start with a letter",
    referralCode_string: "Referral code must be a string",
    agreeToTerms_boolean: "Accepting terms must be a boolean",
    includeExpired_boolean: "includeExpired must be a boolean",
    subscribeToUpdates_boolean: "Subscribe to updates must be a boolean",

    // verify email
    allowed_fields_email_code: "Allowed fields are 'email' and 'code'",
    verification_code_numeric: "Verification code should be a number",
    verification_code_required: "Verification code is required",

    // forgot/reset phone
    phone_canadian:
      "Phone number must be in Canadian format (e.g.: +14165551234)",
    phone_invalid: "Invalid phone number",
    reset_token_required: "Reset token is required",

    // moderation
    only_content_context_allowed:
      "Only 'content' and 'context' fields are allowed",
    content_required: "Content is required and must be a non-empty string",
    context_object: "Context must be an object",
    content_type_invalid:
      "Content type must be one of: chat_message, review, ride_notes, location_name",
    user_role_invalid: "User role must be either USER or ADMIN",
    question_context_string: "Question context must be a string",
    previous_messages_array: "Previous messages must be an array",

    only_contents_allowed: "Only 'contents' field is allowed",
    contents_array_range: "Contents must be an array with 1-10 items",
    each_content_required:
      "Each content item must have a non-empty content string",
    each_context_object: "Each content item must have a context object",
    each_content_type_invalid:
      "Each content type must be one of: chat_message, review, ride_notes, location_name",
    each_user_role_invalid: "Each user role must be either USER or ADMIN",
    each_question_context_string: "Each question context must be a string",
    each_previous_messages_array: "Each previous messages must be an array",

    // no-show
    userId_positive: "User ID must be a positive integer",
    rideId_positive: "Ride ID must be a positive integer",
    rideId_required: "Ride ID is required",
    noshow_reason_length:
      "Reason must be descriptive enough and between 5 and 500 characters",
    reporter_type_string: "Reporter type must be a string",
    reporter_type_required: "Reporter type is required",
    reporter_type_invalid: "Reporter type must be either DRIVER or PASSENGER",
    noShowId_positive: "No-show ID must be a positive integer",
    review_notes_max:
      "Review notes must be a string with a maximum of 500 characters",

    // rating
    driverId_positive: "Driver ID must be a positive integer",
    rating_range: "Rating must be an integer between 1 and 5",
    review_max_200: "Review cannot be longer than 200 characters",
    review_string: "Review must be a string",
    ratingId_positive: "Rating ID must be a positive integer",

    // ride creation and validation
    departure_object: "Departure must be an object",
    departure_region_required: "Departure region/province is required",
    departure_city_required: "Departure city is required",
    departure_locationName_required: "Departure location name is required",
    latitude_range: "Latitude must be a number between -90 and 90",
    longitude_range: "Longitude must be a number between -180 and 180",
    departure_address_string: "Departure address must be a string",
    departure_description_string: "Departure description must be a string",

    destination_object: "Destination must be an object",
    destination_region_required: "Destination region/province is required",
    destination_city_required: "Destination city is required",
    destination_locationName_required: "Destination location name is required",
    destination_latitude_valid: "Valid destination latitude is required",
    destination_longitude_valid: "Valid destination longitude is required",
    destination_address_string: "Destination address must be a string",
    destination_description_string: "Destination description must be a string",

    departureTime_number: "departureTime must be a number",
    departure_time_future: "Departure time must be in the future",
    departure_time_required: "Date is required and must be a valid date",

    estimatedArrivalTime_number: "estimatedArrivalTime must be a number",
    estimatedArrival_after_departure:
      "Estimated arrival time must be after departure time",
    estimatedArrival_required:
      "Estimated arrival time is required and must be a valid date",

    availableSeats_min: "Available seats must be at least 1",
    contribution_non_negative: "Contribution must be a non-negative number",
    vehicleId_positive: "Vehicle ID must be a positive integer",
    bookingType_invalid: "Booking type must be one of {{types}}",
    contributionCollectionMethod_invalid:
      "Contribution collection method must be one of {{methods}}",

    preferences_object: "Preferences must be an object",
    preference_boolean: "Preference must be a boolean",
    luggage_size_invalid:
      "Luggage size must be one of NONE, SMALL, MEDIUM, LARGE",
    luggage_count_non_negative:
      "Maximum luggage count must be a non-negative integer",
    preferences_additionalNotes_string:
      "Preferences additionalNotes must be a string",

    stopovers_array: "Stopovers must be an array",
    stopover_region_required: "Each stopover must have a region/province",
    stopover_city_required: "Each stopover must have a city",
    stopover_location_required: "Each stopover must have a location name",
    stopover_latitude_valid: "Each stopover must have a valid latitude",
    stopover_longitude_valid: "Each stopover must have a valid longitude",
    stopover_address_string:
      "If address is provided, it must be a string in stopovers",
    stopover_description_string:
      "If description is provided, it must be a string in stopovers",

    // Book ride
    seats_booked_positive: "Seats booked must be a positive integer",
    useCoupons_boolean: "Use coupon should be a boolean value",
    planId_positive: "Plan ID must be a positive integer",
    billing_address_required: "Billing address is required",
    billing_address_object: "Billing address must be an object",
    billing_street_required: "Street is required",
    billing_street_string: "Street must be a string",
    billing_city_required: "City is required",
    billing_city_string: "City must be a string",
    billing_province_required: "Province is required",
    billing_province_string: "Province must be a string",
    billing_postal_required: "Postal code is required",
    billing_postal_string: "Postal code must be a string",

    // get rides / search
    kind_invalid: "The kind of rides must be either 'posted' or 'booked'",
    orderBy_string: "Order by must be a string",
    sort_invalid: "Order direction must be 'asc' or 'desc'",
    status_invalid: "Status must be one of {{statuses}}",
    minContribution_non_negative:
      "Minimum contribution must be a non-negative number",
    maxContribution_non_negative:
      "Maximum contribution must be a non-negative number",
    invalid_latitude: "Invalid latitude",
    invalid_longitude: "Invalid longitude",
    radius_min: "Radius must be at least 1 km",

    // publish / attendance
    booking_attendance_code_required:
      "Booking attendance code must be provided",
    cancel_reason_required: "Reason is required and must be a string",

    // fee settings
    fee_type_required: "Type is required",
    fee_type_string: "Type must be a string",
    fee_type_invalid: "Type must be one of {{types}}",
    amount_required: "Amount is required",
    amount_positive: "Amount must be a positive number",
    active_boolean: "Active must be a boolean",
    feeSettingId_required: "FeeSetting ID is required",
    feeSettingId_positive: "FeeSetting ID must be a positive integer",

    // coupon rule
    ruleId_required: "Rule ID is required",
    ruleId_positive: "Rule ID must be a positive integer",
    requiredCoupons_positive: "Required coupons must be a positive integer",
    description_string: "Description must be a string",
    description_not_empty: "Description cannot be empty string",

    // logs
    limit_positive: "Limit must be a positive integer",
    level_string: "Level must be a string",
    action_string: "Action must be a string",
    sortBy_string: "SortBy must be a string",
    sortOrder_invalid: 'SortOrder must be either "asc" or "desc"',
    startDate_iso: "StartDate must be a valid ISO8601 date",
    endDate_iso: "EndDate must be a valid ISO8601 date",
    exportType_string: "eportType must be a string eg csv or json",
    logs_type_string: "type must be a string eg payment",

    // user suspension
    suspend_userId_required: "User ID is required",
    suspend_userId_positive: "User ID must be a positive integer",
    suspendUntil_positive:
      "suspendUntil must be a positive integer (timestamp)",
    suspensionReason_string: "suspensionReason must be a string",
    suspensionReason_not_empty: "suspensionReason must not be empty",
    suspensionReason_max: "suspensionReason must not exceed 200 characters",

    // subscription
    plan_name_string: "Name must be a string",
    plan_name_required: "Name is required",
    plan_description_string: "Description must be a string",
    plan_type_required: "Type is required",
    plan_type_invalid: "Subscription type must be one of {{plan_types}}",
    plan_duration_invalid:
      "Subscription duration must be one of {{plan_dulations}}",
    plan_subscriptionEndDate_number: "subscriptionEndDate must be a number",
    plan_either_duration_or_enddate:
      "Either duration or subscriptionEndDate must be provided",
    plan_only_one_of_duration_enddate:
      "Only one of duration or subscriptionEndDate can be provided",
    plan_price_required: "Price is required",
    plan_price_positive: "Price must be a positive number",
    plan_availableUntil_number: "availableUntil must be a number",
    plan_category_invalid: "Category must be one of {{categories}}",
    plan_id_positive: "Plan ID must be a positive integer",
    startDate_iso8601: "Start date must be a valid ISO date",
    endDate_iso8601: "End date must be a valid ISO date",

    // generic fallback
    invalid_request: "Invalid request",
    cancellation_allowance_invalid:
      "cancellationCountsAgainstAllowance must be YES or NO",

    // transaction
    type_invalid: "Type must be one of: {{types}}",
    paymentProvider_invalid: "Payment provider must be one of: {{providers}}",
    payment_method_id_string: "Payment Method ID must be a string",
    minAmount_non_negative: "minAmount must be a non-negative number",
    maxAmount_non_negative: "maxAmount must be a non-negative number",
    default_transaction_id_positive:
      "Transaction ID must be a positive integer",

    invalid_language: "Invalid language value",
    invalid_theme: "Theme must be either 'light' or 'dark'",
    invalid_date_of_birth: "dateOfBirth must be a valid date (YYYY-MM-DD)",
    notification_pref_invalid: "notificationPref must be one of: {{prefs}}",
    music_pref_invalid: "Music preference must be one of: {{prefs}}",
    additionalNotes_too_long:
      "Additional notes can have at most 500 characters",
    frequentRoutes_invalid:
      "Frequent routes must be an array with at most 10 items",
    route_from_required: "Each route must have a 'from' field",
    route_to_required: "Each route must have a 'to' field",
    route_from_string: "Route 'from' must be a string",
    emergencyContactName_length:
      "Emergency contact name must be between 2 and 100 characters",
    emergencyContactName_not_empty:
      "Emergency contact name can not be empty string if provided",
    emergencyContactName_format:
      "Name must contain only letters, spaces, hyphens, and apostrophes",
    emergencyContactPhone_invalid:
      "Emergency contact phone must be in E.164 format (e.g: +1234567890)",
    emergencyContactName_required: "Emergency contact name is required",
    emergencyContactPhone_string: "Emergency contact phone must be a string",
    phone_required: "Phone number is required",
    licenseNumber_length: "License number must be between 5 and 20 characters",
    licenseNumber_required: "License number is required",
    licence_image_invalid: "Invalid side. Must be 'front' or 'back'",
    drivingExperience_invalid: "Invalid driving experience",
    drivingExperience_required: "Driving experience is required",
    referralCode_invalid:
      "Referral code must be between 3 and 20 characters and alphanumeric",

    // change password
    oldPassword_required: "Old password is required",
    newPassword_min: "New password must be at least 4 characters long",

    // vehicle
    vehicle_make_required: "Make is required",
    vehicle_make_length: "Make must be between 2 and 30 characters",
    vehicle_capacity_required: "Capacity is required",
    vehicle_capacity_min: "Capacity must be at least 1",
    model_required: "Model is required",
    model_length: "Model must be between 1 and 30 characters",
    year_range: "Year must be between 1990 and {{year}}",
    color_required: "Color is required",
    color_too_long: "Color is too long",
    plate_required: "Plate number is required",
    plate_length: "Plate number must be between 3 and 15 characters",

    vehicleId_required: "Vehicle ID is required",
    imageId_required: "Image ID is required",
    imageId_positive: "Image ID must be a positive integer",

    make_string: "Make must be a string",
    make_length: "Make must be between 2 and 30 characters",
    model_string: "Model must be a string",
    color_string: "Color must be a string",
    color_length: "Color cannot exceed 20 characters",
    plate_string: "Plate number must be a string",

    // User – Change Password
    old_password_required: "Old password is required",
    old_password_string: "Old password must be a string",
    old_password_not_empty: "Old password cannot be empty",
    new_password_required: "New password is required",
    new_password_string: "New password must be a string",
    new_password_min: "New password must be at least 4 characters long",

    // User – Preferences
    language_string: "Language must be a string",
    language_invalid: "Invalid language value",
    theme_invalid: "Theme must be either 'light' or 'dark'",
    notification_pref_string: "Notification preference must be a string",
    notification_id_positive: "Notification ID must be a positive integer",
    two_factor_boolean: "Two-factor enabled must be a boolean",

    // contact messages
    subject_required: "Subject is required",
    message_max: "Message cannot exceed 200 characters",
    message_required: "Message is required",
    message_string: "Message must be a string",
    message_id_required: "Message ID is required",
    message_id_postive: "Message ID must be a postive integer",

    fcm_token_required: "FCM token is required",

    session_id_required: "Session ID is required.",
    session_id_string: "Session ID must be a string.",
    payment_method_id_required: "Payment method ID is required.",
    save_card: "Save card must be a boolean",
    commission_rate_invalid:
      "Commission rate must be a number in the range of 0 to 100",
    id_positive: "ID must be a positive integer number",

    // Additional validation rules
    detourRadius_numeric: "Detour radius must be a number.",
    detourRadius_range: "Detour radius must be between 0 and 25 KM.",
    d2dCapacity_positive: "D2D capacity must be a positive integer.",
    basePrice_required: "Base price is required.",
    basePrice_non_negative: "Base price must be a non-negative number.",
    extraKmPrice_required: "Extra km price is required.",
    extraKmPrice_non_negative: "Extra km price must be a non-negative number.",

    // Ride request
    origin_city_required: "Origin city is required",
    origin_province_required: "Origin province is required",
    origin_locationName_string: "Origin location name is must be a string",
    origin_locationName_required: "Origin location name is required",
    rideType_string: "Ride type must be a string",
    rideType_required: "Ride type is required",
    invalid_ride_type: "Ride type must be one of: {{rideTypes}}",
    origin_latitude_invalid: "Invalid origin latitude",
    origin_longitude_invalid: "Invalid origin longitude",
    origin_description_string: "Origin description must be a string",
    origin_description_required: "Origin description is required",
    origin_address_required: "Origin address is required",
    origin_address_string: "Origin address must be a string",
    destination_address_required: "Destination address is required",
    destination_description_required: "Destination description is required",
    destination_province_required: "Destination province is required",
    destination_locationName_string:
    "Destination location name is must be a string",
    destination_latitude_invalid: "Invalid destination latitude",
    destination_longitude_invalid: "Invalid destination longitude",
    date_required: "Date is required",
    date_number: "Date is must in number format",
    timeWindowStart_number: "timeWindowStart is must a date in number format",
    timeWindowEnd: "timeWindowEnd is must a date in number format",
    ride_request_seats_range: "Seats must be between 1 and 9",
    proximityMeters_min: "Proximity must be at least 100 meters",
    rideRequestId_required: "rideRequestId is required",
    rideRequestId_positive: "rideRequestId must be a positive interger number",
    
    search_required: "search term is required",
    search_string: "search term is must be a string",
    rideRequest_status_string: "Ride request status must be a string",
    rideRequest_status_required: "Ride request status is required",
    invalid_rideRequest_status: "Ride request status must be one of: {{statuses}}",

    platform_string: "Platform must be a string",
    platform_not_empty: "Platform must be a non empty string",
    platform_invalid: "Platform must be one of: {{values}}",
    redirect_pathname_string: "Redirect pathname must be a string",

    mine_only: "Mine only must be a boolean",

    // Driver Start
    driverStartLocation_object: "Driver start location must be a valid object.",
    driverStartLocation_region_required: "Driver start region is required.",
    driverStartLocation_city_required: "Driver start city is required.",
    driverStartLocation_locationName_required: "Driver start location name is required.",
    driverStartLocation_address_string: "Driver start address must be a string.",
    driverStartLocation_description_string: "Driver start description must be a string.",

    // Driver Stop
    driverStopLocation_object: "Driver stop location must be a valid object.",
    driverStopLocation_region_required: "Driver stop region is required.",
    driverStopLocation_city_required: "Driver stop city is required.",
    driverStopLocation_locationName_required: "Driver stop location name is required.",
    driverStopLocation_latitude_valid: "Driver stop latitude must be between -90 and 90.",
    driverStopLocation_longitude_valid: "Driver stop longitude must be between -180 and 180.",
    driverStopLocation_address_string: "Driver stop address must be a string.",
    driverStopLocation_description_string: "Driver stop description must be a string.",

    // D2D extra fields
    detourRadius_non_negative: "Detour radius must be zero or a positive value.",


    // Pickup
    pickup_object: "Pickup location must be a valid object.",
    pickup_region_required: "Pickup region is required.",
    pickup_city_required: "Pickup city is required.",
    pickup_locationName_required: "Pickup location name is required.",
    pickup_latitude_valid: "Pickup latitude must be between -90 and 90.",
    pickup_longitude_valid: "Pickup longitude must be between -180 and 180.",
    pickup_address_string: "Pickup address must be a string.",
    pickup_description_string: "Pickup description must be a string.",

    // Dropoff
    dropoff_object: "Dropoff location must be a valid object.",
    dropoff_region_required: "Dropoff region is required.",
    dropoff_city_required: "Dropoff city is required.",
    dropoff_locationName_required: "Dropoff location name is required.",
    dropoff_latitude_valid: "Dropoff latitude must be between -90 and 90.",
    dropoff_longitude_valid: "Dropoff longitude must be between -180 and 180.",
    dropoff_address_string: "Dropoff address must be a string.",
    dropoff_description_string: "Dropoff description must be a string.",

    // Request / Cancel / Common IDs
    requestId_positive: "Request ID must be a positive number.",
    d2d_decline_cancel_reason: "Decline or cancellation reason must be text.",

    maxRadius_positive: "Maximum radius must be a postive number",
    maxPricePerExtraKm_positive: "Maximum price per extra km must be a postive number",

    passengerId_positive: "Passenger ID must be a positive number.",

    d2dBookingRequest_status_string: "Status must be a valid string.",
    d2dBookingRequest_status_required: "Status cannot be empty.",
    invalid_d2dBookingRequest_status:
      "Invalid booking request status. Allowed values: {{statuses}}.",

      // google
      code_string: "code must be a string",
      code_required: "code is required",
      id_token_string: "Id token must be a string",
      id_token_required: "Id token is required",

      destination_required: "Destination is required",
      destination_string: "Destination must be a string",
      destination_not_empty: "Destination can not be empty",
      origin_required: "Origin is required",
      origin_string: "Origin must be a string",
      origin_not_empty: "Origin can not be empty",
      waypoints_string: "Waypoints must be a string",
      waypoints_not_empty: "Waypoints can not be empty",

      // Additional missing validations
      input_required: "Input is required",
      input_string: "Input must be a string",
      input_not_empty: "Input cannot be empty",
      sessiontoken_required: "Session token is required",
      sessiontoken_string: "Session token must be a string",
      sessiontoken_not_empty: "Session token cannot be empty",
      place_id_required: "Place ID is required",
      location_string: "Location must be a string",
      radius_numeric: "Radius must be a number",
      fields_string: "Fields must be a string",
      pickupExtraKms_positive: "Pickup extra kms must be a positive number",
      dropoffExtraKms_positive: "Dropoff extra kms must be a positive number",
  },
};
