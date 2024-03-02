import { useEffect, useState } from 'react';

import { Box, Text, Spinner, Octicon, Heading, Button } from '@primer/react';

import { ClockIcon, AlertIcon, CopyIcon } from '@primer/octicons-react';

import { useAppSelector, useAppDispatch } from '../../store';
import { issueMigrationRequest, setExpired } from '../../store/dataSlice';
import { allowBack } from '../../store/navSlice';

const secondsFormatted = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = time - minutes * 60;

  return String(minutes).padStart(1, '0') + ":" + String(seconds).padStart(2, "0");
};

const fallbackCopyTextToClipboard = (text: string) => {
  let result = false;
  let textArea = document.createElement("textarea");
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  textArea.style.display = "none";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
      if(document.execCommand('copy')) {
        result = true;
      }
  } catch (err) {
      console.error('unable to copy to clipboard', err);

      return false;
  }

  document.body.removeChild(textArea);

  return result;
}

const SuccessScreen = () => {
  const dispatch = useAppDispatch();

  const username = useAppSelector((state) => state.data.handle);
  const repo_uri = useAppSelector((state) => state.data.repo?.uri) as string;
  const repo_exp = useAppSelector((state) => state.data.repo?.expires) as number;

  const [willExpire, setWillExpire] = useState(repo_exp);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const repoURL = window.location.protocol + '//' + window.location.host + '/repo/' + repo_uri;

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

  const displayTooltip = () => {
    setIsTooltipVisible(true);

    setTimeout(() => setIsTooltipVisible(false), 900);
  }

  const copyCloneCommand = () => {
    const command = "git clone " + repoURL;

    if (!navigator.clipboard) {
      const fallbackResult = fallbackCopyTextToClipboard(command);

      if (fallbackResult) {
        displayTooltip();
      }
    } else {
      navigator.clipboard.writeText(command).then(function() {
        displayTooltip();
    }, function(err) {
        console.error('could not copy text: ', err);
    });
    }


  }

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      <Box sx={{ alignSelf: 'center', textAlign: 'center', width: '100%', position: "relative" }}>
        <Heading>Ready!</Heading>
        <br />
        <Text>Gitoboros has successfully copied all public contributions from <Text fontWeight="bold">{username}</Text> account. </Text>
        <Text>Please clone the following repo and open <Text fontWeight="bold">README.md</Text> inside:</Text>
        <br /><br />
        <Box sx={{
          display: "flex",
          borderColor: "border.subtle",
          borderStyle: "solid",
          borderWidth: "1px",
          borderRadius: "10px",
          padding: "8px",
          backgroundColor: "canvas.subtle",
          justifyContent: "center" }}>
          <Box sx={{ paddingTop: '4px' }}>
            <Text fontWeight="bold" fontFamily="monospace" sx={{ fontSize: 2 }}>
              git clone {repoURL}
            </Text>
          </Box>
          <Box marginLeft={1}>
            <Button sx={{ display: "inline-block", color: "fg.muted" }} variant="invisible" onClick={() => copyCloneCommand()} trailingVisual={CopyIcon}></Button>
          </Box>
        </Box>
        { isTooltipVisible &&
          <Box sx={{
            right: 0,
            position: "absolute",
            animation: "fadeOut 1s",
          }}><Text as="small" color='fg.muted'>copied!</Text></Box>
        }
        <br /><br />
        <Box sx={{ display: "flex", justifyContent: "center", margin: "0 auto" }}>
          <Box paddingRight={2}>
            <Text>This link will expire in:</Text>
          </Box>
          <Box paddingLeft={2}>
            <Text fontWeight="bold" fontFamily="monospace" fontSize={2}>{secondsFormatted(willExpire)}</Text>
          </Box>
        </Box>
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
