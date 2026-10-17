import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  headerAction?: React.ReactNode;
  'aria-label'?: string;
}

/**
 * Reusable Card Component
 * Provides consistent card styling with optional header, content, and footer action.
 * Supports keyboard accessibility, focus rings, and custom roles.
 */
export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  icon,
  action,
  headerAction,
  className = '',
  onClick,
  onKeyDown,
  role,
  'aria-label': ariaLabel,
  ...props
}) => {
  const isClickable = Boolean(onClick);
  const cardRole = role || (isClickable ? 'button' : undefined);
  const computedAriaLabel = ariaLabel || (isClickable && title ? title : undefined);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>);
    }
    onKeyDown?.(event);
  };

  return (
    <div
      role={cardRole}
      aria-label={computedAriaLabel}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all ${
        isClickable
          ? 'cursor-pointer hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none'
          : ''
      } ${className}`}
      {...props}
    >
      {/* Header */}
      {(title || icon || headerAction) && (
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {icon && <div className="text-blue-600" aria-hidden="true">{icon}</div>}
              {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            </div>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500 ml-10">{subtitle}</p>
            )}
          </div>
          {headerAction && <div className="ml-4">{headerAction}</div>}
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-4">
        {children}
      </div>

      {/* Footer / Action */}
      {action && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
          {action}
        </div>
      )}
    </div>
  );
};

export default Card;
