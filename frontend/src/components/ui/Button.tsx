import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  hapticPattern?: number | number[];
}

/**
 * Reusable Button Component
 * Supports multiple variants and sizes with loading state
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  hapticPattern,
  className = '',
  disabled,
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    if (hapticPattern !== undefined && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(hapticPattern);
    }

    onClick?.(event);
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      onClick={handleClick}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.359 0 2 3.359 2 7v5a8 8 0 0116 0" />
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
