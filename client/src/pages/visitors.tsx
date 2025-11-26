import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Search, 
  Download, 
  BarChart3,
  Calendar,
  User,
  FileText,
  X,
  Settings,
  Trash2,
  Pencil,
  Check,
  X as XIcon
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/SignaturePad";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Visitor {
  id: string;
  name: string;
  company: string;
  phone: string;
  purpose: string;
  visitDate: string;
  visitTime: string;
  responsiblePerson: string;
  notes?: string;
  status: string;
  badgeNumber?: string;
  createdAt?: string;
  approvedAt?: string;
  completedAt?: string;
  diTrainingCompleted?: boolean;
  diTrainingSignature?: string;
  diTrainingNA?: boolean;
  diTrainingNAReason?: string;
  diTrainingDate?: string;
}

import {
  VisitorRegistrationInput,
  VisitorReservationInput,
  visitorRegistrationSchema,
  visitorReservationSchema,
} from "../../../shared/validation/visitors";

type InsertVisitor = VisitorRegistrationInput;
type InsertReservation = VisitorReservationInput;

interface AuditTrail {
  id: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'cancel_reservation' | 'complete_reservation';
  actor: string;
  entityType: 'visitor';
  entityId: string;
  entityInfo: {
    name?: string;
    visitDate?: string;
    company?: string;
    status?: string;
  };
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  result: 'success' | 'failed';
  errorMessage?: string;
  details?: string;
  hash: string;
}

const ACTION_LABELS: Record<AuditTrail['action'], string> = {
  create: '생성',
  update: '수정',
  delete: '삭제',
  cancel_reservation: '예약 취소',
  complete_reservation: '예약 완료',
};


interface UserMaster {
  id: string;
  employeeId: string;
  name: string;
  isAdmin?: boolean;
}

interface VisitorSettings {
  companies: string[];
  purposes: string[];
  naReasons: string[];
}

const PURPOSE_LABELS: Record<string, string> = {
  audit: "실사/감사",
  meeting: "회의",
  equipment: "장비 점검",
  delivery: "납품",
  other: "기타",
};


export default function Visitors() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  // 오늘 날짜 (대시보드 필터링용)
  const today = new Date().toISOString().split('T')[0];
  const [searchFilters, setSearchFilters] = useState({
    startDate: "",
    endDate: "",
    name: "",
    responsiblePerson: "",
    status: "",
    company: "",
    purpose: "",
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string>("company");
  
  // Audit Trail 필터링 상태
  const [auditTrailFilters, setAuditTrailFilters] = useState({
    startDate: "",
    endDate: "",
    action: "",
    name: "",
  });
  const [companyInput, setCompanyInput] = useState("");
  const [purposeInput, setPurposeInput] = useState("");
  const [naReasonInput, setNaReasonInput] = useState("");
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [editingPurpose, setEditingPurpose] = useState<string | null>(null);
  const [editingNaReason, setEditingNaReason] = useState<string | null>(null);
  const [editCompanyValue, setEditCompanyValue] = useState("");
  const [editPurposeValue, setEditPurposeValue] = useState("");
  const [editNaReasonValue, setEditNaReasonValue] = useState("");
  
  // Select에서 "직접입력" 모드인지 추적하는 상태 (방문 등록 폼)
  const [companyInputMode, setCompanyInputMode] = useState<"select" | "input">("select");
  const [purposeInputMode, setPurposeInputMode] = useState<"select" | "input">("select");
  
  // Select에서 "직접입력" 모드인지 추적하는 상태 (예약 등록 폼)
  const [reservationCompanyInputMode, setReservationCompanyInputMode] = useState<"select" | "input">("select");
  const [reservationPurposeInputMode, setReservationPurposeInputMode] = useState<"select" | "input">("select");

  // 방문자 목록 조회 (필터링 포함)
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (searchFilters.startDate) params.startDate = searchFilters.startDate;
    if (searchFilters.endDate) params.endDate = searchFilters.endDate;
    if (searchFilters.name) params.name = searchFilters.name;
    if (searchFilters.responsiblePerson) params.responsiblePerson = searchFilters.responsiblePerson;
    if (searchFilters.company) params.company = searchFilters.company;
    if (searchFilters.purpose) params.purpose = searchFilters.purpose;
    return params;
  }, [searchFilters]);

  // 대시보드/방문 예약 탭용: 필터 없이 모든 데이터 조회
  const { data: allVisitors = [], isLoading } = useQuery<Visitor[]>({
    queryKey: ["/api/visitors"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/visitors");
      return await res.json();
    },
  });

  // 방문 이력 탭용: queryParams를 사용하는 별도 쿼리
  const { data: historyVisitors = [], isLoading: isLoadingHistory } = useQuery<Visitor[]>({
    queryKey: ["/api/visitors/history", queryParams],
    queryFn: async () => {
      const params = new URLSearchParams(queryParams);
      const url = `/api/visitors${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await apiRequest("GET", url);
      return await res.json();
    },
  });

  // 방문 이력 조회용: 방문예약 제외, 실제 방문등록 정보만 필터링
  const visitors = useMemo(() => {
    return historyVisitors.filter(v => v.status !== 'reserved');
  }, [historyVisitors]);


  // 사용자 마스터 조회 (담당자용)
  const { data: userMasterData } = useQuery<{ success: boolean; data: UserMaster[] }>({
    queryKey: ["/api/user-master"],
    queryFn: async () => {
      const res = await fetch("/api/user-master");
      if (!res.ok) throw new Error("사용자 마스터 조회 실패");
      return await res.json();
    },
  });
  const users = userMasterData?.data || [];

  // 방문 설정 조회 (소속, 방문목적)
  const { data: settingsData, refetch: refetchSettings } = useQuery<{ success: boolean; data: VisitorSettings }>({
    queryKey: ["/api/visitor-settings"],
    queryFn: async () => {
      const res = await fetch("/api/visitor-settings");
      if (!res.ok) throw new Error("설정 조회 실패");
      return await res.json();
    },
  });
  const settings = settingsData?.data || { companies: [], purposes: [], naReasons: [] };

  // Audit Trail 조회 (설정 다이얼로그가 열려있을 때만 조회)
  const { data: auditTrailData, isLoading: isLoadingAuditTrail } = useQuery<{ success: boolean; data: AuditTrail[]; count: number }>({
    queryKey: ["/api/visitors/audit-trail", auditTrailFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (auditTrailFilters.startDate) params.append('startDate', auditTrailFilters.startDate);
      if (auditTrailFilters.endDate) params.append('endDate', auditTrailFilters.endDate);
      if (auditTrailFilters.action) params.append('action', auditTrailFilters.action);
      if (auditTrailFilters.name) params.append('name', auditTrailFilters.name);
      
      const res = await fetch(`/api/visitors/audit-trail?${params.toString()}`);
      if (!res.ok) throw new Error("Audit Trail 조회 실패");
      return await res.json();
    },
    enabled: settingsOpen, // 설정 다이얼로그가 열려있을 때만 조회
  });
  const auditTrails = auditTrailData?.data || [];

  const [alcoaDialogOpen, setAlcoaDialogOpen] = useState(false);
  const [alcoaDialogViewed, setAlcoaDialogViewed] = useState(false);
  const [diTrainingNA, setDiTrainingNA] = useState(false);
  const [reservationCompleteDialogOpen, setReservationCompleteDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Visitor | null>(null);

  const defaultVisitTime = useMemo(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }, []);

  // 예약 등록 폼
  const reservationForm = useForm<InsertReservation>({
    resolver: zodResolver(visitorReservationSchema),
    defaultValues: {
      name: "",
      company: "",
      phone: "",
      purpose: "",
      visitDate: today,
      responsiblePerson: "",
      notes: "",
    },
  });

  const form = useForm<InsertVisitor>({
    resolver: zodResolver(visitorRegistrationSchema),
    defaultValues: {
      name: "",
      company: "",
      phone: "",
      purpose: "",
      visitDate: today, // 오늘 날짜 기본값
      visitTime: defaultVisitTime, // 자동으로 현재 시간 설정
      responsiblePerson: "",
      notes: "",
      diTrainingNA: false,
      diTrainingSignature: "",
      diTrainingNAReason: "",
    },
  });

  // N/A 체크 시 서명 필드 초기화 및 검증 해제
  useEffect(() => {
    if (diTrainingNA) {
      form.setValue("diTrainingSignature", "");
      form.clearErrors("diTrainingSignature");
    } else {
      form.setValue("diTrainingNAReason", "");
      form.clearErrors("diTrainingNAReason");
    }
  }, [diTrainingNA, form]);

  // 방문 시간 자동 설정 (현재 시간)
  const setCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    form.setValue("visitTime", `${hours}:${minutes}`);
  };

  // 방문 등록 탭이 활성화되면 현재 시간 자동 설정
  useEffect(() => {
    if (activeTab === "register") {
      setCurrentTime();
    }
  }, [activeTab]);

  // 예약 완료 다이얼로그가 열릴 때 form 초기화
  useEffect(() => {
    if (reservationCompleteDialogOpen && selectedReservation) {
      form.reset({
        name: "",
        company: selectedReservation.company,
        phone: "",
        purpose: selectedReservation.purpose,
        visitDate: selectedReservation.visitDate,
        visitTime: "", // 방문 완료 시 현재 시간으로 자동 설정됨
        responsiblePerson: selectedReservation.responsiblePerson,
        notes: selectedReservation.notes || "",
        diTrainingNA: false,
        diTrainingSignature: "",
        diTrainingNAReason: "",
      });
      // 예약 정보에서 가져온 값이 설정 목록에 있으면 select 모드, 없으면 input 모드
      setCompanyInputMode(settings.companies.includes(selectedReservation.company) ? "select" : "input");
      setPurposeInputMode(settings.purposes.includes(selectedReservation.purpose) ? "select" : "input");
      setAlcoaDialogViewed(false);
      setDiTrainingNA(false);
    }
  }, [reservationCompleteDialogOpen, selectedReservation, form, settings.companies, settings.purposes]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertVisitor) => {
      const res = await apiRequest("POST", "/api/visitors", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors/audit-trail"] });
      toast({ title: "방문자 등록 완료", description: "방문자가 성공적으로 등록되었습니다." });
      form.reset();
      setCompanyInputMode("select");
      setPurposeInputMode("select");
      setAlcoaDialogViewed(false);
      setDiTrainingNA(false);
      setSelectedReservation(null); // 예약 정보 초기화
      setActiveTab("dashboard");
    },
    onError: (error: any) => {
      toast({ 
        title: "등록 실패", 
        description: error?.message || "방문자 등록에 실패했습니다.", 
        variant: "destructive" 
      });
    },
  });



  const onSubmit = (data: InsertVisitor) => {
    // ALCOA+ 원칙 확인 필수 검증
    if (!alcoaDialogViewed) {
      toast({
        title: "ALCOA+ 원칙 확인 필요",
        description: "방문 등록 전에 반드시 'ALCOA+ 원칙 보기' 버튼을 클릭하여 원칙을 확인해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 방문 시간이 없으면 현재 시간으로 설정
    if (!data.visitTime) {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      data.visitTime = `${hours}:${minutes}`;
    }
    
    // D.I 교육 검증
    if (diTrainingNA) {
      // N/A인 경우 사유 필수
      if (!data.diTrainingNAReason || data.diTrainingNAReason.trim() === '') {
        toast({
          title: "사유 필요",
          description: "N/A 선택 시 사유를 입력해주세요.",
          variant: "destructive",
        });
        form.setFocus("diTrainingNAReason");
        return;
      }
    } else {
      // N/A가 아닌 경우 서명 필수
      if (!data.diTrainingSignature || data.diTrainingSignature.trim() === '') {
        toast({
          title: "서명 필요",
          description: "D.I 준수 교육 서명이 필요합니다. N/A가 해당되는 경우 체크박스를 선택해주세요.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // 예약이 있으면 예약을 업데이트하고, 없으면 새로 생성
    if (selectedReservation) {
      // 예약 완료 Mutation 사용
      completeReservationMutation.mutate({
        id: selectedReservation.id,
        name: data.name,
        phone: data.phone,
        diTrainingNA: diTrainingNA,
        diTrainingSignature: data.diTrainingSignature,
        diTrainingNAReason: data.diTrainingNAReason,
      });
    } else {
      // 새 방문자 등록
      createMutation.mutate({
        ...data,
        diTrainingNA: diTrainingNA,
      });
    }
  };

  // 오늘 이후의 방문등록 목록 (reserved가 아닌 방문자) - 대시보드용
  const registeredVisitors = useMemo(() => {
    return allVisitors.filter(v => v.visitDate >= today && v.status !== 'reserved');
  }, [allVisitors, today]);

  // 오늘 이후의 방문예약 목록 (reserved 상태) - 대시보드/방문 예약 탭용
  const allReservedVisitors = useMemo(() => {
    return allVisitors.filter(v => v.visitDate >= today && v.status === 'reserved');
  }, [allVisitors, today]);

  // 예약 등록 Mutation
  const createReservationMutation = useMutation({
    mutationFn: async (data: InsertReservation) => {
      const res = await apiRequest("POST", "/api/visitors", {
        ...data,
        status: "reserved", // 예약 상태
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors/audit-trail"] });
      toast({ title: "예약 등록 완료", description: "방문 예약이 성공적으로 등록되었습니다." });
      reservationForm.reset();
      setReservationCompanyInputMode("select");
      setReservationPurposeInputMode("select");
      setActiveTab("reservations");
    },
    onError: (error: any) => {
      toast({ 
        title: "예약 등록 실패", 
        description: error?.message || "방문 예약 등록에 실패했습니다.", 
        variant: "destructive" 
      });
    },
  });

  // 예약 완료 Mutation (방문자가 예약을 찾아서 완료)
  const completeReservationMutation = useMutation({
    mutationFn: async ({ id, name, phone, diTrainingNA, diTrainingSignature, diTrainingNAReason }: { 
      id: string; 
      name: string; 
      phone: string;
      diTrainingNA?: boolean;
      diTrainingSignature?: string;
      diTrainingNAReason?: string;
    }) => {
      // 방문 시간을 현재 시간으로 설정
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const visitTime = `${hours}:${minutes}`;
      
      const res = await apiRequest("PATCH", `/api/visitors/${id}`, {
        name,
        phone,
        visitTime,
        status: "pending", // 예약 완료 시 pending으로 변경
        diTrainingNA,
        diTrainingSignature,
        diTrainingNAReason,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors/audit-trail"] });
      setReservationCompleteDialogOpen(false);
      setSelectedReservation(null);
      form.reset();
      setCompanyInputMode("select");
      setPurposeInputMode("select");
      setAlcoaDialogViewed(false);
      setDiTrainingNA(false);
      setActiveTab("dashboard"); // 방문 등록 완료 후 대시보드로 이동
      toast({ title: "방문 등록 완료", description: "방문 등록이 완료되었습니다." });
    },
    onError: (error: any) => {
      toast({ 
        title: "예약 완료 실패", 
        description: error?.message || "예약 완료에 실패했습니다.", 
        variant: "destructive" 
      });
    },
  });

  const onReservationSubmit = (data: InsertReservation) => {
    createReservationMutation.mutate(data);
  };

  // 예약 취소 Mutation
  const cancelReservationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/visitors/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors/audit-trail"] });
      toast({ title: "예약 취소 완료", description: "예약이 취소되었습니다." });
    },
    onError: (error: any) => {
      toast({ 
        title: "예약 취소 실패", 
        description: error?.message || "예약 취소에 실패했습니다.", 
        variant: "destructive" 
      });
    },
  });

  // 소속 추가 Mutation
  const addCompanyMutation = useMutation({
    mutationFn: async (company: string) => {
      const res = await apiRequest("POST", "/api/visitor-settings/companies", { company });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || "소속 추가에 실패했습니다.");
      }
      return result;
    },
    onSuccess: () => {
      refetchSettings();
      setCompanyInput("");
      toast({ title: "소속 추가 완료", description: "소속이 추가되었습니다." });
    },
    onError: (error: any) => {
      toast({ title: "소속 추가 실패", description: error?.message || "소속 추가에 실패했습니다.", variant: "destructive" });
    },
  });

  // 소속 수정 Mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async ({ oldCompany, newCompany }: { oldCompany: string; newCompany: string }) => {
      const res = await apiRequest("PUT", `/api/visitor-settings/companies/${encodeURIComponent(oldCompany)}`, { company: newCompany });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || "소속 수정에 실패했습니다.");
      }
      return result;
    },
    onSuccess: () => {
      refetchSettings();
      setEditingCompany(null);
      setEditCompanyValue("");
      toast({ title: "소속 수정 완료", description: "소속이 수정되었습니다." });
    },
    onError: (error: any) => {
      toast({ title: "소속 수정 실패", description: error?.message || "소속 수정에 실패했습니다.", variant: "destructive" });
    },
  });

  // 소속 삭제 Mutation
  const deleteCompanyMutation = useMutation({
    mutationFn: async (company: string) => {
      const res = await apiRequest("DELETE", `/api/visitor-settings/companies/${encodeURIComponent(company)}`);
      return await res.json();
    },
    onSuccess: () => {
      refetchSettings();
      toast({ title: "소속 삭제 완료", description: "소속이 삭제되었습니다." });
    },
  });

  // 방문목적 추가 Mutation
  const addPurposeMutation = useMutation({
    mutationFn: async (purpose: string) => {
      const res = await apiRequest("POST", "/api/visitor-settings/purposes", { purpose });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || "방문목적 추가에 실패했습니다.");
      }
      return result;
    },
    onSuccess: () => {
      refetchSettings();
      setPurposeInput("");
      toast({ title: "방문목적 추가 완료", description: "방문목적이 추가되었습니다." });
    },
    onError: (error: any) => {
      toast({ title: "방문목적 추가 실패", description: error?.message || "방문목적 추가에 실패했습니다.", variant: "destructive" });
    },
  });

  // 방문목적 수정 Mutation
  const updatePurposeMutation = useMutation({
    mutationFn: async ({ oldPurpose, newPurpose }: { oldPurpose: string; newPurpose: string }) => {
      const res = await apiRequest("PUT", `/api/visitor-settings/purposes/${encodeURIComponent(oldPurpose)}`, { purpose: newPurpose });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || "방문목적 수정에 실패했습니다.");
      }
      return result;
    },
    onSuccess: () => {
      refetchSettings();
      setEditingPurpose(null);
      setEditPurposeValue("");
      toast({ title: "방문목적 수정 완료", description: "방문목적이 수정되었습니다." });
    },
    onError: (error: any) => {
      toast({ title: "방문목적 수정 실패", description: error?.message || "방문목적 수정에 실패했습니다.", variant: "destructive" });
    },
  });

  // 방문목적 삭제 Mutation
  const deletePurposeMutation = useMutation({
    mutationFn: async (purpose: string) => {
      const res = await apiRequest("DELETE", `/api/visitor-settings/purposes/${encodeURIComponent(purpose)}`);
      return await res.json();
    },
    onSuccess: () => {
      refetchSettings();
      toast({ title: "방문목적 삭제 완료", description: "방문목적이 삭제되었습니다." });
    },
  });

  // N/A 사유 추가 Mutation
  const addNaReasonMutation = useMutation({
    mutationFn: async (naReason: string) => {
      const res = await apiRequest("POST", "/api/visitor-settings/na-reasons", { naReason });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || "N/A 사유 추가에 실패했습니다.");
      }
      return result;
    },
    onSuccess: () => {
      refetchSettings();
      setNaReasonInput("");
      toast({ title: "N/A 사유 추가 완료", description: "N/A 사유가 추가되었습니다." });
    },
    onError: (error: any) => {
      toast({ title: "N/A 사유 추가 실패", description: error?.message || "N/A 사유 추가에 실패했습니다.", variant: "destructive" });
    },
  });

  // N/A 사유 수정 Mutation
  const updateNaReasonMutation = useMutation({
    mutationFn: async ({ oldNaReason, newNaReason }: { oldNaReason: string; newNaReason: string }) => {
      const res = await apiRequest("PUT", `/api/visitor-settings/na-reasons/${encodeURIComponent(oldNaReason)}`, { naReason: newNaReason });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || "N/A 사유 수정에 실패했습니다.");
      }
      return result;
    },
    onSuccess: () => {
      refetchSettings();
      setEditingNaReason(null);
      setEditNaReasonValue("");
      toast({ title: "N/A 사유 수정 완료", description: "N/A 사유가 수정되었습니다." });
    },
    onError: (error: any) => {
      toast({ title: "N/A 사유 수정 실패", description: error?.message || "N/A 사유 수정에 실패했습니다.", variant: "destructive" });
    },
  });

  // N/A 사유 삭제 Mutation
  const deleteNaReasonMutation = useMutation({
    mutationFn: async (naReason: string) => {
      const res = await apiRequest("DELETE", `/api/visitor-settings/na-reasons/${encodeURIComponent(naReason)}`);
      return await res.json();
    },
    onSuccess: () => {
      refetchSettings();
      toast({ title: "N/A 사유 삭제 완료", description: "N/A 사유가 삭제되었습니다." });
    },
  });


  const handleSearch = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
  };

  const handleResetFilters = () => {
    setSearchFilters({
      startDate: "",
      endDate: "",
      name: "",
      responsiblePerson: "",
      status: "", // 필터 초기화용으로 유지 (UI에서는 제거됨)
      company: "",
      purpose: "",
    });
  };

  const handleExportExcel = () => {
    // Excel 다운로드 기능 (간단한 CSV 형식)
    const headers = ["방문일자", "시간", "방문자명", "소속", "연락처", "방문목적", "담당자"];
    const rows = visitors.map(v => [
      v.visitDate,
      v.visitTime || "",
      v.name,
      v.company,
      v.phone,
      PURPOSE_LABELS[v.purpose] || v.purpose,
      v.responsiblePerson,
    ]);
    
    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `방문자_이력_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "다운로드 완료", description: "Excel 파일이 다운로드되었습니다." });
  };


  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
      <Button
        variant="ghost"
        onClick={() => setLocation("/menu")}
        data-testid="button-back"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        메뉴로 돌아가기
      </Button>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              설정
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>설정</DialogTitle>
            </DialogHeader>
            <Tabs 
              value={settingsTab} 
              onValueChange={(v) => {
                setSettingsTab(v);
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="company">소속 관리</TabsTrigger>
                <TabsTrigger value="purpose">방문목적 관리</TabsTrigger>
                <TabsTrigger value="naReason">N/A 사유 관리</TabsTrigger>
                <TabsTrigger value="auditTrail">Audit Trail</TabsTrigger>
              </TabsList>
            </Tabs>
              
            {settingsTab === "company" && (
              <div className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">소속 등록</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        placeholder="소속명 입력"
                        value={companyInput}
                        onChange={(e) => setCompanyInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && companyInput.trim()) {
                            addCompanyMutation.mutate(companyInput.trim());
                          }
                        }}
                      />
                      <Button 
                        onClick={() => {
                          if (companyInput.trim()) {
                            addCompanyMutation.mutate(companyInput.trim());
                          }
                        }}
                        disabled={addCompanyMutation.isPending}
                      >
                        추가
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">소속 목록 ({settings.companies.length}개)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>소속명</TableHead>
                            <TableHead>관리</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settings.companies.map((company) => (
                            <TableRow key={company}>
                              <TableCell>
                                {editingCompany === company ? (
                                  <Input
                                    value={editCompanyValue}
                                    onChange={(e) => setEditCompanyValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && editCompanyValue.trim()) {
                                        updateCompanyMutation.mutate({ oldCompany: company, newCompany: editCompanyValue.trim() });
                                      }
                                      if (e.key === 'Escape') {
                                        setEditingCompany(null);
                                        setEditCompanyValue("");
                                      }
                                    }}
                                    className="w-full"
                                    autoFocus
                                  />
                                ) : (
                                  company
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {editingCompany === company ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          if (editCompanyValue.trim()) {
                                            updateCompanyMutation.mutate({ oldCompany: company, newCompany: editCompanyValue.trim() });
                                          }
                                        }}
                                        disabled={updateCompanyMutation.isPending}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingCompany(null);
                                          setEditCompanyValue("");
                                        }}
                                      >
                                        <XIcon className="h-3 w-3" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingCompany(company);
                                          setEditCompanyValue(company);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => deleteCompanyMutation.mutate(company)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {settings.companies.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                                등록된 소속이 없습니다.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {settingsTab === "purpose" && (
              <div className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">방문목적 등록</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        placeholder="방문목적 입력"
                        value={purposeInput}
                        onChange={(e) => setPurposeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && purposeInput.trim()) {
                            addPurposeMutation.mutate(purposeInput.trim());
                          }
                        }}
                      />
                      <Button 
                        onClick={() => {
                          if (purposeInput.trim()) {
                            addPurposeMutation.mutate(purposeInput.trim());
                          }
                        }}
                        disabled={addPurposeMutation.isPending}
                      >
                        추가
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">방문목적 목록 ({settings.purposes.length}개)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>방문목적</TableHead>
                            <TableHead>관리</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settings.purposes.map((purpose) => (
                            <TableRow key={purpose}>
                              <TableCell>
                                {editingPurpose === purpose ? (
                                  <Input
                                    value={editPurposeValue}
                                    onChange={(e) => setEditPurposeValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && editPurposeValue.trim()) {
                                        updatePurposeMutation.mutate({ oldPurpose: purpose, newPurpose: editPurposeValue.trim() });
                                      }
                                      if (e.key === 'Escape') {
                                        setEditingPurpose(null);
                                        setEditPurposeValue("");
                                      }
                                    }}
                                    className="w-full"
                                    autoFocus
                                  />
                                ) : (
                                  PURPOSE_LABELS[purpose] || purpose
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {editingPurpose === purpose ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          if (editPurposeValue.trim()) {
                                            updatePurposeMutation.mutate({ oldPurpose: purpose, newPurpose: editPurposeValue.trim() });
                                          }
                                        }}
                                        disabled={updatePurposeMutation.isPending}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingPurpose(null);
                                          setEditPurposeValue("");
                                        }}
                                      >
                                        <XIcon className="h-3 w-3" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingPurpose(purpose);
                                          setEditPurposeValue(purpose);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => deletePurposeMutation.mutate(purpose)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {settings.purposes.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                                등록된 방문목적이 없습니다.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {settingsTab === "naReason" && (
              <div className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">N/A 사유 등록</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        placeholder="N/A 사유 입력"
                        value={naReasonInput}
                        onChange={(e) => setNaReasonInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && naReasonInput.trim()) {
                            addNaReasonMutation.mutate(naReasonInput.trim());
                          }
                        }}
                      />
                      <Button 
                        onClick={() => {
                          if (naReasonInput.trim()) {
                            addNaReasonMutation.mutate(naReasonInput.trim());
                          }
                        }}
                        disabled={addNaReasonMutation.isPending}
                      >
                        추가
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">N/A 사유 목록 ({settings.naReasons.length}개)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>N/A 사유</TableHead>
                            <TableHead>관리</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settings.naReasons.map((naReason) => (
                            <TableRow key={naReason}>
                              <TableCell>
                                {editingNaReason === naReason ? (
                                  <Input
                                    value={editNaReasonValue}
                                    onChange={(e) => setEditNaReasonValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && editNaReasonValue.trim()) {
                                        updateNaReasonMutation.mutate({ oldNaReason: naReason, newNaReason: editNaReasonValue.trim() });
                                      }
                                      if (e.key === 'Escape') {
                                        setEditingNaReason(null);
                                        setEditNaReasonValue("");
                                      }
                                    }}
                                    className="w-full"
                                    autoFocus
                                  />
                                ) : (
                                  naReason
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {editingNaReason === naReason ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          if (editNaReasonValue.trim()) {
                                            updateNaReasonMutation.mutate({ oldNaReason: naReason, newNaReason: editNaReasonValue.trim() });
                                          }
                                        }}
                                        disabled={updateNaReasonMutation.isPending}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingNaReason(null);
                                          setEditNaReasonValue("");
                                        }}
                                      >
                                        <XIcon className="h-3 w-3" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingNaReason(naReason);
                                          setEditNaReasonValue(naReason);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => deleteNaReasonMutation.mutate(naReason)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {settings.naReasons.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                                등록된 N/A 사유가 없습니다.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {settingsTab === "auditTrail" && (
              <div className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Audit Trail (감사 추적)</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      외부인 출입관리에서 발생한 모든 작업(생성, 수정, 삭제, 승인, 거부, 완료 등)에 대한 기록입니다.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {/* 필터링 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div>
                        <Label>시작 날짜</Label>
                        <Input
                          type="date"
                          value={auditTrailFilters.startDate}
                          onChange={(e) => setAuditTrailFilters({ ...auditTrailFilters, startDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>종료 날짜</Label>
                        <Input
                          type="date"
                          value={auditTrailFilters.endDate}
                          onChange={(e) => setAuditTrailFilters({ ...auditTrailFilters, endDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>작업 유형</Label>
                        <Select
                          value={auditTrailFilters.action || "all"}
                          onValueChange={(value) => setAuditTrailFilters({ ...auditTrailFilters, action: value === "all" ? "" : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="전체" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체</SelectItem>
                            {Object.entries(ACTION_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>방문자명</Label>
                        <Input
                          placeholder="방문자명 검색"
                          value={auditTrailFilters.name}
                          onChange={(e) => setAuditTrailFilters({ ...auditTrailFilters, name: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Excel 다운로드 버튼 */}
                    <div className="flex justify-end mb-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const csvContent = [
                            ['작업 시간', '작업 유형', '작업자', '방문자명', '방문 일자', '소속', '구분', '결과', '변경 내용', '상세 정보', '무결성 Hash'].join(','),
                            ...auditTrails.map(audit => {
                              const timestamp = new Date(audit.timestamp).toLocaleString('ko-KR');
                              const actionLabel = ACTION_LABELS[audit.action] || audit.action;
                              const changes = audit.changes?.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join('; ') || '';
                              const statusLabel = audit.entityInfo?.status === 'reserved' ? '예약' : 
                                                  audit.entityInfo?.status === 'pending' ? '등록' : 
                                                  audit.entityInfo?.status || '';
                              return [
                                timestamp,
                                actionLabel,
                                audit.actor,
                                audit.entityInfo?.name || '',
                                audit.entityInfo?.visitDate || '',
                                audit.entityInfo?.company || '',
                                statusLabel,
                                audit.result === 'success' ? '성공' : '실패',
                                changes,
                                audit.details || audit.errorMessage || '',
                                audit.hash,
                              ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
                            }),
                          ].join('\n');

                          const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                          const link = document.createElement('a');
                          const url = URL.createObjectURL(blob);
                          link.setAttribute('href', url);
                          link.setAttribute('download', `audit-trail-${new Date().toISOString().split('T')[0]}.csv`);
                          link.style.visibility = 'hidden';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Excel 다운로드
                      </Button>
                    </div>

                    {/* Audit Trail 목록 */}
                    {isLoadingAuditTrail ? (
                      <div className="text-center py-12">로딩 중...</div>
                    ) : auditTrails.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        Audit Trail 기록이 없습니다.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>작업 시간</TableHead>
                              <TableHead>작업 유형</TableHead>
                              <TableHead>작업자</TableHead>
                              <TableHead>방문자명</TableHead>
                              <TableHead>방문 일자</TableHead>
                              <TableHead>소속</TableHead>
                              <TableHead>구분</TableHead>
                              <TableHead>결과</TableHead>
                              <TableHead>변경 내용</TableHead>
                              <TableHead>상세 정보</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {auditTrails.map((audit) => (
                              <TableRow key={audit.id}>
                                <TableCell className="whitespace-nowrap">
                                  {new Date(audit.timestamp).toLocaleString('ko-KR')}
                                </TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    audit.action === 'create' ? 'bg-blue-100 text-blue-800' :
                                    audit.action === 'update' ? 'bg-yellow-100 text-yellow-800' :
                                    audit.action === 'delete' || audit.action === 'cancel_reservation' ? 'bg-red-100 text-red-800' :
                                    audit.action === 'complete_reservation' ? 'bg-purple-100 text-purple-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {ACTION_LABELS[audit.action] || audit.action}
                                  </span>
                                </TableCell>
                                <TableCell>{audit.actor}</TableCell>
                                <TableCell>{audit.entityInfo?.name || '-'}</TableCell>
                                <TableCell>{audit.entityInfo?.visitDate || '-'}</TableCell>
                                <TableCell>{audit.entityInfo?.company || '-'}</TableCell>
                                <TableCell>
                                  {audit.entityInfo?.status ? (
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      audit.entityInfo.status === 'reserved' ? 'bg-orange-100 text-orange-800' :
                                      audit.entityInfo.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {audit.entityInfo.status === 'reserved' ? '예약' : 
                                       audit.entityInfo.status === 'pending' ? '등록' : 
                                       audit.entityInfo.status}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    audit.result === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {audit.result === 'success' ? '성공' : '실패'}
                                  </span>
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  {audit.changes && audit.changes.length > 0 ? (
                                    <div className="space-y-1">
                                      {audit.changes.map((change, idx) => (
                                        <div key={idx} className="text-xs">
                                          <span className="font-medium">{change.field}:</span>{' '}
                                          <span className="text-red-600">{String(change.oldValue)}</span>
                                          {' → '}
                                          <span className="text-green-600">{String(change.newValue)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  {audit.details && (
                                    <span className="text-xs">{audit.details}</span>
                                  )}
                                  {audit.errorMessage && (
                                    <span className="text-xs text-red-600">{audit.errorMessage}</span>
                                  )}
                                  {!audit.details && !audit.errorMessage && (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl" data-testid="text-page-title">외부인 출입관리</CardTitle>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList data-testid="tabs-visitor" className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <BarChart3 className="mr-2 h-4 w-4" />
            대시보드
          </TabsTrigger>
          <TabsTrigger value="register" data-testid="tab-register">
            <User className="mr-2 h-4 w-4" />
            방문 등록
          </TabsTrigger>
          <TabsTrigger value="reservations" data-testid="tab-reservations">
            <Calendar className="mr-2 h-4 w-4" />
            사전방문등록
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <FileText className="mr-2 h-4 w-4" />
            방문 이력
          </TabsTrigger>
        </TabsList>

        {/* 대시보드 탭 (방문등록 + 방문예약 통합) */}
        <TabsContent value="dashboard">
          <div className="space-y-6">
            {/* 방문등록 테이블 */}
            <Card>
              <CardHeader>
                <CardTitle>방문등록 ({registeredVisitors.length}건)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">로딩 중...</div>
                ) : registeredVisitors.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    해당 날짜에 등록된 방문이 없습니다
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>시간</TableHead>
                          <TableHead>방문자명</TableHead>
                          <TableHead>소속</TableHead>
                          <TableHead>연락처</TableHead>
                          <TableHead>방문목적</TableHead>
                          <TableHead>담당자</TableHead>
                          <TableHead>상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {registeredVisitors.map((visitor) => (
                          <TableRow key={visitor.id}>
                            <TableCell>{visitor.visitTime || "-"}</TableCell>
                            <TableCell>{visitor.name}</TableCell>
                            <TableCell>{visitor.company}</TableCell>
                            <TableCell>{visitor.phone}</TableCell>
                            <TableCell>{PURPOSE_LABELS[visitor.purpose] || visitor.purpose}</TableCell>
                            <TableCell>{visitor.responsiblePerson}</TableCell>
                            <TableCell>
                              <StatusBadge status={visitor.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 방문예약 테이블 */}
            <Card>
              <CardHeader>
                <CardTitle>방문예약 ({allReservedVisitors.length}건)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">로딩 중...</div>
                ) : allReservedVisitors.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    등록된 예약이 없습니다
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>방문 일자</TableHead>
                          <TableHead>방문자명</TableHead>
                          <TableHead>소속</TableHead>
                          <TableHead>연락처</TableHead>
                          <TableHead>방문목적</TableHead>
                          <TableHead>담당자</TableHead>
                          <TableHead>상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allReservedVisitors.map((visitor) => (
                          <TableRow key={visitor.id}>
                            <TableCell>{visitor.visitDate}</TableCell>
                            <TableCell>{visitor.name || "-"}</TableCell>
                            <TableCell>{visitor.company}</TableCell>
                            <TableCell>{visitor.phone}</TableCell>
                            <TableCell>{PURPOSE_LABELS[visitor.purpose] || visitor.purpose}</TableCell>
                            <TableCell>{visitor.responsiblePerson}</TableCell>
                            <TableCell>
                              <StatusBadge status={visitor.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 방문 등록 탭 */}
        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-register-title">방문자 등록</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    // ALCOA+ 원칙 확인 검증을 먼저 실행
                    if (!alcoaDialogViewed) {
                      toast({
                        title: "ALCOA+ 원칙 확인 필요",
                        description: "방문 등록 전에 반드시 'ALCOA+ 원칙 보기' 버튼을 클릭하여 원칙을 확인해주세요.",
                        variant: "destructive",
                      });
                      return;
                    }
                    // ALCOA+ 원칙 확인 후 react-hook-form 검증 실행
                    form.handleSubmit(onSubmit)(e);
                  }} 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>방문자명 *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="홍길동" 
                            {...field} 
                            data-testid="input-name" 
                            required 
                            onFocus={(e) => {
                              setTimeout(() => {
                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }, 100);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => {
                      const isInputMode = companyInputMode === "input";
                      const selectValue = isInputMode ? undefined : (settings.companies.includes(field.value || "") ? field.value : undefined);
                      
                      return (
                        <FormItem>
                          <FormLabel>소속 *</FormLabel>
                          {settings.companies.length > 0 ? (
                            <Select 
                              onValueChange={(value) => {
                                if (value === "__CUSTOM_INPUT__") {
                                  setCompanyInputMode("input");
                                  field.onChange("");
                                } else {
                                  setCompanyInputMode("select");
                                  field.onChange(value);
                                }
                              }} 
                              value={isInputMode ? "__CUSTOM_INPUT__" : selectValue}
                            >
                              <FormControl>
                                <SelectTrigger 
                                  data-testid="input-company"
                                  onFocus={(e) => {
                                    setTimeout(() => {
                                      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 100);
                                  }}
                                >
                                  <SelectValue placeholder="소속 선택" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {settings.companies.map((company) => (
                                  <SelectItem key={company} value={company}>
                                    {company}
                                  </SelectItem>
                                ))}
                                <SelectItem value="__CUSTOM_INPUT__">직접입력</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : null}
                          <Input 
                            placeholder="소속 입력" 
                            value={field.value || ""}
                            disabled={settings.companies.length > 0 && !isInputMode}
                            className={settings.companies.length > 0 ? "mt-2" : ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                            }}
                            onFocus={(e) => {
                              setTimeout(() => {
                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }, 100);
                            }}
                          />
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            {settings.companies.length > 0 
                              ? "💡 드롭다운에서 선택하거나 '직접입력'을 선택하여 입력할 수 있습니다."
                              : "💡 소속을 직접 입력하거나, 설정 탭에서 자주 사용하는 소속을 등록하여 드롭다운으로 선택할 수 있습니다."}
                          </p>
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>연락처 *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="01012345678" 
                            {...field} 
                            data-testid="input-phone" 
                            required 
                            onFocus={(e) => {
                              setTimeout(() => {
                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }, 100);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          "-" 표시 없이 숫자만 입력하세요. 예: 01012345678
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="purpose"
                    render={({ field }) => {
                      const isInputMode = purposeInputMode === "input";
                      const selectValue = isInputMode ? undefined : (settings.purposes.includes(field.value || "") ? field.value : undefined);
                      
                      return (
                        <FormItem>
                          <FormLabel>방문 목적 *</FormLabel>
                          {settings.purposes.length > 0 ? (
                            <Select 
                              onValueChange={(value) => {
                                if (value === "__CUSTOM_INPUT__") {
                                  setPurposeInputMode("input");
                                  field.onChange("");
                                } else {
                                  setPurposeInputMode("select");
                                  field.onChange(value);
                                }
                              }} 
                              value={isInputMode ? "__CUSTOM_INPUT__" : selectValue}
                            >
                              <FormControl>
                                <SelectTrigger 
                                  data-testid="select-purpose"
                                  onFocus={(e) => {
                                    setTimeout(() => {
                                      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 100);
                                  }}
                                >
                                  <SelectValue placeholder="방문목적 선택" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {settings.purposes.map((purpose) => (
                                  <SelectItem key={purpose} value={purpose}>
                                    {PURPOSE_LABELS[purpose] || purpose}
                                  </SelectItem>
                                ))}
                                <SelectItem value="__CUSTOM_INPUT__">직접입력</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : null}
                          <Input 
                            placeholder="방문목적 입력" 
                            value={field.value || ""}
                            disabled={settings.purposes.length > 0 && !isInputMode}
                            className={settings.purposes.length > 0 ? "mt-2" : ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                            }}
                            onFocus={(e) => {
                              setTimeout(() => {
                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }, 100);
                            }}
                          />
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            {settings.purposes.length > 0 
                              ? "💡 드롭다운에서 선택하거나 '직접입력'을 선택하여 입력할 수 있습니다."
                              : "💡 방문목적을 직접 입력하거나, 설정 탭에서 자주 사용하는 방문목적을 등록하여 드롭다운으로 선택할 수 있습니다."}
                          </p>
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="visitDate"
                    render={({ field }) => {
                      const today = new Date().toISOString().split('T')[0];
                      return (
                      <FormItem>
                        <FormLabel>방문 일자 *</FormLabel>
                        <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              data-testid="input-visit-date" 
                              required 
                              min={today}
                              onFocus={(e) => {
                                setTimeout(() => {
                                  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 100);
                              }}
                            />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="visitTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>방문 시간 * (자동 저장, 수정 불가)</FormLabel>
                        <FormControl>
                          <Input 
                            type="time" 
                            {...field} 
                            data-testid="input-visit-time" 
                            required 
                            readOnly
                            disabled
                            className="bg-muted cursor-not-allowed"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          방문 등록 시 현재 시간이 자동으로 저장됩니다. (수정 불가)
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responsiblePerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>담당자 *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger 
                              data-testid="input-responsible"
                              onFocus={(e) => {
                                setTimeout(() => {
                                  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 100);
                              }}
                            >
                              <SelectValue placeholder="담당자 선택" />
                            </SelectTrigger>
                        </FormControl>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={`${user.name} (${user.employeeId})`}>
                                {user.name} ({user.employeeId})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2 lg:col-span-3">
                        <FormLabel>비고</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="추가 정보를 입력하세요" 
                            {...field} 
                            data-testid="textarea-notes" 
                            onFocus={(e) => {
                              setTimeout(() => {
                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }, 100);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* D.I 준수 교육 섹션 */}
                  <div className="md:col-span-2 lg:col-span-3 border-t pt-6 mt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <FormLabel className="text-base font-semibold">D.I 준수 교육 *</FormLabel>
                          {!alcoaDialogViewed && (
                            <p className="text-xs text-red-600 font-medium mt-1">
                              ⚠️ 반드시 "ALCOA+ 원칙 보기"를 클릭하여 원칙을 확인해주세요.
                            </p>
                          )}
                          {alcoaDialogViewed && (
                            <p className="text-xs text-green-600 font-medium mt-1">
                              ✓ ALCOA+ 원칙을 확인하셨습니다.
                            </p>
                          )}
                        </div>
                        <Dialog 
                          open={alcoaDialogOpen} 
                          onOpenChange={(open) => {
                            setAlcoaDialogOpen(open);
                            if (open) {
                              setAlcoaDialogViewed(true);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button 
                              type="button" 
                              variant={alcoaDialogViewed ? "default" : "outline"} 
                              size="sm"
                              className={alcoaDialogViewed ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                              {alcoaDialogViewed ? "✓ ALCOA+ 원칙 보기 (확인됨)" : "ALCOA+ 원칙 보기"}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-bold text-center border-b-2 border-orange-500 pb-2">
                                ALCOA+원칙
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 py-4">
                              {/* ALCOA+ 원칙 */}
                              <div className="space-y-3">
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">■</span>
                                  <div>
                                    <strong>Attributable (귀속성):</strong> 등록된 본인의 계정 및 서명을 사용하여
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">■</span>
                                  <div>
                                    <strong>Legible (가독성):</strong> 지워지지 않고, 명확히 읽을 수 있게
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">■</span>
                                  <div>
                                    <strong>Contemporaneous (동시성):</strong> 행위와 동시에 실시간(Real-Time)으로
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">■</span>
                                  <div>
                                    <strong>Original (원본성):</strong> 승인된 유효문서 및 데이터 원본(=True Copy)의
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">■</span>
                                  <div>
                                    <strong>Accurate (정확성):</strong> 정확한 기록이 되어야 한다.
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">+</span>
                                  <div>
                                    <strong>Complete (완전성):</strong> 임의 수정 및 삭제 없이
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">+</span>
                                  <div>
                                    <strong>Consistent (일관성):</strong> 모든 데이터가 일관되게
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">+</span>
                                  <div>
                                    <strong>Enduring (지속성):</strong> 지워지지 않게 지속적으로 보관되어
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">+</span>
                                  <div>
                                    <strong>Available (유용성):</strong> 보관기간 동안 조회, 출력되어야 한다.
                                  </div>
                                </div>
                              </div>

                              {/* 외부인 안내 */}
                              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-red-700 font-semibold text-center">
                                  시험실 출입 외부인은 본 준수사항을 숙독 하신 후 서명하여 주시길 바랍니다.
                                </p>
                              </div>

                              {/* 준수사항 */}
                              <div className="space-y-2">
                                <h3 className="font-semibold text-lg mb-3">준수사항</h3>
                                <ul className="space-y-2 list-disc list-inside">
                                  <li>데이터의 작성 및 기록과 보관에 대해 ALCOA+ 원칙 및 요구사항 준수</li>
                                  <li>데이터 및 기록들에 대해서 의도적으로 조작 및 위조 금지</li>
                                  <li>유리한 결과나 특정한 결과를 얻기 위해 또는 예상치 못한 상황을 피하기 위한 테스트성 시험 진행 금지</li>
                                  <li>문서화된 적절한 사유 없이 진행중인 시험 정지하거나 중단 금지</li>
                                  <li>부여된 권한 이외의 작업 금지</li>
                                  <li>모든 작업은 광동제약 GMP 규정 및 절차에 따라 실시</li>
                                </ul>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="di-training-na"
                          checked={diTrainingNA}
                          onCheckedChange={(checked) => {
                            setDiTrainingNA(checked as boolean);
                            if (checked) {
                              form.setValue("diTrainingSignature", "");
                            } else {
                              form.setValue("diTrainingNAReason", "");
                            }
                          }}
                        />
                        <Label htmlFor="di-training-na" className="text-sm font-normal cursor-pointer">
                          N/A (해당사항 없음)
                        </Label>
                      </div>

                      {diTrainingNA ? (
                        <FormField
                          control={form.control}
                          name="diTrainingNAReason"
                          rules={{
                            required: "N/A 선택 시 사유를 입력해주세요.",
                          }}
                          render={({ field }) => (
                            <FormItem className="md:col-span-2 lg:col-span-3">
                              <FormLabel>N/A 사유 *</FormLabel>
                              {settings.naReasons.length > 0 && (
                                <Select 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                  }} 
                                  value={field.value || undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger 
                                      data-testid="select-na-reason"
                                      onFocus={(e) => {
                                        setTimeout(() => {
                                          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 100);
                                      }}
                                    >
                                      <SelectValue placeholder="N/A 사유 선택" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {settings.naReasons.map((naReason) => (
                                      <SelectItem key={naReason} value={naReason}>
                                        {naReason}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <FormControl>
                                <Textarea 
                                  placeholder={settings.naReasons.length > 0 ? "위 드롭다운에서 선택하거나 직접 입력하세요" : "N/A 사유를 입력하세요"} 
                                  {...field} 
                                  data-testid="textarea-na-reason"
                                  className={settings.naReasons.length > 0 ? "mt-2" : ""}
                                  rows={3}
                                  onFocus={(e) => {
                                    setTimeout(() => {
                                      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 100);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                              {settings.naReasons.length > 0 ? (
                                <p className="text-xs text-muted-foreground mt-1">
                                  💡 위 드롭다운에서 선택하거나 아래 입력란에 직접 입력할 수 있습니다. 자주 사용하는 N/A 사유는 설정 탭에서 등록해주세요.
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground mt-1">
                                  N/A가 해당되는 경우 사유를 입력하거나, 설정 탭에서 자주 사용하는 N/A 사유를 등록하여 드롭다운으로 선택할 수 있습니다.
                                </p>
                              )}
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="diTrainingSignature"
                          rules={{
                            required: alcoaDialogViewed ? "서명을 입력해주세요." : false,
                            validate: (value) => {
                              if (!alcoaDialogViewed) {
                                return "먼저 ALCOA+ 원칙을 확인해주세요.";
                              }
                              if (!value || value.trim() === '') {
                                return "서명을 입력해주세요.";
                              }
                              return true;
                            },
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>서명 *</FormLabel>
                              <FormControl>
                                <SignaturePad
                                  value={field.value}
                                  onChange={(signature) => {
                                    field.onChange(signature);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                              <p className="text-xs text-muted-foreground">
                                ALCOA+ 원칙 및 준수사항을 확인하고 서명해주세요. 마우스 또는 터치스크린으로 서명할 수 있습니다.
                              </p>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2 lg:col-span-3">
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      data-testid="button-submit-visitor"
                    >
                      {createMutation.isPending ? "등록 중..." : "방문 등록"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 방문 예약 탭 */}
        <TabsContent value="reservations">
          <div className="space-y-6">
            {/* 예약 등록 폼 */}
            <Card>
              <CardHeader>
                <CardTitle>방문 예약 등록</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...reservationForm}>
                  <form 
                    onSubmit={reservationForm.handleSubmit(onReservationSubmit)} 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    <FormField
                      control={reservationForm.control}
                      name="name"
                      rules={{ required: "방문자명을 입력해주세요." }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>방문자명 *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="홍길동" 
                              {...field} 
                              onFocus={(e) => { setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={reservationForm.control}
                      name="phone"
                      rules={{ required: "연락처를 입력해주세요." }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>연락처 *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="01012345678" 
                              {...field} 
                              onFocus={(e) => { setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); }}
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            "-" 표시 없이 숫자만 입력하세요. 예: 01012345678
                          </p>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={reservationForm.control}
                      name="company"
                      rules={{ required: "소속을 입력해주세요." }}
                      render={({ field }) => {
                        const isInputMode = reservationCompanyInputMode === "input";
                        const selectValue = isInputMode ? undefined : (settings.companies.includes(field.value || "") ? field.value : undefined);
                        
                        return (
                          <FormItem>
                            <FormLabel>소속 *</FormLabel>
                            {settings.companies.length > 0 ? (
                              <Select 
                                onValueChange={(value) => {
                                  if (value === "__CUSTOM_INPUT__") {
                                    setReservationCompanyInputMode("input");
                                    field.onChange("");
                                  } else {
                                    setReservationCompanyInputMode("select");
                                    field.onChange(value);
                                  }
                                }} 
                                value={isInputMode ? "__CUSTOM_INPUT__" : selectValue}
                              >
                                <FormControl>
                                  <SelectTrigger onFocus={(e) => { setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); }}>
                                    <SelectValue placeholder="소속 선택" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {settings.companies.map((company) => (
                                    <SelectItem key={company} value={company}>
                                      {company}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="__CUSTOM_INPUT__">직접입력</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : null}
                            <Input 
                              placeholder="소속 입력" 
                              value={field.value || ""}
                              disabled={settings.companies.length > 0 && !isInputMode}
                              className={settings.companies.length > 0 ? "mt-2" : ""}
                              onChange={(e) => {
                                field.onChange(e.target.value);
                              }}
                              onFocus={(e) => { setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); }}
                            />
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">
                              {settings.companies.length > 0
                                ? "💡 드롭다운에서 선택하거나 '직접입력'을 선택하여 입력할 수 있습니다."
                                : "💡 소속을 직접 입력하거나, 설정 탭에서 자주 사용하는 소속을 등록하여 드롭다운으로 선택할 수 있습니다."}
                            </p>
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={reservationForm.control}
                      name="purpose"
                      rules={{ required: "방문 목적을 입력해주세요." }}
                      render={({ field }) => {
                        const isInputMode = reservationPurposeInputMode === "input";
                        const selectValue = isInputMode ? undefined : (settings.purposes.includes(field.value || "") ? field.value : undefined);
                        
                        return (
                          <FormItem>
                            <FormLabel>방문 목적 *</FormLabel>
                            {settings.purposes.length > 0 ? (
                              <Select 
                                onValueChange={(value) => {
                                  if (value === "__CUSTOM_INPUT__") {
                                    setReservationPurposeInputMode("input");
                                    field.onChange("");
                                  } else {
                                    setReservationPurposeInputMode("select");
                                    field.onChange(value);
                                  }
                                }} 
                                value={isInputMode ? "__CUSTOM_INPUT__" : selectValue}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="방문목적 선택" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {settings.purposes.map((purpose) => (
                                    <SelectItem key={purpose} value={purpose}>
                                      {PURPOSE_LABELS[purpose] || purpose}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="__CUSTOM_INPUT__">직접입력</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : null}
                            <Input 
                              placeholder="방문목적 입력" 
                              value={field.value || ""}
                              disabled={settings.purposes.length > 0 && !isInputMode}
                              className={settings.purposes.length > 0 ? "mt-2" : ""}
                              onChange={(e) => {
                                field.onChange(e.target.value);
                              }}
                            />
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">
                              {settings.purposes.length > 0 
                                ? "💡 드롭다운에서 선택하거나 '직접입력'을 선택하여 입력할 수 있습니다."
                                : "💡 방문목적을 직접 입력하거나, 설정 탭에서 자주 사용하는 방문목적을 등록하여 드롭다운으로 선택할 수 있습니다."}
                            </p>
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={reservationForm.control}
                      name="visitDate"
                      rules={{ required: "방문 일자를 선택해주세요." }}
                      render={({ field }) => {
                        const today = new Date().toISOString().split('T')[0];
                        return (
                          <FormItem>
                            <FormLabel>방문 일자 *</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                required 
                                min={today}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={reservationForm.control}
                      name="responsiblePerson"
                      rules={{ required: "담당자를 선택해주세요." }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>담당자 *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="담당자 선택" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={`${user.name} (${user.employeeId})`}>
                                  {user.name} ({user.employeeId})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={reservationForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2 lg:col-span-3">
                          <FormLabel>비고</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="추가 정보를 입력하세요" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="md:col-span-2 lg:col-span-3">
                      <Button 
                        type="submit" 
                        disabled={createReservationMutation.isPending}
                      >
                        {createReservationMutation.isPending ? "예약 중..." : "예약 등록"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* 예약 목록 */}
            <Card>
              <CardHeader>
                <CardTitle>예약 목록</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">로딩 중...</div>
                ) : allReservedVisitors.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    등록된 예약이 없습니다
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>방문 일자</TableHead>
                          <TableHead>방문자명</TableHead>
                          <TableHead>연락처</TableHead>
                          <TableHead>소속</TableHead>
                          <TableHead>방문 목적</TableHead>
                          <TableHead>담당자</TableHead>
                          <TableHead>비고</TableHead>
                          <TableHead>관리</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allReservedVisitors.map((reservation: Visitor) => (
                          <TableRow key={reservation.id}>
                            <TableCell>{reservation.visitDate}</TableCell>
                            <TableCell>{reservation.name || "-"}</TableCell>
                            <TableCell>{reservation.phone || "-"}</TableCell>
                            <TableCell>{reservation.company}</TableCell>
                            <TableCell>{PURPOSE_LABELS[reservation.purpose] || reservation.purpose}</TableCell>
                            <TableCell>{reservation.responsiblePerson}</TableCell>
                            <TableCell>{reservation.notes || "-"}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    // 예약 정보를 방문 등록 폼에 채워넣기
                                    form.reset({
                                      name: reservation.name || "",
                                      company: reservation.company,
                                      phone: reservation.phone || "",
                                      purpose: reservation.purpose,
                                      visitDate: reservation.visitDate,
                                      visitTime: "", // 방문 등록 완료 시 현재 시간으로 자동 설정됨
                                      responsiblePerson: reservation.responsiblePerson,
                                      notes: reservation.notes || "",
                                      diTrainingNA: false,
                                      diTrainingSignature: "",
                                      diTrainingNAReason: "",
                                    });
                                    // 예약 정보에서 가져온 값이 설정 목록에 있으면 select 모드, 없으면 input 모드
                                    setCompanyInputMode(settings.companies.includes(reservation.company) ? "select" : "input");
                                    setPurposeInputMode(settings.purposes.includes(reservation.purpose) ? "select" : "input");
                                    setAlcoaDialogViewed(false);
                                    setDiTrainingNA(false);
                                    // 방문 등록 탭으로 이동
                                    setActiveTab("register");
                                    // 예약 ID 저장 (방문 등록 완료 시 예약을 업데이트하기 위해)
                                    setSelectedReservation(reservation);
                                  }}
                                >
                                  방문등록하기
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm(`예약을 취소하시겠습니까?\n방문자: ${reservation.name || "-"}\n방문 일자: ${reservation.visitDate}`)) {
                                      cancelReservationMutation.mutate(reservation.id);
                                    }
                                  }}
                                  disabled={cancelReservationMutation.isPending}
                                >
                                  {cancelReservationMutation.isPending ? "취소 중..." : "예약 취소"}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        {/* 방문 이력 탭 */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-history-title">방문 이력 조회</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <Label>조회 기간 (시작)</Label>
                    <Input 
                      type="date" 
                      value={searchFilters.startDate}
                      onChange={(e) => setSearchFilters({ ...searchFilters, startDate: e.target.value })}
                      data-testid="input-start-date" 
                    />
                </div>
                <div>
                    <Label>조회 기간 (종료)</Label>
                    <Input 
                      type="date" 
                      value={searchFilters.endDate}
                      onChange={(e) => setSearchFilters({ ...searchFilters, endDate: e.target.value })}
                      data-testid="input-end-date" 
                    />
                </div>
                <div>
                  <Label>방문자명</Label>
                    <Input 
                      placeholder="전체" 
                      value={searchFilters.name}
                      onChange={(e) => setSearchFilters({ ...searchFilters, name: e.target.value })}
                      data-testid="input-search-name" 
                    />
                </div>
                <div>
                  <Label>담당자</Label>
                    <Input 
                      placeholder="전체" 
                      value={searchFilters.responsiblePerson}
                      onChange={(e) => setSearchFilters({ ...searchFilters, responsiblePerson: e.target.value })}
                      data-testid="input-search-responsible" 
                    />
                  </div>
                  <div>
                    <Label>소속</Label>
                    <Input 
                      placeholder="전체" 
                      value={searchFilters.company}
                      onChange={(e) => setSearchFilters({ ...searchFilters, company: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>방문 목적</Label>
                    <Select 
                      value={searchFilters.purpose || undefined} 
                      onValueChange={(value) => setSearchFilters({ ...searchFilters, purpose: value || "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="전체" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="audit">실사/감사</SelectItem>
                        <SelectItem value="meeting">회의</SelectItem>
                        <SelectItem value="equipment">장비 점검</SelectItem>
                        <SelectItem value="delivery">납품</SelectItem>
                        <SelectItem value="other">기타</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
              </div>
              <div className="flex gap-3">
                  <Button onClick={handleSearch} data-testid="button-search">
                    <Search className="mr-2 h-4 w-4" />
                    조회
                  </Button>
                  <Button variant="outline" onClick={handleResetFilters}>
                    <X className="mr-2 h-4 w-4" />
                    필터 초기화
                  </Button>
                  <Button variant="outline" onClick={handleExportExcel} data-testid="button-excel">
                    <Download className="mr-2 h-4 w-4" />
                    Excel 다운로드
                  </Button>
                </div>
              </div>

              <div className="mt-6">
                {isLoadingHistory ? (
                  <div className="text-center py-12">로딩 중...</div>
                ) : visitors.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    조회된 방문 이력이 없습니다
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>방문일자</TableHead>
                          <TableHead>시간</TableHead>
                          <TableHead>방문자명</TableHead>
                          <TableHead>소속</TableHead>
                          <TableHead>연락처</TableHead>
                          <TableHead>방문목적</TableHead>
                          <TableHead>담당자</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visitors.map((visitor) => (
                          <TableRow key={visitor.id}>
                            <TableCell>{visitor.visitDate}</TableCell>
                            <TableCell>{visitor.visitTime || "-"}</TableCell>
                            <TableCell>{visitor.name}</TableCell>
                            <TableCell>{visitor.company}</TableCell>
                            <TableCell>{visitor.phone}</TableCell>
                            <TableCell>{PURPOSE_LABELS[visitor.purpose] || visitor.purpose}</TableCell>
                            <TableCell>{visitor.responsiblePerson}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      {/* 예약 완료 다이얼로그 */}
      <Dialog open={reservationCompleteDialogOpen} onOpenChange={setReservationCompleteDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>예약 완료 - 방문자 정보 입력</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>예약 정보</Label>
                <div className="p-4 bg-muted rounded-md space-y-2">
                  <div><strong>소속:</strong> {selectedReservation.company}</div>
                  <div><strong>방문 일자:</strong> {selectedReservation.visitDate}</div>
                  <div><strong>방문 목적:</strong> {PURPOSE_LABELS[selectedReservation.purpose] || selectedReservation.purpose}</div>
                  <div><strong>담당자:</strong> {selectedReservation.responsiblePerson}</div>
                  {selectedReservation.notes && (
                    <div><strong>비고:</strong> {selectedReservation.notes}</div>
                  )}
                </div>
              </div>

              <Form {...form}>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!alcoaDialogViewed) {
                      toast({
                        title: "ALCOA+ 원칙 확인 필요",
                        description: "방문 등록 전에 반드시 'ALCOA+ 원칙 보기' 버튼을 클릭하여 원칙을 확인해주세요.",
                        variant: "destructive",
                      });
                      return;
                    }
                    const formData = form.getValues();
                    if (diTrainingNA) {
                      if (!formData.diTrainingNAReason || formData.diTrainingNAReason.trim() === '') {
                        toast({
                          title: "사유 필요",
                          description: "N/A 선택 시 사유를 입력해주세요.",
                          variant: "destructive",
                        });
                        return;
                      }
                    } else {
                      if (!formData.diTrainingSignature || formData.diTrainingSignature.trim() === '') {
                        toast({
                          title: "서명 필요",
                          description: "D.I 준수 교육 서명이 필요합니다.",
                          variant: "destructive",
                        });
                        return;
                      }
                    }
                    completeReservationMutation.mutate({
                      id: selectedReservation.id,
                      name: formData.name,
                      phone: formData.phone,
                      diTrainingNA: diTrainingNA,
                      diTrainingSignature: formData.diTrainingSignature,
                      diTrainingNAReason: formData.diTrainingNAReason,
                    });
                  }}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: "방문자명을 입력해주세요." }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>방문자명 *</FormLabel>
                        <FormControl>
                          <Input placeholder="홍길동" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    rules={{ required: "연락처를 입력해주세요." }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>연락처 *</FormLabel>
                        <FormControl>
                          <Input placeholder="01012345678" {...field} />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          "-" 표시 없이 숫자만 입력하세요. 예: 01012345678
                        </p>
                      </FormItem>
                    )}
                  />

                  {/* D.I 준수 교육 섹션 */}
                  <div className="border-t pt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <FormLabel className="text-base font-semibold">D.I 준수 교육 *</FormLabel>
                          {!alcoaDialogViewed && (
                            <p className="text-xs text-red-600 font-medium mt-1">
                              ⚠️ 반드시 "ALCOA+ 원칙 보기"를 클릭하여 원칙을 확인해주세요.
                            </p>
                          )}
                          {alcoaDialogViewed && (
                            <p className="text-xs text-green-600 font-medium mt-1">
                              ✓ ALCOA+ 원칙을 확인하셨습니다.
                            </p>
                          )}
                        </div>
                        <Dialog 
                          open={alcoaDialogOpen} 
                          onOpenChange={(open) => {
                            setAlcoaDialogOpen(open);
                            if (open) {
                              setAlcoaDialogViewed(true);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button 
                              type="button" 
                              variant={alcoaDialogViewed ? "default" : "outline"} 
                              size="sm"
                              className={alcoaDialogViewed ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                              {alcoaDialogViewed ? "✓ ALCOA+ 원칙 보기 (확인됨)" : "ALCOA+ 원칙 보기"}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-bold text-center border-b-2 border-orange-500 pb-2">
                                ALCOA+원칙
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 py-4">
                              {/* ALCOA+ 원칙 내용은 기존과 동일 */}
                              <div className="space-y-3">
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">■</span>
                                  <div>
                                    <strong>Attributable (귀속성):</strong> 등록된 본인의 계정 및 서명을 사용하여
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">■</span>
                                  <div>
                                    <strong>Legible (가독성):</strong> 지워지지 않고, 명확히 읽을 수 있게
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">■</span>
                                  <div>
                                    <strong>Contemporaneous (동시성):</strong> 행위와 동시에 실시간(Real-Time)으로
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">■</span>
                                  <div>
                                    <strong>Original (원본성):</strong> 승인된 유효문서 및 데이터 원본(=True Copy)의
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">■</span>
                                  <div>
                                    <strong>Accurate (정확성):</strong> 정확한 기록이 되어야 한다.
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">+</span>
                                  <div>
                                    <strong>Complete (완전성):</strong> 임의 수정 및 삭제 없이
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">+</span>
                                  <div>
                                    <strong>Consistent (일관성):</strong> 모든 데이터가 일관되게
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">+</span>
                                  <div>
                                    <strong>Enduring (지속성):</strong> 지워지지 않게 지속적으로 보관되어
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-orange-500 mr-2">+</span>
                                  <div>
                                    <strong>Available (유용성):</strong> 보관기간 동안 조회, 출력되어야 한다.
                                  </div>
                                </div>
                              </div>
                              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-red-700 font-semibold text-center">
                                  시험실 출입 외부인은 본 준수사항을 숙독 하신 후 서명하여 주시길 바랍니다.
                                </p>
                              </div>
                              <div className="space-y-2">
                                <h3 className="font-semibold text-lg mb-3">준수사항</h3>
                                <ul className="space-y-2 list-disc list-inside">
                                  <li>데이터의 작성 및 기록과 보관에 대해 ALCOA+ 원칙 및 요구사항 준수</li>
                                  <li>데이터 및 기록들에 대해서 의도적으로 조작 및 위조 금지</li>
                                  <li>유리한 결과나 특정한 결과를 얻기 위해 또는 예상치 못한 상황을 피하기 위한 테스트성 시험 진행 금지</li>
                                  <li>문서화된 적절한 사유 없이 진행중인 시험 정지하거나 중단 금지</li>
                                  <li>부여된 권한 이외의 작업 금지</li>
                                  <li>모든 작업은 광동제약 GMP 규정 및 절차에 따라 실시</li>
                                </ul>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="reservation-di-training-na"
                          checked={diTrainingNA}
                          onCheckedChange={(checked) => {
                            setDiTrainingNA(checked as boolean);
                            if (checked) {
                              form.setValue("diTrainingSignature", "");
                            } else {
                              form.setValue("diTrainingNAReason", "");
                            }
                          }}
                        />
                        <Label htmlFor="reservation-di-training-na" className="text-sm font-normal cursor-pointer">
                          N/A (해당사항 없음)
                        </Label>
                      </div>

                      {diTrainingNA ? (
                        <FormField
                          control={form.control}
                          name="diTrainingNAReason"
                          rules={{ required: "N/A 선택 시 사유를 입력해주세요." }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>N/A 사유 *</FormLabel>
                              {settings.naReasons.length > 0 && (
                                <Select 
                                  onValueChange={(value) => field.onChange(value)} 
                                  value={field.value || undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="N/A 사유 선택" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {settings.naReasons.map((naReason) => (
                                      <SelectItem key={naReason} value={naReason}>
                                        {naReason}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <FormControl>
                                <Textarea 
                                  placeholder={settings.naReasons.length > 0 ? "위 드롭다운에서 선택하거나 직접 입력하세요" : "N/A 사유를 입력하세요"} 
                                  {...field} 
                                  className={settings.naReasons.length > 0 ? "mt-2" : ""}
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="diTrainingSignature"
                          rules={{
                            required: alcoaDialogViewed ? "서명을 입력해주세요." : false,
                            validate: (value) => {
                              if (!alcoaDialogViewed) {
                                return "먼저 ALCOA+ 원칙을 확인해주세요.";
                              }
                              if (!value || value.trim() === '') {
                                return "서명을 입력해주세요.";
                              }
                              return true;
                            },
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>서명 *</FormLabel>
                              <FormControl>
                                <SignaturePad
                                  value={field.value}
                                  onChange={(signature) => {
                                    field.onChange(signature);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                              <p className="text-xs text-muted-foreground">
                                ALCOA+ 원칙 및 준수사항을 확인하고 서명해주세요. 마우스 또는 터치스크린으로 서명할 수 있습니다.
                              </p>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setReservationCompleteDialogOpen(false);
                        setSelectedReservation(null);
                        form.reset();
                        setCompanyInputMode("select");
                        setPurposeInputMode("select");
                        setAlcoaDialogViewed(false);
                        setDiTrainingNA(false);
                      }}
                    >
                      취소
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={completeReservationMutation.isPending}
                    >
                      {completeReservationMutation.isPending ? "등록 중..." : "방문 등록 완료"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
