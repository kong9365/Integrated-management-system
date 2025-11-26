import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "Running" | "Idle" | "Error" | "NotReady" | "NotConnected" | "PreRun";
  className?: string;
}

const statusConfig = {
  Running: {
    label: "가동 중",
    className: "bg-green-100 text-green-800 border-green-300",
  },
  PreRun: {
    label: "준비 중",
    className: "bg-blue-100 text-blue-800 border-blue-300",
  },
  Idle: {
    label: "대기 중",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  Error: {
    label: "오류",
    className: "bg-red-100 text-red-800 border-red-300",
  },
  NotReady: {
    label: "준비 안됨",
    className: "bg-orange-100 text-orange-800 border-orange-300",
  },
  NotConnected: {
    label: "연결 안됨",
    className: "bg-gray-100 text-gray-800 border-gray-300",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.Idle;

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

