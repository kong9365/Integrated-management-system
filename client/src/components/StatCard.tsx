import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  valueColor?: string;
  trend?: string;
  testId?: string;
}

export function StatCard({ icon: Icon, label, value, valueColor = "text-primary", trend, testId }: StatCardProps) {
  return (
    <Card className="p-6 text-center hover-elevate" data-testid={testId || `card-stat-${label}`}>
      {Icon && (
        <div className="flex justify-center mb-3">
          <Icon className="w-8 h-8 text-primary" />
        </div>
      )}
      <div className={`text-4xl font-bold mb-2 ${valueColor}`} data-testid={`text-stat-value-${label}`}>
        {value}
      </div>
      <div className="text-sm text-muted-foreground" data-testid={`text-stat-label-${label}`}>
        {label}
      </div>
      {trend && (
        <div className="text-xs text-muted-foreground mt-1" data-testid={`text-stat-trend-${label}`}>
          {trend}
        </div>
      )}
    </Card>
  );
}

