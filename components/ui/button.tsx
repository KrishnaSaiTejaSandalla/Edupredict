import type { ButtonHTMLAttributes } from 'react';

const variants = {
  primary:
    'inline-flex items-center justify-center rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400',
  secondary:
    'inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export function Button({ className = '', variant = 'primary', ...props }: ButtonProps) {
  return <button className={`${variants[variant]} ${className}`} {...props} />;
}
