import React from "react";

interface AdminCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function AdminCard({ children, className = "", ...props }: AdminCardProps) {
  return (
    <div
      className={`rounded-2xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#233B32] shadow-2xs text-[#304D42] dark:text-[#FFF9EF] transition-colors min-w-0 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface AdminCardHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function AdminCardHeader({
  title,
  subtitle,
  badge,
  action,
  className = "",
}: AdminCardHeaderProps) {
  return (
    <div
      className={`p-5 sm:p-6 border-b border-[#DEDDD0] dark:border-[#3A5B4F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
    >
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-[#304D42] dark:text-[#FFF9EF] tracking-tight">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-[#565D4F] dark:text-[#BAC0B3] leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function AdminCardContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>;
}
