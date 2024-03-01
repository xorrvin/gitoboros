import { Box, Link, Text, Heading } from '@primer/react'
import { useCallback, useEffect, useState } from 'react';

import ValidatedField from './ValidatedField';

import { useAppDispatch, useAppSelector } from '../../store';
import { allowNext } from '../../store/navSlice';
import { setHandle, setEmail, setBranch, setReady } from '../../store/dataSlice';
import { goNext } from '../../store/navSlice';
import { PageTypes } from '.';

import * as EmailValidator from 'email-validator';

import { defaultHandle, defaultEmail, defaultBranch } from '../../consts';

const hrefEmailPrivacyProtection = "https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/setting-your-commit-email-address";

const FormPage = () => {
  const dispatch = useAppDispatch()

  const inFocus = useAppSelector((state) => state.navigation.currentPage === PageTypes.Form);

  const currentHandle = useAppSelector((state) => state.data.handle);
  const currentEmail = useAppSelector((state) => state.data.email);
  const currentBranch = useAppSelector((state) => state.data.branch);

  const [handleValue, setHandleValue] = useState(currentHandle)
  const [isHandleValid, setIsHandleValid] = useState(true);
  const [handleValidationResult, setHandleValidationResult] = useState("")

  const [emailValue, setEmailValue] = useState(currentEmail)
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [emailValidationResult, setEmailValidationResult] = useState("")

  const [branchValue, setBranchValue] = useState("")
  const [isBranchValid, setIsBranchValid] = useState(true);  
  const [branchValidationResult, setBranchValidationResult] = useState("")

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

      /* empty branch is okay */
      if (branchValue === "") {
        setIsBranchValid(true)
        setBranchValidationResult("")
      } else {
          if (! /^[0-9a-zA-Z-.\\/]{0,64}$/ig.test(branchValue)) {
            setIsBranchValid(false)
            setBranchValidationResult("Invalid git branch name")
          } else {
            setIsBranchValid(true)
            setBranchValidationResult("")
          }
      }
  }, [handleValue, emailValue, branchValue])

  /* form is valid and ready */
  const setFormReady = useCallback(() => {
      /* fill required data */
      dispatch(setHandle(handleValue));
      dispatch(setEmail(emailValue));

      if (branchValue === "") {
        dispatch(setBranch(defaultBranch));
      } else {
        dispatch(setBranch(branchValue));
      }

      /* ready for API request */
      dispatch(setReady());
  }, [branchValue, dispatch, emailValue, handleValue]);

  /* submit by pressing Enter when fields are valid */
  const submitFromField = () => {
    if (isHandleValid && isEmailValid && isBranchValid) {
      /* by this point, useEffect would already execute,  */
      /* so form data is already saved                    */
      dispatch(goNext())
    }
  }

  /* lock form if needed */
  useEffect(() => {
    if (inFocus) {
      if (isHandleValid && isEmailValid && isBranchValid) {
        setFormReady();

        /* unblock Next button */
        dispatch(allowNext(true));
      } else {
        dispatch(allowNext(false));
      }
    }
  }, [branchValue, dispatch, emailValue, handleValue, inFocus, isBranchValid, isEmailValid, isHandleValid, setFormReady]);

  return (
    <Box>
      <Heading>Gitoboros needs some data...</Heading>
      <Box display="grid" gap={5}>
        <ValidatedField
          required
          onSubmit={() => submitFromField()}
          valid={isHandleValid}
          validationResult={handleValidationResult}
          label="GitHub username"
          onChange={(value) => setHandleValue(value)}
          initialValue={currentHandle}
          defaultValue={defaultHandle}
          caption=
          {<>
            <Text>Public GitHub account to migrate from. For example <Text fontWeight="bold">octocat</Text> or <Text fontWeight="bold">torvalds</Text>.</Text>
          </>
          }
        />
        <ValidatedField
          required
          onSubmit={() => submitFromField()}
          valid={isEmailValid}
          validationResult={emailValidationResult}
          label="Your email"
          onChange={(value) => setEmailValue(value)}
          initialValue={currentEmail}
          defaultValue={defaultEmail}
          caption=
          {<>
            <Text>GitHub email to use for contribution commits. You can also use  <Text fontWeight="bold">@users.noreply.github.com</Text> private email issued by GitHub.</Text>
            <Text> For that, you need to <Link href={hrefEmailPrivacyProtection} target="_blank">enable</Link> email privacy protection.</Text>
          </>}
        />
        <ValidatedField
          onSubmit={() => submitFromField()}
          valid={isBranchValid}
          validationResult={branchValidationResult}
          label="Git branch"
          onChange={(value) => setBranchValue(value)}
          initialValue={currentBranch}
          defaultValue={defaultBranch}
          caption=
          {<>
            <Text>This is the branch name all migrated contributions will be committed to. If not filled, will default to <Text fontWeight="bold">main</Text>.</Text>
          </>}
        />
      </Box>
    </Box>
  )
}

export default FormPage;