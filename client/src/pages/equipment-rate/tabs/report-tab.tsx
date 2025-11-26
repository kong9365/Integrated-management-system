/**
 * 자동 보고서 탭
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertBox } from "@/components/ui/alert-box";
import { FileText, Loader2, Bot, BarChart3, Database } from "lucide-react";

interface ReportTabProps {
  onGenerateReport?: (options: {
    type: "weekly" | "monthly" | "quarterly" | "yearly";
    includeAI: boolean;
    includeCharts: boolean;
    includeData: boolean;
  }) => Promise<string>;
}

export function ReportTab({ onGenerateReport }: ReportTabProps) {
  const [reportType, setReportType] = useState<"weekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [includeAI, setIncludeAI] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeData, setIncludeData] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setAiInsights(null);

    try {
      if (onGenerateReport) {
        const insights = await onGenerateReport({
          type: reportType,
          includeAI,
          includeCharts,
          includeData,
        });
        setAiInsights(insights);
      } else {
        // 기본 동작
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setAiInsights("보고서 생성 기능은 서버 API와 연동되어야 합니다.");
      }
    } catch (error) {
      setAiInsights(`오류 발생: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 보고서 생성 설정 */}
        <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              보고서 생성 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-3 block">보고서 유형:</Label>
              <RadioGroup value={reportType} onValueChange={(v) => setReportType(v as any)}>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly" className="cursor-pointer">
                    주간 운영 요약
                  </Label>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="cursor-pointer">
                    월간 운영 리포트
                  </Label>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="quarterly" id="quarterly" />
                  <Label htmlFor="quarterly" className="cursor-pointer">
                    분기별 투자 효율성 분석
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yearly" id="yearly" />
                  <Label htmlFor="yearly" className="cursor-pointer">
                    연간 종합 보고서
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block">보고서 옵션:</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-ai"
                    checked={includeAI}
                    onCheckedChange={(checked) => setIncludeAI(checked === true)}
                  />
                  <Label htmlFor="include-ai" className="cursor-pointer flex items-center gap-2">
                    <Bot className="h-4 w-4 text-purple-600" />
                    AI 인사이트 포함
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-charts"
                    checked={includeCharts}
                    onCheckedChange={(checked) => setIncludeCharts(checked === true)}
                  />
                  <Label htmlFor="include-charts" className="cursor-pointer flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    상세 차트 포함
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-data"
                    checked={includeData}
                    onCheckedChange={(checked) => setIncludeData(checked === true)}
                  />
                  <Label htmlFor="include-data" className="cursor-pointer flex items-center gap-2">
                    <Database className="h-4 w-4 text-green-600" />
                    Raw 데이터 첨부
                  </Label>
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  보고서 생성
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* AI 인사이트 미리보기 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-600" />
              AI 분석 인사이트
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[400px]">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                  <p className="text-gray-600">AI 분석 중...</p>
                </div>
              ) : aiInsights ? (
                <div className="space-y-4">
                  <AlertBox type="info" title="AI 분석 결과">
                    <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">
                      {aiInsights}
                    </pre>
                  </AlertBox>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 italic">
                  보고서 생성 버튼을 클릭하면 AI 분석이 시작됩니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

