import { configureStore } from '@reduxjs/toolkit';
import { tourGuideApi } from './services/tourGuideApi';
import nearbyReducer from './slices/nearbySlice';
import mapPlacesReducer from './slices/mapPlacesSlice';

export const store = configureStore({
  reducer: {
    [tourGuideApi.reducerPath]: tourGuideApi.reducer,
    nearby: nearbyReducer,
    mapPlaces: mapPlacesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(tourGuideApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
