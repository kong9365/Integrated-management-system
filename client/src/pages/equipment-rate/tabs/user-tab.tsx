/**
 * 사용자 분석 탭
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlotlyChart } from "@/components/ui/plotly-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, FlaskConical, Trophy } from "lucide-react";
import { Data, Layout } from "plotly.js";

interface UserTabProps {
  userBarChart: {
    data: Data[];
    layout?: Partial<Layout>;
  };
  methodPieChart: {
    data: Data[];
    layout?: Partial<Layout>;
  };
  rankingData: Array<{
    순위: number;
    시험자: string;
    "가동시간(h)": number;
    세션수: number;
  }>;
}

export function UserTab({ userBarChart, methodPieChart, rankingData }: UserTabProps) {
  return (
    <div className="space-y-6">
      {/* 사용자별 사용시간 & 분석법별 비율 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              사용자별 장비 사용 통계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: "400px" }}>
              <PlotlyChart data={userBarChart.data} layout={userBarChart.layout} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-purple-600" />
              분석법별 사용 비율
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: "400px" }}>
              <PlotlyChart data={methodPieChart.data} layout={methodPieChart.layout} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 사용자 랭킹 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            사용자 랭킹
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>순위</TableHead>
                  <TableHead>사용자</TableHead>
                  <TableHead>사용시간(h)</TableHead>
                  <TableHead>세션 수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingData.map((row, index) => (
                  <TableRow
                    key={index}
                    className={
                      row.순위 === 1
                        ? "bg-yellow-50 font-bold"
                        : row.순위 === 2
                        ? "bg-gray-50"
                        : row.순위 === 3
                        ? "bg-gray-100"
                        : ""
                    }
                  >
                    <TableCell>{row.순위}</TableCell>
                    <TableCell className="font-medium">{row.시험자}</TableCell>
                    <TableCell>{row["가동시간(h)"].toFixed(1)}</TableCell>
                    <TableCell>{row.세션수}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

