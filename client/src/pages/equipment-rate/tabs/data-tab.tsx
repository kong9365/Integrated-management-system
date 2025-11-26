/**
 * 상세 데이터 탭
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

interface DataTabProps {
  data: Array<{
    집계일자: string;
    장비: string;
    시험자: string;
    acquisitionMethod: string;
    샘플명: string;
    "가동시간(h)": number;
    세션시작?: string;
    세션종료?: string;
  }>;
  onExport?: (format: "xlsx" | "csv") => void;
}

export function DataTab({ data, onExport }: DataTabProps) {
  const handleExport = (format: "xlsx" | "csv") => {
    if (onExport) {
      onExport(format);
    } else {
      // 기본 내보내기 로직
      const headers = ["날짜", "장비", "사용자", "분석법", "샘플명", "사용시간(h)", "시작시간", "종료시간"];
      const rows = data.map((row) => [
        row.집계일자,
        row.장비,
        row.시험자,
        row.acquisitionMethod,
        row.샘플명,
        row["가동시간(h)"],
        row.세션시작 || "",
        row.세션종료 || "",
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `equipment-data-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          장비 사용 상세 데이터
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download className="mr-2 h-4 w-4" />
            CSV 내보내기
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")}>
            <Download className="mr-2 h-4 w-4" />
            Excel 내보내기
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-[70vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>날짜</TableHead>
                <TableHead>장비</TableHead>
                <TableHead>사용자</TableHead>
                <TableHead>분석법</TableHead>
                <TableHead>샘플명</TableHead>
                <TableHead>사용시간(h)</TableHead>
                <TableHead>시작시간</TableHead>
                <TableHead>종료시간</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.집계일자}</TableCell>
                  <TableCell className="font-medium">{row.장비}</TableCell>
                  <TableCell>{row.시험자 || "-"}</TableCell>
                  <TableCell>{row.acquisitionMethod || "-"}</TableCell>
                  <TableCell>{row.샘플명 || "-"}</TableCell>
                  <TableCell>{row["가동시간(h)"].toFixed(2)}</TableCell>
                  <TableCell>{row.세션시작 || "-"}</TableCell>
                  <TableCell>{row.세션종료 || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

