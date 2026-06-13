import type { ButtonHTMLAttributes } from 'react';

const variants = {
  primary:
    'inline-flex items-center justify-center rounded-full btn-cyan px-5 py-3 text-sm font-semibold',
  secondary:
    'inline-flex items-center justify-center rounded-full border border-border bg-card hover:bg-hover text-primary px-5 py-3 text-sm font-semibold shadow-sm transition-all duration-200',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export function Button({ className = '', variant = 'primary', ...props }: ButtonProps) {
  return <button className={`${variants[variant]} ${className}`} {...props} />;
}
