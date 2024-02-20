import { Box, Link, Text, Token, Heading } from '@primer/react'
import { useEffect, useState } from 'react';

import ValidatedField from './ValidatedField';

import { useAppDispatch, useAppSelector } from '../../store';
import { allowNext } from '../../store/navSlice';
import { setHandle, setEmail, setReady } from '../../store/dataSlice';
import { PageTypes } from '.';

import * as EmailValidator from 'email-validator';

import { defaultHandle, defaultEmail } from '../../consts';

const FormPage = () => {
  const dispatch = useAppDispatch()

  const inFocus = useAppSelector((state) => state.navigation.currentPage === PageTypes.Form);

  const currentHandle = useAppSelector((state) => state.data.handle);
  const currentEmail = useAppSelector((state) => state.data.email);

  const [handleValue, setHandleValue] = useState(currentHandle)
  const [isHandleValid, setIsHandleValid] = useState(true);
  const [handleValidationResult, setHandleValidationResult] = useState("")

  const [emailValue, setEmailValue] = useState(currentEmail)
  const [isEmailValid, setIsEmailValid] = useState(true);  
  const [emailValidationResult, setEmailValidationResult] = useState("")

  /* Validate inputs */
  useEffect(() => {
      if (handleValue === "") {
          setIsHandleValid(false)
          setHandleValidationResult("GitHub username cannot be empty")
      }
      // https://github.com/shinnn/github-username-regex/pull/5/files
      else if (! /^[a-z\d](?:[a-z\d]|-(?!-)){0,38}$/ig.test(handleValue)) {
          setIsHandleValid(false)
          setHandleValidationResult("Invalid GitHub username")
      } else if (handleValue) {
          setIsHandleValid(true)
          setHandleValidationResult("")
      }

      if (! EmailValidator.validate(emailValue)) {
        setIsEmailValid(false);
        setEmailValidationResult("Email address should be valid")
      } else {
        setIsEmailValid(true);
        setEmailValidationResult("")
      }
  }, [handleValue, emailValue])

  /* lock form if needed */
  useEffect(() => {
    if (inFocus) {
      if (isHandleValid && isEmailValid) {
        /* fill required data */
        dispatch(setHandle(handleValue));
        dispatch(setEmail(emailValue));

        /* ready for API request */
        dispatch(setReady());

        /* unblock Next button */
        dispatch(allowNext(true));
      } else {
        dispatch(allowNext(false));
      }
    }
  }, [dispatch, emailValue, handleValue, inFocus, isEmailValid, isHandleValid]);

  return (
    <Box>
      <Heading>Gitoboros needs some data...</Heading>
      <Box display="grid" gap={5}>
        <ValidatedField
          required
          valid={isHandleValid}
          validationResult={handleValidationResult}
          label="GitHub username"
          onChange={(value) => setHandleValue(value)}
          initialValue={currentHandle}
          defaultValue={defaultHandle}
          caption=
          {<>
            <Text>Target GitHub account to migrate from. For example <Token text="octocat" /> or <Token text="torvalds" /></Text>
            <Text><br />Note: only <Text fontWeight={"bold"}>public</Text> accounts can be migrated.</Text>
          </>
          }
        />
        <ValidatedField
          required
          valid={isEmailValid}
          validationResult={emailValidationResult}
          label="Your email"
          onChange={(value) => setEmailValue(value)}
          initialValue={currentEmail}
          defaultValue={defaultEmail}
          caption=
          {<>
            <Text>GitHub email which you use for your commits. You can also use  <Token text="@users.noreply.github.com" /> private email issued by GitHub.</Text>
            <Text> For that, you need to enable email privacy protection, as mentioned <Link href="https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/setting-your-commit-email-address" target="_blank">here</Link>.</Text>
          </>}
        />
      </Box>
    </Box>
  )
}

export default FormPage;