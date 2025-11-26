import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  icon: string | React.ReactNode;
  value: string | number | React.ReactNode;
  label: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  className?: string;
}

export function KPICard({
  icon,
  value,
  label,
  change,
  changeType = "neutral",
  className,
}: KPICardProps) {
  const isCompact = className?.includes('compact');
  
  return (
    <Card className={cn("border-l-4 border-l-blue-600 hover:shadow-lg transition-all", className)}>
      <CardContent className={cn("text-center", isCompact ? "p-3" : "p-6")}>
        <div className={cn(isCompact ? "mb-1 flex justify-center" : "mb-2 flex justify-center")}>
          {typeof icon === 'string' ? (
            <span className={cn(isCompact ? "text-xl" : "text-3xl")}>{icon}</span>
          ) : (
            icon
          )}
        </div>
        <div className={cn("font-bold text-blue-600", isCompact ? "text-2xl my-1.5" : "text-4xl my-3")}>
          {value}
        </div>
        <div className={cn("text-gray-600 font-medium", isCompact ? "text-xs" : "text-sm")}>{label}</div>
        {change && (
          <div
            className={cn(
              "text-xs mt-2",
              changeType === "positive" && "text-green-600",
              changeType === "negative" && "text-red-600",
              changeType === "neutral" && "text-gray-500"
            )}
          >
            {change}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

