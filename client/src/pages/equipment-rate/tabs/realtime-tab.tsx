/**
 * 📊 실시간 모니터링 탭
 */

import { useState } from "react";
import { KPICard } from "@/components/ui/kpi-card";
import { EquipmentStatusCard } from "@/components/ui/equipment-status-card";
import { AlertBox } from "@/components/ui/alert-box";
import { EquipmentStatsCard } from "@/components/ui/equipment-stats-card";
import { ChevronDown, ChevronUp, Settings, TrendingUp, Calendar, AlertCircle, Monitor } from "lucide-react";

interface RealtimeTabProps {
  kpiData: {
    totalUtilization: number;
    activeEquipment: number;
    todayHours: number;
    monthlyUtilization: number;
  };
  equipmentStatus: Array<{
    장비: string;
    상태: string;
    사용자?: string;
    샘플?: string;
    분석법?: string;
  }>;
  alerts: Array<{
    type: "info" | "warning" | "danger" | "success";
    title?: string;
    message: string;
  }>;
  equipmentTypeStats?: Record<string, { running: number; total: number }>;
}

export function RealtimeTab({ kpiData, equipmentStatus, alerts, equipmentTypeStats }: RealtimeTabProps) {
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(true);

  return (
    <div className="space-y-6">
      {/* KPI 카드 */}
      <div className="space-y-4">
        {/* 가동 중인 장비 카드 - 전체 폭 */}
        {equipmentTypeStats ? (
          <EquipmentStatsCard equipmentTypeStats={equipmentTypeStats} />
        ) : (
          <KPICard
            icon={<Settings className="h-8 w-8 text-blue-600" />}
            value={`${kpiData.activeEquipment}대`}
            label="가동 중인 장비"
          />
        )}
        
        {/* 나머지 2개 카드 - 2열 그리드 */}
        <div className="grid grid-cols-2 gap-4">
          <KPICard
            icon={<TrendingUp className="h-6 w-6 text-blue-600" />}
            value={`${kpiData.totalUtilization}%`}
            label="전체 장비 가동률"
            className="compact"
          />
          <KPICard
            icon={<Calendar className="h-6 w-6 text-blue-600" />}
            value={`${kpiData.monthlyUtilization}%`}
            label="이번 달 누적 가동률"
            className="compact"
          />
        </div>
      </div>

      {/* 알림 영역 */}
      {alerts.length > 0 && (
        <div>
          <button
            onClick={() => setIsAlertsExpanded(!isAlertsExpanded)}
            className="flex items-center justify-between w-full text-left mb-3 hover:opacity-80 transition-opacity"
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              실시간 알림
            </h3>
            {isAlertsExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>
          {isAlertsExpanded && (
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <AlertBox key={index} type={alert.type} title={alert.title}>
                  {alert.message}
                </AlertBox>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 실시간 장비 상태 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Monitor className="h-5 w-5 text-blue-600" />
          실시간 장비 상태
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {equipmentStatus.map((status) => (
            <EquipmentStatusCard
              key={status.장비}
              equipment={status.장비}
              status={status.상태 as any}
              user={status.사용자}
              sample={status.샘플}
              method={status.분석법}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

