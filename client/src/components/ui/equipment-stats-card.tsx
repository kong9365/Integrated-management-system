/**
 * 장비 타입별 통계 카드 컴포넌트 (게이지 디자인 포함)
 */

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EquipmentStatsCardProps {
  equipmentTypeStats: Record<string, { running: number; total: number }>;
  className?: string;
}

export function EquipmentStatsCard({ equipmentTypeStats, className }: EquipmentStatsCardProps) {
  const order = ['HPLC장비', 'GC장비', 'GC/MS장비'];
  
  const getPercentage = (running: number, total: number) => {
    return total > 0 ? (running / total) * 100 : 0;
  };

  const getGaugeColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getGaugeBgColor = (percentage: number) => {
    if (percentage >= 70) return '#28a745';
    if (percentage >= 40) return '#ffc107';
    return '#dc3545';
  };

  const totalRunning = Object.values(equipmentTypeStats).reduce((sum, stats) => sum + stats.running, 0);
  const totalEquipment = Object.values(equipmentTypeStats).reduce((sum, stats) => sum + stats.total, 0);
  const overallPercentage = getPercentage(totalRunning, totalEquipment);

  return (
    <Card className={cn("border-l-4 border-l-blue-600 hover:shadow-lg transition-all", className)}>
      {/* 헤더 */}
      <div className="bg-blue-600 text-white py-3 px-5">
        <h3 className="text-lg font-bold text-center">장비 그룹별 가동 현황</h3>
      </div>
      
      <CardContent className="p-5">
        {/* 장비 타입별 통계 - 가로 배치 */}
        <div className="flex flex-wrap justify-around items-center gap-6">
          {order.map((type) => {
            const stats = equipmentTypeStats[type];
            if (!stats) return null;

            const { running, total } = stats;
            const percentage = getPercentage(running, total);

            return (
              <div key={type} className="flex items-center gap-3">
                <span className="text-base font-bold text-gray-800 whitespace-nowrap">
                  {type}:
                </span>
                {/* 게이지 바 */}
                <div 
                  className="relative border-2 rounded-lg overflow-hidden"
                  style={{ 
                    width: "280px",
                    height: "45px",
                    borderColor: "#333",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    backgroundColor: "#e9ecef"
                  }}
                >
                  {/* 진행 바 */}
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-500 flex items-center justify-center"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: getGaugeBgColor(percentage)
                    }}
                  />
                  {/* 텍스트 */}
                  <div
                    className="absolute inset-0 flex items-center justify-center font-bold text-base z-10"
                    style={{
                      color: "#000",
                      textShadow: "1px 1px 2px rgba(255,255,255,0.8)"
                    }}
                  >
                    {running}대 / 총{total}대
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

