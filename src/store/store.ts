import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './reducers';
import { tourGuideApi } from './services/tourGuideApi';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(tourGuideApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof rootReducer>;
