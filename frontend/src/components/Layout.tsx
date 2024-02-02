import { Box } from '@primer/react'

import AppHeader from './AppHeader';
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


  /* useEffect(() => {
    if (canGoNext) {
      goNext();
    }

    if (canGoBack) {
      goBack();
    }
  }, [canGoBack, canGoNext, goBack, goNext]); */

  return (
    <Box
      sx={{
        bg: 'canvas.default',
        width: '100%',
        minHeight: '100vh',
        justifyContent: 'center',
        margin: 'auto',
        
        // p: 5,
      }}
    >
      <Box sx={{
        display: 'flex',
        flexDirection: 'column', alignItems: 'center',
      }}>
        <AppHeader />
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
    </Box>
  )
}

export default Layout;
