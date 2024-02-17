import { Box, Text, Spinner, Flash, Octicon, Heading } from '@primer/react'
import { CheckIcon, AlertIcon } from '@primer/octicons-react'

import { useAppSelector } from '../../store';

const LoadingScreen = () => {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      <Box sx={{ alignSelf: 'center', textAlign: 'center', width: '100%' }}>
        <Spinner size="large" />
        <Heading>Please wait...</Heading>
      </Box>
    </Box>
  )
}

interface ErrorScreenProps {
  errorType: string;
  errorDetails: string;
}

const ErrorScreen = (props: ErrorScreenProps) => {
  const { errorType, errorDetails } = props;

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      <Box sx={{ alignSelf: 'center', textAlign: 'center', width: '100%' }}>
        <Octicon icon={AlertIcon} size="large" color="fg.subtle" />
        <Heading>Error: {errorType}</Heading>
        <Text>
          <br />{errorDetails}<br />
        </Text>
        <Text>You can go back to fill the form again, reload the page or try again later.</Text>
      </Box>
    </Box>
  )
}

const SuccessScreen = () => {
  return (
    <Box>
      <Flash variant="success">
        <Octicon icon={CheckIcon} />
        Success!
      </Flash>
    </Box>
  )
}
const FinalPage = () => {
  const isLoading = true;
  const isError = false;
  const handle = useAppSelector((state) => state.data.handle)
  const email = useAppSelector((state) => state.data.email);

  if (isError) {
    return (
      <ErrorScreen errorType='Gooo' errorDetails='something happened.'/>
    )
  }
  return isLoading ? <LoadingScreen /> : (
    <Box>
      Completed!
    </Box>
  )
}

export default FinalPage;
