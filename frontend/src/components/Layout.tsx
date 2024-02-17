import { Box } from '@primer/react'

import AppHeader from './AppHeader';
import AppFooter from './AppFooter';

import NavigationPanel from './NavigationPanel';
// import { WelcomePage, FormPage, FinalPage, PageTypes } from './pages'

import { useAppSelector, useAppDispatch } from '../store';
import { goNext, goBack } from '../store/navSlice';
import { AllPages } from './pages';

const Layout = () => {
  const totalSteps = AllPages.length;
  const currentStep = useAppSelector((state) => state.navigation.currentPageIndex);  

  const canGoBack = useAppSelector((state) => state.navigation.canGoBack);
  const canGoNext = useAppSelector((state) => state.navigation.canGoNext);
  
  const dispatch = useAppDispatch()

  const CurrentPage = AllPages[currentStep];


  return (
    <Box
      sx={{
        /* main canvas */
        bg: 'canvas.default',
        width: '100%',
        minHeight: '100vh',
        justifyContent: 'center',
        margin: 'auto',
      }}
    >
      <Box sx={{
        /* primary flex container */
        display: 'flex',
        height: '100vh',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <AppHeader />
        <Box sx={{
          /* main content container */
          display: 'flex',
          flexGrow: 1,
          justifyContent: "center",
          width: '100%',
        }}>
          <NavigationPanel
            currentStep={currentStep}
            totalSteps={totalSteps}
            canGoNext={canGoNext}
            canGoBack={canGoBack}
            onNext={() => dispatch(goNext()) }
            onBack={() => dispatch(goBack()) }
          >
            <CurrentPage />
          </NavigationPanel>
        </Box>
        <AppFooter />
      </Box>
    </Box>
  )
}

export default Layout;
