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
  const nextButtonText = (currentStep === 0 ? "Let's go!" : "Next");

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
      display: "flex",
      alignSelf: "center"
    }}>
      <Box sx={{
        border: '5px solid yellow',
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        flexGrow: 1,
      }}>
        <Box sx={{
          border: '5px solid red',
          display: "flex",
          flexGrow: 1,
        }}>{children}</Box>

      <Box sx={{ border: '5px solid green', justifySelf: "flex-end", width: "100%" }}>
        <Box sx={{ display: 'flex', textAlign: 'center', justifyContent: "space-between", width: '100%' }}>
          <Box sx={{ width: '33%' }}>
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
              >{nextButtonText}</Button>}
          </Box>
        </Box>
      </Box>
      </Box>
    </Box>
  )
}

export default NavigationPanel;
