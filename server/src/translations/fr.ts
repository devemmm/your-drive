export default {
  validation: {
    // pagination
    page_positive_int: "La page doit être un entier positif",
    page_size_positive_int: "La taille de la page doit être un entier positif",

    // auth (existing)
    email_required: "Veuillez saisir une adresse e-mail valide",
    password_required: "Le mot de passe est requis",
    password_min: "Le mot de passe doit comporter au moins 4 caractères",
    password_rule:
      "Le mot de passe doit comporter au moins 8 caractères et inclure une majuscule, une minuscule et un chiffre",
    role_invalid: "Le rôle doit être l'un des suivants : {{roles}}",

    // auth extended
    firstName_string: "Le prénom doit être une chaîne de caractères",
    firstName_length: "Le prénom doit comporter entre 2 et 50 caractères",
    name_required: "Le nom est requis",
    firstName_format:
      "Le prénom ne peut contenir que des lettres, des traits d'union et des apostrophes, et doit commencer par une lettre",
    lastName_string: "Le nom doit être une chaîne de caractères",
    lastName_required: "Le nom est requis",
    lastName_length: "Le nom doit comporter entre 2 et 50 caractères",
    lastName_format:
      "Le nom ne peut contenir que des lettres, des traits d'union et des apostrophes, et doit commencer par une lettre",
    referralCode_string:
      "Le code de parrainage doit être une chaîne de caractères",
    agreeToTerms_boolean: "L'acceptation des conditions doit être un booléen",
    includeExpired_boolean: "includeExpired doit être un booléen",
    subscribeToUpdates_boolean:
      "S'abonner aux mises à jour doit être un booléen",

    // verify email
    allowed_fields_email_code: "Les champs autorisés sont 'email' et 'code'",
    verification_code_numeric: "Le code de vérification doit être un nombre",
    verification_code_required: "Le code de vérification est requis",

    // forgot/reset phone
    phone_canadian:
      "Le numéro de téléphone doit être au format canadien (ex. : +14165551234)",
    phone_invalid: "Numéro de téléphone invalide",
    reset_token_required: "Le jeton de réinitialisation est requis",

    // moderation
    only_content_context_allowed:
      "Seuls les champs 'content' et 'context' sont autorisés",
    content_required: "Le contenu est requis et doit être une chaîne non vide",
    context_object: "Le contexte doit être un objet",
    content_type_invalid:
      "Le type de contenu doit être l'un de : chat_message, review, ride_notes, location_name",
    user_role_invalid: "Le rôle utilisateur doit être USER ou ADMIN",
    question_context_string: "Le contexte de la question doit être une chaîne",
    previous_messages_array: "Les messages précédents doivent être un tableau",

    only_contents_allowed: "Seul le champ 'contents' est autorisé",
    contents_array_range: "Contents doit être un tableau avec 1 à 10 éléments",
    each_content_required:
      "Chaque élément de contenu doit avoir une chaîne de contenu non vide",
    each_context_object:
      "Chaque élément de contenu doit avoir un objet de contexte",
    each_content_type_invalid:
      "Chaque type de contenu doit être : chat_message, review, ride_notes, location_name",
    each_user_role_invalid: "Chaque rôle utilisateur doit être USER ou ADMIN",
    each_question_context_string:
      "Chaque contexte de question doit être une chaîne",
    each_previous_messages_array:
      "Chaque previous messages doit être un tableau",

    // no-show
    userId_positive: "L'ID utilisateur doit être un entier positif",
    rideId_positive: "L'ID de la trajet doit être un entier positif",
    rideId_required: "L'ID du trajet est requis",
    noshow_reason_length:
      "La raison doit être suffisamment descriptive et contenir entre 5 et 500 caractères",
    reporter_type_string: "Le type de rapporteur doit être une chaîne",
    reporter_type_required: "Le type de rapporteur est requis",
    reporter_type_invalid:
      "Le type de rapporteur doit être DRIVER ou PASSENGER",
    noShowId_positive: "L'ID de non-présentation doit être un entier positif",
    review_notes_max:
      "Les notes de révision doivent être une chaîne d'au plus 500 caractères",

    // rating
    driverId_positive: "L'ID du conducteur doit être un entier positif",
    rating_range: "La note doit être un entier entre 1 et 5",
    review_max_200: "L'avis ne peut pas dépasser 200 caractères",
    review_string: "L'avis doit être une chaîne",
    ratingId_positive: "L'ID de la note doit être un entier positif",

    // ride
    departure_object: "Le départ doit être un objet",
    departure_region_required: "La région/province de départ est requise",
    departure_city_required: "La ville de départ est requise",
    departure_locationName_required: "Le nom du lieu de départ est requis",
    latitude_range: "La latitude doit être un nombre entre -90 et 90",
    longitude_range: "La longitude doit être un nombre entre -180 et 180",
    departure_address_string: "L'adresse de départ doit être une chaîne",
    departure_description_string:
      "La description de départ doit être une chaîne",

    destination_object: "La destination doit être un objet",
    destination_region_required:
      "La région/province de destination est requise",
    destination_city_required: "La ville de destination est requise",
    destination_locationName_required:
      "Le nom du lieu de destination est requis",
    destination_latitude_valid: "Latitude de destination valide requise",
    destination_longitude_valid: "Longitude de destination valide requise",
    destination_address_string: "L'adresse de destination doit être une chaîne",
    destination_description_string:
      "La description de destination doit être une chaîne",

    departureTime_number: "departureTime doit être un nombre",
    departure_time_future: "L'heure de départ doit être dans le futur",
    departure_time_required: "La date est requise et doit être une date valide",

    estimatedArrivalTime_number: "estimatedArrivalTime doit être un nombre",
    estimatedArrival_after_departure:
      "L'heure d'arrivée estimée doit être après l'heure de départ",
    estimatedArrival_required:
      "L'heure d'arrivée estimée est requise et doit être une date valide",

    availableSeats_min: "Les places disponibles doivent être au moins 1",
    contribution_non_negative:
      "La contribution doit être un nombre non négatif",
    vehicleId_positive: "L'ID du véhicule doit être un entier positif",
    bookingType_invalid: "Le type de réservation doit être l'un de {{types}}",
    contributionCollectionMethod_invalid:
      "La méthode de collecte de contribution doit être l'une des suivantes : {{methods}}",

    preferences_object: "Les préférences doivent être un objet",
    preference_boolean: "La préférence doit être un booléen",
    luggage_size_invalid:
      "La taille des bagages doit être l'une des valeurs NONE, SMALL, MEDIUM, LARGE",
    luggage_count_non_negative:
      "Le nombre maximal de bagages doit être un entier non négatif",
    preferences_additionalNotes_string:
      "Les notes supplémentaires doivent être une chaîne",

    stopovers_array: "Les escales doivent être un tableau",
    stopover_region_required: "Chaque escale doit avoir une région/province",
    stopover_city_required: "Chaque escale doit avoir une ville",
    stopover_location_required: "Chaque escale doit avoir un nom de lieu",
    stopover_latitude_valid: "Chaque escale doit avoir une latitude valide",
    stopover_longitude_valid: "Chaque escale doit avoir une longitude valide",
    stopover_address_string:
      "Si une adresse est fournie, elle doit être une chaîne dans les escales",
    stopover_description_string:
      "Si une description est fournie, elle doit être une chaîne dans les escales",

    // Book ride
    seats_booked_positive:
      "Le nombre de places réservées doit être un entier positif",
    useCoupons_boolean: "L'utilisation de coupons doit être un booléen",
    planId_positive: "L'ID du plan doit être un entier positif",
    billing_address_required: "L'adresse de facturation est requise",
    billing_address_object: "L'adresse de facturation doit être un objet",
    billing_street_required: "La rue est requise",
    billing_street_string: "La rue doit être une chaîne",
    billing_city_required: "La ville est requise",
    billing_city_string: "La ville doit être une chaîne",
    billing_province_required: "La province est requise",
    billing_province_string: "La province doit être une chaîne",
    billing_postal_required: "Le code postal est requis",
    billing_postal_string: "Le code postal doit être une chaîne",

    // get rides / search
    kind_invalid: "Le type de trajets doit être 'posted' ou 'booked'",
    orderBy_string: "Trier par doit être une chaîne",
    sort_invalid: "L'ordre doit être 'asc' ou 'desc'",
    status_invalid: "Le statut doit être l'un des suivants : {{statuses}}",
    minContribution_non_negative:
      "La contribution minimale doit être un nombre non négatif",
    maxContribution_non_negative:
      "La contribution maximale doit être un nombre non négatif",
    invalid_latitude: "Latitude invalide",
    invalid_longitude: "Longitude invalide",
    radius_min: "Le rayon doit être au moins 1 km",

    // publish / attendance
    booking_attendance_code_required:
      "Le code de présence à la réservation doit être fourni",
    cancel_reason_required: "La raison est requise et doit être une chaîne",

    // fee settings
    fee_type_required: "Le type est requis",
    fee_type_string: "Le type doit être une chaîne",
    fee_type_invalid: "Le type doit être l'un des suivants : {{types}}",
    amount_required: "Le montant est requis",
    amount_positive: "Le montant doit être un nombre positif",
    active_boolean: "Active doit être un booléen",
    feeSettingId_required: "L'ID FeeSetting est requis",
    feeSettingId_positive: "L'ID FeeSetting doit être un entier positif",

    // coupon rule
    ruleId_required: "L'ID de la règle est requis",
    ruleId_positive: "L'ID de la règle doit être un entier positif",
    requiredCoupons_positive:
      "Les coupons requis doivent être un entier positif",
    description_string: "La description doit être une chaîne",
    description_not_empty: "La description ne peut pas être une chaîne vide",

    // logs
    limit_positive: "La limite doit être un entier positif",
    level_string: "Le niveau doit être une chaîne",
    action_string: "L'action doit être une chaîne",
    sortBy_string: "SortBy doit être une chaîne",
    sortOrder_invalid: 'SortOrder doit être "asc" ou "desc"',
    startDate_iso: "StartDate doit être une date ISO8601 valide",
    endDate_iso: "EndDate doit être une date ISO8601 valide",
    exportType_string:
      "eportType doit être une chaîne, par exemple csv ou json",
    logs_type_string:
      "le type doit être une chaîne de caractères, par exemple payment",

    // user suspension
    suspend_userId_required: "L'ID utilisateur est requis",
    suspend_userId_positive: "L'ID utilisateur doit être un entier positif",
    suspendUntil_positive:
      "suspendUntil doit être un entier positif (timestamp)",
    suspensionReason_string: "suspensionReason doit être une chaîne",
    suspensionReason_not_empty: "suspensionReason ne doit pas être vide",
    suspensionReason_max:
      "suspensionReason ne doit pas dépasser 200 caractères",

    // subscription
    plan_name_string: "Le nom doit être une chaîne",
    plan_name_required: "Le nom est requis",
    plan_description_string: "La description doit être une chaîne",
    plan_type_required: "Le type est requis",
    plan_type_invalid: "Le type d'abonnement doit être l'un des {{plan_types}}",
    plan_duration_invalid:
      "La durée de l'abonnement doit être l'une des suivantes : {{plan_dulations}}",
    plan_subscriptionEndDate_number: "subscriptionEndDate doit être un nombre",
    plan_either_duration_or_enddate:
      "Une durée ou une subscriptionEndDate doit être fournie",
    plan_only_one_of_duration_enddate:
      "Seul l'un des champs duration ou subscriptionEndDate peut être fourni",
    plan_price_required: "Le prix est requis",
    plan_price_positive: "Le prix doit être un nombre positif",
    plan_availableUntil_number: "availableUntil doit être un nombre",
    plan_category_invalid:
      "La catégorie doit être l'une des suivantes : {{categories}}",
    plan_id_positive: "L'ID du plan doit être un entier positif",
    startDate_iso8601: "StartDate doit être une date ISO valide",
    endDate_iso8601: "EndDate doit être une date ISO valide",

    // generic
    invalid_request: "Requête invalide",

    // transaction
    type_invalid: "Le type doit être l'un des suivants : {{types}}",
    paymentProvider_invalid:
      "Le fournisseur de paiement doit être l'un des suivants : {{providers}}",
    payment_method_id_string:
      "L'ID de la méthode de paiement doit être une chaîne de caractères",
    minAmount_non_negative: "minAmount doit être un nombre non négatif",
    maxAmount_non_negative: "maxAmount doit être un nombre non négatif",
    default_transaction_id_positive:
      "L'ID de transaction doit être un entier positif",

    invalid_language: "Valeur de langue non valide",
    invalid_theme: "Le thème doit être 'light' ou 'dark'",
    invalid_date_of_birth: "dateOfBirth doit être une date valide (AAAA-MM-JJ)",
    notification_pref_invalid:
      "notificationPref doit être l'un des suivants : {{prefs}}",
    music_pref_invalid:
      "La préférence musicale doit être l'une des suivantes : {{prefs}}",
    additionalNotes_too_long:
      "Les notes supplémentaires peuvent comporter au maximum 500 caractères",
    frequentRoutes_invalid:
      "Les trajets fréquents doivent être un tableau contenant au maximum 10 éléments",
    route_from_required: "Chaque trajet doit avoir un champ 'from'",
    route_to_required: "Chaque trajet doit avoir un champ 'to'",
    route_from_string: "Le champ 'from' du trajet doit être une chaîne",
    emergencyContactName_length:
      "Le nom du contact d'urgence doit comporter entre 2 et 100 caractères",
    emergencyContactName_not_empty:
      "Le nom du contact d'urgence ne peut pas être une chaîne vide si fourni",
    emergencyContactName_required: "Le nom du contact d'urgence est requis",
    emergencyContactPhone_string:
      "Le téléphone du contact d'urgence doit être une chaîne",
    phone_required: "Le numéro de téléphone est requis",
    emergencyContactName_format:
      "Le nom ne doit contenir que des lettres, des espaces, des traits d'union et des apostrophes",
    emergencyContactPhone_invalid:
      "Le téléphone du contact d'urgence doit être au format E.164 (ex : +1234567890)",
    licenseNumber_length:
      "Le numéro de permis doit comporter entre 5 et 20 caractères",
    licenseNumber_required: "Le numéro de permis est requis",
    licence_image_invalid:
      "Côté invalide. Doit être avant ('front') ou verso ('back')",
    drivingExperience_invalid: "Expérience de conduite non valide",
    drivingExperience_required: "Une expérience de conduite est requise",
    referralCode_invalid:
      "Le code de parrainage doit comporter entre 3 et 20 caractères et être alphanumérique",

    // change password
    oldPassword_required: "L'ancien mot de passe est requis",
    newPassword_min:
      "Le nouveau mot de passe doit comporter au moins 4 caractères",

    // vehicle
    vehicle_make_required: "La marque est requise",
    vehicle_make_length: "La marque doit comporter entre 2 et 30 caractères",
    vehicle_capacity_required: "La capacité est requise",
    vehicle_capacity_min: "La capacité doit être au moins de 1",
    model_required: "Le modèle est requis",
    model_length: "Le modèle doit comporter entre 1 et 30 caractères",
    year_range: "L'année doit être comprise entre 1990 et {{year}}",
    color_required: "La couleur est requise",
    color_too_long: "La couleur est trop longue",
    plate_required: "Le numéro de plaque est requis",
    plate_length: "Le numéro de plaque doit comporter entre 3 et 15 caractères",

    vehicleId_required: "L'ID du véhicule est requis",
    imageId_required: "L'ID de l'image est requis",
    imageId_positive: "L'ID de l'image doit être un entier positif",

    make_string: "La marque doit être une chaîne de caractères",
    make_length: "La marque doit comporter entre 2 et 30 caractères",
    model_string: "Le modèle doit être une chaîne de caractères",
    color_string: "La couleur doit être une chaîne de caractères",
    color_length: "La couleur ne peut pas dépasser 20 caractères",
    plate_string: "Le numéro de plaque doit être une chaîne de caractères",

    // User – Change Password
    old_password_required: "L'ancien mot de passe est requis",
    old_password_string:
      "L'ancien mot de passe doit être une chaîne de caractères",
    old_password_not_empty: "L'ancien mot de passe ne peut pas être vide",
    new_password_required: "Le nouveau mot de passe est requis",
    new_password_string:
      "Le nouveau mot de passe doit être une chaîne de caractères",
    new_password_min:
      "Le nouveau mot de passe doit comporter au moins 4 caractères",

    // User – Preferences
    language_string: "La langue doit être une chaîne de caractères",
    language_invalid: "Valeur de langue invalide",
    theme_invalid: "Le thème doit être 'light' ou 'dark'",
    notification_pref_string:
      "La préférence de notification doit être une chaîne de caractères",
    notification_id_positive:
      "L'ID de notification doit être un entier positif",
    two_factor_boolean:
      "L'activation de l'authentification à deux facteurs doit être un booléen",

    // contact messages
    subject_required: "Le sujet est requis",
    message_max: "Le message ne peut pas dépasser 200 caractères",
    message_required: "Le message est requis",
    message_string: "Le message doit être une chaîne",
    message_id_required: "L'ID du message est requis",
    message_id_postive: "L'ID du message doit être un entier positif",

    fcm_token_required: "Le jeton FCM est requis",

    session_id_required: "L'ID de session est requis.",
    session_id_string: "L'ID de session doit être une chaîne de caractères.",
    payment_method_id_required: "L'ID de la méthode de paiement est requis.",
    save_card: "L'option de sauvegarde de la carte doit être un booléen.",
    commission_rate_invalid:
      "Le taux de commission doit être un nombre compris entre 0 et 100",
    id_positive: "L'ID doit être un nombre entier positif",
    detourRadius_numeric: "Le rayon de détour doit être un nombre.",
    detourRadius_range:
      "Le rayon de détour doit être compris entre 0 et 25 km.",
    d2dCapacity_positive: "La capacité D2D doit être un entier positif.",
    basePrice_required: "Le prix de base est requis.",
    basePrice_non_negative: "Le prix de base doit être un nombre non négatif.",
    extraKmPrice_required: "Le prix par km supplémentaire est requis.",
    extraKmPrice_non_negative:
      "Le prix par km supplémentaire doit être un nombre non négatif.",
    // commission_rate_invalid:
    //   "Le taux de commission doit être un nombre compris entre 0 et 100",
    // id_positive: "L'ID doit être un nombre entier positif",

    origin_city_required: "La ville de départ est requise",
    origin_province_required: "La province de départ est requise",
    origin_locationName_string:
      "Le nom du lieu de départ doit être une chaîne de caractères",
    origin_locationName_required: "Le nom du lieu de départ est requis",
    rideType_string: "Le type de trajet doit être une chaîne de caractères",
    rideType_required: "Le type de trajet est requis",
    invalid_ride_type:
      "Le type de trajet doit être l'un des suivants : {{rideTypes}}",
    origin_latitude_invalid: "Latitude de départ invalide",
    origin_longitude_invalid: "Longitude de départ invalide",
    origin_description_string:
      "La description du départ doit être une chaîne de caractères",
    origin_description_required: "La description du départ est requise",
    origin_address_required: "L'adresse d'origine est requise",
    origin_address_string:
      "L'adresse d'origine doit être une chaîne de caractères",
    destination_address_required: "L'adresse de destination est requise",
    destination_description_required:
      "La description de la destination est requise",
    destination_province_required: "La province de destination est requise",
    destination_locationName_string:
      "Le nom du lieu de destination doit être une chaîne de caractères",
    destination_latitude_invalid: "Latitude de destination invalide",
    destination_longitude_invalid: "Longitude de destination invalide",
    date_required: "La date est requise",
    date_number: "La date doit être au format numérique",
    timeWindowStart_number:
      "Le début de la fenêtre horaire doit être une date au format numérique",
    timeWindowEnd:
      "La fin de la fenêtre horaire doit être une date au format numérique",
    ride_request_seats_range:
      "Le nombre de sièges doit être compris entre 1 et 9",
    proximityMeters_min: "La proximité doit être d'au moins 100 mètres",
    rideRequestId_required: "L'identifiant de la demande de trajet est requis",
    rideRequestId_positive:
      "L'identifiant de la demande de trajet doit être un nombre entier positif",

    search_required: "le terme de recherche est requis",
    search_string: "le terme de recherche doit être une chaîne de caractères",
    rideRequest_status_string:
      "le statut de la demande de trajet doit être une chaîne de caractères",
    rideRequest_status_required: "le statut de la demande de trajet est requis",
    invalid_rideRequest_status:
      "le statut de la demande de trajet doit être l'un des suivants : {{statuses}}",

    platform_string: "La plateforme doit être une chaîne de caractères",
    platform_not_empty: "La plateforme doit être une chaîne non vide",
    platform_invalid:
      "La plateforme doit être l'une des suivantes : {{values}}",
    redirect_pathname_string:
      "Le chemin de redirection doit être une chaîne de caractères",
    mine_only: "Le mien doit seulement être un booléen",

    // Driver Start
    driverStartLocation_object:
      "Le lieu de départ du conducteur doit être un objet valide.",
    driverStartLocation_region_required:
      "La région de départ du conducteur est requise.",
    driverStartLocation_city_required:
      "La ville de départ du conducteur est requise.",
    driverStartLocation_locationName_required:
      "Le nom du lieu de départ est requis.",
    driverStartLocation_address_string:
      "L'adresse de départ doit être une chaîne de caractères.",
    driverStartLocation_description_string:
      "La description de départ doit être une chaîne de caractères.",

    // Driver Stop
    driverStopLocation_object:
      "Le lieu d'arrivée du conducteur doit être un objet valide.",
    driverStopLocation_region_required:
      "La région d'arrivée du conducteur est requise.",
    driverStopLocation_city_required:
      "La ville d'arrivée du conducteur est requise.",
    driverStopLocation_locationName_required:
      "Le nom du lieu d'arrivée est requis.",
    driverStopLocation_latitude_valid:
      "La latitude d'arrivée doit être comprise entre -90 et 90.",
    driverStopLocation_longitude_valid:
      "La longitude d'arrivée doit être comprise entre -180 et 180.",
    driverStopLocation_address_string:
      "L'adresse d'arrivée doit être une chaîne de caractères.",
    driverStopLocation_description_string:
      "La description d'arrivée doit être une chaîne de caractères.",

    // D2D extra fields
    detourRadius_non_negative:
      "Le rayon de détour doit être égal ou supérieur à zéro.",

    // Pickup
    pickup_object: "Le lieu de prise en charge doit être un objet valide.",
    pickup_region_required: "La région de prise en charge est requise.",
    pickup_city_required: "La ville de prise en charge est requise.",
    pickup_locationName_required:
      "Le nom du lieu de prise en charge est requis.",
    pickup_latitude_valid:
      "La latitude de prise en charge doit être comprise entre -90 et 90.",
    pickup_longitude_valid:
      "La longitude de prise en charge doit être comprise entre -180 et 180.",
    pickup_address_string:
      "L'adresse de prise en charge doit être une chaîne de caractères.",
    pickup_description_string:
      "La description de prise en charge doit être une chaîne de caractères.",

    // Dropoff
    dropoff_object: "Le lieu de dépose doit être un objet valide.",
    dropoff_region_required: "La région de dépose est requise.",
    dropoff_city_required: "La ville de dépose est requise.",
    dropoff_locationName_required: "Le nom du lieu de dépose est requis.",
    dropoff_latitude_valid:
      "La latitude de dépose doit être comprise entre -90 et 90.",
    dropoff_longitude_valid:
      "La longitude de dépose doit être comprise entre -180 et 180.",
    dropoff_address_string:
      "L'adresse de dépose doit être une chaîne de caractères.",
    dropoff_description_string:
      "La description de dépose doit être une chaîne de caractères.",

    // Request / Cancel / IDs
    requestId_positive: "L'ID de la demande doit être un nombre positif.",
    d2d_decline_cancel_reason:
      "La raison de refus ou d'annulation doit être un texte.",

    maxRadius_positive: "Le rayon maximum doit être un nombre positif",
    maxPricePerExtraKm_positive:
      "Le prix maximum par kilomètre supplémentaire doit être un nombre positif",

    passengerId_positive: "L'ID du passager doit être un nombre positif.",

    d2dBookingRequest_status_string: "Le statut doit être une chaîne valide.",
    d2dBookingRequest_status_required: "Le statut ne peut pas être vide.",
    invalid_d2dBookingRequest_status:
      "Statut de demande invalide. Valeurs autorisées : {{statuses}}.",

    // google
    code_string: "le code doit être une chaîne de caractères",
    code_required: "le code est requis",
    id_token_string:
      "Le jeton d'identification doit être une chaîne de caractères",
    id_token_required: "Le jeton d'identification est requis",

    destination_required: "La destination est requise",
    destination_string: "La destination doit être une chaîne de caractères",
    destination_not_empty: "La destination ne peut pas être vide",
    origin_required: "L'origine est requise",
    origin_string: "L'origine doit être une chaîne de caractères",
    origin_not_empty: "L'origine ne peut pas être vide",
    waypoints_string: "Les points de passage doivent être une chaîne de caractères",
    waypoints_not_empty: "Les points de passage ne peuvent pas être vides",

    // Additional missing validations
    input_required: "L'entrée est requise",
    input_string: "L'entrée doit être une chaîne de caractères",
    input_not_empty: "L'entrée ne peut pas être vide",
    sessiontoken_required: "Le jeton de session est requis",
    sessiontoken_string: "Le jeton de session doit être une chaîne de caractères",
    sessiontoken_not_empty: "Le jeton de session ne peut pas être vide",
    firstName_required: "Le prénom est requis",
    cancellation_allowance_invalid: "cancellationCountsAgainstAllowance doit être OUI ou NON",
    place_id_required: "L'ID du lieu est requis",
    location_string: "L'emplacement doit être une chaîne de caractères",
    radius_numeric: "Le rayon doit être un nombre",
    fields_string: "Les champs doivent être une chaîne de caractères",
    pickupExtraKms_positive: "Les kilomètres supplémentaires de prise en charge doivent être un nombre positif",
    dropoffExtraKms_positive: "Les kilomètres supplémentaires de dépose doivent être un nombre positif",
  },
};
