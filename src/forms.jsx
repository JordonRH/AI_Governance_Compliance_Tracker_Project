import React, {useId} from 'react';
export function Field({children}) {
  const id = useId();
  const control = React.Children.toArray(children).find(child => React.isValidElement(child));
  const label = React.Children.toArray(children).filter(child => !React.isValidElement(child));
  const required = Boolean(control?.props.required);
  return <div className={`field ${control?.type === 'textarea' ? 'field-wide' : ''}`}>
    <label htmlFor={id}>{label}{required && <span className="required-mark" aria-hidden="true"> *</span>}</label>
    {React.cloneElement(control, {id, 'aria-describedby': control.props.minLength ? `${id}-hint` : undefined})}
    {control.props.minLength && <small id={`${id}-hint`}>Use {control.props.minLength} to {control.props.maxLength} characters.</small>}
  </div>;
}
export function FormNote(){return <p className="form-note">Fields marked <span className="required-mark">*</span> are required.</p>}
