import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

import { defaultHandle, defaultEmail } from '../consts';

import { submitMigrationRequest, MigrationSuccessResponse, MigrationErrorResponse } from '../api';
import { RootState } from '.';

interface DataState {
  /* request params */
  handle: string;
  email: string;
  branch: string;

  /* API interaction states */
  isError: boolean;
  isSuccess: boolean;
  isLoading: boolean;

  /* fake API state to indicate user their session is no longer valid */
  isExpired: boolean;

  /* API error values */
  error : {
    name: string;
    info: string;
  } | null;

  /* API success values */
  repo: {
    uri: string;
    expires: number;
  } | null;
}

const initialState: DataState = {
  handle: defaultHandle,
  email: defaultEmail,
  branch: "",

  isLoading: false,
  isSuccess: false,
  isExpired: false,
  isError: false,

  error: null,
  repo: null,
}

const abortController = new AbortController();

const issueMigrationRequest = createAsyncThunk
  <MigrationSuccessResponse, void, { rejectValue: MigrationErrorResponse }>(
  'data/api',
  async (arg, thunkAPI) => {
    const { getState, rejectWithValue } = thunkAPI;

    const state = getState() as RootState;
    const result = await submitMigrationRequest(
      state.data.handle,
      state.data.email,
      abortController.signal
    ).catch((err) => {
      return rejectWithValue(err);
    });

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
      state.isSuccess = false;
      state.repo = null;
      state.error = null;
    },
    setExpired: (state) => {
      state.isError = true;
      state.isExpired = true;

      state.error = {
        name: "Expired!",
        info: "Your session has expired.",
      }
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
      state.isError = false;
      state.isLoading = false;
      state.isSuccess = true;

      state.repo = {
        uri: action.payload.repo,
        expires: action.payload.expires,
      }
      //state.finalMessage = action.payload.message;
    });
    builder.addCase(issueMigrationRequest.rejected, (state, action) => {
      state.isLoading = false;
      state.isError = true;

      state.error = {
        name: action.payload?.error as string,
        info: action.payload?.details as string,
      }
    });
  },
})

// Action creators are generated for each case reducer function
export const { setHandle, setEmail, setReady, setExpired, abortMigrationRequest } = dataSlice.actions
export { issueMigrationRequest }

export default dataSlice.reducer
