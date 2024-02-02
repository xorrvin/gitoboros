import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'

import navReducer from './navSlice'

const store = configureStore({
  reducer: {
    navigation: navReducer,
  },
});

export { store };
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
