import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface PhoneInputComponentProps {
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  editPhone: boolean;
  className?: string;
}

export function PhoneInputComponent({
  phoneNumber,
  setPhoneNumber,
  editPhone,
  className,
}: PhoneInputComponentProps) {
  return (
    <>
      <PhoneInput
        defaultCountry="RW"
        international
        countryCallingCodeEditable={false}
        value={phoneNumber}
        onChange={(value) => {
          setPhoneNumber(value ?? "+250");
        }}
        disabled={!editPhone}
        className={
          className ? className : "w-full border border-gray-300 rounded-md p-2"
        }
      />

      {/* Scoped global override for react-phone-number-input */}
      <style>{`
        /* your input override as before */
        .PhoneInputInput {
          padding: 0.5rem;
          font-size: 0.875rem;
          border: none;
          outline: none;
          width: 100%;
          background-color: transparent;
        }
      `}</style>
    </>
  );
}
