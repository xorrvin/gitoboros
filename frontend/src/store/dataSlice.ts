import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { defaultHandle, defaultEmail } from '../consts';

interface DataState {
  handle: string;
  email: string;
}

const initialState: DataState = {
  handle: defaultHandle,
  email: defaultEmail,
}

export const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setHandle: (state, action) => {
      state.handle = action.payload
    },
    setEmail: (state, action) => {
      state.email = action.payload
    }
  },
})

// Action creators are generated for each case reducer function
export const { setHandle, setEmail } = dataSlice.actions

export default dataSlice.reducer
