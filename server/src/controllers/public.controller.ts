import { Request, Response } from 'express';
import { catchAsync } from '../utils/CatchAsync';
import axios from 'axios';
import { matchedData } from 'express-validator';

export class PublicController {
    static getDirectionsData = catchAsync(async (req: Request, res: Response) => {
        const apiKey = process.env.GOOGLE_SERVER_MAPS_API_KEY;
        const { origin, destination, waypoints } = matchedData<{
            origin: string;
            destination: string;
            waypoints?: string;
        }>(req, { locations: ['body'] });

        const { data } = await axios.get(
            "https://maps.googleapis.com/maps/api/directions/json",
            {
                params: {
                    origin,
                    destination,
                    waypoints,
                    key: apiKey,
                },
            }
        );

        return res.json({
            success: true,
            data
        })
    });

     /**
     * Get place autocomplete suggestions (cities)
     */
    static getPlacesAutocompleteCities = catchAsync(async (req: Request, res: Response) => {
        const apiKey = process.env.GOOGLE_SERVER_MAPS_API_KEY;
        const { input, sessiontoken } = matchedData<{
            input: string;
            sessiontoken: string;
        }>(req, { locations: ['query'] });

        const { data } = await axios.get(
            'https://maps.googleapis.com/maps/api/place/autocomplete/json',
            {
                params: {
                    input,
                    components: 'country:rw|country:zw',
                    types: '(cities)',
                    sessiontoken,
                    key: apiKey,
                },
            }
        );

        return res.json({
            success: true,
            data
        });
    });

    /**
     * Get place autocomplete suggestions (addresses + POIs + neighborhoods).
     * When types=default, fans out to establishment + geocode calls, deduplicates
     * by place_id, and caps at 5 results. Without types, makes a single call
     * with no type filter (backwards compatible).
     */
    static getPlacesAutocompleteAddresses = catchAsync(async (req: Request, res: Response) => {
        const apiKey = process.env.GOOGLE_SERVER_MAPS_API_KEY;
        const {
            input,
            sessiontoken,
            location,
            radius,
            types,
        } = matchedData<{
            input: string;
            sessiontoken: string;
            location?: string;
            radius?: number;
            types?: "default";
        }>(req, { locations: ['query'] });

        const baseParams: Record<string, unknown> = {
            input,
            components: 'country:rw|country:zw',
            sessiontoken,
            key: apiKey,
        };
        if (location && radius) {
            baseParams.location = location;
            baseParams.radius = radius;
        }

        if (types !== "default") {
            // Backwards-compatible single call (no type filter — Google returns "all").
            const { data } = await axios.get(
                'https://maps.googleapis.com/maps/api/place/autocomplete/json',
                { params: baseParams }
            );
            return res.json({ success: true, data });
        }

        // types=default → fan out establishment + geocode, dedup by place_id, cap 5.
        const [estRes, geoRes] = await Promise.all([
            axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
                params: { ...baseParams, types: "establishment" },
            }),
            axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
                params: { ...baseParams, types: "geocode" },
            }),
        ]);

        const merged: Array<{ place_id: string; [k: string]: unknown }> = [];
        const seen = new Set<string>();
        for (const src of [estRes.data?.predictions ?? [], geoRes.data?.predictions ?? []]) {
            for (const pred of src) {
                if (!pred?.place_id || seen.has(pred.place_id)) continue;
                seen.add(pred.place_id);
                merged.push(pred);
                if (merged.length >= 5) break;
            }
            if (merged.length >= 5) break;
        }

        return res.json({
            success: true,
            data: {
                predictions: merged,
                status: merged.length > 0 ? "OK" : "ZERO_RESULTS",
            },
        });
    });

    /**
     * Get place details by place_id
     */
    static getPlaceDetails = catchAsync(async (req: Request, res: Response) => {
        const apiKey = process.env.GOOGLE_SERVER_MAPS_API_KEY;
        const { 
            place_id, 
            sessiontoken,
            fields 
        } = matchedData<{
            place_id: string;
            sessiontoken: string;
            fields?: string;
        }>(req, { locations: ['query'] });

        const { data } = await axios.get(
            'https://maps.googleapis.com/maps/api/place/details/json',
            {
                params: {
                    place_id,
                    fields: fields || 'geometry,address_components,formatted_address,name',
                    sessiontoken,
                    key: apiKey,
                },
            }
        );

        return res.json({
            success: true,
            data
        });
    });
}