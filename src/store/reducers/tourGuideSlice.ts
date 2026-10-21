import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { getApiBaseUrl, getAuthHeaders } from '../../config/apiConfig';

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  role: 'user' | 'assistant';
  text: string;
  content: string;
  timestamp?: string;
  created_at?: string;
  card?: any;
  chips?: string[];
  recommendations?: any[];
  metadata?: any;
  mode?: string;
}

export interface TourGuideState {
  messages: Message[];
  history: Message[];
  loading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const initialState: TourGuideState = {
  messages: [],
  history: [],
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
      const rawList = Array.isArray(data)
        ? data
        : (data.messages || data.history || []);

      // Normalize backend schema to frontend expectation
      return rawList.map((item: any) => {
        const meta = typeof item.metadata === 'string'
          ? (() => { try { return JSON.parse(item.metadata); } catch { return {}; } })()
          : (item.metadata || {});

        const role = (item.role === 'assistant' || item.role === 'guide' || item.sender === 'assistant')
          ? 'assistant'
          : 'user';
        const text = item.content || item.text || meta?.reply || '';
        const card = item.card || meta?.card || null;
        const chips = item.chips || meta?.chips || item.recommendations || [];
        const timestamp = item.created_at || item.timestamp || new Date().toISOString();

        return {
          id: String(item.id || `msg_${Date.now()}_${Math.random()}`),
          sender: role,
          role: role,
          text: text,
          content: text,
          timestamp: timestamp,
          created_at: timestamp,
          card: card,
          chips: chips,
          recommendations: chips,
          metadata: {
            ...meta,
            card: card,
            chips: chips
          },
          mode: item.mode || 'local',
        };
      });
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch guide history');
    }
  },
  {
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
    appendGuideMessage: (state, action: PayloadAction<any>) => {
      const item = action.payload;
      const meta = typeof item.metadata === 'string'
        ? (() => { try { return JSON.parse(item.metadata); } catch { return {}; } })()
        : (item.metadata || {});

      const role = (item.role === 'assistant' || item.role === 'guide' || item.sender === 'assistant')
        ? 'assistant'
        : 'user';
      const text = item.content || item.text || meta?.reply || '';
      const card = item.card || meta?.card || null;
      const chips = item.chips || meta?.chips || item.recommendations || [];
      const timestamp = item.created_at || item.timestamp || new Date().toISOString();

      const normalized: Message = {
        id: String(item.id || `msg_${Date.now()}`),
        sender: role,
        role: role,
        text: text,
        content: text,
        timestamp: timestamp,
        created_at: timestamp,
        card: card,
        chips: chips,
        recommendations: chips,
        metadata: {
          ...meta,
          card: card,
          chips: chips
        },
        mode: item.mode || 'local',
      };
      state.messages.push(normalized);
      state.history.push(normalized);
    },
    resetGuideHistory: (state) => {
      state.messages = [];
      state.history = [];
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
        state.history = action.payload;
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
