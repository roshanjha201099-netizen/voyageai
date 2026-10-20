import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { getApiBaseUrl, getAuthHeaders } from '../../config/apiConfig';

export interface Message {
  id: string;
  sender?: 'user' | 'assistant';
  role?: 'user' | 'assistant';
  text?: string;
  content?: string;
  timestamp?: string;
  recommendations?: any[];
  metadata?: any;
  mode?: string;
}

export interface TourGuideState {
  messages: Message[];
  loading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const initialState: TourGuideState = {
  messages: [],
  loading: false,
  isInitialized: false,
  error: null,
};

export const fetchTourGuideHistory = createAsyncThunk(
  'tourGuide/fetchHistory',
  async (tripId: string | null = null, { rejectWithValue }) => {
    try {
      const baseUrl = getApiBaseUrl();
      const query = tripId ? `?trip_id=${encodeURIComponent(tripId)}` : '';
      const url = `${baseUrl}/api/tour-guide/history${query}`;
      
      const res = await axios.get(url, {
        withCredentials: true,
        headers: getAuthHeaders(),
      });
      
      const data = res.data;
      const rawMessages = Array.isArray(data)
        ? data
        : data.messages || data.history || [];

      // Normalize message fields for role/sender and content/text
      return rawMessages.map((m: any) => ({
        id: m.id || `msg_${Date.now()}_${Math.random()}`,
        role: m.role || m.sender || 'assistant',
        sender: m.sender || m.role || 'assistant',
        content: m.content || m.text || '',
        text: m.text || m.content || '',
        timestamp: m.timestamp || new Date().toISOString(),
        recommendations: m.recommendations || m.metadata?.chips || [],
        metadata: m.metadata || {},
        mode: m.mode || 'local',
      }));
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch guide history');
    }
  },
  {
    // Guard: Prevent redundant calls if history is already loaded or currently fetching
    condition: (_, { getState }: any) => {
      const { tourGuide } = getState() as { tourGuide: TourGuideState };
      if (tourGuide.isInitialized || tourGuide.loading) {
        return false;
      }
      return true;
    },
  }
);

export const tourGuideSlice = createSlice({
  name: 'tourGuide',
  initialState,
  reducers: {
    appendGuideMessage: (state, action: PayloadAction<Message>) => {
      const normalized: Message = {
        ...action.payload,
        role: action.payload.role || action.payload.sender || 'assistant',
        sender: action.payload.sender || action.payload.role || 'assistant',
        content: action.payload.content || action.payload.text || '',
        text: action.payload.text || action.payload.content || '',
      };
      state.messages.push(normalized);
    },
    resetGuideHistory: (state) => {
      state.messages = [];
      state.isInitialized = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTourGuideHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTourGuideHistory.fulfilled, (state, action: PayloadAction<Message[]>) => {
        state.loading = false;
        state.isInitialized = true;
        state.messages = action.payload;
        state.error = null;
      })
      .addCase(fetchTourGuideHistory.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch guide history';
      });
  },
});

export const { appendGuideMessage, resetGuideHistory } = tourGuideSlice.actions;
export default tourGuideSlice.reducer;
