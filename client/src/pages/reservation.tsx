import { useState, useEffect } from "react";
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
import { ArrowLeft, ChevronLeft, ChevronRight, Settings, Pencil, Trash2, Calendar as CalendarIcon, Clock, BarChart as BarChartIcon, User } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface EquipmentMaster {
  id: string;
  code: string;
  name: string;
  location: string;
}

interface Reservation {
  id: string;
  equipmentId: string;
  equipmentName: string;
  userName: string;
  reservationDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  purpose: string;
  testItem?: string;
  sampleCount?: number;
  notes?: string;
  status: string;
}

interface InsertReservation {
  equipmentId: string;
  equipmentName: string;
  userName: string;
  reservationDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  purpose: string;
  testItem?: string;
  sampleCount?: number;
  notes?: string;
}

interface UserInfo {
  employeeId: string;
  name: string;
}

interface UserMaster {
  id: string;
  employeeId: string;
  name: string;
  isAdmin?: boolean;
}

export default function ReservationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("calendar");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"equipment" | "user">("equipment");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEquipmentFilter, setSelectedEquipmentFilter] = useState<string>("all");
  const [calendarLocationFilter, setCalendarLocationFilter] = useState<string>("all");
  const [purposeInputMode, setPurposeInputMode] = useState<"select" | "input">("select");
  
  // 로그인 상태 관리
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem("reservation_logged_in_user");
    return saved !== null;
  });
  const [loginEmployeeId, setLoginEmployeeId] = useState("");
  const [loginName, setLoginName] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(() => {
    const saved = localStorage.getItem("reservation_logged_in_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // 사용자 마스터 등록/수정 폼
  const userForm = useForm<UserMaster>({
    defaultValues: {
      id: "",
      employeeId: "",
      name: "",
      isAdmin: false,
    },
  });

  // 현재 로그인한 사용자가 관리자인지 확인
  const isCurrentUserAdmin = () => {
    if (!userInfo || !userMasterList.length) return false;
    const currentUser = userMasterList.find(
      (u) => u.employeeId === userInfo.employeeId && u.name === userInfo.name
    );
    return currentUser?.isAdmin === true;
  };


  // 사용자 마스터 등록/수정 Mutation
  const userMutation = useMutation({
    mutationFn: async (data: UserMaster) => {
      try {
        // isAdmin 필드를 명시적으로 포함하여 전송
        const requestData = {
          employeeId: data.employeeId,
          name: data.name,
          isAdmin: data.isAdmin === true, // 명시적으로 boolean으로 변환
        };
        
        console.log('API 요청 데이터:', requestData);
        
        if (isEditingUser) {
          const response = await apiRequest("PUT", `/api/user-master/${data.id}`, requestData);
          return await response.json();
        } else {
          const response = await apiRequest("POST", "/api/user-master", requestData);
          return await response.json();
        }
      } catch (error: any) {
        // 에러 응답에서 상세 메시지 추출
        const errorMessage = error?.message || `사용자 ${isEditingUser ? "수정" : "등록"}에 실패했습니다.`;
        throw new Error(errorMessage);
      }
    },
    onSuccess: async (responseData) => {
      // 서버 응답 데이터 확인
      console.log('✅ 사용자 수정/등록 성공 응답:', responseData);
      console.log('✅ 응답 데이터 isAdmin 값:', responseData?.data?.isAdmin);
      
      // 사용자 목록 강제 갱신 (캐시 무효화 후 재조회)
      queryClient.invalidateQueries({ queryKey: ["/api/user-master"] });
      const refetchResult = await refetchUserMaster();
      console.log('✅ 사용자 목록 갱신 완료:', refetchResult.data?.data?.find((u: UserMaster) => u.id === responseData?.data?.id));
      
      // 관리자 권한 상태에 따른 메시지 생성
      const isAdmin = responseData?.data?.isAdmin === true;
      let adminMessage = '';
      if (isEditingUser) {
        // 수정 시: 관리자 권한이 부여되었는지 제거되었는지 확인
        const previousUser = userMasterList.find((u: UserMaster) => u.id === responseData?.data?.id);
        const wasAdmin = previousUser?.isAdmin === true;
        
        if (isAdmin && !wasAdmin) {
          adminMessage = ' (관리자 권한 부여됨)';
        } else if (!isAdmin && wasAdmin) {
          adminMessage = ' (관리자 권한 제거됨)';
        }
      } else {
        // 등록 시: 관리자 권한이 부여되었는지만 확인
        if (isAdmin) {
          adminMessage = ' (관리자 권한 부여됨)';
        }
      }
      
      toast({
        title: isEditingUser ? "수정 완료" : "등록 완료",
        description: `사용자가 ${isEditingUser ? "수정" : "등록"}되었습니다.${adminMessage}`,
      });
      userForm.reset({
        id: "",
        employeeId: "",
        name: "",
        isAdmin: false,
      });
      setIsEditingUser(false);
    },
    onError: (error: Error) => {
      console.error("사용자 등록/수정 오류:", error);
      toast({
        title: isEditingUser ? "수정 실패" : "등록 실패",
        description: error.message || `사용자 ${isEditingUser ? "수정" : "등록"}에 실패했습니다.`,
        variant: "destructive",
      });
    },
  });

  // 사용자 마스터 삭제 Mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/user-master/${id}`);
    },
    onSuccess: (_data, id) => {
      refetchUserMaster();
      toast({
        title: "삭제 완료",
        description: "사용자가 삭제되었습니다.",
      });
      // 삭제된 사용자가 현재 로그인된 사용자면 로그아웃
      if (userInfo && userMasterList.find(u => u.id === id)?.name === userInfo.name) {
        handleLogout();
      }
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "사용자 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: UserMaster) => {
    setIsEditingUser(true);
    // isAdmin 필드를 명시적으로 boolean으로 변환하여 폼에 설정
    userForm.reset({
      ...user,
      isAdmin: user.isAdmin === true,
    });
  };

  const handleDeleteUser = (id: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteUserMutation.mutate(id);
    }
  };

  const handleUserSubmit = (data: UserMaster) => {
    // isAdmin 필드를 명시적으로 boolean으로 변환하여 전송
    const submitData: UserMaster = {
      ...data,
      isAdmin: data.isAdmin === true,
    };
    console.log('사용자 제출 데이터:', submitData);
    userMutation.mutate(submitData);
  };

  const handleNewUser = () => {
    setIsEditingUser(false);
    userForm.reset({
      id: "",
      employeeId: "",
      name: "",
      isAdmin: false,
    });
  };


  // 사용자 정보가 변경되면 폼에 자동 입력
  useEffect(() => {
    if (userInfo) {
      // 이름만 사용하거나 "사번 - 이름" 형식으로 표시
      const displayName = userInfo.employeeId 
        ? `${userInfo.employeeId} - ${userInfo.name}` 
        : userInfo.name;
      form.setValue("userName", displayName);
    }
  }, [userInfo]);

  // 현재 사용자 표시명
  const currentUserDisplay = userInfo 
    ? (userInfo.employeeId ? `${userInfo.employeeId} - ${userInfo.name}` : userInfo.name)
    : "";

  // 장비 마스터 조회
  const { data: equipmentMasterData, refetch: refetchEquipmentMaster } = useQuery<{ success: boolean; data: EquipmentMaster[] }>({
    queryKey: ["/api/equipment-master"],
    queryFn: async () => {
      const response = await fetch("/api/equipment-master");
      if (!response.ok) throw new Error("장비 마스터 조회 실패");
      return response.json();
    },
  });

  const equipmentMasterList = equipmentMasterData?.data || [];

  // 사용자 마스터 조회
  const { data: userMasterData, refetch: refetchUserMaster } = useQuery<{ success: boolean; data: UserMaster[] }>({
    queryKey: ["/api/user-master"],
    queryFn: async () => {
      const response = await fetch("/api/user-master");
      if (!response.ok) throw new Error("사용자 마스터 조회 실패");
      const result = await response.json();
      console.log('사용자 마스터 조회 결과:', result);
      // 데이터 정규화: isAdmin 필드가 없는 경우 false로 설정
      if (result.data && Array.isArray(result.data)) {
        result.data = result.data.map((u: UserMaster) => ({
          ...u,
          isAdmin: u.isAdmin === true, // 명시적으로 boolean으로 변환
        }));
      }
      return result;
    },
    refetchOnWindowFocus: true, // 창 포커스 시 자동 갱신
  });

  const userMasterList = userMasterData?.data || [];
  
  // 디버깅: 사용자 목록 데이터 확인
  useEffect(() => {
    if (userMasterList.length > 0) {
      console.log('userMasterList 업데이트:', userMasterList.map(u => ({ id: u.id, name: u.name, isAdmin: u.isAdmin })));
    }
  }, [userMasterList]);

  // 로그인 처리
  const handleLogin = () => {
    if (!loginEmployeeId.trim()) {
      toast({
        title: "입력 오류",
        description: "사번을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!loginName.trim()) {
      toast({
        title: "입력 오류",
        description: "이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 사용자 마스터에서 일치하는 사용자 찾기
    const matchedUser = userMasterList.find((user) => {
      const nameMatch = user.name.trim() === loginName.trim();
      const employeeIdMatch = user.employeeId.trim() === loginEmployeeId.trim();
      
      return nameMatch && employeeIdMatch;
    });

    if (!matchedUser) {
      toast({
        title: "로그인 실패",
        description: "사번과 이름이 일치하는 사용자를 찾을 수 없습니다. 설정에서 사용자를 등록해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 로그인 성공
    const loggedInUser: UserInfo = {
      employeeId: matchedUser.employeeId,
      name: matchedUser.name,
    };
    
    setUserInfo(loggedInUser);
    setIsLoggedIn(true);
    localStorage.setItem("reservation_logged_in_user", JSON.stringify(loggedInUser));
    
    const displayName = loggedInUser.employeeId 
      ? `${loggedInUser.employeeId} - ${loggedInUser.name}` 
      : loggedInUser.name;
    
    toast({
      title: "로그인 성공",
      description: `안녕하세요, ${loggedInUser.name}님.`,
    });
    
    // 폼에 이름 자동 입력
    form.setValue("userName", displayName);
    
    // 로그인 입력 필드 초기화
    setLoginEmployeeId("");
    setLoginName("");
  };

  // 로그아웃 처리
  const handleLogout = () => {
    setUserInfo(null);
    setIsLoggedIn(false);
    localStorage.removeItem("reservation_logged_in_user");
    form.setValue("userName", "");
    setLoginEmployeeId("");
    setLoginName("");
    toast({
      title: "로그아웃",
      description: "로그아웃되었습니다.",
    });
  };

  // 위치 목록 추출
  const locations = Array.from(new Set(equipmentMasterList.map((eq) => eq.location))).sort();

  // 선택된 위치의 장비 필터링 (동적으로 업데이트됨)
  const filteredEquipment = selectedLocation && selectedLocation !== "all" && selectedLocation !== ""
    ? equipmentMasterList.filter((eq) => eq.location === selectedLocation)
    : equipmentMasterList;

  // 장비 마스터 등록/수정 폼
  const equipmentForm = useForm<EquipmentMaster>({
    defaultValues: {
      id: "",
      code: "",
      name: "",
      location: "",
    },
  });

  // 장비 마스터 등록/수정 Mutation
  const equipmentMutation = useMutation({
    mutationFn: async (data: EquipmentMaster) => {
      if (isEditing) {
        return await apiRequest("PUT", `/api/equipment-master/${data.id}`, data);
      } else {
        return await apiRequest("POST", "/api/equipment-master", data);
      }
    },
    onSuccess: () => {
      refetchEquipmentMaster();
      toast({
        title: isEditing ? "수정 완료" : "등록 완료",
        description: `장비가 ${isEditing ? "수정" : "등록"}되었습니다.`,
      });
      equipmentForm.reset();
      setIsEditing(false);
      // 장비 목록이 갱신되면 위치 목록도 자동으로 업데이트됨 (locations는 equipmentMasterList에서 동적으로 추출)
    },
    onError: () => {
      toast({
        title: isEditing ? "수정 실패" : "등록 실패",
        description: `장비 ${isEditing ? "수정" : "등록"}에 실패했습니다.`,
        variant: "destructive",
      });
    },
  });

  // 장비 마스터 삭제 Mutation
  const deleteEquipmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/equipment-master/${id}`);
    },
    onSuccess: () => {
      refetchEquipmentMaster();
      toast({
        title: "삭제 완료",
        description: "장비가 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "장비 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleEditEquipment = (equipment: EquipmentMaster) => {
    setIsEditing(true);
    equipmentForm.reset(equipment);
  };

  const handleDeleteEquipment = (id: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteEquipmentMutation.mutate(id);
    }
  };

  const handleEquipmentSubmit = (data: EquipmentMaster) => {
    equipmentMutation.mutate(data);
  };

  const handleNewEquipment = () => {
    setIsEditing(false);
    equipmentForm.reset({
      id: "",
      code: "",
      name: "",
      location: "",
    });
  };

  // 예약 관련 코드
  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/reservations"],
  });

  const form = useForm<InsertReservation>({
    defaultValues: {
      equipmentId: "",
      equipmentName: "",
      userName: currentUserDisplay || "",
      reservationDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      purpose: "",
      testItem: "",
      sampleCount: undefined,
      notes: "",
    },
  });

  // 장비 마스터 목록이 변경될 때 선택된 장비가 유효한지 확인
  useEffect(() => {
    const currentEquipmentId = form.getValues("equipmentId");
    if (currentEquipmentId) {
      const selectedEquipment = equipmentMasterList.find((eq) => eq.id === currentEquipmentId);
      
      // 선택된 장비가 삭제되었거나 위치가 변경된 경우
      if (!selectedEquipment) {
        // 장비가 삭제된 경우
        form.setValue("equipmentId", "");
        form.setValue("equipmentName", "");
        if (selectedLocation) {
          toast({
            title: "장비 정보 변경",
            description: "선택하신 장비가 삭제되었습니다. 다시 선택해주세요.",
            variant: "destructive",
          });
        }
      } else if (selectedLocation && selectedEquipment.location !== selectedLocation) {
        // 장비의 위치가 변경된 경우
        form.setValue("equipmentId", "");
        form.setValue("equipmentName", "");
        toast({
          title: "장비 위치 변경",
          description: "선택하신 장비의 위치가 변경되었습니다. 다시 선택해주세요.",
          variant: "destructive",
        });
      }
    }
  }, [equipmentMasterList, selectedLocation, form, toast]);

  // 위치 선택 시 해당 위치에 없는 장비가 선택되어 있으면 초기화
  useEffect(() => {
    const currentEquipmentId = form.getValues("equipmentId");
    if (currentEquipmentId && selectedLocation && selectedLocation !== "all" && selectedLocation !== "") {
      const selectedEquipment = filteredEquipment.find((eq) => eq.id === currentEquipmentId);
      if (!selectedEquipment) {
        form.setValue("equipmentId", "");
        form.setValue("equipmentName", "");
      }
    }
  }, [selectedLocation, filteredEquipment, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertReservation) => {
      const response = await apiRequest("POST", "/api/reservations", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "예약 생성 실패");
      }
      return await response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      toast({ title: "예약 완료", description: "장비 예약이 성공적으로 등록되었습니다." });
      
      // 현재 사용자가 설정되지 않았다면 예약자명으로 자동 설정
      if (!userInfo && variables.userName) {
        const name = variables.userName.trim();
        const newUserInfo: UserInfo = { employeeId: "", name };
        setUserInfo(newUserInfo);
        localStorage.setItem("reservation_user", JSON.stringify(newUserInfo));
        toast({ title: "사용자 자동 설정", description: `${name}님으로 사용자 정보가 설정되었습니다.` });
      }

      form.reset();
      setPurposeInputMode("select");
      setSelectedLocation("");
      setActiveTab("calendar"); // 예약 후 캘린더로 이동
    },
    onError: (error: Error) => {
      console.error("예약 실패:", error);
      toast({ 
        title: "예약 실패", 
        description: error.message || "장비 예약에 실패했습니다.", 
        variant: "destructive" 
      });
    },
  });

  // 예약 취소/삭제 Mutation
  const cancelReservationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/reservations/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "예약 취소 실패");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      toast({ title: "예약 취소", description: "예약이 취소되었습니다." });
    },
    onError: (error: Error) => {
      toast({
        title: "취소 실패",
        description: error.message || "예약 취소에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleCancelReservation = (id: string) => {
    if (confirm("정말 예약을 취소하시겠습니까?")) {
      cancelReservationMutation.mutate(id);
    }
  };

  // 날짜 변경 (Drag and Drop) Mutation - 기간 예약도 함께 이동
  const updateDateMutation = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: string }) => {
      const res = reservations.find(r => r.id === id);
      if (!res) throw new Error("Reservation not found");

      // 기간 예약인지 확인
      const hasEndDate = res.endDate && res.endDate.trim() && res.endDate !== res.reservationDate;
      
      let updated: any = { ...res, reservationDate: newDate };
      
      // 기간 예약인 경우, 기간 길이를 유지하면서 시작일과 종료일을 함께 이동
      if (hasEndDate && res.endDate) {
        const startDate = new Date(res.reservationDate);
        const endDate = new Date(res.endDate);
        const newStartDate = new Date(newDate);
        
        // 기간 길이 계산 (일 수)
        const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // 새로운 종료일 계산
        const newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + daysDiff);
        
        // YYYY-MM-DD 형식으로 변환
        const formatDate = (date: Date): string => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        };
        
        updated.endDate = formatDate(newEndDate);
      } else {
        // 단일일 예약인 경우 endDate 제거
        updated.endDate = undefined;
      }
      
      const response = await apiRequest("PUT", `/api/reservations/${id}`, updated);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "예약 수정 실패");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      toast({ title: "일정 변경", description: "예약 날짜가 변경되었습니다." });
    },
    onError: (error: Error) => {
      toast({
        title: "변경 실패", 
        description: error.message || "일정 변경에 실패했습니다.", 
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: InsertReservation) => {
    // 사용자명 검증 (현재 사용자와 일치하는지 확인)
    if (!data.userName || !data.userName.trim()) {
      toast({
        title: "입력 오류",
        description: "사용자명을 입력해주세요. 상단의 '설정' 버튼에서 사용자 등록 탭을 클릭하여 이름을 등록할 수 있습니다.", 
        variant: "destructive" 
      });
      setSettingsOpen(true);
      setSettingsTab("user");
      return;
    }

    // 필수 필드 검증
    if (!data.equipmentId || !data.equipmentId.trim()) {
      toast({ title: "입력 오류", description: "장비를 선택해주세요.", variant: "destructive" });
      return;
    }
    if (!data.reservationDate || !data.reservationDate.trim()) {
      toast({ title: "입력 오류", description: "사용 일자를 선택해주세요.", variant: "destructive" });
      return;
    }
    if (!data.purpose || !data.purpose.trim()) {
      toast({ title: "입력 오류", description: "사용 목적을 선택해주세요.", variant: "destructive" });
      return;
    }

    const selectedEquipment = filteredEquipment.find((eq) => eq.id === data.equipmentId);
    if (!selectedEquipment) {
      toast({ title: "입력 오류", description: "선택한 장비를 찾을 수 없습니다.", variant: "destructive" });
      return;
    }

    // 필수 필드만 포함하고, 옵션 필드는 값이 있을 때만 추가
    const submitData: any = {
      equipmentId: data.equipmentId.trim(),
      equipmentName: selectedEquipment.name.trim(),
      userName: data.userName.trim(),
      reservationDate: data.reservationDate.trim(),
      purpose: data.purpose.trim(),
    };

    // 옵션 필드는 값이 있을 때만 추가
    if (data.endDate?.trim()) submitData.endDate = data.endDate.trim();
    if (data.startTime?.trim()) submitData.startTime = data.startTime.trim();
    if (data.endTime?.trim()) submitData.endTime = data.endTime.trim();
    if (data.testItem?.trim()) submitData.testItem = data.testItem.trim();
    if (data.sampleCount !== undefined && data.sampleCount !== null) submitData.sampleCount = data.sampleCount;
    if (data.notes?.trim()) submitData.notes = data.notes.trim();

    createMutation.mutate(submitData);
  };

  // 내 예약 필터링 (사용자명으로 매칭)
  const myReservations = reservations.filter((r) => {
    if (r.status === "cancelled") return false;
    if (!userInfo) return false;
    
    // 사용자명이 "사번 - 이름" 형식이거나 이름만 있는 경우 모두 매칭
    const userNameMatch = r.userName === currentUserDisplay || 
                         r.userName === userInfo.name ||
                         (userInfo.employeeId && r.userName.includes(userInfo.employeeId));
    return userNameMatch;
  });

  // 캘린더 데이터 처리
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day);

  const formatDateForKey = (day: number): string => {
    // Local time issue prevention: create date manually string
    const m = month + 1;
    return `${year}-${m.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const monthName = `${year}년 ${month + 1}월`;

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, reservationId: string) => {
    e.dataTransfer.setData("reservationId", reservationId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    const reservationId = e.dataTransfer.getData("reservationId");
    if (reservationId) {
      updateDateMutation.mutate({ id: reservationId, newDate: date });
    }
  };

  const getReservationsForDay = (dateStr: string) => {
    return reservations.filter(r => {
        if (r.status === "cancelled") return false;
        
        // Equipment Filter
        if (selectedEquipmentFilter !== "all" && r.equipmentId !== selectedEquipmentFilter) return false;

        // Location Filter (only if equipment is "all")
        if (selectedEquipmentFilter === "all" && calendarLocationFilter !== "all") {
             const equipment = equipmentMasterList.find(eq => eq.id === r.equipmentId);
             if (!equipment || equipment.location !== calendarLocationFilter) return false;
        }

        // 날짜 범위 확인: endDate가 있으면 해당 기간에 포함되는지 확인
        if (r.endDate && r.endDate.trim()) {
          // YYYY-MM-DD 형식이므로 문자열 비교 가능
          return dateStr >= r.reservationDate && dateStr <= r.endDate;
        }
        
        // endDate가 없으면 reservationDate와 일치하는지 확인
        return r.reservationDate === dateStr;
    });
  };

  // Statistics Calculation
  const statsByEquipment = reservations.reduce((acc, curr) => {
    if (curr.status === 'cancelled') return acc;
    acc[curr.equipmentName] = (acc[curr.equipmentName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statsData = Object.entries(statsByEquipment)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10

  // 로그인하지 않은 경우 로그인 화면 표시
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setLocation("/menu")} data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            메뉴로 돌아가기
          </Button>
        </div>
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-center">시험장비 예약 로그인</CardTitle>
              <p className="text-center text-muted-foreground mt-2">
                사번과 이름을 입력하여 로그인하세요
              </p>
            </CardHeader>
            <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>사번 *</Label>
                <Input
                  placeholder="사번을 입력하세요"
                  value={loginEmployeeId}
                  onChange={(e) => setLoginEmployeeId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>이름 *</Label>
                <Input
                  placeholder="이름을 입력하세요"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <Button 
                onClick={handleLogin} 
                className="w-full"
                disabled={!loginEmployeeId.trim() || !loginName.trim()}
              >
                로그인
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                <p>사용자가 등록되어 있지 않다면</p>
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => {
                    setSettingsOpen(true);
                    setSettingsTab("user");
                  }}
                >
                  설정에서 사용자를 등록해주세요
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* 설정 다이얼로그 (사용자 등록용) */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>설정</DialogTitle>
            </DialogHeader>
            <Tabs value={settingsTab} onValueChange={(v) => setSettingsTab(v as "equipment" | "user")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="equipment">장비 등록</TabsTrigger>
                <TabsTrigger value="user">사용자 등록</TabsTrigger>
              </TabsList>
              
              <TabsContent value="equipment" className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {isEditing ? "장비 수정" : "장비 등록"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...equipmentForm}>
                      <form
                        onSubmit={equipmentForm.handleSubmit(handleEquipmentSubmit)}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                      >
                        <FormField
                          control={equipmentForm.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>코드번 *</FormLabel>
                              <FormControl>
                                <Input placeholder="1101" {...field} disabled={isEditing} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={equipmentForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>기계명 *</FormLabel>
                              <FormControl>
                                <Input placeholder="HPLC Agilent-16" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={equipmentForm.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>위치 *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="위치 선택" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {locations.map((loc) => (
                                    <SelectItem key={loc} value={loc}>
                                      {loc}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="md:col-span-3 flex gap-2">
                          <Button type="submit" disabled={equipmentMutation.isPending}>
                            {equipmentMutation.isPending
                              ? isEditing
                                ? "수정 중..."
                                : "등록 중..."
                              : isEditing
                              ? "수정"
                              : "등록"}
                          </Button>
                          {isEditing && (
                            <Button type="button" variant="outline" onClick={handleNewEquipment}>
                              취소
                            </Button>
                          )}
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">장비 목록 ({equipmentMasterList.length}개)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>코드번</TableHead>
                            <TableHead>기계명</TableHead>
                            <TableHead>위치</TableHead>
                            <TableHead>관리</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {equipmentMasterList.map((eq) => (
                            <TableRow key={eq.id}>
                              <TableCell className="font-medium">{eq.code}</TableCell>
                              <TableCell>{eq.name}</TableCell>
                              <TableCell>{eq.location}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditEquipment(eq)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteEquipment(eq.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="user" className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {isEditingUser ? "사용자 수정" : "사용자 등록"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...userForm}>
                      <form
                        onSubmit={userForm.handleSubmit(handleUserSubmit)}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        <FormField
                          control={userForm.control}
                          name="employeeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>사번 *</FormLabel>
                              <FormControl>
                                <Input placeholder="12345" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>이름 *</FormLabel>
                              <FormControl>
                                <Input placeholder="홍길동" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="md:col-span-2 flex gap-2">
                          <Button type="submit" disabled={userMutation.isPending}>
                            {userMutation.isPending
                              ? isEditingUser
                                ? "수정 중..."
                                : "등록 중..."
                              : isEditingUser
                              ? "수정"
                              : "등록"}
                          </Button>
                          {isEditingUser && (
                            <Button type="button" variant="outline" onClick={handleNewUser}>
                              취소
                            </Button>
                          )}
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">사용자 목록 ({userMasterList.length}개)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>사번</TableHead>
                            <TableHead>이름</TableHead>
                            <TableHead>관리</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userMasterList.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                {user.employeeId || "-"}
                              </TableCell>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditUser(user)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteUser(user.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {userMasterList.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                등록된 사용자가 없습니다. 위 폼에서 사용자를 등록해주세요.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => setLocation("/menu")} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          메뉴로 돌아가기
        </Button>
        <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleLogout}>
                <User className="h-4 w-4" />
                {currentUserDisplay} (로그아웃)
        </Button>
        <Dialog open={settingsOpen} onOpenChange={(open) => {
          if (open && !isCurrentUserAdmin()) {
            toast({
              title: "접근 권한 없음",
              description: "설정 탭은 관리자만 접근할 수 있습니다.",
              variant: "destructive",
            });
            return;
          }
          setSettingsOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              설정
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>설정 {isCurrentUserAdmin() && <span className="text-sm text-muted-foreground">(관리자)</span>}</DialogTitle>
            </DialogHeader>
            <Tabs value={settingsTab} onValueChange={(v) => setSettingsTab(v as "equipment" | "user")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="equipment">장비 등록</TabsTrigger>
                <TabsTrigger value="user">사용자 등록</TabsTrigger>
              </TabsList>
              
              <TabsContent value="equipment" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {isEditing ? "장비 수정" : "장비 등록"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...equipmentForm}>
                    <form
                      onSubmit={equipmentForm.handleSubmit(handleEquipmentSubmit)}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                      <FormField
                        control={equipmentForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>코드번 *</FormLabel>
                            <FormControl>
                              <Input placeholder="1101" {...field} disabled={isEditing} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={equipmentForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>기계명 *</FormLabel>
                            <FormControl>
                              <Input placeholder="HPLC Agilent-16" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={equipmentForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>위치 *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="위치 선택" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {locations.map((loc) => (
                                  <SelectItem key={loc} value={loc}>
                                    {loc}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="md:col-span-3 flex gap-2">
                        <Button type="submit" disabled={equipmentMutation.isPending}>
                          {equipmentMutation.isPending
                            ? isEditing
                              ? "수정 중..."
                              : "등록 중..."
                            : isEditing
                            ? "수정"
                            : "등록"}
                        </Button>
                        {isEditing && (
                          <Button type="button" variant="outline" onClick={handleNewEquipment}>
                            취소
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">장비 목록 ({equipmentMasterList.length}개)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>코드번</TableHead>
                          <TableHead>기계명</TableHead>
                          <TableHead>위치</TableHead>
                          <TableHead>관리</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {equipmentMasterList.map((eq) => (
                          <TableRow key={eq.id}>
                            <TableCell className="font-medium">{eq.code}</TableCell>
                            <TableCell>{eq.name}</TableCell>
                            <TableCell>{eq.location}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditEquipment(eq)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteEquipment(eq.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              </TabsContent>

              <TabsContent value="user" className="space-y-6 mt-4">
                {/* 사용자 등록/수정 폼 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {isEditingUser ? "사용자 수정" : "사용자 등록"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...userForm}>
                      <form
                        onSubmit={userForm.handleSubmit(handleUserSubmit)}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        <FormField
                          control={userForm.control}
                          name="employeeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>사번 *</FormLabel>
                              <FormControl>
                                <Input placeholder="12345" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>이름 *</FormLabel>
                              <FormControl>
                                <Input placeholder="홍길동" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="isAdmin"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2 flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value === true}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked === true);
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  관리자 권한
                                </FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  관리자로 설정하면 설정 탭에 접근할 수 있습니다.
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                        <div className="md:col-span-2 flex gap-2">
                          <Button type="submit" disabled={userMutation.isPending}>
                            {userMutation.isPending
                              ? isEditingUser
                                ? "수정 중..."
                                : "등록 중..."
                              : isEditingUser
                              ? "수정"
                              : "등록"}
                          </Button>
                          {isEditingUser && (
                            <Button type="button" variant="outline" onClick={handleNewUser}>
                              취소
                            </Button>
                          )}
            </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                {/* 사용자 목록 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">사용자 목록 ({userMasterList.length}개)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>사번</TableHead>
                            <TableHead>이름</TableHead>
                            <TableHead>관리자</TableHead>
                            <TableHead>관리</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userMasterList.map((user) => {
                            // 디버깅: 사용자 데이터 확인
                            console.log('사용자 목록 렌더링:', { id: user.id, name: user.name, isAdmin: user.isAdmin });
                            
                            return (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">
                                  {user.employeeId || "-"}
                                </TableCell>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>
                                  {user.isAdmin === true ? (
                                    <span className="text-primary font-semibold">✓ 관리자</span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditUser(user)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDeleteUser(user.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {userMasterList.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                등록된 사용자가 없습니다. 위 폼에서 사용자를 등록해주세요.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl" data-testid="text-page-title">
            시험장비 예약
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList data-testid="tabs-reservation">
          <TabsTrigger value="calendar" data-testid="tab-calendar">
            <CalendarIcon className="mr-2 h-4 w-4"/> 캘린더
          </TabsTrigger>
          <TabsTrigger value="new" data-testid="tab-new">
            <Clock className="mr-2 h-4 w-4"/> 예약 신청
          </TabsTrigger>
          <TabsTrigger value="my" data-testid="tab-my">
            내 예약
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">
            전체 예약
          </TabsTrigger>
          <TabsTrigger value="stats" data-testid="tab-stats">
            <BarChartIcon className="mr-2 h-4 w-4"/> 통계
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                    <h3 className="text-xl font-semibold min-w-[140px] text-center">
                  {monthName}
                </h3>
                    <Button variant="outline" size="sm" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
                
                <div className="flex items-center gap-4">
                    <div className="w-[150px]">
                        <Label className="text-xs mb-1 block">위치 필터</Label>
                        <Select 
                        value={calendarLocationFilter} 
                        onValueChange={(val) => {
                            setCalendarLocationFilter(val);
                            setSelectedEquipmentFilter("all");
                        }}
                        >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체 위치</SelectItem>
                            {locations.map((loc) => (
                            <SelectItem key={loc} value={loc}>
                                {loc}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>

                    <div className="w-[200px]">
                        <Label className="text-xs mb-1 block">장비 필터</Label>
                <Select 
                  value={selectedEquipmentFilter} 
                  onValueChange={setSelectedEquipmentFilter}
                >
                        <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 장비</SelectItem>
                            {equipmentMasterList
                              .filter(eq => calendarLocationFilter === "all" || eq.location === calendarLocationFilter)
                              .map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name} ({eq.location})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                    </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <div className="grid grid-cols-7 gap-px bg-muted sm:gap-2 sm:bg-transparent text-center text-sm font-medium mb-2">
                {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                  <div key={day} className="p-2 bg-background">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-muted sm:gap-2 sm:bg-transparent">
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="aspect-square bg-background sm:border sm:rounded-lg p-2 min-h-[100px]"
                      />
                    );
                  }

                  const dateKey = formatDateForKey(day);
                  const dayReservations = getReservationsForDay(dateKey);
                  const isToday = new Date().toISOString().split('T')[0] === dateKey;

                  return (
                    <div
                      key={day}
                      className={cn(
                          "aspect-square bg-background sm:border sm:rounded-lg p-1 sm:p-2 min-h-[100px] flex flex-col relative group",
                          isToday && "ring-2 ring-primary ring-inset"
                      )}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, dateKey)}
                    >
                      <div className={cn(
                          "font-semibold text-sm mb-1 h-6 w-6 flex items-center justify-center rounded-full",
                          isToday && "bg-primary text-primary-foreground"
                      )}>{day}</div>
                      
                      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1">
                        {dayReservations.map((res) => {
                          // 기간 예약인지 확인
                          const isPeriodReservation = res.endDate && res.endDate.trim() && res.endDate !== res.reservationDate;
                          const isStartDate = res.reservationDate === dateKey;
                          const isEndDate = res.endDate && res.endDate.trim() && res.endDate === dateKey;
                          const isMiddleDate = isPeriodReservation && res.endDate && dateKey > res.reservationDate && dateKey < res.endDate;
                          
                          return (
                            <div
                                key={`${res.id}-${dateKey}`}
                                draggable={isStartDate} // 시작일만 드래그 가능
                                onDragStart={(e) => isStartDate && handleDragStart(e, res.id)}
                                className={cn(
                                    "text-[10px] sm:text-xs p-1 rounded border shadow-sm transition-colors hover:opacity-80",
                                    isStartDate && "cursor-grab active:cursor-grabbing", // 시작일만 드래그 가능
                                    !isStartDate && "cursor-default", // 중간/종료일은 드래그 불가
                                    res.purpose === 'routine' ? "bg-blue-100 text-blue-800 border-blue-200" :
                                    res.purpose === 'research' ? "bg-purple-100 text-purple-800 border-purple-200" :
                                    "bg-gray-100 text-gray-800 border-gray-200",
                                    isPeriodReservation && (isStartDate || isEndDate) && "font-bold",
                                    isMiddleDate && "opacity-75"
                                )}
                                title={`${res.equipmentName} - ${res.userName}${isPeriodReservation ? `\n${res.reservationDate} ~ ${res.endDate}` : ''}\n${res.startTime || ''}~${res.endTime || ''}`}
                            >
                                {isStartDate && <span className="font-semibold">{res.userName}</span>}
                                {isEndDate && <span className="font-semibold">→ {res.userName}</span>}
                                {isMiddleDate && <span className="opacity-75">━ {res.userName}</span>}
                                {!isPeriodReservation && <span className="font-semibold">{res.userName}</span>}
                                <span className="hidden sm:inline"> | {res.equipmentName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-new-title">장비 예약 신청</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {/* 위치 선택 */}
                  <div className="md:col-span-1 lg:col-span-1">
                    <Label>위치 선택 *</Label>
                    <Select
                      value={selectedLocation || undefined}
                      onValueChange={(value) => {
                        setSelectedLocation(value === "all" ? "" : value);
                        form.setValue("equipmentId", ""); 
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="위치를 먼저 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {loc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <FormField
                    control={form.control}
                    name="equipmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>장비 선택 *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedLocation || selectedLocation === ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-equipment">
                              <SelectValue placeholder={selectedLocation ? "장비를 선택하세요" : "위치를 먼저 선택하세요"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredEquipment.map((eq) => (
                              <SelectItem key={eq.id} value={eq.id}>
                                {eq.name} ({eq.code})
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
                    name="userName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>사용자명 *</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              placeholder={currentUserDisplay || "홍길동"} 
                              {...field} 
                              data-testid="input-user-name"
                              disabled={!userInfo}
                              className={cn(!userInfo && "bg-muted")}
                            />
                            {!userInfo && (
                              <Button 
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setSettingsOpen(true);
                                  setSettingsTab("user");
                                }}
                                className="whitespace-nowrap"
                              >
                                <User className="h-4 w-4 mr-1" />
                                설정
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                        {!userInfo && (
                          <p className="text-xs text-muted-foreground">
                            상단의 "사용자 설정" 버튼을 클릭하여 사번과 이름을 등록하세요.
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reservationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>사용 일자 *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-reservation-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>종료 일자</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>시작 시간</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-start-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>종료 시간</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-end-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="purpose"
                    render={({ field }) => {
                      const isInputMode = purposeInputMode === "input";
                      const purposeOptions = ["routine", "stability", "validation", "research", "other"];
                      const selectValue = isInputMode ? undefined : (purposeOptions.includes(field.value || "") ? field.value : undefined);
                      
                      return (
                        <FormItem>
                          <FormLabel>사용 목적 *</FormLabel>
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
                              <SelectTrigger data-testid="select-purpose">
                                <SelectValue placeholder="선택하세요" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="routine">정기 시험</SelectItem>
                              <SelectItem value="stability">안정성 시험</SelectItem>
                              <SelectItem value="validation">밸리데이션</SelectItem>
                              <SelectItem value="research">연구개발</SelectItem>
                              <SelectItem value="other">기타</SelectItem>
                              <SelectItem value="__CUSTOM_INPUT__">직접입력</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input 
                            placeholder="사용 목적 입력" 
                            value={field.value || ""}
                            disabled={!isInputMode}
                            className="mt-2"
                            onChange={(e) => {
                              field.onChange(e.target.value);
                            }}
                          />
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            💡 드롭다운에서 선택하거나 '직접입력'을 선택하여 입력할 수 있습니다.
                          </p>
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="testItem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>시험 항목</FormLabel>
                        <FormControl>
                          <Input placeholder="함량, 순도 등" {...field} data-testid="input-test-item" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sampleCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>샘플 수</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="10"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                            }
                            data-testid="input-sample-count"
                          />
                        </FormControl>
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
                          <Textarea placeholder="추가 정보" {...field} data-testid="textarea-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-2 lg:col-span-3">
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-reservation">
                      {createMutation.isPending ? "예약 중..." : "예약 신청"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-my-title">내 예약 현황 {userInfo && `(${userInfo.name}${userInfo.employeeId ? ` - ${userInfo.employeeId}` : ''})`}</CardTitle>
            </CardHeader>
            <CardContent>
              {!userInfo ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">사용자 정보가 설정되지 않았습니다.</p>
                    <Button onClick={() => {
                      setSettingsOpen(true);
                      setSettingsTab("user");
                    }}>사용자 설정하기</Button>
                </div>
              ) : isLoading ? (
                <div className="text-center py-12">로딩 중...</div>
              ) : myReservations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">예약 내역이 없습니다</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>장비명</TableHead>
                        <TableHead>예약일시</TableHead>
                        <TableHead>사용시간</TableHead>
                        <TableHead>사용목적</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myReservations.map((res) => (
                        <TableRow key={res.id} data-testid={`row-reservation-${res.id}`}>
                          <TableCell className="font-medium">{res.equipmentName}</TableCell>
                          <TableCell>{res.reservationDate}</TableCell>
                          <TableCell>
                            {res.startTime} - {res.endTime}
                          </TableCell>
                          <TableCell>{res.purpose}</TableCell>
                          <TableCell>
                            <StatusBadge status={res.status} />
                          </TableCell>
                          <TableCell>
                            {res.status === "pending" ? (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                data-testid={`button-modify-${res.id}`}
                                onClick={() => handleCancelReservation(res.id)}
                                disabled={cancelReservationMutation.isPending}
                              >
                                취소
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" data-testid={`button-modify-${res.id}`} disabled>
                                변경
                              </Button>
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
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-all-title">전체 예약 현황</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">로딩 중...</div>
              ) : reservations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">예약 내역이 없습니다</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>장비명</TableHead>
                        <TableHead>사용자</TableHead>
                        <TableHead>예약일시</TableHead>
                        <TableHead>사용시간</TableHead>
                        <TableHead>사용목적</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservations.map((res) => (
                        <TableRow key={res.id}>
                          <TableCell className="font-medium">{res.equipmentName}</TableCell>
                          <TableCell>{res.userName}</TableCell>
                          <TableCell>{res.reservationDate}</TableCell>
                          <TableCell>
                            {res.startTime} - {res.endTime}
                          </TableCell>
                          <TableCell>{res.purpose}</TableCell>
                          <TableCell>
                            <StatusBadge status={res.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>장비 활용 통계 (Top 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" name="예약 횟수">
                      {statsData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#8884d8' : '#82ca9d'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
