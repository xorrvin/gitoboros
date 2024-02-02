import { Box, Link, Text, Token } from '@primer/react'
import { useEffect, useState } from 'react';

import ValidatedField from './ValidatedField';


import { useAppDispatch, useAppSelector } from '../../store';
import { allowNext } from '../../store/navSlice';
import { PageTypes } from '.';

import * as EmailValidator from 'email-validator';

const defaultHandle = "octocat";
const defaultEmail = "octocat@nowhere.com";

const FormPage = () => {
  const dispatch = useAppDispatch()
  // const isGoingNext = useAppSelector((state) => state.navigation.isGoingNext);
  const inFocus = useAppSelector((state) => state.navigation.currentPage === PageTypes.Form);

  const [handleValue, setHandleValue] = useState(defaultHandle)
  const [isHandleValid, setIsHandleValid] = useState(true);
  const [handleValidationResult, setHandleValidationResult] = useState("")

  const [emailValue, setEmailValue] = useState(defaultEmail)
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
    console.log('2nd effect')
    if (inFocus) {
      if (isHandleValid && isEmailValid) {
        console.log('unlocking form')
        dispatch(allowNext(true));
      } else {
        console.log('locking form')
        dispatch(allowNext(false));
      }
    }
  }, [dispatch, inFocus, isEmailValid, isHandleValid]);

  return (
    <Box>
      <Text as="h2">Gitoboros needs some data...</Text>
      <Text>In order to proceed, please fill out this form.</Text>
      <Text><br /><br /></Text>
      <Box display="grid" gap={5}>
        <ValidatedField
          required
          valid={isHandleValid}
          validationResult={handleValidationResult}
          label="GitHub username"
          defaultValue={defaultHandle}
          onChange={(value) => setHandleValue(value)}
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
          defaultValue={defaultEmail}
          onChange={(value) => setEmailValue(value)}
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