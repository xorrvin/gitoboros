import { useEffect } from 'react';

import { Box, Text, Spinner, Flash, Octicon, Heading } from '@primer/react'
import { CheckIcon, AlertIcon } from '@primer/octicons-react'

import { useAppSelector, useAppDispatch } from '../../store';
import { issueMigrationRequest, abortMigrationRequest } from '../../store/dataSlice';
import { allowBack } from '../../store/navSlice';

interface SuccessScreenProps {
  message: string;
};

const SuccessScreen = (props: SuccessScreenProps) => {
  const { message } = props;

  return (
    <Box>
      <Flash variant="success">
        <Octicon icon={CheckIcon} />
        Success! {message}
      </Flash>
    </Box>
  )
}

interface ErrorScreenProps {
  errorType: string | null;
  errorDetails: string | null;
}

const ErrorScreen = (props: ErrorScreenProps) => {
  const { errorType, errorDetails } = props;

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      <Box sx={{ alignSelf: 'center', textAlign: 'center', width: '100%' }}>
        <Octicon icon={AlertIcon} size="large" color="fg.subtle" />
        <Heading>{errorType}</Heading>
        <Text>
          <br />{errorDetails}<br /><br />
        </Text>
        <Text>You can go back to fill the form again, reload the page or try again later.</Text>
      </Box>
    </Box>
  )
}

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


const FinalPage = () => {
  const dispatch = useAppDispatch();

  const isError = useAppSelector((state) => state.data.isError);
  const isLoading = useAppSelector((state) => state.data.isLoading);

  const errorName = useAppSelector((state) => state.data.errorName);
  const finalMessage = useAppSelector((state) => state.data.finalMessage);

  const hasFinished = finalMessage !== null;

  useEffect(() => {
    /* make request and disable back button */
    if (!isLoading && !isError && !hasFinished) {
      dispatch(issueMigrationRequest());
      dispatch(allowBack(false));
    }

    /* enable back button once loading is finished */
    if (hasFinished || isError) {
      dispatch(allowBack(true));
    }

    /* abort request on unmount */
    /* broken: just disable StrictMode on dev
    return () => {
      if (isLoading) {
        dispatch(abortMigrationRequest())
      }
    } */
  }, [dispatch, hasFinished, isError, isLoading])

  if (isLoading) {
    return (
      <LoadingScreen />
    )
  }

  if (isError) {
    return (
      <ErrorScreen errorType={errorName} errorDetails={finalMessage}/>
    )
  }

  if (hasFinished) {
    return (
      <SuccessScreen message={finalMessage} />
    )
  }

  return <Box>Loading...</Box>
}

export default FinalPage;
