import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "대기", variant: "secondary" },
  approved: { label: "승인", variant: "default" },
  rejected: { label: "거부", variant: "destructive" },
  completed: { label: "완료", variant: "outline" },
  reserved: { label: "예약", variant: "secondary" },
  confirmed: { label: "확정", variant: "default" },
  cancelled: { label: "취소", variant: "destructive" },
  in_progress: { label: "진행중", variant: "default" },
  active: { label: "활성", variant: "default" },
  removed: { label: "제거됨", variant: "outline" },
  borrowed: { label: "대여중", variant: "default" },
  returned: { label: "반납완료", variant: "outline" },
  overdue: { label: "연체", variant: "destructive" },
  running: { label: "가동중", variant: "default" },
  idle: { label: "대기", variant: "secondary" },
  maintenance: { label: "점검중", variant: "destructive" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "outline" as const };
  
  return (
    <Badge 
      variant={config.variant} 
      className={className}
      data-testid={`badge-status-${status}`}
    >
      {config.label}
    </Badge>
  );
}

