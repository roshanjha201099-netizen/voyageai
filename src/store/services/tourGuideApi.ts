import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getApiBaseUrl, getAuthHeaders } from '../../config/apiConfig';

export interface TourGuideRawMessage {
  id?: string;
  role: string;
  content: string;
  mode?: 'local' | 'trip';
  metadata?: any;
  created_at?: string;
}

export const tourGuideApi = createApi({
  reducerPath: 'tourGuideApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${getApiBaseUrl()}/api`,
    credentials: 'include',
    prepareHeaders: (headers) => {
      const authHeaders = getAuthHeaders();
      for (const [key, value] of Object.entries(authHeaders)) {
        if (value) {
          headers.set(key, value);
        }
      }
      return headers;
    },
  }),
  tagTypes: ['TourGuideHistory'],
  endpoints: (builder) => ({
    getTourGuideHistory: builder.query<TourGuideRawMessage[], string | void>({
      query: (tripId) => (tripId ? `/tour-guide/history?trip_id=${encodeURIComponent(tripId)}` : '/tour-guide/history'),
      providesTags: ['TourGuideHistory'],
      keepUnusedDataFor: 300, // Keeps data cached for 5 mins even after unmounting
    }),
  }),
});

export const { useGetTourGuideHistoryQuery } = tourGuideApi;
