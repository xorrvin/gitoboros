import { useState } from 'react';

import { FormControl, TextInput } from '@primer/react'

/* {validationResult === 'validName' && (
    <FormControl.Validation variant="success">Valid name</FormControl.Validation>
)} */


interface ValidatedFieldProps {
  required?: boolean;
  label: string;
  caption: string | JSX.Element;
  initialValue: string;
  defaultValue: string;
  valid: boolean;
  validationResult: string;

  onChange: (value: string) => void;
};

const ValidatedField = (props: ValidatedFieldProps) => {
  const { required, label, caption, defaultValue, valid, initialValue, validationResult, onChange } = props;
  const [fieldValue, setFieldValue] = useState(initialValue)

  const handleValueChange = (e: any) => {
    const value = e.currentTarget.value;

    setFieldValue(value);
    onChange(value);
  }

  return (
    <FormControl required={required ? true : false} sx={{ marginBottom: 5 }}>
      <FormControl.Label>{label}</FormControl.Label>
      <TextInput maxLength={64} block placeholder={defaultValue} value={fieldValue} onChange={handleValueChange} />
      {!valid && (
        <FormControl.Validation variant="error">{validationResult}</FormControl.Validation>
      )}
      <FormControl.Caption>{caption}</FormControl.Caption>
    </FormControl>
  )
}

export default ValidatedField;
