import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  UserCheck, 
  BarChart3, 
  Activity, 
  Calendar, 
  ArrowLeft,
  Gauge,
  ExternalLink,
  Link as LinkIcon
} from "lucide-react";
import { useStats } from "@/lib/cds-api";
import { useQuery } from "@tanstack/react-query";

interface MenuModule {
  id: string;
  icon: typeof UserCheck;
  title: string;
  description: string;
  status: string;
  path: string;
}

const modules: MenuModule[] = [
  {
    id: "reservation",
    icon: Calendar,
    title: "시험장비 예약",
    description: "장비 예약 신청 및 일정을 관리합니다",
    status: "금일 예약: 18건",
    path: "/reservation",
  },
  {
    id: "visitors",
    icon: UserCheck,
    title: "외부인 출입관리",
    description: "방문자 사전예약, 등록 및 출입 현황을 관리합니다",
    status: "방문 현황: 8명 대기",
    path: "/visitors",
  },
  {
    id: "equipment-rate",
    icon: BarChart3,
    title: "시험장비 모니터링",
    description: "장비별 가동현황 및 가동률 모니터링 및 분석 자료를 확인합니다",
    status: "평균 가동률: 87%",
    path: "/equipment-rate",
  },
  {
    id: "equipment-status",
    icon: Activity,
    title: "시험장비 가동현황(삭제예정)",
    description: "실시간 장비 사용 현황을 모니터링합니다",
    status: "가동중: 12대 / 전체: 15대",
    path: "/equipment-status",
  },
  {
    id: "sensor-monitoring",
    icon: Gauge,
    title: "온습도 모니터링",
    description: "실시간 온도 및 습도 센서 데이터를 모니터링합니다",
    status: "실시간 모니터링",
    path: "/sensor-monitoring",
  },
];

interface Reservation {
  id: string;
  reservationDate: string;
  status: string;
}

interface ExternalLinkItem {
  id: string;
  name: string;
  url: string;
  description?: string;
  icon?: typeof BarChart3;
}

// 외부 링크 목록
const externalLinks: ExternalLinkItem[] = [
  {
    id: "tableau",
    name: "Tableau 대시보드",
    url: "http://tableau.ekdp.com/#/signin",
    description: "데이터 분석 및 시각화 대시보드",
    icon: BarChart3,
  },
  // 향후 추가될 외부 링크들을 여기에 추가
];

export default function Menu() {
  const [, setLocation] = useLocation();
  const [externalLinksOpen, setExternalLinksOpen] = useState(false);
  
  // 장비 통계 데이터 조회 (5초마다 자동 갱신)
  const { data: statsData, isLoading: statsLoading } = useStats(5000);
  
  // 예약 데이터 조회 (5초마다 자동 갱신)
  const { data: reservations = [], isLoading: reservationsLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/reservations"],
    queryFn: async () => {
      const response = await fetch("/api/reservations");
      if (!response.ok) throw new Error("예약 데이터 조회 실패");
      return response.json();
    },
    refetchInterval: 5000,
  });

  // 방문자 데이터 조회 (5초마다 자동 갱신)
  interface Visitor {
    id: string;
    status: string;
  }

  const { data: visitors = [], isLoading: visitorsLoading } = useQuery<Visitor[]>({
    queryKey: ["/api/visitors"],
    queryFn: async () => {
      const response = await fetch("/api/visitors");
      if (!response.ok) throw new Error("방문자 데이터 조회 실패");
      return response.json();
    },
    refetchInterval: 5000,
  });
  
  // 시험장비 가동현황 상태 계산
  const equipmentStatusText = statsData?.data
    ? `가동중: ${statsData.data.running}대 / 전체: ${statsData.data.total}대`
    : statsLoading
    ? "데이터 로딩 중..."
    : "가동중: -대 / 전체: -대";

  // 금일 예약 건수 계산
  const todayReservationCount = (() => {
    if (reservationsLoading) return -1;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    const todayReservations = reservations.filter(
      (res) => res.reservationDate === today && res.status !== "cancelled"
    );
    return todayReservations.length;
  })();

  const reservationStatusText = todayReservationCount === -1
    ? "데이터 로딩 중..."
    : `금일 예약: ${todayReservationCount}건`;

  // 방문 현황 계산 (방문등록과 방문예약 구분)
  const visitorStatusText = (() => {
    if (visitorsLoading) return "데이터 로딩 중...";
    
    // 방문등록 대기: status가 "pending"인 방문자 (예약이 아닌 일반 등록)
    const registeredPending = visitors.filter(
      (v) => v.status === "pending"
    ).length;
    
    // 방문예약 대기: status가 "reserved"인 방문자
    const reservedPending = visitors.filter(
      (v) => v.status === "reserved"
    ).length;
    
    if (registeredPending === 0 && reservedPending === 0) {
      return "방문 현황: 대기 없음";
    }
    
    const parts: string[] = [];
    if (registeredPending > 0) {
      parts.push(`등록 ${registeredPending}명`);
    }
    if (reservedPending > 0) {
      parts.push(`예약 ${reservedPending}명`);
    }
    
    return `방문 현황: ${parts.join(", ")} 대기`;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E31E24] to-[#FFB3B3] flex flex-col">
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
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            대기화면으로
          </Button>
        </div>
      </header>

      <div className="flex-1 p-6 md:p-12">
        <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 mt-8">
          <h1 className="text-5xl font-bold text-white mb-3" data-testid="text-menu-title">
            관리 메뉴
          </h1>
          <p className="text-xl text-white/90">원하는 기능을 선택하세요</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {modules.map((module, index) => {
            const Icon = module.icon;
            // 시험장비 가동현황 카드는 실제 데이터 사용
            // 시험장비 예약 카드는 금일 예약 건수 사용
            // 외부인 출입관리 카드는 방문 현황 데이터 사용
            const displayStatus = module.id === "equipment-status" 
              ? equipmentStatusText 
              : module.id === "reservation"
              ? reservationStatusText
              : module.id === "visitors"
              ? visitorStatusText
              : module.status;
            
            return (
              <Card
                key={module.id}
                className="relative overflow-hidden cursor-pointer hover:-translate-y-2 transition-all duration-300 hover-elevate active-elevate-2 animate-in fade-in-0 slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => setLocation(module.path)}
                data-testid={`card-module-${module.id}`}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF1A00] to-[#FF4D33]" />
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Icon className="w-16 h-16 text-primary" />
                  </div>
                  <CardTitle className="text-2xl" data-testid={`text-module-title-${module.id}`}>
                    {module.title}
                  </CardTitle>
                  <CardDescription className="text-base mt-2" data-testid={`text-module-desc-${module.id}`}>
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-3 text-sm font-medium" data-testid={`text-module-status-${module.id}`}>
                    {displayStatus}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      </div>

      {/* 좌측 하단 고정 플로팅 버튼 */}
      <button
        onClick={() => setExternalLinksOpen(true)}
        className="fixed left-6 bottom-6 w-14 h-14 rounded-full bg-[#E31E24] text-white shadow-lg hover:bg-[#C91E24] transition-all duration-300 hover:scale-110 flex items-center justify-center z-50 group"
        aria-label="외부 링크"
        title="외부 링크"
      >
        <LinkIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>

      {/* 외부 링크 모달 */}
      <Dialog open={externalLinksOpen} onOpenChange={setExternalLinksOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <ExternalLink className="w-6 h-6 text-[#E31E24]" />
              외부 링크
            </DialogTitle>
            <DialogDescription>
              다양한 외부 시스템에 빠르게 접근할 수 있습니다
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            {externalLinks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                등록된 외부 링크가 없습니다
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {externalLinks.map((link) => {
                  const LinkIcon = link.icon || ExternalLink;
                  return (
                    <Card
                      key={link.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-2 hover:border-[#E31E24]"
                      onClick={() => {
                        window.open(link.url, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-[#E31E24]/10">
                            <LinkIcon className="w-5 h-5 text-[#E31E24]" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{link.name}</CardTitle>
                            {link.description && (
                              <CardDescription className="mt-1 text-sm">
                                {link.description}
                              </CardDescription>
                            )}
                          </div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-xs text-muted-foreground truncate">
                          {link.url}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

