import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LiveClock } from "@/components/LiveClock";
import { Bell, Video, ChevronLeft, ChevronRight, Settings, Upload, Trash2, Cake, Plus, Edit2, FileText, Handshake, Megaphone, FlaskConical, File } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDateKorean } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";

interface Notice {
  id: number;
  content: string;
  createdAt: string | Date;
  isImportant: boolean;
  isWelcome?: boolean;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}

interface DashboardSettings {
  ad: {
    youtubeUrl: string;
    channelName: string;
    autoplay: boolean;
  };
  promo: {
    images: string[];
  };
  lab: {
    fileType: 'image' | 'pdf';
    files: string[];
  };
}

interface Birthday {
  id: number;
  name: string;
  birthMonth: number;
  birthDay: number;
  department?: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [currentPromoPage, setCurrentPromoPage] = useState(1);
  const [currentLabPage, setCurrentLabPage] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"ad" | "promo" | "birthday" | "notice" | "lab">("ad");
  const [editingBirthday, setEditingBirthday] = useState<Birthday | null>(null);
  const [birthdayForm, setBirthdayForm] = useState({
    name: "",
    birthMonth: "",
    birthDay: "",
    department: "",
  });
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [noticeForm, setNoticeForm] = useState({
    content: "",
    isImportant: false,
    isWelcome: false,
    startDate: "",
    endDate: "",
    isPermanent: true,
  });
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notices = [] } = useQuery<Notice[]>({
    queryKey: ["/api/notices"],
  });

  const { data: settings } = useQuery<DashboardSettings>({
    queryKey: ["/api/dashboard-settings"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard-settings");
      const json = await res.json();
      return json.data;
    },
  });

  const { data: birthdaysData } = useQuery<{ success: boolean; data: Birthday[] }>({
    queryKey: ["/api/birthdays"],
    queryFn: async () => {
      const res = await fetch("/api/birthdays");
      if (!res.ok) throw new Error("생일자 조회 실패");
      return await res.json();
    },
  });

  const birthdays = birthdaysData?.data || [];

  // 생일 축하 메시지인지 판별
  const isBirthdayNotice = (notice: Notice): boolean => {
    return notice.content.includes("생일을 축하합니다");
  };

  // 공지사항을 스페셜(환영/생일)과 일반으로 분류
  const welcomeNotices = notices.filter((notice) => notice.isWelcome);
  const birthdayNotices = notices.filter(
    (notice) => !notice.isWelcome && isBirthdayNotice(notice)
  );
  const normalNotices = notices.filter(
    (notice) => !notice.isWelcome && !isBirthdayNotice(notice)
  );

  let bannerNotice: Notice | null = null;
  let listNotices: Notice[] = [];

  if (welcomeNotices.length > 0) {
    const sortedWelcome = [...welcomeNotices].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    bannerNotice = sortedWelcome[0];
    const remainingWelcome = sortedWelcome.slice(1);
    listNotices = [...remainingWelcome, ...birthdayNotices, ...normalNotices];
  } else if (birthdayNotices.length > 0) {
    const sortedBirthday = [...birthdayNotices].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    bannerNotice = sortedBirthday[0];
    const remainingBirthday = sortedBirthday.slice(1);
    listNotices = [...remainingBirthday, ...normalNotices];
  } else {
    listNotices = [...normalNotices];
  }

  listNotices.sort((a, b) => {
    const aIsBirthday = isBirthdayNotice(a);
    const bIsBirthday = isBirthdayNotice(b);

    if (aIsBirthday && !bIsBirthday) return -1;
    if (!aIsBirthday && bIsBirthday) return 1;

    if (a.isImportant && !b.isImportant) return -1;
    if (!a.isImportant && b.isImportant) return 1;

    return (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  const recentNotices = listNotices.slice(0, 5);
  
  // 광고 설정 업데이트 mutation
  const updateAdSettings = useMutation({
    mutationFn: async (data: { youtubeUrl?: string; channelName?: string; autoplay?: boolean }) => {
      const res = await fetch("/api/dashboard-settings/ad", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("업데이트 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-settings"] });
      toast({
        title: "저장 완료",
        description: "광고 설정이 저장되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "설정 저장에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 이미지 업로드 mutation
  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/dashboard-settings/promo/images", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("업로드 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-settings"] });
      toast({
        title: "업로드 완료",
        description: "이미지가 업로드되었습니다.",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: () => {
      toast({
        title: "오류",
        description: "이미지 업로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 이미지 삭제 mutation
  const deleteImage = useMutation({
    mutationFn: async (filename: string) => {
      const res = await fetch(`/api/dashboard-settings/promo/images/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("삭제 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-settings"] });
      toast({
        title: "삭제 완료",
        description: "이미지가 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "이미지 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage.mutate(file);
    }
  };

  // 시험실 파일 타입 변경 mutation
  const updateLabFileType = useMutation({
    mutationFn: async (fileType: 'image' | 'pdf') => {
      const res = await fetch("/api/dashboard-settings/lab", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileType }),
      });
      if (!res.ok) throw new Error("업데이트 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-settings"] });
      toast({
        title: "저장 완료",
        description: "파일 타입이 변경되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "파일 타입 변경에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 시험실 파일 업로드 mutation
  const uploadLabFile = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', labFileType); // 현재 선택된 파일 타입 전송
      const res = await fetch("/api/dashboard-settings/lab/files", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "업로드 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-settings"] });
      toast({
        title: "업로드 완료",
        description: "파일이 업로드되었습니다.",
      });
      if (labFileInputRef.current) {
        labFileInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message || "파일 업로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 시험실 파일 삭제 mutation
  const deleteLabFile = useMutation({
    mutationFn: async (filename: string) => {
      const res = await fetch(`/api/dashboard-settings/lab/files/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("삭제 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-settings"] });
      toast({
        title: "삭제 완료",
        description: "파일이 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "파일 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const labFileInputRef = useRef<HTMLInputElement>(null);

  const handleLabFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadLabFile.mutate(file);
    }
  };

  // 생일자 등록 mutation
  const createBirthday = useMutation({
    mutationFn: async (data: { name: string; birthMonth: number; birthDay: number; department?: string }) => {
      const res = await fetch("/api/birthdays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "등록 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/birthdays"] });
      toast({
        title: "등록 완료",
        description: "생일자가 등록되었습니다.",
      });
      setBirthdayForm({ name: "", birthMonth: "", birthDay: "", department: "" });
      setEditingBirthday(null);
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message || "생일자 등록에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 생일자 수정 mutation
  const updateBirthday = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; birthMonth?: number; birthDay?: number; department?: string }) => {
      const res = await fetch(`/api/birthdays/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "수정 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/birthdays"] });
      toast({
        title: "수정 완료",
        description: "생일자 정보가 수정되었습니다.",
      });
      setBirthdayForm({ name: "", birthMonth: "", birthDay: "", department: "" });
      setEditingBirthday(null);
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message || "생일자 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 생일자 삭제 mutation
  const deleteBirthday = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/birthdays/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "삭제 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/birthdays"] });
      toast({
        title: "삭제 완료",
        description: "생일자가 삭제되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message || "생일자 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleBirthdaySubmit = () => {
    if (!birthdayForm.name.trim()) {
      toast({
        title: "입력 오류",
        description: "이름을 입력하세요.",
        variant: "destructive",
      });
      return;
    }

    if (!birthdayForm.birthMonth || !birthdayForm.birthDay) {
      toast({
        title: "입력 오류",
        description: "생일 날짜를 선택하세요.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name: birthdayForm.name.trim(),
      birthMonth: parseInt(birthdayForm.birthMonth, 10),
      birthDay: parseInt(birthdayForm.birthDay, 10),
      department: birthdayForm.department.trim() || undefined,
    };

    if (editingBirthday) {
      updateBirthday.mutate({ id: editingBirthday.id, ...data });
    } else {
      createBirthday.mutate(data);
    }
  };

  const handleEditBirthday = (birthday: Birthday) => {
    setEditingBirthday(birthday);
    setBirthdayForm({
      name: birthday.name,
      birthMonth: birthday.birthMonth.toString(),
      birthDay: birthday.birthDay.toString(),
      department: birthday.department || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingBirthday(null);
    setBirthdayForm({ name: "", birthMonth: "", birthDay: "", department: "" });
  };

  // 월별 일수 배열 생성
  const getDaysInMonth = (month: number): number[] => {
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return Array.from({ length: daysInMonth[month - 1] || 31 }, (_, i) => i + 1);
  };

  // 공지사항 등록 mutation
  const createNotice = useMutation({
    mutationFn: async (data: { content: string; isImportant: boolean; isWelcome: boolean; startDate?: string | null; endDate?: string | null }) => {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "등록 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notices"] });
      toast({
        title: "등록 완료",
        description: "공지사항이 등록되었습니다.",
      });
      setNoticeForm({ 
        content: "", 
        isImportant: false,
        isWelcome: false,
        startDate: "",
        endDate: "",
        isPermanent: true,
      });
      setEditingNotice(null);
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message || "공지사항 등록에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 공지사항 수정 mutation
  const updateNotice = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; content?: string; isImportant?: boolean; startDate?: string | null; endDate?: string | null }) => {
      const res = await fetch(`/api/notices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "수정 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notices"] });
      toast({
        title: "수정 완료",
        description: "공지사항이 수정되었습니다.",
      });
      setNoticeForm({ 
        content: "", 
        isImportant: false,
        isWelcome: false,
        startDate: "",
        endDate: "",
        isPermanent: true,
      });
      setEditingNotice(null);
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message || "공지사항 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 공지사항 삭제 mutation
  const deleteNotice = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notices/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "삭제 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notices"] });
      toast({
        title: "삭제 완료",
        description: "공지사항이 삭제되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message || "공지사항 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleNoticeSubmit = () => {
    if (!noticeForm.content.trim()) {
      toast({
        title: "입력 오류",
        description: "공지사항 내용을 입력하세요.",
        variant: "destructive",
      });
      return;
    }

    // 날짜 유효성 검사
    if (!noticeForm.isPermanent && noticeForm.endDate && noticeForm.startDate) {
      const start = new Date(noticeForm.startDate);
      const end = new Date(noticeForm.endDate);
      if (end < start) {
        toast({
          title: "입력 오류",
          description: "종료일은 시작일보다 이후여야 합니다.",
          variant: "destructive",
        });
        return;
      }
    }

    const data: {
      content: string;
      isImportant: boolean;
      isWelcome: boolean;
      startDate?: string | null;
      endDate?: string | null;
    } = {
      content: noticeForm.content.trim(),
      isImportant: noticeForm.isImportant,
      isWelcome: noticeForm.isWelcome,
      startDate: noticeForm.startDate || null,
      endDate: noticeForm.isPermanent ? null : (noticeForm.endDate || null),
    };

    if (editingNotice) {
      updateNotice.mutate({ id: editingNotice.id, ...data });
    } else {
      createNotice.mutate(data);
    }
  };

  const handleEditNotice = (notice: Notice) => {
    setEditingNotice(notice);
    const startDate = notice.startDate 
      ? new Date(notice.startDate).toISOString().split('T')[0]
      : "";
    const endDate = notice.endDate 
      ? new Date(notice.endDate).toISOString().split('T')[0]
      : "";
    
    setNoticeForm({
      content: notice.content,
      isImportant: notice.isImportant,
      isWelcome: notice.isWelcome || false,
      startDate: startDate,
      endDate: endDate,
      isPermanent: !notice.endDate, // endDate가 null이면 영구 게시
    });
  };

  const handleCancelNoticeEdit = () => {
    setEditingNotice(null);
    setNoticeForm({ 
      content: "", 
      isImportant: false,
      isWelcome: false,
      startDate: "",
      endDate: "",
      isPermanent: true,
    });
  };

  // 설정에서 가져온 값 사용
  const adSettings = settings?.ad || {
    youtubeUrl: "https://www.youtube.com/embed?listType=user_uploads&list=Kwangdong&autoplay=0",
    channelName: "Kwangdong",
    autoplay: false,
  };

  const promoImages = settings?.promo?.images || ["홍보페이지-1.png", "홍보페이지-2.png"];
  const labSettings = settings?.lab || { fileType: 'image' as 'image' | 'pdf', files: [] };
  const labFiles = labSettings.files || [];
  const labFileType = labSettings.fileType || 'image';

  const adVideoSrc = useMemo(() => {
    const ensureLoopParams = (url: URL, fallbackId?: string) => {
      url.searchParams.set('loop', '1');
      if (!url.searchParams.get('playlist')) {
        const listId = url.searchParams.get('list');
        const videoId = url.searchParams.get('v');
        if (listId) {
          url.searchParams.set('playlist', listId);
        } else if (videoId) {
          url.searchParams.set('playlist', videoId);
        } else if (fallbackId) {
          url.searchParams.set('playlist', fallbackId);
        }
      }
    };

    const decorateUrl = (url: URL, fallbackId?: string) => {
      const shouldAutoplay = adSettings.autoplay ?? true;
      url.searchParams.set('autoplay', shouldAutoplay ? '1' : '0');
      url.searchParams.set('mute', shouldAutoplay ? '1' : '0');
      url.searchParams.set('playsinline', '1');
      url.searchParams.set('controls', '0');
      url.searchParams.set('rel', '0');
      url.searchParams.set('modestbranding', '1');
      ensureLoopParams(url, fallbackId);
      return url.toString();
    };

    const channelHandle = adSettings.channelName?.startsWith('@')
      ? adSettings.channelName.substring(1)
      : adSettings.channelName || 'Kwangdong';

    try {
      if (adSettings.youtubeUrl && adSettings.youtubeUrl.trim() !== '') {
        const url = new URL(adSettings.youtubeUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const embedIndex = pathParts.indexOf('embed');
        const embedId = embedIndex >= 0 ? pathParts[embedIndex + 1] : undefined;
        return decorateUrl(url, embedId || channelHandle);
      }

      const url = new URL('https://www.youtube.com/embed');
      url.searchParams.set('listType', 'user_uploads');
      url.searchParams.set('list', channelHandle);
      return decorateUrl(url, channelHandle);
    } catch (error) {
      console.error('YouTube URL 파싱 실패:', error);
      const fallback = new URL(`https://www.youtube.com/embed?listType=user_uploads&list=${channelHandle}`);
      return decorateUrl(fallback, channelHandle);
    }
  }, [adSettings.youtubeUrl, adSettings.channelName, adSettings.autoplay]);

  // 터치 이벤트 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50; // 최소 스와이프 거리

    if (distance > minSwipeDistance && currentPromoPage < promoImages.length) {
      // 오른쪽으로 스와이프 (다음 페이지)
      setCurrentPromoPage(currentPromoPage + 1);
    } else if (distance < -minSwipeDistance && currentPromoPage > 1) {
      // 왼쪽으로 스와이프 (이전 페이지)
      setCurrentPromoPage(currentPromoPage - 1);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const goToNextPage = () => {
    if (currentPromoPage < promoImages.length) {
      setCurrentPromoPage(currentPromoPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPromoPage > 1) {
      setCurrentPromoPage(currentPromoPage - 1);
    }
  };

  // 이미지 개수 변경 시 현재 페이지 조정
  useEffect(() => {
    if (currentPromoPage > promoImages.length && promoImages.length > 0) {
      setCurrentPromoPage(promoImages.length);
    } else if (promoImages.length === 0) {
      setCurrentPromoPage(1);
    }
  }, [promoImages.length, currentPromoPage]);

  // 시험실 파일 개수 변경 시 현재 페이지 조정
  useEffect(() => {
    if (currentLabPage > labFiles.length && labFiles.length > 0) {
      setCurrentLabPage(labFiles.length);
    } else if (labFiles.length === 0) {
      setCurrentLabPage(1);
    }
  }, [labFiles.length, currentLabPage]);

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
            <h1 className="text-xl md:text-2xl font-bold text-[#E31E24]" data-testid="text-system-title">
              품질관리팀 통합 관리 시스템
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <LiveClock />
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>설정</DialogTitle>
                </DialogHeader>
                <Tabs value={settingsTab} onValueChange={(v) => setSettingsTab(v as "ad" | "promo" | "birthday" | "notice" | "lab")} className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="ad">광고 영상 설정</TabsTrigger>
                    <TabsTrigger value="promo">홍보 이미지 관리</TabsTrigger>
                    <TabsTrigger value="birthday">생일자 관리</TabsTrigger>
                    <TabsTrigger value="notice">공지사항 관리</TabsTrigger>
                    <TabsTrigger value="lab">시험실 관리</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="ad" className="space-y-6 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">광고 영상 정보 설정</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="youtubeUrl">YouTube URL</Label>
                          <Input
                            id="youtubeUrl"
                            defaultValue={adSettings.youtubeUrl}
                            placeholder="https://www.youtube.com/embed?..."
                            onBlur={(e) => {
                              updateAdSettings.mutate({ youtubeUrl: e.target.value });
                            }}
                          />
                          <p className="text-sm text-muted-foreground">
                            YouTube 임베드 URL 또는 채널 설정을 입력하세요
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="channelName">채널명</Label>
                          <Input
                            id="channelName"
                            defaultValue={adSettings.channelName}
                            placeholder="Kwangdong"
                            onBlur={(e) => {
                              updateAdSettings.mutate({ channelName: e.target.value });
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="autoplay">자동재생</Label>
                            <p className="text-sm text-muted-foreground">
                              페이지 로드 시 자동으로 영상 재생
                            </p>
                          </div>
                          <Switch
                            id="autoplay"
                            defaultChecked={adSettings.autoplay}
                            onCheckedChange={(checked) => {
                              updateAdSettings.mutate({ autoplay: checked });
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="promo" className="space-y-6 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">홍보 이미지 업로드</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="imageUpload">이미지 파일 선택</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="imageUpload"
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="cursor-pointer"
                            />
                            <Button
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadImage.isPending}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              업로드
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            PNG, JPG, GIF, WEBP 형식의 이미지를 업로드할 수 있습니다 (최대 10MB)
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">업로드된 이미지 목록</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {promoImages.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              업로드된 이미지가 없습니다
                            </p>
                          ) : (
                            promoImages.map((image, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <img
                                    src={encodeURI(`/static/${image}`)}
                                    alt={`홍보 이미지 ${index + 1}`}
                                    className="h-16 w-auto object-contain rounded"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                  <span className="text-sm font-medium">{image}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (confirm(`"${image}" 이미지를 삭제하시겠습니까?`)) {
                                      deleteImage.mutate(image);
                                    }
                                  }}
                                  disabled={deleteImage.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="birthday" className="space-y-6 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Cake className="h-5 w-5" />
                          {editingBirthday ? "생일자 수정" : "생일자 등록"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="birthdayName">이름 *</Label>
                          <Input
                            id="birthdayName"
                            value={birthdayForm.name}
                            onChange={(e) => setBirthdayForm({ ...birthdayForm, name: e.target.value })}
                            placeholder="이름을 입력하세요"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="birthMonth">월 *</Label>
                            <Select
                              value={birthdayForm.birthMonth}
                              onValueChange={(value) => {
                                setBirthdayForm({ ...birthdayForm, birthMonth: value, birthDay: "" });
                              }}
                            >
                              <SelectTrigger id="birthMonth">
                                <SelectValue placeholder="월 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                                  <SelectItem key={month} value={month.toString()}>
                                    {month}월
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="birthDay">일 *</Label>
                            <Select
                              value={birthdayForm.birthDay}
                              onValueChange={(value) => setBirthdayForm({ ...birthdayForm, birthDay: value })}
                              disabled={!birthdayForm.birthMonth}
                            >
                              <SelectTrigger id="birthDay">
                                <SelectValue placeholder="일 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {birthdayForm.birthMonth
                                  ? getDaysInMonth(parseInt(birthdayForm.birthMonth, 10)).map((day) => (
                                      <SelectItem key={day} value={day.toString()}>
                                        {day}일
                                      </SelectItem>
                                    ))
                                  : null}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="birthdayDepartment">부서 (선택사항)</Label>
                          <Input
                            id="birthdayDepartment"
                            value={birthdayForm.department}
                            onChange={(e) => setBirthdayForm({ ...birthdayForm, department: e.target.value })}
                            placeholder="부서명을 입력하세요"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleBirthdaySubmit}
                            disabled={createBirthday.isPending || updateBirthday.isPending}
                            className="flex-1"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {editingBirthday ? "수정" : "등록"}
                          </Button>
                          {editingBirthday && (
                            <Button
                              variant="outline"
                              onClick={handleCancelEdit}
                              disabled={createBirthday.isPending || updateBirthday.isPending}
                            >
                              취소
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">등록된 생일자 목록</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {birthdays.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              등록된 생일자가 없습니다
                            </p>
                          ) : (
                            birthdays.map((birthday) => (
                              <div
                                key={birthday.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <Cake className="h-5 w-5 text-primary" />
                                  <div>
                                    <div className="font-medium">
                                      {birthday.name}
                                      {birthday.department && (
                                        <span className="text-sm text-muted-foreground ml-2">
                                          ({birthday.department})
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {birthday.birthMonth}월 {birthday.birthDay}일
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditBirthday(birthday)}
                                    disabled={deleteBirthday.isPending}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (confirm(`"${birthday.name}"님의 생일 정보를 삭제하시겠습니까?`)) {
                                        deleteBirthday.mutate(birthday.id);
                                      }
                                    }}
                                    disabled={deleteBirthday.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="notice" className="space-y-6 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {editingNotice ? "공지사항 수정" : "공지사항 등록"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="noticeContent">공지사항 내용 *</Label>
                          <Textarea
                            id="noticeContent"
                            value={noticeForm.content}
                            onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                            placeholder="공지사항 내용을 입력하세요"
                            rows={5}
                            className="resize-none"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="noticeImportant">중요 공지</Label>
                            <p className="text-sm text-muted-foreground">
                              중요 공지로 표시하면 노란색 배경과 빨간색 테두리로 강조됩니다
                            </p>
                          </div>
                          <Switch
                            id="noticeImportant"
                            checked={noticeForm.isImportant}
                            onCheckedChange={(checked) => setNoticeForm({ ...noticeForm, isImportant: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="noticeWelcome">방문객 환영 메시지</Label>
                            <p className="text-sm text-muted-foreground">
                              방문객 환영 메시지로 표시하면 화려한 스타일이 적용됩니다
                            </p>
                          </div>
                          <Switch
                            id="noticeWelcome"
                            checked={noticeForm.isWelcome}
                            onCheckedChange={(checked) => setNoticeForm({ ...noticeForm, isWelcome: checked })}
                          />
                        </div>
                        
                        <div className="space-y-4 border-t pt-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="noticePermanent">영구 게시</Label>
                              <p className="text-sm text-muted-foreground">
                                영구 게시로 설정하면 종료일 없이 계속 표시됩니다
                              </p>
                            </div>
                            <Switch
                              id="noticePermanent"
                              checked={noticeForm.isPermanent}
                              onCheckedChange={(checked) => {
                                setNoticeForm({ 
                                  ...noticeForm, 
                                  isPermanent: checked,
                                  endDate: checked ? "" : noticeForm.endDate,
                                });
                              }}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="noticeStartDate">게시 시작일 (선택사항)</Label>
                              <Input
                                id="noticeStartDate"
                                type="date"
                                value={noticeForm.startDate}
                                onChange={(e) => setNoticeForm({ ...noticeForm, startDate: e.target.value })}
                              />
                              <p className="text-xs text-muted-foreground">
                                비워두면 즉시 게시됩니다
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="noticeEndDate">
                                게시 종료일 {!noticeForm.isPermanent && "*"}
                              </Label>
                              <Input
                                id="noticeEndDate"
                                type="date"
                                value={noticeForm.endDate}
                                onChange={(e) => setNoticeForm({ ...noticeForm, endDate: e.target.value })}
                                disabled={noticeForm.isPermanent}
                                min={noticeForm.startDate || undefined}
                              />
                              <p className="text-xs text-muted-foreground">
                                {noticeForm.isPermanent 
                                  ? "영구 게시로 설정되어 종료일이 없습니다"
                                  : "종료일 이후에는 공지사항이 표시되지 않습니다"}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={handleNoticeSubmit}
                            disabled={createNotice.isPending || updateNotice.isPending}
                            className="flex-1"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {editingNotice ? "수정" : "등록"}
                          </Button>
                          {editingNotice && (
                            <Button
                              variant="outline"
                              onClick={handleCancelNoticeEdit}
                              disabled={createNotice.isPending || updateNotice.isPending}
                            >
                              취소
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">등록된 공지사항 목록</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {notices.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              등록된 공지사항이 없습니다
                            </p>
                          ) : (
                            notices.map((notice) => (
                              <div
                                key={notice.id}
                                className={`p-4 rounded-lg border-l-4 ${
                                  notice.isImportant
                                    ? "bg-yellow-50 dark:bg-yellow-950/20 border-l-destructive"
                                    : "border-l-primary"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="text-sm text-muted-foreground mb-1">
                                      {formatDateKorean(notice.createdAt)}
                                      {notice.isImportant && (
                                        <span className="ml-2 px-2 py-0.5 bg-destructive/10 text-destructive text-xs rounded">
                                          중요
                                        </span>
                                      )}
                                      {notice.isWelcome && (
                                        <span className="ml-2 px-2 py-0.5 bg-pink-100 text-pink-600 text-xs rounded">
                                          환영
                                        </span>
                                      )}
                                      {notice.endDate ? (
                                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                          {new Date(notice.endDate) >= new Date() ? "게시중" : "만료됨"}
                                        </span>
                                      ) : (
                                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                          영구 게시
                                        </span>
                                      )}
                                    </div>
                                    <div className="font-medium whitespace-pre-wrap mb-1">
                                      {notice.content}
                                    </div>
                                    {(notice.startDate || notice.endDate) && (
                                      <div className="text-xs text-muted-foreground">
                                        게시 기간:{" "}
                                        {notice.startDate 
                                          ? formatDateKorean(notice.startDate)
                                          : "즉시"}
                                        {" ~ "}
                                        {notice.endDate 
                                          ? formatDateKorean(notice.endDate)
                                          : "영구"}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-2 flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditNotice(notice)}
                                      disabled={deleteNotice.isPending}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        if (confirm(`이 공지사항을 삭제하시겠습니까?`)) {
                                          deleteNotice.mutate(notice.id);
                                        }
                                      }}
                                      disabled={deleteNotice.isPending}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="lab" className="space-y-6 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FlaskConical className="h-5 w-5" />
                          시험실 파일 관리
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>파일 타입 선택</Label>
                          <div className="flex gap-4">
                            <Button
                              variant={labFileType === 'image' ? 'default' : 'outline'}
                              onClick={() => updateLabFileType.mutate('image')}
                              disabled={updateLabFileType.isPending}
                            >
                              이미지
                            </Button>
                            <Button
                              variant={labFileType === 'pdf' ? 'default' : 'outline'}
                              onClick={() => updateLabFileType.mutate('pdf')}
                              disabled={updateLabFileType.isPending}
                            >
                              PDF
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            현재 선택된 타입: <strong>{labFileType === 'image' ? '이미지' : 'PDF'}</strong>
                            {labFileType !== labSettings.fileType && labFiles.length > 0 && (
                              <span className="text-destructive ml-2">
                                (파일 타입 변경 시 기존 파일이 삭제됩니다)
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="labFileUpload">
                            {labFileType === 'image' ? '이미지' : 'PDF'} 파일 선택
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="labFileUpload"
                              ref={labFileInputRef}
                              type="file"
                              accept={labFileType === 'image' ? 'image/*' : '.pdf,application/pdf'}
                              onChange={handleLabFileUpload}
                              className="cursor-pointer"
                            />
                            <Button
                              onClick={() => labFileInputRef.current?.click()}
                              disabled={uploadLabFile.isPending}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              업로드
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {labFileType === 'image' 
                              ? 'PNG, JPG, GIF, WEBP 형식의 이미지를 업로드할 수 있습니다 (최대 50MB)'
                              : 'PDF 파일을 업로드할 수 있습니다 (최대 50MB)'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">업로드된 파일 목록</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {labFiles.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              업로드된 파일이 없습니다
                            </p>
                          ) : (
                            labFiles.map((filename: string, index: number) => {
                              const isImage = /\.(jpeg|jpg|png|gif|webp)$/i.test(filename);
                              const isPdf = /\.pdf$/i.test(filename);
                              
                              return (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    {isImage ? (
                                      <img
                                        src={encodeURI(`/static/uploads/lab/${filename}`)}
                                        alt={`시험실 이미지 ${index + 1}`}
                                        className="h-16 w-auto object-contain rounded"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    ) : isPdf ? (
                                      <div className="h-16 w-16 flex items-center justify-center bg-red-50 rounded">
                                        <File className="h-8 w-8 text-red-600" />
                                      </div>
                                    ) : null}
                                    <span className="text-sm font-medium">{filename}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (confirm(`"${filename}" 파일을 삭제하시겠습니까?`)) {
                                        deleteLabFile.mutate(filename);
                                      }
                                    }}
                                    disabled={deleteLabFile.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 md:p-8">
        <div className="space-y-6">
          <Card className="p-10 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <Bell className="w-7 h-7 text-primary" />
              <h2 className="text-2xl font-semibold" data-testid="text-notice-title">공지사항</h2>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {/* 스페셜 배너 영역 */}
              {bannerNotice && (
                <div className="pb-4">
                  <div className={`relative overflow-hidden rounded-2xl shadow-lg transition-all duration-500 hover:shadow-xl hover:scale-[1.01] ${
                    bannerNotice.isWelcome 
                      ? "bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-100"
                      : "bg-gradient-to-r from-rose-50 via-pink-50 to-orange-50 border border-rose-100"
                  }`}>
                    <div className="p-8 relative z-10 flex flex-col items-center text-center space-y-4">
                      {/* 배경 장식 */}
                      <div className="absolute -right-8 -top-8 text-9xl opacity-5 rotate-12 select-none pointer-events-none">
                        {bannerNotice.isWelcome ? '🤝' : '🎂'}
                      </div>
                      <div className="absolute -left-8 -bottom-8 text-9xl opacity-5 -rotate-12 select-none pointer-events-none">
                        {bannerNotice.isWelcome ? '✨' : '🎉'}
                      </div>

                      <div className="p-4 bg-white rounded-full shadow-md ring-4 ring-white/50 animate-bounce-slow">
                        {bannerNotice.isWelcome ? (
                          <Handshake className="w-10 h-10 text-blue-500" />
                        ) : (
                          <Cake className="w-10 h-10 text-rose-500" />
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className={`text-sm md:text-base font-black tracking-[0.2em] uppercase ${
                          bannerNotice.isWelcome ? "text-blue-400" : "text-rose-400"
                        }`}>
                          {bannerNotice.isWelcome ? "Special Welcome" : "Happy Birthday"}
                        </div>
                        <div className="text-2xl md:text-4xl font-black text-gray-800 leading-tight break-keep py-2">
                          {bannerNotice.content}
                        </div>
                      </div>
                    </div>
                    
                    {/* 하단 장식 바 */}
                    <div className={`h-2 w-full ${
                      bannerNotice.isWelcome 
                        ? "bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400" 
                        : "bg-gradient-to-r from-rose-400 via-pink-400 to-orange-400"
                    }`} />
                  </div>
                </div>
              )}

              {recentNotices.length === 0 && !bannerNotice ? (
                <div className="text-center py-12 text-muted-foreground">
                  등록된 공지사항이 없습니다
                </div>
              ) : (
                recentNotices.map((notice, index) => {
                  const isBirthday = isBirthdayNotice(notice);
                  
                  return (
                      <div
                        key={notice.id}
                        className={`relative overflow-hidden rounded-xl transition-all duration-500 ${
                          isBirthday
                            ? "bg-gradient-to-br from-rose-50 via-white to-orange-50 border border-rose-100 shadow-md hover:shadow-lg hover:scale-[1.01]"
                            : notice.isImportant
                            ? "p-5 bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-l-destructive shadow-sm animate-in slide-in-from-left"
                            : "p-4 border-l-4 border-l-primary animate-in slide-in-from-left"
                        }`}
                        style={{ animationDelay: `${index * 100}ms` }}
                        data-testid={`notice-item-${index}`}
                      >
                      {isBirthday ? (
                        <div className="p-6 relative z-10">
                          {/* 배경 장식 */}
                          <div className="absolute -right-6 -top-6 text-9xl opacity-5 rotate-12 select-none pointer-events-none">
                            🎂
                          </div>
                          
                          <div className="flex flex-col items-center text-center space-y-3">
                            <div className="p-3 bg-white rounded-full shadow-sm ring-1 ring-rose-100">
                              <Cake className="w-6 h-6 text-rose-500 animate-pulse" />
                            </div>
                            
                            <div className="space-y-1">
                              <div className="text-lg font-extrabold tracking-widest text-rose-400 uppercase">
                                Happy Birthday
                              </div>
                              <div className="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed break-keep">
                                {notice.content}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="text-sm text-muted-foreground" data-testid={`text-notice-date-${index}`}>
                              {formatDateKorean(notice.createdAt)}
                            </div>
                            {notice.isImportant && (
                              <Megaphone className="w-5 h-5 text-destructive animate-pulse" />
                            )}
                          </div>
                          <div 
                            className={`${
                              notice.isImportant 
                                ? "text-lg md:text-xl font-extrabold text-red-950 leading-snug" 
                                : "font-medium text-gray-700"
                            }`} 
                            data-testid={`text-notice-content-${index}`}
                          >
                            {notice.content}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="h-full flex flex-col overflow-hidden relative">
            <Tabs defaultValue="ad" className="flex-1 flex flex-col h-full">
              <div className="flex items-center justify-between px-8 pt-8 pb-2 flex-shrink-0 relative z-10">
                <div className="flex items-center gap-3">
                  <Video className="w-7 h-7 text-primary" />
                  <h2 className="text-2xl font-semibold" data-testid="text-media-title">
                    미디어
                  </h2>
                </div>
                <TabsList>
                  <TabsTrigger value="ad">광고</TabsTrigger>
                  <TabsTrigger value="promo">홍보</TabsTrigger>
                  <TabsTrigger value="lab">시험실</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="ad" className="absolute inset-x-0 top-[85px] bottom-0 flex flex-col z-10">
                <div className="flex-1 rounded-lg overflow-hidden bg-gray-100 flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto p-4">
                    <iframe
                      className="w-full aspect-video rounded-lg"
                      src={adVideoSrc}
                      title="광동제약 YouTube 채널"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    <div className="mt-4 text-center">
                      <a
                        href={`https://www.youtube.com/@${adSettings.channelName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#E31E24] hover:underline"
                      >
                        광동제약 YouTube 채널 보기 →
                      </a>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="promo" className="absolute inset-x-0 top-[85px] bottom-0 flex flex-col z-10">
                <div 
                  className="flex-1 rounded-lg overflow-hidden flex flex-col relative h-full"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* 이미지 슬라이더 */}
                  <div className="flex-1 relative overflow-hidden">
                    {promoImages.length > 0 ? (
                      <div 
                        className="absolute inset-0 flex transition-transform duration-300 ease-in-out"
                        style={{ transform: `translateX(-${(currentPromoPage - 1) * 100}%)` }}
                      >
                        {promoImages.map((image, index) => (
                          <div key={index} className="min-w-full h-full relative flex items-start justify-center">
                            <img
                              src={encodeURI(`/static/${image}`)}
                              alt={`홍보 페이지 ${index + 1}`}
                              className="w-full h-auto object-contain object-top"
                              onError={(e) => {
                                console.error("이미지 로드 실패:", e.currentTarget.src);
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'text-center text-red-500';
                                errorDiv.textContent = '이미지를 불러올 수 없습니다';
                                e.currentTarget.parentElement?.appendChild(errorDiv);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">홍보 이미지가 없습니다</p>
                      </div>
                    )}
                  </div>

                  {/* 하단 네비게이션 버튼 및 인디케이터 */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-none z-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white pointer-events-auto ${
                        currentPromoPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={goToPrevPage}
                      disabled={currentPromoPage === 1 || promoImages.length === 0}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    
                    {/* 페이지 인디케이터 */}
                    <div className="flex gap-2">
                      {promoImages.map((_, index) => (
                        <div
                          key={index}
                          className={`h-2 rounded-full transition-all ${
                            currentPromoPage === index + 1
                              ? 'w-8 bg-white'
                              : 'w-2 bg-white/50'
                          }`}
                        />
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white pointer-events-auto ${
                        currentPromoPage === promoImages.length ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={goToNextPage}
                      disabled={currentPromoPage === promoImages.length || promoImages.length === 0}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="lab" className="absolute inset-x-0 top-[85px] bottom-0 flex flex-col z-10">
                {labFileType === 'image' && labFiles.length > 0 ? (
                  <div 
                    className="flex-1 rounded-lg overflow-hidden flex flex-col relative h-full"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={() => {
                      if (!touchStartX.current || !touchEndX.current) return;
                      const distance = touchStartX.current - touchEndX.current;
                      const minSwipeDistance = 50;
                      if (distance > minSwipeDistance && currentLabPage < labFiles.length) {
                        setCurrentLabPage(currentLabPage + 1);
                      } else if (distance < -minSwipeDistance && currentLabPage > 1) {
                        setCurrentLabPage(currentLabPage - 1);
                      }
                      touchStartX.current = null;
                      touchEndX.current = null;
                    }}
                  >
                    {/* 이미지 슬라이더 */}
                    <div className="flex-1 relative overflow-hidden">
                      <div 
                        className="absolute inset-0 flex transition-transform duration-300 ease-in-out"
                        style={{ transform: `translateX(-${(currentLabPage - 1) * 100}%)` }}
                      >
                        {labFiles.map((filename, index) => (
                          <div key={index} className="min-w-full h-full relative flex items-start justify-center">
                            <img
                              src={encodeURI(`/static/uploads/lab/${filename}`)}
                              alt={`시험실 이미지 ${index + 1}`}
                              className="w-full h-auto object-contain object-top"
                              onError={(e) => {
                                console.error("이미지 로드 실패:", e.currentTarget.src);
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'text-center text-red-500';
                                errorDiv.textContent = '이미지를 불러올 수 없습니다';
                                e.currentTarget.parentElement?.appendChild(errorDiv);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 하단 네비게이션 버튼 및 인디케이터 */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-none z-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white pointer-events-auto ${
                          currentLabPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => {
                          if (currentLabPage > 1) {
                            setCurrentLabPage(currentLabPage - 1);
                          }
                        }}
                        disabled={currentLabPage === 1 || labFiles.length === 0}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      
                      {/* 페이지 인디케이터 */}
                      <div className="flex gap-2">
                        {labFiles.map((_, index) => (
                          <div
                            key={index}
                            className={`h-2 rounded-full transition-all ${
                              currentLabPage === index + 1
                                ? 'w-8 bg-white'
                                : 'w-2 bg-white/50'
                            }`}
                          />
                        ))}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white pointer-events-auto ${
                          currentLabPage === labFiles.length ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => {
                          if (currentLabPage < labFiles.length) {
                            setCurrentLabPage(currentLabPage + 1);
                          }
                        }}
                        disabled={currentLabPage === labFiles.length || labFiles.length === 0}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ) : labFileType === 'pdf' && labFiles.length > 0 ? (
                  <div className="flex-1 relative overflow-hidden p-4">
                    <iframe
                      src={encodeURI(`/static/uploads/lab/${labFiles[currentLabPage - 1]}`)}
                      className="w-full h-full rounded-lg"
                      title="시험실 PDF 문서"
                    />
                    {/* 하단 네비게이션 버튼 및 인디케이터 */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-none z-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white pointer-events-auto ${
                          currentLabPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => {
                          if (currentLabPage > 1) {
                            setCurrentLabPage(currentLabPage - 1);
                          }
                        }}
                        disabled={currentLabPage === 1 || labFiles.length === 0}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      
                      {/* 페이지 인디케이터 */}
                      <div className="flex gap-2">
                        {labFiles.map((_, index) => (
                          <div
                            key={index}
                            className={`h-2 rounded-full transition-all ${
                              currentLabPage === index + 1
                                ? 'w-8 bg-white'
                                : 'w-2 bg-white/50'
                            }`}
                          />
                        ))}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white pointer-events-auto ${
                          currentLabPage === labFiles.length ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => {
                          if (currentLabPage < labFiles.length) {
                            setCurrentLabPage(currentLabPage + 1);
                          }
                        }}
                        disabled={currentLabPage === labFiles.length || labFiles.length === 0}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">등록된 시험실 파일이 없습니다</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
        <Button
          size="lg"
          className="bg-white border-2 border-[#E31E24] text-[#E31E24] hover:bg-[#E31E24] hover:text-white px-20 py-7 text-2xl font-semibold rounded-full shadow-2xl hover:-translate-y-1 transition-all"
          onClick={() => setLocation("/menu")}
          data-testid="button-start"
        >
          시작하기
        </Button>
      </div>
    </div>
  );
}

