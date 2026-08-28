"use client";

import * as React from "react";
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
  wrapperClassName?: string;
}

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(
  (
    {
      className,
      label,
      labelClassName,
      wrapperClassName,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className={cn("grid w-full gap-2", wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn("text-sm font-medium pub-text-secondary", labelClassName)}
          >
            {label}
          </label>
        )}

        <div className="relative">
          <input
            {...props}
            id={inputId}
            ref={ref}
            disabled={disabled}
            type={showPassword ? "text" : "password"}
            className={cn(
              "h-12 w-full rounded-xl border pub-border-line pub-card px-4 pr-12 text-sm pub-text-primary outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 disabled:opacity-50",
              className
            )}
          />

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={disabled}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center pub-text-muted hover:pub-text-primary transition-colors focus:outline-none focus:text-cyan-500 disabled:opacity-50"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

