import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

import { defaultHandle, defaultEmail } from '../consts';

import { submitMigrationRequest, MigrationResponse } from '../api';
import { RootState } from '.';

interface DataState {
  /* request params */
  handle: string;
  email: string;
  branch: string;

  /* API interaction states */
  isError: boolean;
  isLoading: boolean;

  /* API return values */
  errorName: string | null;
  finalMessage: string | null;
}

const initialState: DataState = {
  handle: defaultHandle,
  email: defaultEmail,
  branch: "",

  isError: false,
  isLoading: false,

  errorName: null,
  finalMessage: null,
}

const abortController = new AbortController();

const issueMigrationRequest = createAsyncThunk
  <MigrationResponse, void, { rejectValue: MigrationResponse }>(
  'data/api',
  async (arg, thunkAPI) => {
    const { getState, rejectWithValue } = thunkAPI;

    const state = getState() as RootState;
    const result = await submitMigrationRequest(
      state.data.handle,
      state.data.email,
      abortController.signal
    );

    if (result.error) {
      return rejectWithValue(result);
    }

    return result;
  },
);

export const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setHandle: (state, action) => {
      state.handle = action.payload
    },
    setEmail: (state, action) => {
      state.email = action.payload
    },
    setReady: (state) => {
      state.isError = false;
      state.isLoading = false;
      state.finalMessage = null;
    },
    abortMigrationRequest: (state) => {
      abortController.abort();
    }
  },
  extraReducers: (builder) => {
    builder.addCase(issueMigrationRequest.pending, (state, action) => {
      state.isLoading = true;
    });
    builder.addCase(issueMigrationRequest.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isError = false;
      state.finalMessage = action.payload.message;
    });
    builder.addCase(issueMigrationRequest.rejected, (state, action) => {
      state.isLoading = false;
      state.isError = true;
      state.errorName = action.payload?.errorName as string;
      state.finalMessage = action.payload?.message as string;
    });
  },
})

// Action creators are generated for each case reducer function
export const { setHandle, setEmail, setReady, abortMigrationRequest } = dataSlice.actions
export { issueMigrationRequest }

export default dataSlice.reducer
