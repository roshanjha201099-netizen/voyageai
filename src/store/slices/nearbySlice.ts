import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchNearbyPlaces as apiFetchNearbyPlaces, type NearbyPlaceItem } from '../../services/tourGuideApi';

export interface NearbyLocationParams {
  lat: number;
  lng: number;
  radius?: number;
}

export interface NearbyCenter {
  latitude: number;
  longitude: number;
}

export interface NearbyState {
  places: NearbyPlaceItem[];
  center: NearbyCenter | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

// Distance helper (Haversine approx in km)
export const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const p = 0.017453292519943295; // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 +
            c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
};

export const fetchNearbyPlaces = createAsyncThunk(
  'nearby/fetchPlaces',
  async ({ lat, lng, radius = 5000 }: NearbyLocationParams) => {
    const res = await apiFetchNearbyPlaces(lat, lng, radius);
    return res;
  },
  {
    // Guard: Prevent re-fetching if location moved < 500 meters and data already exists
    condition: ({ lat, lng }: NearbyLocationParams, { getState }: any) => {
      const { nearby } = getState() as { nearby: NearbyState };
      if (nearby.loading) return false;

      if (nearby.center && nearby.places.length > 0) {
        const distKm = calculateDistanceKm(
          nearby.center.latitude,
          nearby.center.longitude,
          lat,
          lng
        );
        if (distKm < 0.5) {
          // Under 500m movement: use existing cached places
          return false;
        }
      }
      return true;
    },
  }
);

const initialState: NearbyState = {
  places: [],
  center: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
};

const nearbySlice = createSlice({
  name: 'nearby',
  initialState,
  reducers: {
    clearNearbyCache: (state) => {
      state.places = [];
      state.center = null;
      state.lastFetchedAt = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNearbyPlaces.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNearbyPlaces.fulfilled, (state, action) => {
        state.loading = false;
        state.places = action.payload.places || [];
        state.center = action.payload.center || null;
        state.lastFetchedAt = Date.now();
        state.error = null;
      })
      .addCase(fetchNearbyPlaces.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch nearby places';
      });
  },
});

export const { clearNearbyCache } = nearbySlice.actions;
export default nearbySlice.reducer;
