// const RideMap = ({
//   startPoint: initialStartPoint,
//   endPoint: initialEndPoint,
//   stops: initialStops,
//   height = "400px",
//   onRouteChange,
//   mode = "edit",
//   hideButton = false,
// }) => {
//   const { theme } = useTheme();
//   const [directions, setDirections] =
//     useState<google.maps.DirectionsResult | null>(null);
//   // const [map, setMap] = useState<google.maps.Map | null>(null);
//   const [mapLoaded, setMapLoaded] = useState(false);
//   const [mapContainerStyle, setMapContainerStyle] = useState({
//     height,
//     width: "100%",
//     borderRadius: "0.5rem",
//   });
//   const [isExpanded, setIsExpanded] = useState(mode === "view");

//   // For select
//   const [selectionMode, setSelectionMode] = useState<
//     "start" | "end" | "stop" | null
//   >(null);
//   const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(
//     null
//   );

//   // Location states
//   const [startPoint, setStartPoint] = useState<Location | null>(
//     initialStartPoint || null
//   );
//   const [endPoint, setEndPoint] = useState<Location | null>(
//     initialEndPoint || null
//   );
//   const [stops, setStops] = useState<Location[]>(initialStops || []);
//   const [userHasInteracted, setUserHasInteracted] = useState(false);

//   const [showToggle, setShowToggle] = useState(false);

//   const mapRef = useRef<google.maps.Map | null>(null);

//   useEffect(() => {
//     setStartPoint(initialStartPoint || null);
//     setEndPoint(initialEndPoint || null);
//     setStops(initialStops || []);
//   }, [initialStartPoint, initialEndPoint, initialStops]);

//   useEffect(() => {
//     if (
//       isExpanded &&
//       directions &&
//       mapRef.current &&
//       directions.routes[0].bounds &&
//       !userHasInteracted
//     ) {
//       setTimeout(() => {
//         if (mapRef.current) {
//           mapRef.current.fitBounds(directions.routes[0].bounds);
//         }
//       }, 300);
//     }
//   }, [isExpanded, directions, userHasInteracted]);

//   // Refs for autocomplete inputs
//   const startAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(
//     null
//   );
//   const endAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(
//     null
//   );
//   const stopAutocompleteRefs = useRef<
//     (google.maps.places.Autocomplete | null)[]
//   >([]);

//   const apiKey = import.meta.env?.VITE_GOOGLE_API_KEY;

//   const { isLoaded, loadError } = useJsApiLoader({
//     googleMapsApiKey: apiKey,
//     libraries: LIBRARIES,
//   });

//   const { t } = useTranslation();

//   // Initialize stop refs
//   useEffect(() => {
//     stopAutocompleteRefs.current = initialStops.map(() => null);
//   }, [initialStops.length]);

//   useEffect(() => {
//     // Reset interaction state when major route points change
//     setUserHasInteracted(false);
//   }, [startPoint, endPoint, stops.length]);

//   useEffect(() => {
//     setMapContainerStyle((prev) => ({ ...prev, height }));
//   }, [height]);

//   // Handle place selection for start point
//   const onStartPlaceChanged = () => {
//     if (startAutocompleteRef.current) {
//       const place = startAutocompleteRef.current.getPlace();
//       handlePlaceSelection(place, "start");
//     }
//   };

//   // Handle place selection for end point
//   const onEndPlaceChanged = () => {
//     if (endAutocompleteRef.current) {
//       const place = endAutocompleteRef.current.getPlace();
//       handlePlaceSelection(place, "end");
//     }
//   };

//   // Handle place selection for stopovers
//   const onStopPlaceChanged = (index: number) => {
//     if (stopAutocompleteRefs.current[index]) {
//       const place = stopAutocompleteRefs.current[index]?.getPlace();
//       if (place) handlePlaceSelection(place, "stop", index);
//     }
//   };

//   // Common place selection handler
//   const handlePlaceSelection = (
//     place: google.maps.places.PlaceResult,
//     type: "start" | "end" | "stop",
//     stopIndex?: number
//   ) => {
//     if (!place.geometry || !place.geometry.location) return;

//     const getComponent = (types: string[]) =>
//       place.address_components?.find((c) =>
//         types.some((t) => c.types.includes(t))
//       )?.long_name || "";

//     // This gets the city (like "Montreal")
//     const city = getComponent(["locality"]);

//     const region = getComponent(["administrative_area_level_1"]) || "";

//     const location: Location = {
//       latitude: place.geometry.location.lat(),
//       longitude: place.geometry.location.lng(),
//       locationName: place.name || place.formatted_address || "",
//       address: place.formatted_address,
//       city,
//       region,
//     };

//     switch (type) {
//       case "start":
//         setStartPoint(location);
//         break;
//       case "end":
//         setEndPoint(location);
//         break;
//       case "stop":
//         if (stopIndex !== undefined) {
//           const updatedStops = [...stops];
//           updatedStops[stopIndex] = location;
//           setStops(updatedStops);
//         }
//         break;
//     }

//     // In view mode, we don't need to manage showMap state
//     if (mode === "edit" && startPoint && endPoint) {
//       setIsExpanded(true);
//     }
//   };

//   // Add a new stopover
//   const addStopover = () => {
//     setStops([
//       ...stops,
//       {
//         latitude: 0,
//         longitude: 0,
//         locationName: "",
//       },
//     ]);
//     stopAutocompleteRefs.current.push(null);
//   };

//   // Remove a stopover
//   const removeStopover = (index: number) => {
//     const updatedStops = stops.filter((_, i) => i !== index);
//     setStops(updatedStops);
//     stopAutocompleteRefs.current.splice(index, 1);
//   };

//   const handleMapClick = async (e: google.maps.MapMouseEvent) => {
//     if (!selectionMode || !e.latLng) return;

//     const lat = e.latLng.lat();
//     const lng = e.latLng.lng();

//     // Optimistic update
//     const tempLocation: Location = {
//       latitude: lat,
//       longitude: lng,
//       locationName: "",
//       address: "",
//       city: "",
//       region: "",
//     };

//     switch (selectionMode) {
//       case "start":
//         setStartPoint(tempLocation);
//         break;
//       case "end":
//         setEndPoint(tempLocation);
//         break;
//       case "stop":
//         if (selectedStopIndex !== null) {
//           const updatedStops = [...stops];
//           updatedStops[selectedStopIndex] = tempLocation;
//           setStops(updatedStops);
//         }
//         break;
//     }

//     try {
//       const geocoder = new google.maps.Geocoder();
//       const response = await geocoder.geocode({ location: e.latLng });

//       const place =
//         response.results.find(
//           (r) =>
//             r.types.includes("street_address") ||
//             r.types.includes("premise") ||
//             r.types.includes("route") ||
//             r.types.includes("locality") ||
//             r.types.includes("administrative_area_level_1")
//         ) || response.results[0];

//       if (place) {
//         const getComponent = (types: string[]) => {
//           const match = place.address_components?.find((c) =>
//             types.some((t) => c.types.includes(t))
//           );
//           if (!match) console.warn("Missing component for", types);
//           return match?.long_name || "";
//         };

//         const location: Location = {
//           latitude: lat,
//           longitude: lng,
//           locationName: place.formatted_address || "Selected location",
//           address: place.formatted_address || "Selected location",
//           city:
//             getComponent(["locality"]) ||
//             getComponent(["administrative_area_level_2"]),
//           region: getComponent(["administrative_area_level_1"]),
//         };

//         switch (selectionMode) {
//           case "start":
//             setStartPoint(location);
//             break;
//           case "end":
//             setEndPoint(location);
//             break;
//           case "stop":
//             if (selectedStopIndex !== null) {
//               const updatedStops = [...stops];
//               updatedStops[selectedStopIndex] = location;
//               setStops(updatedStops);
//             }
//             break;
//         }
//       } else {
//         console.warn("No valid place result found.");
//       }
//     } catch (error) {
//       console.error("Geocoding error:", error);

//       const failedLocation: Location = {
//         latitude: lat,
//         longitude: lng,
//         locationName: "Failed to load address",
//         address: "Failed to load address",
//         city: "",
//         region: "",
//       };

//       switch (selectionMode) {
//         case "start":
//           setStartPoint(failedLocation);
//           break;
//         case "end":
//           setEndPoint(failedLocation);
//           break;
//         case "stop":
//           if (selectedStopIndex !== null) {
//             const updatedStops = [...stops];
//             updatedStops[selectedStopIndex] = failedLocation;
//             setStops(updatedStops);
//           }
//           break;
//       }
//     }

//     setSelectionMode(null);
//     setSelectedStopIndex(null);
//     if (mode === "edit") setIsExpanded(true);
//   };

//   const handleMapInteraction = () => {
//     setUserHasInteracted(true);
//   };

//   const shouldShowMap = isExpanded;

//   return (
//     <div className="space-y-4">
//       {/* Always show map with inputs positioned around it */}
//       {mode === "edit" && (
//         <div className="space-y-4">
//           {/* From and To inputs in a responsive row above map */}
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//             {/* Starting Point */}
//             <div className="relative">
//               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//                 {t("RideDetail.Map.from")} *
//               </label>
//               <Autocomplete
//                 onLoad={(autocomplete) =>
//                   (startAutocompleteRef.current = autocomplete)
//                 }
//                 onPlaceChanged={onStartPlaceChanged}
//               >
//                 <div className="relative flex items-center">
//                   <MapPin className="absolute left-3 h-4 w-4 text-green-500" />
//                   <input
//                     type="text"
//                     placeholder={t("RideDetail.Map.startingPoint")}
//                     value={startPoint?.address || ""}
//                     onChange={(e) => {
//                       if (startPoint) {
//                         setStartPoint({
//                           ...startPoint,
//                           address: e.target.value,
//                         });
//                       }
//                     }}
//                     className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#30BFDD] focus:border-transparent transition-colors"
//                   />
//                 </div>
//               </Autocomplete>
//             </div>

//             {/* End Point Input */}
//             <div className="relative">
//               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//                 {t("RideDetail.Map.to")} *
//               </label>
//               <Autocomplete
//                 onLoad={(autocomplete) =>
//                   (endAutocompleteRef.current = autocomplete)
//                 }
//                 onPlaceChanged={onEndPlaceChanged}
//               >
//                 <div className="relative flex items-center">
//                   <MapPin className="absolute left-3 h-4 w-4 text-red-500" />
//                   <input
//                     type="text"
//                     placeholder={t("RideDetail.Map.destination")}
//                     value={endPoint?.address || ""}
//                     onChange={(e) => {
//                       if (endPoint) {
//                         setEndPoint({
//                           ...endPoint,
//                           address: e.target.value,
//                         });
//                       }
//                     }}
//                     className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#30BFDD] focus:border-transparent transition-colors"
//                   />
//                 </div>
//               </Autocomplete>
//             </div>
//           </div>

//           {/* Map Container - Always visible */}
//           <div className="relative">
//             <GoogleMap
//               mapContainerStyle={mapContainerStyle}
//               center={center}
//               zoom={7}
//               onLoad={(mapInstance) => {
//                 mapRef.current = mapInstance;
//                 setMapLoaded(true);
//                 google.maps.event.addListener(
//                   mapInstance,
//                   "dragstart",
//                   handleMapInteraction
//                 );
//                 google.maps.event.addListener(
//                   mapInstance,
//                   "zoom_changed",
//                   handleMapInteraction
//                 );
//               }}
//               onClick={handleMapClick}
//               options={{
//                 styles: theme === "dark" ? darkMapStyle : undefined,
//                 mapTypeControl: true,
//                 mapTypeControlOptions: {
//                   position: google.maps.ControlPosition.TOP_RIGHT,
//                 },
//                 fullscreenControl: true,
//                 fullscreenControlOptions: {
//                   position: google.maps.ControlPosition.TOP_RIGHT,
//                 },
//                 disableDefaultUI: false,
//                 gestureHandling: "greedy",
//               }}
//             >
//               {directions && (
//                 <DirectionsRenderer
//                   directions={directions}
//                   options={{
//                     suppressMarkers: true,
//                     preserveViewport: userHasInteracted,
//                   }}
//                 />
//               )}

//               {/* Start Marker */}
//               {startPoint && (
//                 <Marker
//                   position={{
//                     lat: startPoint.latitude,
//                     lng: startPoint.longitude,
//                   }}
//                   icon={{
//                     path: google.maps.SymbolPath.CIRCLE,
//                     fillColor: "#4CAF50",
//                     fillOpacity: 1,
//                     strokeColor: "white",
//                     strokeWeight: 2,
//                     scale: 10,
//                   }}
//                   title={startPoint.locationName || "Start point"}
//                 />
//               )}

//               {/* Stop Markers */}
//               {stops.map((stop, index) => (
//                 <Marker
//                   key={`stop-marker-${index}`}
//                   position={{ lat: stop.latitude, lng: stop.longitude }}
//                   icon={{
//                     path: google.maps.SymbolPath.CIRCLE,
//                     fillColor: "#2196F3",
//                     fillOpacity: 1,
//                     strokeColor: "white",
//                     strokeWeight: 2,
//                     scale: 8,
//                   }}
//                   title={stop.locationName || `Stop ${index + 1}`}
//                 />
//               ))}

//               {/* End Marker */}
//               {endPoint && (
//                 <Marker
//                   position={{ lat: endPoint.latitude, lng: endPoint.longitude }}
//                   icon={{
//                     path: google.maps.SymbolPath.CIRCLE,
//                     fillColor: "#F44336",
//                     fillOpacity: 1,
//                     strokeColor: "white",
//                     strokeWeight: 2,
//                     scale: 10,
//                   }}
//                   title={endPoint.locationName || "End point"}
//                 />
//               )}

//               {selectionMode && (
//                 <div className="absolute inset-0 bg-black bg-opacity-10 pointer-events-none flex items-center justify-center">
//                   <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-lg">
//                     <p className="font-medium">
//                       Click on the map to set {selectionMode} point
//                       {selectionMode === "stop" &&
//                         selectedStopIndex !== null &&
//                         ` (Stop ${selectedStopIndex + 1})`}
//                     </p>
//                   </div>
//                 </div>
//               )}
//             </GoogleMap>

//             {/* Map Selection Controls - Overlay on map with glass morphism effect */}
//             {!hideButton && mode === "edit" && (
//               <div className="absolute top-2 left-4">
//                 <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-1 rounded-xl border-2 border-white/50 dark:border-gray-700/50 hover:border-white dark:hover:border-gray-600 transition-all duration-500 shadow-lg">
//                   <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
//                     {t("RideDetail.Map.selectOnMap")}
//                   </div>
//                   <div className="flex justify-between gap-3 text-xs">
//                     <Button
//                       className="bg-gradient-to-r from-green-500 to-green-500 text-white hover:from-green-500 hover:to-green-500 transition-all duration-300 border-2 border-green-500 hover:border-green-500 backdrop-blur-sm text-center items-center justify-center"
//                       title={t("RideDetail.Map.starting")}
//                       type="button"
//                       variant={
//                         selectionMode === "start" ? "default" : "outline"
//                       }
//                       size="sm"
//                       onClick={() => {
//                         setSelectionMode("start");
//                         setSelectedStopIndex(null);
//                       }}
//                     >
//                       <MapPin className="h-4 w-4 mr-2 text-white font-black text-lg" />
//                     </Button>

//                     <Button
//                       className="bg-gradient-to-r from-red-500 to-red-500 text-white hover:from-red-500 hover:to-red-500 transition-all duration-300 border-2 border-red-500 hover:border-red-500 backdrop-blur-sm"
//                       type="button"
//                       title={t("RideDetail.Map.end")}
//                       variant={selectionMode === "end" ? "default" : "outline"}
//                       size="sm"
//                       onClick={() => {
//                         setSelectionMode("end");
//                         setSelectedStopIndex(null);
//                       }}
//                     >
//                       <MapPin className="h-4 w-4 mr-2 text-white" />
//                     </Button>

//                     <Button
//                       className="bg-gradient-to-r from-blue-500 to-blue-500 text-white hover:from-blue-500 hover:to-blue-500 transition-all duration-300 border-2 border-blue-500 hover:border-blue-500 backdrop-blur-sm"
//                       type="button"
//                       variant={selectionMode === "stop" ? "default" : "outline"}
//                       size="sm"
//                       onClick={() => {
//                         setSelectionMode("stop");
//                         if (selectedStopIndex === null) {
//                           setStops((prevStops) => {
//                             const newStops = [
//                               ...prevStops,
//                               { latitude: 0, longitude: 0, locationName: "" },
//                             ];
//                             setSelectedStopIndex(newStops.length - 1);
//                             return newStops;
//                           });
//                         }
//                       }}
//                     >
//                       <MapPin className="h-4 w-4 mr-2 text-white" />
//                       {selectedStopIndex !== null
//                         ? `${t("RideDetail.Map.edit")} ${selectedStopIndex + 1}`
//                         : t("RideDetail.Map.add")}
//                     </Button>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Stopovers - Below the map */}
//           {mode === "edit" &&
//             stops.map((stop, index) => (
//               <div key={`stop-${index}`} className="relative">
//                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//                   {t("RideDetail.Map.stopover")} {index + 1}
//                 </label>
//                 <div className="flex items-center gap-2">
//                   <div className="flex-1">
//                     <Autocomplete
//                       onLoad={(autocomplete) =>
//                         (stopAutocompleteRefs.current[index] = autocomplete)
//                       }
//                       onPlaceChanged={() => onStopPlaceChanged(index)}
//                     >
//                       <div className="relative flex items-center">
//                         <MapPin className="absolute left-3 h-4 w-4 text-blue-500" />
//                         <input
//                           type="text"
//                           placeholder={`${t("RideDetail.Map.stopover")} ${
//                             index + 1
//                           }`}
//                           value={stop.address || ""}
//                           onChange={(e) => {
//                             const updatedStops = [...stops];
//                             updatedStops[index] = {
//                               ...updatedStops[index],
//                               address: e.target.value,
//                             };
//                             setStops(updatedStops);
//                           }}
//                           className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#30BFDD] focus:border-transparent transition-colors"
//                         />
//                       </div>
//                     </Autocomplete>
//                   </div>
//                   <Button
//                     type="button"
//                     variant="ghost"
//                     size="icon"
//                     onClick={() => removeStopover(index)}
//                     className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
//                   >
//                     <X className="h-4 w-4" />
//                   </Button>
//                 </div>
//               </div>
//             ))}

//           {/* Add Stopover Button - Below the map */}
//           {mode === "edit" && (
//             <Button
//               type="button"
//               size="sm"
//               onClick={addStopover}
//               className="flex items-center gap-2 bg-black text-white hover:bg-[#2aa8c4] transition-colors"
//             >
//               <Plus className="h-4 w-4" />
//               {t("RideDetail.Map.stopOver")}
//             </Button>
//           )}

//           {/* Distance display */}
//           {directions?.routes?.[0]?.legs?.[0]?.distance?.text && (
//             <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
//               {t("RideDetail.Map.Distance")}:{" "}
//               {directions.routes[0].legs[0].distance.text}
//             </div>
//           )}
//         </div>
//       )}

//       {/* View mode - Just show the map */}
//       {mode === "view" && (
//         <div className="relative">
//           <GoogleMap
//             mapContainerStyle={mapContainerStyle}
//             center={center}
//             zoom={7}
//             onLoad={(mapInstance) => {
//               mapRef.current = mapInstance;
//               setMapLoaded(true);
//             }}
//             options={{
//               styles: theme === "dark" ? darkMapStyle : undefined,
//               mapTypeControl: true,
//               mapTypeControlOptions: {
//                 position: google.maps.ControlPosition.TOP_RIGHT,
//               },
//               fullscreenControl: true,
//               fullscreenControlOptions: {
//                 position: google.maps.ControlPosition.TOP_RIGHT,
//               },
//               disableDefaultUI: false,
//               gestureHandling: "greedy",
//             }}
//           >
//             {directions && (
//               <DirectionsRenderer
//                 directions={directions}
//                 options={{
//                   suppressMarkers: true,
//                   preserveViewport: userHasInteracted,
//                 }}
//               />
//             )}

//             {/* Start Marker */}
//             {startPoint && (
//               <Marker
//                 position={{
//                   lat: startPoint.latitude,
//                   lng: startPoint.longitude,
//                 }}
//                 icon={{
//                   path: google.maps.SymbolPath.CIRCLE,
//                   fillColor: "#4CAF50",
//                   fillOpacity: 1,
//                   strokeColor: "white",
//                   strokeWeight: 2,
//                   scale: 10,
//                 }}
//                 title={startPoint.locationName || "Start point"}
//               />
//             )}

//             {/* Stop Markers */}
//             {stops.map((stop, index) => (
//               <Marker
//                 key={`stop-marker-${index}`}
//                 position={{ lat: stop.latitude, lng: stop.longitude }}
//                 icon={{
//                   path: google.maps.SymbolPath.CIRCLE,
//                   fillColor: "#2196F3",
//                   fillOpacity: 1,
//                   strokeColor: "white",
//                   strokeWeight: 2,
//                   scale: 8,
//                 }}
//                 title={stop.locationName || `Stop ${index + 1}`}
//               />
//             ))}

//             {/* End Marker */}
//             {endPoint && (
//               <Marker
//                 position={{ lat: endPoint.latitude, lng: endPoint.longitude }}
//                 icon={{
//                   path: google.maps.SymbolPath.CIRCLE,
//                   fillColor: "#F44336",
//                   fillOpacity: 1,
//                   strokeColor: "white",
//                   strokeWeight: 2,
//                   scale: 10,
//                 }}
//                 title={endPoint.locationName || "End point"}
//               />
//             )}
//           </GoogleMap>

//           {/* Distance display for view mode */}
//           {directions?.routes?.[0]?.legs?.[0]?.distance?.text && (
//             <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg text-sm text-gray-700 dark:text-gray-300">
//               {t("RideDetail.Map.Distance")}:{" "}
//               {directions.routes[0].legs[0].distance.text}
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };
