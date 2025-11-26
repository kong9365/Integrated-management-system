/**
 * 가동률 분석 탭
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlotlyChart } from "@/components/ui/plotly-chart";
import { BarChart3, TrendingUp } from "lucide-react";
import { Data, Layout } from "plotly.js";

interface UtilizationTabProps {
  equipmentBarChart: {
    data: Data[];
    layout?: Partial<Layout>;
  };
  trendChart: {
    data: Data[];
    layout?: Partial<Layout>;
  };
}

export function UtilizationTab({
  equipmentBarChart,
  trendChart,
}: UtilizationTabProps) {
  return (
    <div className="space-y-6">
      {/* 장비별 가동률 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            장비별 가동률 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: "400px" }}>
            <PlotlyChart data={equipmentBarChart.data} layout={equipmentBarChart.layout} />
          </div>
        </CardContent>
      </Card>

      {/* 가동률 트렌드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            가동률 트렌드
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: "400px" }}>
            <PlotlyChart data={trendChart.data} layout={trendChart.layout} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

