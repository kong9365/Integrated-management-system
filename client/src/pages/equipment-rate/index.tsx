/**
 * 시험장비 가동률 페이지 - 새로운 6개 탭 구조
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  RefreshCw, 
  Activity, 
  Calendar, 
  Wrench, 
  User, 
  FlaskConical,
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  MonitorSpeaker,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lightbulb
} from "lucide-react";
import { subDays, format } from "date-fns";
import { DatePickerWithRange } from "@/components/ui/date-picker-range";
import { collectDataNow, useInstruments, GROUP_CLASSIFICATION } from "@/lib/cds-api";

// 탭 컴포넌트
import { RealtimeTab } from "./tabs/realtime-tab";
import { UtilizationTab } from "./tabs/utilization-tab";
import { ROITab } from "./tabs/roi-tab";
import { UserTab } from "./tabs/user-tab";
import { DataTab } from "./tabs/data-tab";
import { ReportTab } from "./tabs/report-tab";

// 차트 데이터 생성 유틸리티
import {
  createEquipmentBarChart,
  createTrendLineChart,
  createUserBarChart,
  createMethodPieChart,
  createROIScatterChart,
  getDefaultEquipmentCosts,
} from "./utils/chart-data";

// 컴포넌트
import { CostUploadDialog } from "./components/cost-upload-dialog";
import { AnalysisMappingDialog } from "./components/analysis-mapping-dialog";

interface SessionRecord {
  집계일자: string;
  장비: string;
  시험자: string;
  acquisitionMethod: string;
  샘플명: string;
  가동시간_h: number;
  세션시작?: string;
  세션종료?: string;
}

interface UtilizationResponse {
  success: boolean;
  data: SessionRecord[];
  count: number;
}

interface StatsResponse {
  success: boolean;
  data: {
    equipmentRanking: Array<{ 순위: number; 장비: string; 가동시간_h: number }>;
    userRanking: Array<{ 순위: number; 시험자: string; 가동시간_h: number }>;
  };
}

interface OptionsResponse {
  success: boolean;
  data: {
    equipment: Array<{ label: string; value: string }>;
    users: Array<{ label: string; value: string }>;
    analysis: Array<{ label: string; value: string }>;
    products?: Array<{ label: string; value: string }>;
    timeperiods?: Array<{ label: string; value: string }>;
  };
}

type TabType = "realtime" | "utilization" | "roi" | "user" | "data" | "report";

export default function EquipmentRate() {
  const [, setLocation] = useLocation();
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedTimeperiods, setSelectedTimeperiods] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState<TabType>("realtime");

  // 필터 옵션 조회
  const { data: optionsData } = useQuery<OptionsResponse>({
    queryKey: ["cds-utilization-options"],
    queryFn: async () => {
      const response = await fetch("/api/cds/utilization/options");
      if (!response.ok) {
        throw new Error("필터 옵션을 가져오는데 실패했습니다");
      }
      return response.json();
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // 실시간 장비 상태 조회 (30초마다)
  const { data: instrumentsData } = useInstruments(30000);

  // 가동률 데이터 조회 (30초마다)
  const { data: utilizationData, isLoading, refetch } = useQuery<UtilizationResponse>({
    queryKey: [
      "cds-utilization",
      dateRange.from,
      dateRange.to,
      selectedEquipment,
      selectedUsers,
      selectedAnalysis,
      selectedProducts,
      selectedTimeperiods,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) {
        params.append("startDate", format(dateRange.from, "yyyy-MM-dd"));
      }
      if (dateRange.to) {
        params.append("endDate", format(dateRange.to, "yyyy-MM-dd"));
      }
      if (selectedEquipment.length > 0) {
        selectedEquipment.forEach((eq) => params.append("equipment", eq));
      }
      if (selectedUsers.length > 0) {
        selectedUsers.forEach((user) => params.append("user", user));
      }
      if (selectedAnalysis.length > 0) {
        selectedAnalysis.forEach((analysis) => params.append("analysis", analysis));
      }
      if (selectedProducts.length > 0) {
        selectedProducts.forEach((product) => params.append("product", product));
      }
      if (selectedTimeperiods.length > 0) {
        selectedTimeperiods.forEach((tp) => params.append("timeperiod", tp));
      }

      const response = await fetch(`/api/cds/utilization?${params.toString()}`);
      if (!response.ok) {
        throw new Error("가동률 데이터를 가져오는데 실패했습니다");
      }
      return response.json();
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 30000, // 30초마다 자동 갱신
  });

  // 통계 데이터 조회
  const { data: statsData, refetch: refetchStats } = useQuery<StatsResponse>({
    queryKey: [
      "cds-utilization-stats",
      dateRange.from,
      dateRange.to,
      selectedEquipment,
      selectedUsers,
      selectedAnalysis,
      selectedProducts,
      selectedTimeperiods,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) {
        params.append("startDate", format(dateRange.from, "yyyy-MM-dd"));
      }
      if (dateRange.to) {
        params.append("endDate", format(dateRange.to, "yyyy-MM-dd"));
      }
      if (selectedEquipment.length > 0) {
        selectedEquipment.forEach((eq) => params.append("equipment", eq));
      }
      if (selectedUsers.length > 0) {
        selectedUsers.forEach((user) => params.append("user", user));
      }
      if (selectedAnalysis.length > 0) {
        selectedAnalysis.forEach((analysis) => params.append("analysis", analysis));
      }
      if (selectedProducts.length > 0) {
        selectedProducts.forEach((product) => params.append("product", product));
      }
      if (selectedTimeperiods.length > 0) {
        selectedTimeperiods.forEach((tp) => params.append("timeperiod", tp));
      }

      const response = await fetch(`/api/cds/utilization/stats?${params.toString()}`);
      if (!response.ok) {
        throw new Error("통계 데이터를 가져오는데 실패했습니다");
      }
      return response.json();
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const sessions = utilizationData?.data || [];
  const instruments = instrumentsData?.data || [];

  // 수동 데이터 수집 함수
  const handleManualCollect = async () => {
    const success = await collectDataNow();
    if (success) {
      setTimeout(() => {
        refetch();
        refetchStats();
      }, 1000);
    }
  };

  // 필터 전체 선택/해제
  const handleSelectAll = (type: "equipment" | "user" | "analysis" | "product" | "timeperiod") => {
    if (!optionsData?.data) return;
    if (type === "equipment") {
      setSelectedEquipment(optionsData.data.equipment.map((eq) => eq.value));
    } else if (type === "user") {
      setSelectedUsers(optionsData.data.users.map((user) => user.value));
    } else if (type === "analysis") {
      setSelectedAnalysis(optionsData.data.analysis.map((analysis) => analysis.value));
    } else if (type === "product" && optionsData.data.products) {
      setSelectedProducts(optionsData.data.products.map((product) => product.value));
    } else if (type === "timeperiod" && optionsData.data.timeperiods) {
      setSelectedTimeperiods(optionsData.data.timeperiods.map((tp) => tp.value));
    }
  };

  const handleDeselectAll = (type: "equipment" | "user" | "analysis" | "product" | "timeperiod") => {
    if (type === "equipment") {
      setSelectedEquipment([]);
    } else if (type === "user") {
      setSelectedUsers([]);
    } else if (type === "analysis") {
      setSelectedAnalysis([]);
    } else if (type === "product") {
      setSelectedProducts([]);
    } else if (type === "timeperiod") {
      setSelectedTimeperiods([]);
    }
  };

  // KPI 데이터 계산
  const calculateKPI = () => {
    if (sessions.length === 0) {
      return {
        totalUtilization: 0,
        activeEquipment: 0,
        todayHours: 0,
        monthlyUtilization: 0,
      };
    }

    const today = new Date().toISOString().split("T")[0];
    const todaySessions = sessions.filter((s) => s.집계일자 === today);
    const todayHours = todaySessions.reduce((sum, s) => sum + s.가동시간_h, 0);

    const uniqueDates = new Set(sessions.map((s) => s.집계일자)).size;
    const uniqueEquipment = new Set(sessions.map((s) => s.장비)).size;
    const totalPossibleHours = uniqueDates * uniqueEquipment * 24;
    const totalUsedHours = sessions.reduce((sum, s) => sum + s.가동시간_h, 0);
    const totalUtilization = totalPossibleHours > 0 ? (totalUsedHours / totalPossibleHours) * 100 : 0;

    const currentMonth = new Date().getMonth();
    const monthSessions = sessions.filter((s) => {
      const sessionMonth = new Date(s.집계일자).getMonth();
      return sessionMonth === currentMonth;
    });
    const monthDays = new Date().getDate();
    const monthPossibleHours = monthDays * uniqueEquipment * 24;
    const monthUsedHours = monthSessions.reduce((sum, s) => sum + s.가동시간_h, 0);
    const monthlyUtilization = monthPossibleHours > 0 ? (monthUsedHours / monthPossibleHours) * 100 : 0;

    const activeEquipment = instruments.filter(
      (inst) => inst.state.state === "Running" || inst.state.state === "PreRun"
    ).length;

    return {
      totalUtilization: Math.round(totalUtilization * 10) / 10,
      activeEquipment,
      todayHours: Math.round(todayHours * 10) / 10,
      monthlyUtilization: Math.round(monthlyUtilization * 10) / 10,
    };
  };

  const kpiData = calculateKPI();

  // 장비 타입별 통계 계산
  const calculateEquipmentTypeStats = () => {
    const groupStats: Record<string, { running: number; total: number }> = {};
    
    Object.keys(GROUP_CLASSIFICATION).forEach((groupName) => {
      const instrumentList = GROUP_CLASSIFICATION[groupName];
      const total = instrumentList.length;
      const running = instruments.filter(
        (inst) => 
          instrumentList.includes(inst.name) && 
          (inst.state.state === "Running" || inst.state.state === "PreRun")
      ).length;
      
      groupStats[groupName] = { running, total };
    });
    
    return groupStats;
  };

  const equipmentTypeStats = calculateEquipmentTypeStats();

  // 실시간 장비 상태 변환
  const equipmentStatus = instruments.map((inst) => ({
    장비: inst.name,
    상태: inst.state.state,
    사용자: inst.currentRun?.fullUserName,
    샘플: inst.currentRun?.sampleName,
    분석법: inst.currentRun?.acquisitionMethod,
  }));

  // 알림 생성
  const generateAlerts = () => {
    const alerts: Array<{ type: "info" | "warning" | "danger" | "success"; message: string }> = [];

    // 저가동률 장비 확인
    const uniqueDates = new Set(sessions.map((s) => s.집계일자)).size;
    const equipmentUtil = sessions.reduce((acc, s) => {
      if (!acc[s.장비]) acc[s.장비] = 0;
      acc[s.장비] += s.가동시간_h;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(equipmentUtil).forEach(([equipment, hours]) => {
      const utilization = (hours / (uniqueDates * 24)) * 100;
      if (utilization < 30) {
        alerts.push({
          type: "warning",
          message: `저가동률 장비: ${equipment} (${utilization.toFixed(1)}%) - 유지보수 계약 재검토 권장`,
        });
      }
    });

    if (alerts.length === 0) {
      alerts.push({
        type: "info",
        message: "현재 특별한 알림이 없습니다.",
      });
    }

    return alerts;
  };

  const alerts = generateAlerts();

  // 차트 데이터 생성
  const equipmentBarChart = createEquipmentBarChart(sessions, dateRange);
  const trendChart = createTrendLineChart(sessions, dateRange);
  const userBarChart = createUserBarChart(sessions, dateRange);
  const methodPieChart = createMethodPieChart(sessions, dateRange);

  // 유지보수 비용 조회
  const { data: costsData } = useQuery<{ success: boolean; data: Record<string, number> }>({
    queryKey: ["equipment-costs"],
    queryFn: async () => {
      const response = await fetch("/api/cds/equipment-costs");
      if (!response.ok) {
        // 기본값 사용
        return { success: true, data: getDefaultEquipmentCosts() };
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });

  // ROI 데이터 생성
  const equipmentCosts = costsData?.data || getDefaultEquipmentCosts();
  const roiScatterChart = createROIScatterChart(sessions, equipmentCosts, dateRange);

  // ROI 테이블 데이터
  const uniqueDates = new Set(sessions.map((s) => s.집계일자)).size;
  const days = uniqueDates || 1;
  const equipmentUsage = sessions.reduce((acc, session) => {
    if (!acc[session.장비]) acc[session.장비] = 0;
    acc[session.장비] += session.가동시간_h;
    return acc;
  }, {} as Record<string, number>);

  const roiTableData = Object.entries(equipmentUsage).map(([장비, 가동시간_h]) => {
    const 가동률 = (가동시간_h / (days * 24)) * 100;
    const 연간비용 = equipmentCosts[장비] || 10000000;
    const 시간당비용 = 가동시간_h > 0 ? Math.round(연간비용 / 가동시간_h) : 0;

    let 권장사항 = "계약 유지";
    if (가동률 < 30) {
      권장사항 = "미계약 권장";
    } else if (가동률 < 70) {
      권장사항 = "재검토 권장";
    }

    return {
      장비,
      "가동률(%)": Math.round(가동률 * 10) / 10,
      "연간비용(만원)": Math.round(연간비용 / 10000),
      "시간당비용(원)": 시간당비용,
      권장사항,
    };
  });

  const maintainCount = roiTableData.filter((r) => r.권장사항 === "✅ 계약 유지").length;
  const reviewCount = roiTableData.filter((r) => r.권장사항 === "⚠️ 재검토 권장").length;
  const cancelCount = roiTableData.filter((r) => r.권장사항 === "🔴 미계약 권장").length;
  const totalCost = roiTableData.reduce((sum, r) => sum + r["연간비용(만원)"], 0);
  const potentialSavings = roiTableData
    .filter((r) => r.권장사항 === "🔴 미계약 권장")
    .reduce((sum, r) => sum + r["연간비용(만원)"], 0);

  const roiRecommendations = {
    totalEquipment: roiTableData.length,
    totalCost,
    maintainCount,
    reviewCount,
    cancelCount,
    potentialSavings,
  };

  // 사용자 랭킹 데이터
  const userRankingData = statsData?.data.userRanking.map((r) => {
    const userSessions = sessions.filter((s) => s.시험자 === r.시험자);
    return {
      순위: r.순위,
      시험자: r.시험자,
      "가동시간(h)": r.가동시간_h,
      세션수: userSessions.length,
    };
  }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E31E24] to-[#FFB3B3]">
      {/* 헤더 */}
      <header className="bg-white border-b-[3px] border-[#E31E24] shadow-sm">
        <div className="px-6 md:px-12 py-2.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src="https://www.ekdp.com/static/cw/images/renewal/logo1.png" 
              alt="광동제약" 
              className="h-[50px] w-auto"
              style={{
                filter: "brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(7404%) hue-rotate(353deg) brightness(95%) contrast(89%)"
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <h1 className="text-xl md:text-2xl font-bold text-[#E31E24]">
              품질관리팀 통합 관리 시스템
            </h1>
          </div>
          <Button
            variant="ghost"
            className="bg-white text-[#E31E24] border-2 border-[#E31E24] hover:bg-[#E31E24] hover:text-white"
            onClick={() => setLocation("/menu")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            메뉴로 돌아가기
          </Button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-80px)]">
        {/* 사이드바 */}
        <div className="w-64 min-w-[250px] bg-white/95 backdrop-blur-sm border-r border-gray-200 p-5 shadow-sm overflow-y-auto">
          {/* 실시간 상태 */}
          <div className="mb-5">
            <label className="block font-bold mb-2 text-sm text-gray-700 flex items-center gap-2">
              <Activity className="h-4 w-4 text-red-600" />
              시스템 상태:
            </label>
            <div className="text-sm text-gray-600 flex items-center gap-2">
              {isLoading ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                  로딩 중...
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  시스템 활성 - {sessions.length}건 세션
                </>
              )}
            </div>
          </div>

          <hr className="my-5" />

          {/* 날짜 선택 */}
          <div className="mb-5">
            <label className="block font-bold mb-2 text-sm text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              분석 기간:
            </label>
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          </div>

          {/* 장비 선택 */}
          <div className="mb-5">
            <label className="block font-bold mb-2 text-sm text-gray-700 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-gray-700" />
              장비 필터:
            </label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 mb-2">
              {optionsData?.data.equipment.map((eq) => (
                <div key={eq.value} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={`eq-${eq.value}`}
                    checked={selectedEquipment.includes(eq.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedEquipment([...selectedEquipment, eq.value]);
                      } else {
                        setSelectedEquipment(selectedEquipment.filter((v) => v !== eq.value));
                      }
                    }}
                  />
                  <label htmlFor={`eq-${eq.value}`} className="text-sm cursor-pointer flex-1">
                    {eq.label}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-6" onClick={() => handleSelectAll("equipment")}>
                전체 선택
              </Button>
              <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-6" onClick={() => handleDeselectAll("equipment")}>
                선택 해제
              </Button>
            </div>
          </div>

          {/* 사용자 선택 */}
          <div className="mb-5">
            <label className="block font-bold mb-2 text-sm text-gray-700 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              사용자 필터:
            </label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 mb-2">
              {optionsData?.data.users.map((user) => (
                <div key={user.value} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={`user-${user.value}`}
                    checked={selectedUsers.includes(user.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedUsers([...selectedUsers, user.value]);
                      } else {
                        setSelectedUsers(selectedUsers.filter((v) => v !== user.value));
                      }
                    }}
                  />
                  <label htmlFor={`user-${user.value}`} className="text-sm cursor-pointer flex-1">
                    {user.label}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-6" onClick={() => handleSelectAll("user")}>
                전체 선택
              </Button>
              <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-6" onClick={() => handleDeselectAll("user")}>
                선택 해제
              </Button>
            </div>
          </div>

          {/* 분석법 선택 */}
          <div className="mb-5">
            <label className="block font-bold mb-2 text-sm text-gray-700 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-purple-600" />
              분석법 필터:
            </label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 mb-2">
              {optionsData?.data.analysis.map((analysis) => (
                <div key={analysis.value} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={`analysis-${analysis.value}`}
                    checked={selectedAnalysis.includes(analysis.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedAnalysis([...selectedAnalysis, analysis.value]);
                      } else {
                        setSelectedAnalysis(selectedAnalysis.filter((v) => v !== analysis.value));
                      }
                    }}
                  />
                  <label htmlFor={`analysis-${analysis.value}`} className="text-sm cursor-pointer flex-1">
                    {analysis.label}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-6" onClick={() => handleSelectAll("analysis")}>
                전체 선택
              </Button>
              <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-6" onClick={() => handleDeselectAll("analysis")}>
                선택 해제
              </Button>
            </div>
          </div>

          <hr className="my-5" />

          {/* 분석법 매핑 관리 버튼 */}
          <AnalysisMappingDialog />

          {/* 유지보수 비용 관리 버튼 */}
          <CostUploadDialog />

          {/* 수동 수집 버튼 */}
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold mt-3" onClick={handleManualCollect} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            수동 수집
          </Button>
        </div>

        {/* 메인 콘텐츠 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 탭 네비게이션 */}
          <div className="bg-white border-b border-gray-200">
            <div className="flex">
              {(
                [
                  { id: "realtime", label: "실시간 모니터링", icon: MonitorSpeaker },
                  { id: "utilization", label: "가동률 분석", icon: BarChart3 },
                  { id: "roi", label: "투자 효율성", icon: DollarSign },
                  { id: "user", label: "사용자 분석", icon: Users },
                  { id: "data", label: "상세 데이터", icon: FileText },
                  { id: "report", label: "자동 보고서", icon: FileText },
                ] as Array<{ id: TabType; label: string; icon: typeof MonitorSpeaker }>
              ).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    className={`px-5 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600 bg-gray-50"
                        : "border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="flex-1 overflow-y-auto bg-white/95 backdrop-blur-sm p-5 rounded-tl-lg shadow-lg">
            {activeTab === "realtime" && (
              <RealtimeTab 
                kpiData={kpiData} 
                equipmentStatus={equipmentStatus} 
                alerts={alerts}
                equipmentTypeStats={equipmentTypeStats}
              />
            )}
            {activeTab === "utilization" && (
              <UtilizationTab
                equipmentBarChart={equipmentBarChart}
                trendChart={trendChart}
              />
            )}
            {activeTab === "roi" && (
              <ROITab
                scatterChart={roiScatterChart}
                roiTableData={roiTableData}
                recommendations={roiRecommendations}
              />
            )}
            {activeTab === "user" && (
              <UserTab
                userBarChart={userBarChart}
                methodPieChart={methodPieChart}
                rankingData={userRankingData}
              />
            )}
            {activeTab === "data" && (
              <DataTab
                data={sessions.map((s) => ({
                  집계일자: s.집계일자,
                  장비: s.장비,
                  시험자: s.시험자,
                  acquisitionMethod: s.acquisitionMethod,
                  샘플명: s.샘플명,
                  "가동시간(h)": s.가동시간_h,
                  세션시작: s.세션시작,
                  세션종료: s.세션종료,
                }))}
              />
            )}
            {activeTab === "report" && (
              <ReportTab
                onGenerateReport={async (options) => {
                  // 데이터 요약 생성
                  const totalEquipment = new Set(sessions.map((s) => s.장비)).size;
                  const totalHours = sessions.reduce((sum, s) => sum + s.가동시간_h, 0);
                  const equipmentSummary = Object.entries(
                    sessions.reduce((acc, s) => {
                      if (!acc[s.장비]) acc[s.장비] = 0;
                      acc[s.장비] += s.가동시간_h;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([equipment, hours]) => `${equipment}: ${hours.toFixed(1)}h`)
                    .join("\n");

                  const dataSummary = `보고서 유형: ${options.type}
분석 기간: ${format(dateRange.from, "yyyy-MM-dd")} ~ ${format(dateRange.to, "yyyy-MM-dd")}
총 장비 수: ${totalEquipment}대
총 사용시간: ${totalHours.toFixed(1)}시간

상위 5개 장비:
${equipmentSummary}`;

                  const response = await fetch("/api/cds/ai-report", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      reportType: options.type,
                      dataSummary,
                      options,
                    }),
                  });

                  if (!response.ok) {
                    throw new Error("AI 보고서 생성에 실패했습니다");
                  }

                  const result = await response.json();
                  return result.data.insights;
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

