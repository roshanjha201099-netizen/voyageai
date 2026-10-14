import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getApiBaseUrl, DEFAULT_FETCH_OPTIONS, getAuthHeaders } from '../../config/apiConfig';

export interface MapNearbyParams {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
  category?: string;
  force?: boolean;
}

// Distance helper: Haversine formula (km)
export const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const p = 0.017453292519943295; // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 +
            c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
};

export const fetchMapNearbyPlaces = createAsyncThunk(
  'mapPlaces/fetchNearby',
  async ({ lat, lng, radius = 5000, limit = 40, category = 'all' }: MapNearbyParams) => {
    const baseUrl = getApiBaseUrl();
    const categoryParam = category !== 'all' ? `&category=${encodeURIComponent(category)}` : '';
    const url = `${baseUrl}/api/places/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}${categoryParam}`;

    const res = await fetch(url, {
      ...DEFAULT_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch map places: HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawItems = Array.isArray(data)
      ? data
      : (data.places || data.results || []);

    return {
      places: rawItems,
      center: { lat, lng },
      radius,
      category,
    };
  },
  {
    // Guard: Prevent redundant calls if movement is small (< 500m) and data already exists
    condition: ({ lat, lng, category = 'all', force }: MapNearbyParams, { getState }: any) => {
      if (force) return true;
      const { mapPlaces } = getState() as { mapPlaces: MapPlacesState };
      if (mapPlaces.loading) return false;

      if (mapPlaces.center && mapPlaces.places.length > 0) {
        const distKm = calculateDistanceKm(
          mapPlaces.center.lat,
          mapPlaces.center.lng,
          lat,
          lng
        );
        // Do not re-fetch if movement is under 500 meters and category hasn't changed
        if (distKm < 0.5 && (category === mapPlaces.category || category === 'all')) {
          return false;
        }
      }
      return true;
    },
  }
);

export interface MapPlacesState {
  places: any[];
  center: { lat: number; lng: number } | null;
  radius: number;
  category: string;
  loading: boolean;
  error: string | null;
  selectedPlaceId: string | null;
  lastFetchedAt: number | null;
}

const initialState: MapPlacesState = {
  places: [],
  center: null,
  radius: 5000,
  category: 'all',
  loading: false,
  error: null,
  selectedPlaceId: null,
  lastFetchedAt: null,
};

const mapPlacesSlice = createSlice({
  name: 'mapPlaces',
  initialState,
  reducers: {
    setSelectedPlaceId: (state, action) => {
      state.selectedPlaceId = action.payload;
    },
    clearMapPlaces: (state) => {
      state.places = [];
      state.center = null;
      state.selectedPlaceId = null;
      state.lastFetchedAt = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMapNearbyPlaces.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMapNearbyPlaces.fulfilled, (state, action) => {
        state.loading = false;
        state.places = action.payload.places;
        state.center = action.payload.center;
        state.radius = action.payload.radius;
        state.category = action.payload.category;
        state.lastFetchedAt = Date.now();
        state.error = null;
      })
      .addCase(fetchMapNearbyPlaces.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch map places';
      });
  },
});

export const { setSelectedPlaceId, clearMapPlaces } = mapPlacesSlice.actions;
export default mapPlacesSlice.reducer;
