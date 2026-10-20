import React from "react";
import { FolderOpen } from "lucide-react";

interface AdminEmptyStateProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ size?: number; className?: string }>;
  };
  className?: string;
}

export function AdminEmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
  className = "",
}: AdminEmptyStateProps) {
  const ActionIcon = action?.icon;

  return (
    <div
      className={`rounded-2xl border border-dashed border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#FFF9EF]/50 dark:bg-[#1B2E27]/30 p-8 sm:p-12 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-[#E8EBDF] dark:bg-[#2C473D] text-[#304D42] dark:text-[#FFF9EF] flex items-center justify-center mb-3.5 shadow-2xs">
        <Icon size={22} />
      </div>
      <h3 className="text-sm sm:text-base font-bold text-[#304D42] dark:text-[#FFF9EF]">
        {title}
      </h3>
      <p className="mt-1 text-xs text-[#565D4F] dark:text-[#BAC0B3] max-w-sm leading-relaxed">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] hover:opacity-90 transition-opacity text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
        >
          {ActionIcon && <ActionIcon size={14} />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}
