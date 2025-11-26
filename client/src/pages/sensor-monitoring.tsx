import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Thermometer, Droplets, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface SensorData {
  name: string;
  value: number;
  unit: string;
  thresholds: Record<string, number>;
  alarmLevel: 'normal' | 'warning' | 'danger';
}

interface GroupedData {
  [highGroup: string]: {
    [room: string]: SensorData[];
  };
}

interface SensorsResponse {
  success: boolean;
  data: GroupedData;
  thresholds: Record<string, Record<string, number>>;
  timestamp: string;
}

// 레이아웃 설정 (Python 코드와 동일)
const LAYOUT_CONFIG = {
  top_section_height: 35,
  middle_section_height: 35,
  bottom_section_height: 30,
  top_section_rows: 5,
  middle_section_rows: 4,
  bottom_section_rows: 2,
  card_gap: "12px",
  section_margin: "0.1rem",
  section_padding: "0.3rem",
};

// 그룹별 방/장비 리스트 (Python 코드와 동일)
const ROOMS_BY_GROUP: Record<string, string[]> = {
  "미생물실": [
    "Incubator(1522)", "Incubator(2960)", "저온배양기2(2868)", "냉장고(미생물)2(2724)", "배지보관기(798)",
    "미생물실(320)", "미생물한도시험실(326)", "무균시험실(321)", "진탕배양기(989)", "Incubator(2044)",
    "냉장고(미생물)3", "소형배양기1"
  ],
  "시험실": [
    "이화학시험실(305)", "칭량실(308)", "시약보관실1(311)", "시약보관실2(367)",
    "일반기기실2(316)", "GC실(307)", "LC실1(303)", "LC실2(304)",
    "표준품보관실(309)", "검체냉장고(2378)", "냉장형필터시약장1(2946)",
    "표준품냉장고(1233)", "냉동고1(2047)", "보관검체냉장고1(2658)",
    "안정성챔버2(2732)", "DRY OVEN(663)", "감압건조기(904)", "회화로2(2726)"
  ],
  "안정성실": [
    "안정성챔버(905)", "안정성검체실(318)"
  ],
  "보관용 검체보관실": [
    "보관용검체보관실(349)"
  ],
  "검체채취실": [
    "B1F 검체채취실(B09)"
  ]
};

// 센서 카드 컴포넌트
function SensorCard({ title, sensors, useTwoLines = false }: { title: string; sensors: SensorData[]; useTwoLines?: boolean }) {
  if (!sensors || sensors.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-center text-[#a44] border-b border-[#a44] pb-1">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-4">
          <span className="text-gray-400">-</span>
        </CardContent>
      </Card>
    );
  }

  if (useTwoLines) {
    // 2줄 표시: 온도/습도별로 분리
    const tempSensors = sensors.filter(s => s.name.includes("온도"));
    const humiSensors = sensors.filter(s => s.name.includes("습도"));

    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-center text-[#a44] border-b border-[#a44] pb-1 bg-gray-50">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          {tempSensors.length > 0 && (
            <div className="flex justify-center gap-1 mb-1 flex-wrap">
              {tempSensors.map((sensor, idx) => (
                <SensorBadge key={idx} sensor={sensor} />
              ))}
            </div>
          )}
          {humiSensors.length > 0 && (
            <div className="flex justify-center gap-1 flex-wrap">
              {humiSensors.map((sensor, idx) => (
                <SensorBadge key={idx} sensor={sensor} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // 1줄 표시: 모든 센서를 한 줄에 나란히 정렬
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-center text-[#a44] border-b border-[#a44] pb-1 bg-gray-50">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="flex justify-center gap-1 flex-wrap overflow-hidden">
          {sensors.map((sensor, idx) => (
            <SensorBadge key={idx} sensor={sensor} compact />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 센서 배지 컴포넌트
function SensorBadge({ sensor, compact = false }: { sensor: SensorData; compact?: boolean }) {
  const { name, value, unit, alarmLevel } = sensor;
  const isTemp = name.includes("온도");
  
  let bgColor = "#fff";
  let textColor = isTemp ? "#d9534f" : "#0275d8";
  let animationClass = "";

  if (alarmLevel === 'danger') {
    bgColor = "#e6350c";
    textColor = "#ffffff";
    animationClass = "animate-blink";
  } else if (alarmLevel === 'warning') {
    bgColor = "#ff8040";
    textColor = "#ffffff";
    animationClass = "animate-blink";
  }

  const icon = isTemp ? <Thermometer className="w-3 h-3" /> : <Droplets className="w-3 h-3" />;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1 py-0.5 rounded text-xs font-semibold whitespace-nowrap transition-all ${animationClass}`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        fontSize: compact ? "0.75rem" : "0.8rem",
      }}
    >
      {icon}
      <span>{value.toFixed(2)} {unit}</span>
    </span>
  );
}

// 섹션 컴포넌트
function Section({ groupName, nRows, data }: { groupName: string; nRows: number; data: GroupedData }) {
  const roomList = ROOMS_BY_GROUP[groupName] || [];
  const nCols = Math.ceil(roomList.length / nRows);
  const useTwoLines = ["안정성실", "보관용 검체보관실", "검체채취실"].includes(groupName);

  return (
    <div className="w-full bg-gray-50 border-2 border-[#e6350c] rounded-xl p-1 min-w-0 h-full flex flex-col">
      <h4 className="text-center text-white bg-[#e6350c] rounded-t-lg py-2 mb-1 text-lg font-bold tracking-wide">
        {groupName}
      </h4>
      <div
        className="flex-1 grid min-h-0"
        style={{
          gridTemplateColumns: `repeat(${nCols}, 1fr)`,
          gridTemplateRows: `repeat(${nRows}, 1fr)`,
          gap: LAYOUT_CONFIG.card_gap,
        }}
      >
        {roomList.map((room) => (
          <SensorCard
            key={room}
            title={room}
            sensors={data[groupName]?.[room] || []}
            useTwoLines={useTwoLines}
          />
        ))}
      </div>
    </div>
  );
}

export default function SensorMonitoring() {
  const [, setLocation] = useLocation();
  const [connectionStatus, setConnectionStatus] = useState<"연결 중..." | "연결됨" | "연결 실패">("연결 중...");
  const [lastUpdate, setLastUpdate] = useState<string>("없음");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 센서 설정 조회
  const { data: settingsData } = useQuery({
    queryKey: ["/api/sensor-settings"],
    queryFn: async () => {
      const response = await fetch("/api/sensor-settings");
      if (!response.ok) throw new Error("설정 조회 실패");
      return response.json();
    },
  });

  // 설정 다이얼로그 열 때 현재 설정값 로드
  useEffect(() => {
    if (settingsOpen && settingsData?.data) {
      setUsername(settingsData.data.username || "");
      setPassword(""); // 비밀번호는 항상 빈 값으로 시작 (마스킹된 값이므로)
    }
  }, [settingsOpen, settingsData]);

  // 설정 저장 mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: { username: string; password: string }) => {
      const response = await fetch("/api/sensor-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("설정 저장 실패");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "설정 저장 완료",
        description: "센서 시스템 아이디/비밀번호가 저장되었습니다.",
      });
      setSettingsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/sensor-settings"] });
      // 센서 데이터도 다시 불러오기 (새로운 인증 정보로)
      queryClient.invalidateQueries({ queryKey: ["/api/sensors"] });
    },
    onError: (error: Error) => {
      toast({
        title: "설정 저장 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 센서 데이터 조회 (1분 주기)
  const { data, isLoading, error } = useQuery<SensorsResponse>({
    queryKey: ["/api/sensors"],
    queryFn: async () => {
      const response = await fetch("/api/sensors");
      if (!response.ok) throw new Error("센서 데이터 조회 실패");
      return response.json();
    },
    refetchInterval: 60 * 1000, // 1분
    retry: 3,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (data) {
      setConnectionStatus("연결됨");
      setLastUpdate(new Date(data.timestamp).toLocaleTimeString('ko-KR'));
    } else if (error) {
      setConnectionStatus("연결 실패");
    }
  }, [data, error]);

  const groupedData: GroupedData = data?.data || {};

  return (
    <div className="h-screen bg-gradient-to-b from-[#E31E24] to-[#FFB3B3] flex flex-col overflow-hidden">
      {/* 헤더 */}
      <header className="bg-white border-b-[3px] border-[#E31E24] shadow-sm flex-shrink-0">
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
          <div className="flex items-center gap-4">
            {/* 연결 상태 표시 */}
            <div className="flex items-center gap-2">
              <div
                className={`px-2 py-1 rounded text-xs font-bold ${
                  connectionStatus === "연결됨"
                    ? "bg-green-100 text-green-800 border border-green-300"
                    : connectionStatus === "연결 실패"
                    ? "bg-red-100 text-red-800 border border-red-300"
                    : "bg-yellow-100 text-yellow-800 border border-yellow-300"
                }`}
              >
                {connectionStatus}
              </div>
              <div className="text-xs text-gray-600">
                마지막 업데이트: {lastUpdate}
              </div>
            </div>
            
            {/* 설정 버튼 */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white text-[#E31E24] border border-[#E31E24] hover:bg-[#E31E24] hover:text-white"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>센서 시스템 설정</DialogTitle>
                  <DialogDescription>
                    센서 데이터 수집을 위한 아이디와 비밀번호를 설정하세요.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="username">아이디</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="10077:-:Korea Standard Time,UTC+09:00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">비밀번호</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호를 입력하세요"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setSettingsOpen(false)}
                  >
                    취소
                  </Button>
                  <Button
                    onClick={() => {
                      if (!username || !password) {
                        toast({
                          title: "입력 오류",
                          description: "아이디와 비밀번호를 모두 입력하세요.",
                          variant: "destructive",
                        });
                        return;
                      }
                      saveSettingsMutation.mutate({ username, password });
                    }}
                    disabled={saveSettingsMutation.isPending}
                  >
                    {saveSettingsMutation.isPending ? "저장 중..." : "저장"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button
              variant="ghost"
              className="bg-white text-[#E31E24] border-2 border-[#E31E24] hover:bg-[#E31E24] hover:text-white"
              onClick={() => setLocation("/menu")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              관리메뉴로
            </Button>
          </div>
        </div>
      </header>

      {/* 대시보드 본문 */}
      <div className="flex-1 p-1 overflow-hidden min-h-0">
        <div className="h-full flex flex-col">
          {/* 제목 */}
          <div className="text-center mb-1 flex-shrink-0">
            <h2 className="text-2xl font-bold text-white mb-1">
              온습도 모니터링
            </h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-white text-lg">데이터 로딩 중...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-red-200 text-lg">데이터를 불러올 수 없습니다.</div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-1 overflow-hidden min-h-0">
              {/* 상단 섹션: 시험실 */}
              <div className="min-h-0 flex-shrink-0" style={{ height: `${LAYOUT_CONFIG.top_section_height}%`, marginBottom: LAYOUT_CONFIG.section_margin }}>
                <Section groupName="시험실" nRows={LAYOUT_CONFIG.top_section_rows} data={groupedData} />
              </div>

              {/* 중간 섹션: 미생물실 */}
              <div className="min-h-0 flex-shrink-0" style={{ height: `${LAYOUT_CONFIG.middle_section_height}%`, marginBottom: LAYOUT_CONFIG.section_margin }}>
                <Section groupName="미생물실" nRows={LAYOUT_CONFIG.middle_section_rows} data={groupedData} />
              </div>

              {/* 하단 섹션: 안정성실, 보관용 검체보관실, 검체채취실 */}
              <div className="flex gap-1 min-h-0 flex-1 flex-shrink-0" style={{ height: `${LAYOUT_CONFIG.bottom_section_height}%`, padding: `${LAYOUT_CONFIG.section_padding} 0` }}>
                <div className="flex-1 min-w-0">
                  <Section groupName="안정성실" nRows={LAYOUT_CONFIG.bottom_section_rows} data={groupedData} />
                </div>
                <div className="flex-1 min-w-0">
                  <Section groupName="보관용 검체보관실" nRows={LAYOUT_CONFIG.bottom_section_rows} data={groupedData} />
                </div>
                <div className="flex-1 min-w-0">
                  <Section groupName="검체채취실" nRows={LAYOUT_CONFIG.bottom_section_rows} data={groupedData} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 점멸 애니메이션 CSS */}
      <style>{`
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
        .animate-blink {
          animation: blink 1s infinite;
        }
      `}</style>
    </div>
  );
}

