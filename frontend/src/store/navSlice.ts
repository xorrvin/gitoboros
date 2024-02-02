import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '.';

import { PageTypes, AllPagesTypes } from '../components/pages';


interface NavigationState {
  canGoNext: boolean;
  canGoBack: boolean;

  totalPages: number;
  currentPage: PageTypes;
  currentPageIndex: number;
}

const initialState: NavigationState = {
  canGoNext: true,
  canGoBack: true,

  currentPage: AllPagesTypes[0],
  currentPageIndex: 0,
  totalPages: AllPagesTypes.length,
}

export const navSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    allowNext: (state, action) => {
      state.canGoNext = action.payload
    },
    goNext: (state) => {
      if (state.canGoNext && (state.currentPageIndex + 1 < state.totalPages)) {
        state.currentPageIndex += 1;
        state.currentPage = AllPagesTypes[state.currentPageIndex];

        /* enable page return unless it's explicitly disabled */
        state.canGoBack = true;
      }
    },

    allowBack: (state, action) => {
      state.canGoBack = action.payload
    },
    goBack: (state) => {
      if (state.canGoBack && (state.currentPageIndex > 0)) {
        state.currentPageIndex -= 1;
        state.currentPage = AllPagesTypes[state.currentPageIndex];

        /* enable page return unless it's explicitly disabled */
        state.canGoNext = true;
      }
    },

    setCurrentPage: (state, action) => {
      state.currentPage = action.payload
    },
    /*
    increment: (state) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes.
      // Also, no return statement is required from these functions.
      state.value += 1
    },
    decrement: (state) => {
      state.value -= 1
    },
    incrementByAmount: (state, action) => {
      state.value += action.payload
    },*/
  },
})

// Action creators are generated for each case reducer function
export const { allowNext, goNext, allowBack, goBack } = navSlice.actions

export default navSlice.reducer
