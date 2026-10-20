import { combineReducers } from '@reduxjs/toolkit';
import tourGuideReducer from './tourGuideSlice';
import nearbyReducer from './nearbySlice';
import mapPlacesReducer from './mapPlacesSlice';
import tripsReducer from './tripsSlice';
import { tourGuideApi } from '../services/tourGuideApi';

export const rootReducer = combineReducers({
  tourGuide: tourGuideReducer,
  nearby: nearbyReducer,
  mapPlaces: mapPlacesReducer,
  trips: tripsReducer,
  [tourGuideApi.reducerPath]: tourGuideApi.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export * from './tourGuideSlice';
export * from './nearbySlice';
export * from './mapPlacesSlice';
export * from './tripsSlice';
