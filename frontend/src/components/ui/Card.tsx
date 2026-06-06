import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

/**
 * Reusable Card Component
 * Provides consistent card styling with optional header/footer
 */
export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  icon,
  action,
  className = '',
  ...props
}) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      {(title || icon || action) && (
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {icon && <div className="text-blue-600">{icon}</div>}
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 ml-10">{subtitle}</p>
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-4">
        {children}
      </div>

      {/* Footer/Action */}
      {action && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
          {action}
        </div>
      )}
    </div>
  );
};

export default Card;
