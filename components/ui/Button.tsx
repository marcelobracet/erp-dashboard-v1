import React, { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium rounded-xl
      transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      ${fullWidth ? 'w-full' : ''}
    `;

    const variantStyles = {
      primary: `
        bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
        text-white shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60
        focus:ring-blue-500
      `,
      secondary: `
        bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
        text-gray-900 dark:text-gray-100 focus:ring-gray-500
      `,
      outline: `
        border-2 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600
        bg-transparent text-gray-700 dark:text-gray-300 focus:ring-gray-500
      `,
      ghost: `
        bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800
        text-gray-700 dark:text-gray-300 focus:ring-gray-500
      `,
    };

    const sizeStyles = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Carregando...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

