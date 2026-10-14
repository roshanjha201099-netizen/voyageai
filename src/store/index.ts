import { configureStore } from '@reduxjs/toolkit';
import { tourGuideApi } from './services/tourGuideApi';

export const store = configureStore({
  reducer: {
    [tourGuideApi.reducerPath]: tourGuideApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(tourGuideApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
