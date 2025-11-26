import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

interface EquipmentStatusCardProps {
  equipment: string;
  status: "Running" | "Idle" | "Error" | "NotReady" | "NotConnected" | "PreRun";
  user?: string;
  sample?: string;
  method?: string;
  onClick?: () => void;
  className?: string;
}

const statusBorderColor = {
  Running: "border-l-green-500",
  PreRun: "border-l-blue-500",
  Idle: "border-l-yellow-500",
  Error: "border-l-red-500",
  NotReady: "border-l-orange-500",
  NotConnected: "border-l-gray-500",
};

export function EquipmentStatusCard({
  equipment,
  status,
  user,
  sample,
  method,
  onClick,
  className,
}: EquipmentStatusCardProps) {
  return (
    <Card
      className={cn(
        "border-l-4 hover:shadow-md transition-all cursor-pointer",
        statusBorderColor[status],
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-sm">{equipment}</h3>
          <StatusBadge status={status} />
        </div>
        {user && (
          <div className="text-xs text-gray-600 mt-2">
            <div>👤 {user}</div>
            {method && <div className="text-gray-500 mt-1">🧪 {method}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

