import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Clock, PowerOff } from "lucide-react";
import { formatTime } from "@/lib/date-utils";
import {
  useInstruments,
  STATUS_COLORS,
  GROUP_CLASSIFICATION,
  ROOM_CLASSIFICATION,
  collectDataNow,
  type Instrument,
} from "@/lib/cds-api";

export default function EquipmentStatus() {
  const [, setLocation] = useLocation();

  // 장비 목록 조회 (5초마다 자동 갱신) - 공통 훅 사용
  const {
    data: instrumentsData,
    isLoading: instrumentsLoading,
    error: instrumentsError,
    refetch: refetchInstruments,
  } = useInstruments(5000);

  const instruments = instrumentsData?.data || [];

  // 새로고침 함수 (수동 데이터 수집 후 갱신)
  const handleRefresh = async () => {
    // 수동 데이터 수집 (백그라운드 수집기와 동일한 API 사용)
    await collectDataNow();
    // 수집 완료 후 장비 데이터 새로고침
    setTimeout(() => {
      refetchInstruments();
    }, 1000);
  };

  // 그룹별 Running 상태 집계 계산
  const calculateGroupStats = () => {
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

  const groupStats = calculateGroupStats();

  // 실험실별 장비 필터링
  const getRoomInstruments = (roomName: string): Instrument[] => {
    const instrumentList = ROOM_CLASSIFICATION[roomName] || [];
    return instruments
      .filter((inst) => instrumentList.includes(inst.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // 장비 카드 생성 함수 (Python 버전과 동일한 스타일)
  const createInstrumentCard = (instrument: Instrument) => {
    const status = instrument.state.state;
    const statusColor = STATUS_COLORS[status] || "#6c757d";
    const currentRun = instrument.currentRun;
    const queuedAnalyses = instrument.workload?.totalQueuedAnalyses || 0;
    const sampleName = currentRun?.sampleName || "-";
    const owner = currentRun?.fullUserName || "-";
    const acquisitionMethod = currentRun?.acquisitionMethod || "-";

    // Running/PreRun 상태이고 작업 정보가 있으면 파란색 배경, 없으면 녹색 배경
    const hasWorkDetails = status === "Running" || status === "PreRun";
    const hasDetails = hasWorkDetails && (sampleName !== "-" || owner !== "-" || acquisitionMethod !== "-");
    const bgColor = hasDetails ? "#007bff" : (status === "Idle" ? "#28a745" : "#f8f9fa");

    return (
      <div
        key={instrument.name}
        className="border border-gray-300 rounded-md overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
        style={{ height: "100%" }}
      >
        {/* 상단: 장비 이름 및 상태 */}
        <div 
          className="flex justify-between items-center px-2 py-2 bg-gray-200"
          style={{ borderRadius: "4px 4px 0 0" }}
        >
          <div 
            className="font-bold text-sm text-gray-800 truncate mr-2"
            style={{ 
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {instrument.name}
          </div>
          <div className="flex items-center">
            {/* 상태 색상 박스 */}
            <div
              className="rounded mr-1"
              style={{
                backgroundColor: statusColor,
                width: "18px",
                height: "18px",
                borderRadius: "4px",
                marginRight: "5px"
              }}
            />
            {/* 상태 텍스트 */}
            <div 
              className="text-xs font-semibold text-gray-800 whitespace-nowrap"
            >
              {status}
            </div>
          </div>
        </div>

        {/* 작업 상세 정보 */}
        <div 
          className="px-2 pb-2 text-gray-800"
          style={{ 
            backgroundColor: bgColor,
            borderRadius: "0 0 4px 4px",
            minHeight: "30px",
            color: bgColor === "#007bff" || bgColor === "#28a745" ? "#fff" : "#333"
          }}
        >
          {hasDetails ? (
            <div className="space-y-1 text-xs">
              {acquisitionMethod !== "-" && (
                <div className="font-bold">{acquisitionMethod}</div>
              )}
              {sampleName !== "-" && (
                <div className="font-bold">샘플명: {sampleName}</div>
              )}
              {owner !== "-" && (
                <div className="font-bold">시험자: {owner}</div>
              )}
            </div>
          ) : (
            <div className="text-center py-1 text-sm">-</div>
          )}
          {queuedAnalyses > 0 && (
            <div className="text-xs mt-1">대기열: {queuedAnalyses}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => setLocation("/menu")}
        data-testid="button-back"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        메뉴로 돌아가기
      </Button>

      {/* 페이지 제목 */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-center mb-2" style={{ color: "#212530" }}>
          Instrument 모니터링 시스템
        </h2>
        <p className="text-sm text-muted-foreground text-center">
          실시간 업데이트 • 마지막 갱신: {formatTime(new Date())}
        </p>
      </div>

      {/* 로딩 상태 */}
      {instrumentsLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">장비 데이터를 불러오는 중...</p>
        </div>
      ) : instrumentsError ? (
        <Card className="border-red-200 bg-red-50 mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>장비 데이터를 불러오는데 실패했습니다. 다시 시도해주세요.</p>
            </div>
            <Button onClick={handleRefresh} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" /> 다시 시도
            </Button>
          </CardContent>
        </Card>
      ) : instruments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          등록된 장비가 없습니다
        </div>
      ) : (
        <>
          {/* 그룹별 상태 집계 카드 */}
          <div 
            className="mb-6 rounded-lg overflow-hidden border-2"
            style={{ 
              borderColor: "#007bff",
              boxShadow: "0 3px 6px rgba(0,0,0,0.1)"
            }}
          >
            {/* 헤더 */}
            <div 
              className="text-white font-bold text-xl py-3 text-center"
              style={{ backgroundColor: "#007bff" }}
            >
              장비 그룹별 가동 현황
            </div>
            {/* 게이지 바 영역 */}
            <div 
              className="bg-white p-6 flex flex-wrap justify-around items-center gap-4"
            >
              {Object.keys(GROUP_CLASSIFICATION).map((groupName) => {
                const stats = groupStats[groupName];
                const running = stats?.running || 0;
                const total = stats?.total || 0;
                const percentage = total > 0 ? (running / total) * 100 : 0;

                return (
                  <div key={groupName} className="flex items-center gap-2">
                    <span 
                      className="font-bold text-lg"
                      style={{ color: "#333", marginRight: "8px" }}
                    >
                      {groupName}:
                    </span>
                    {/* 게이지 바 */}
                    <div
                      className="relative border-2 rounded-lg overflow-hidden"
                      style={{
                        width: "280px",
                        height: "45px",
                        borderColor: "#333",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                      }}
                    >
                      {/* 배경 바 */}
                      <div
                        className="absolute inset-0"
                        style={{ backgroundColor: "#e9ecef" }}
                      />
                      {/* 진행 바 */}
                      <div
                        className="absolute inset-y-0 left-0 transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: "#28a745"
                        }}
                      />
                      {/* 텍스트 */}
                      <div
                        className="absolute inset-0 flex items-center justify-center font-bold text-lg z-10"
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
          </div>

          {/* 실험실별 섹션 */}
          <div className="space-y-4">
            {Object.keys(ROOM_CLASSIFICATION).map((roomName) => {
              const roomInstruments = getRoomInstruments(roomName);
              
              if (roomInstruments.length === 0) return null;

              return (
                <div
                  key={roomName}
                  className="rounded-lg overflow-hidden border mb-4"
                  style={{
                    borderColor: "#e6350c",
                    backgroundColor: "#f8f9fa"
                  }}
                >
                  {/* 섹션 헤더 */}
                  <h4
                    className="text-center font-bold py-2 mb-0"
                    style={{
                      color: "#e6350c",
                      backgroundColor: "#ffffff",
                      fontSize: "1.2rem",
                      letterSpacing: "0.05em"
                    }}
                  >
                    {roomName}
                  </h4>
                  {/* 장비 카드 그리드 */}
                  <div
                    className="p-4"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                      gap: "1rem"
                    }}
                  >
                    {roomInstruments.map((instrument) => createInstrumentCard(instrument))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
