"use client";

import { forwardRef } from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}

const FormField = forwardRef<HTMLInputElement, Props>(
  ({ label, icon, trailing, className = "", ...props }, ref) => {
    return (
      <label className="block">
        <span className="block text-[13px] text-app mb-2 font-semibold">{label}</span>
        <div className="relative">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`form-control ${icon ? "pl-11" : "pl-4"} ${trailing ? "pr-11" : "pr-4"} py-3 text-[15px] ${className}`}
            {...props}
          />
          {trailing && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
              {trailing}
            </span>
          )}
        </div>
      </label>
    );
  }
);

FormField.displayName = "FormField";
export default FormField;
