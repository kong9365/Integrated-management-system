/**
 * 투자 효율성 분석 탭
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlotlyChart } from "@/components/ui/plotly-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertBox } from "@/components/ui/alert-box";
import { CostUploadDialog } from "../components/cost-upload-dialog";
import { BarChart3, DollarSign, Lightbulb, Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Data, Layout } from "plotly.js";

interface ROITabProps {
  scatterChart: {
    data: Data[];
    layout?: Partial<Layout>;
  };
  roiTableData: Array<{
    장비: string;
    "가동률(%)": number;
    "연간비용(만원)": number;
    "시간당비용(원)": number;
    권장사항: string;
  }>;
  recommendations: {
    totalEquipment: number;
    totalCost: number;
    maintainCount: number;
    reviewCount: number;
    cancelCount: number;
    potentialSavings: number;
  };
}

export function ROITab({ scatterChart, roiTableData, recommendations }: ROITabProps) {
  return (
    <div className="space-y-6">
      {/* 효율성 매트릭스 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            장비별 투자 효율성 매트릭스
          </CardTitle>
          <CostUploadDialog />
        </CardHeader>
        <CardContent>
          <div style={{ height: "500px" }}>
            <PlotlyChart data={scatterChart.data} layout={scatterChart.layout} />
          </div>
        </CardContent>
      </Card>

      {/* 투자 효율성 테이블 & 권장사항 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                장비별 투자 대비 성과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>장비</TableHead>
                      <TableHead>가동률(%)</TableHead>
                      <TableHead>연간비용(만원)</TableHead>
                      <TableHead>시간당비용(원)</TableHead>
                      <TableHead>권장사항</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roiTableData.map((row, index) => (
                      <TableRow
                        key={index}
                        className={
                          row.권장사항 === "계약 유지"
                            ? "bg-green-50"
                            : row.권장사항 === "재검토 권장"
                            ? "bg-yellow-50"
                            : "bg-red-50"
                        }
                      >
                        <TableCell className="font-medium">{row.장비}</TableCell>
                        <TableCell>{row["가동률(%)"].toFixed(1)}</TableCell>
                        <TableCell>{row["연간비용(만원)"].toLocaleString()}</TableCell>
                        <TableCell>{row["시간당비용(원)"].toLocaleString()}</TableCell>
                        <TableCell>{row.권장사항}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                계약 권장사항
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AlertBox type="info" title={
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  전체 현황
                </span>
              }>
                <div className="space-y-1">
                  <div>• 총 장비: {recommendations.totalEquipment}대</div>
                  <div>• 연간 총 비용: {recommendations.totalCost.toLocaleString()}만원</div>
                </div>
              </AlertBox>

              <AlertBox type="success" title={
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  계약 유지
                </span>
              }>
                <div className="space-y-1">
                  <div>• {recommendations.maintainCount}대 장비</div>
                  <div>• 효율적 운영 중</div>
                </div>
              </AlertBox>

              {recommendations.reviewCount > 0 && (
                <AlertBox type="warning" title={
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    재검토 권장
                  </span>
                }>
                  <div className="space-y-1">
                    <div>• {recommendations.reviewCount}대 장비</div>
                    <div>• 가동률 개선 필요</div>
                  </div>
                </AlertBox>
              )}

              {recommendations.cancelCount > 0 && (
                <AlertBox type="danger" title={
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    미계약 권장
                  </span>
                }>
                  <div className="space-y-1">
                    <div>• {recommendations.cancelCount}대 장비</div>
                    <div>• 예상 절감액: {recommendations.potentialSavings.toLocaleString()}만원/년</div>
                    {recommendations.totalCost > 0 && (
                      <div>
                        • 절감률:{" "}
                        {((recommendations.potentialSavings / recommendations.totalCost) * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </AlertBox>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

