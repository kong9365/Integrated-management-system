import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";

interface AlertBoxProps {
  type?: "info" | "warning" | "danger" | "success";
  title?: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const alertConfig = {
  info: {
    icon: Info,
    className: "bg-blue-50 border-l-blue-500 text-blue-900",
    iconClassName: "text-blue-600",
  },
  warning: {
    icon: AlertTriangle,
    className: "bg-yellow-50 border-l-yellow-500 text-yellow-900",
    iconClassName: "text-yellow-600",
  },
  danger: {
    icon: AlertCircle,
    className: "bg-red-50 border-l-red-500 text-red-900",
    iconClassName: "text-red-600",
  },
  success: {
    icon: CheckCircle,
    className: "bg-green-50 border-l-green-500 text-green-900",
    iconClassName: "text-green-600",
  },
};

export function AlertBox({
  type = "info",
  title,
  children,
  className,
}: AlertBoxProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "p-4 rounded-lg border-l-4 flex gap-3",
        config.className,
        className
      )}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.iconClassName)} />
      <div className="flex-1">
        {title && <div className="font-semibold mb-1">{title}</div>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

