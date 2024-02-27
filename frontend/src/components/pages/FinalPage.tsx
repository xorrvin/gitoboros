import { useEffect } from 'react';

import { Box, Text, Spinner, Octicon, Heading } from '@primer/react'
import { CheckIcon, AlertIcon } from '@primer/octicons-react'

import { useAppSelector, useAppDispatch } from '../../store';
import { issueMigrationRequest, abortMigrationRequest } from '../../store/dataSlice';
import { allowBack } from '../../store/navSlice';

import { publicURL } from '../../consts';

const SuccessScreen = () => {
  const username = useAppSelector((state) => state.data.handle);
  const repo_uri = useAppSelector((state) => state.data.repo?.uri);
  const repo_exp = useAppSelector((state) => state.data.repo?.expires);

  useEffect(() => {
    // set timer
  }, []);

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      <Box sx={{ alignSelf: 'center', textAlign: 'center', width: '100%' }}>
        <Heading>Ready!</Heading>
        <Text>Gitoboros has successfully copied all public contributions from <Text fontWeight="bold">{username}</Text> account. </Text>
        <Text>To use it, please clone the following repo and open file inside:</Text>
        <br /><br />
        <Text fontWeight="bold" fontFamily="monospace">git clone {publicURL}/repo/{repo_uri}</Text>
        <br />
        <Text>it will expire in {repo_exp} seconds</Text>
      </Box>
    </Box>
  )
}

const ErrorScreen = () => {
  const name = useAppSelector((state) => state.data.error?.name);
  const info = useAppSelector((state) => state.data.error?.info);

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      <Box sx={{ alignSelf: 'center', textAlign: 'center', width: '100%' }}>
        <Octicon icon={AlertIcon} size="large" color="fg.subtle" />
        <Heading>{name}</Heading>
        <Text>
          <br />{info}<br /><br />
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
  const isSuccess = useAppSelector((state) => state.data.isSuccess);
  const isLoading = useAppSelector((state) => state.data.isLoading);

  useEffect(() => {
    /* make request and disable back button */
    if (!isLoading && !isError && !isSuccess) {
      dispatch(issueMigrationRequest());
      dispatch(allowBack(false));
    }

    /* enable back button once loading is finished */
    if (isSuccess || isError) {
      dispatch(allowBack(true));
    }

    /* abort request on unmount */
    /* broken: just disable StrictMode on dev
    return () => {
      if (isLoading) {
        dispatch(abortMigrationRequest())
      }
    } */
  }, [dispatch, isError, isLoading, isSuccess])

  if (isLoading) {
    return (
      <LoadingScreen />
    )
  }

  if (isError) {
    return (
      <ErrorScreen />
    )
  }

  if (isSuccess) {
    return (
      <SuccessScreen />
    )
  }

  return <Box>Loading...</Box>
}

export default FinalPage;
