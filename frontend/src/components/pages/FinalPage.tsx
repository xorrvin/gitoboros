import { useEffect, useState } from 'react';

import { Box, Text, Spinner, Octicon, Heading } from '@primer/react'
import { ClockIcon, AlertIcon } from '@primer/octicons-react'

import { useAppSelector, useAppDispatch } from '../../store';
import { issueMigrationRequest, setExpired } from '../../store/dataSlice';
import { allowBack } from '../../store/navSlice';

import { publicURL } from '../../consts';

const secondsFormatted = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = time - minutes * 60;

  return String(minutes).padStart(1, '0') + ":" + String(seconds).padStart(2, "0");
};

const SuccessScreen = () => {
  const dispatch = useAppDispatch();

  const username = useAppSelector((state) => state.data.handle);
  const repo_uri = useAppSelector((state) => state.data.repo?.uri) as string;
  const repo_exp = useAppSelector((state) => state.data.repo?.expires) as number;

  const [willExpire, setWillExpire] = useState(repo_exp);
 
  useEffect(() => {
    const interval = setInterval(() => {
      if (willExpire > 0) {
        setWillExpire(willExpire - 1);
      } else {
        /* session expired, fire an event to show error screen */
        dispatch(setExpired());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [dispatch, willExpire]);

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      <Box sx={{ alignSelf: 'center', textAlign: 'center', width: '100%' }}>
        <Heading>Ready!</Heading>
        <Text>Gitoboros has successfully copied all public contributions from <Text fontWeight="bold" fontFamily="monospace">{username}</Text> account. </Text>
        <Text>Please clone the following repo and open <Text fontWeight="bold" fontFamily="monospace">README</Text> file inside:</Text>
        <br /><br />
        <Text fontWeight="bold" fontFamily="monospace">git clone {publicURL}/repo/{repo_uri}</Text>
        <br /><br />
        <Text>This link will expire in <Text fontWeight="bold" fontFamily="monospace">{secondsFormatted(willExpire)}</Text>.</Text>
      </Box>
    </Box>
  )
}

const ErrorScreen = () => {
  const name = useAppSelector((state) => state.data.error?.name);
  const info = useAppSelector((state) => state.data.error?.info);

  const isExpired = useAppSelector((state) => state.data.isExpired);

  const Icon = isExpired ? ClockIcon : AlertIcon;

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      <Box sx={{ alignSelf: 'center', textAlign: 'center', width: '100%' }}>
        <Octicon icon={Icon} size="large" color="fg.subtle" />
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
