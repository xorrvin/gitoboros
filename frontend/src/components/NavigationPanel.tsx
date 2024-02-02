import { Box, Text, Button } from '@primer/react'

interface NavigationPanelProps extends React.PropsWithChildren {
  currentStep: number;
  totalSteps: number;

  canGoNext: boolean;
  canGoBack: boolean;

  onNext: () => void;
  onBack: () => void;
}

const NavigationPanel = (props: NavigationPanelProps) => {
  const { onNext, onBack, canGoNext, canGoBack, currentStep, totalSteps, children } = props;

  return (
    <Box sx={{
      maxWidth: 700,
      width: '90%',
      minHeight: 600,
      borderStyle: 'solid',
      borderWidth: 1,
      borderColor: 'border.subtle',
      borderRadius: 6,
      p: 4,
      mt: 8,
      display: 'flex',
      flexDirection: 'column',
      // mt: 10,
    }}>
      {children}
      <br /><br />
      <Box sx={{ display: 'flex', textAlign: 'center', width: '100%', marginTop: 'auto' }}>
        <Box sx={{ width: '33%', textAlign: 'left' }}>
          {currentStep !== 0 &&
            <Button
              onClick={() => onBack()}
              variant='invisible'
              disabled={!canGoBack}
              size='large'
            >Back</Button>}
        </Box>
        <Box sx={{ flexGrow: 1, marginTop: 2 }}>
          <Text color='fg.muted' as="small">step {currentStep + 1}/{totalSteps}</Text>
        </Box>
        <Box sx={{ width: '33%'}}>
          {(currentStep + 1) !== totalSteps &&
            <Button
              sx={{ float: 'right' }}
              disabled={!canGoNext}
              onClick={() => onNext()}
              variant='primary'
              size='large'
            >Next</Button>}
        </Box>
      </Box>
    </Box>
  )
}

export default NavigationPanel;
