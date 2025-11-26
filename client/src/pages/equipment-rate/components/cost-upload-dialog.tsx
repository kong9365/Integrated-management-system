/**
 * 유지보수 비용 파일 업로드 다이얼로그
 */

import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CostUploadDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 유지보수 비용 조회
  const { data: costsData } = useQuery<{ success: boolean; data: Record<string, number> }>({
    queryKey: ["equipment-costs"],
    queryFn: async () => {
      const response = await fetch("/api/cds/equipment-costs");
      if (!response.ok) {
        throw new Error("유지보수 비용을 가져오는데 실패했습니다");
      }
      return response.json();
    },
  });

  // 파일 업로드 mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/cds/equipment-costs/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "업로드 실패");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-costs"] });
      toast({
        title: "업로드 완료",
        description: "유지보수 비용이 업데이트되었습니다.",
      });
      setFile(null);
      setOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 수동 입력 mutation
  const updateMutation = useMutation({
    mutationFn: async (costs: Record<string, number>) => {
      const response = await fetch("/api/cds/equipment-costs", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ costs }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "업데이트 실패");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-costs"] });
      toast({
        title: "업데이트 완료",
        description: "유지보수 비용이 업데이트되었습니다.",
      });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "업데이트 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      if (!["xlsx", "xls", "csv"].includes(ext || "")) {
        toast({
          title: "파일 형식 오류",
          description: "Excel 또는 CSV 파일만 업로드 가능합니다.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = () => {
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleManualUpdate = () => {
    if (costsData?.data) {
      updateMutation.mutate(costsData.data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Upload className="mr-2 h-4 w-4" />
          유지보수 비용 관리
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>유지보수 비용 관리</DialogTitle>
          <DialogDescription>
            Excel 또는 CSV 파일을 업로드하거나 수동으로 입력하여 장비별 유지보수 비용을 관리할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 파일 업로드 섹션 */}
          <div>
            <Label className="text-base font-semibold mb-3 block">파일 업로드</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="cost-file-input"
              />
              <label htmlFor="cost-file-input" className="cursor-pointer">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="text-sm text-gray-600 mb-2">
                  {file ? file.name : "Excel 또는 CSV 파일을 선택하세요"}
                </div>
                <div className="text-xs text-gray-500">
                  지원 형식: .xlsx, .xls, .csv (최대 10MB)
                </div>
              </label>
              {file && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-4">
              <Button
                onClick={handleUpload}
                disabled={!file || uploadMutation.isPending}
                className="w-full"
              >
                {uploadMutation.isPending ? "업로드 중..." : "파일 업로드"}
              </Button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <p>CSV 파일 형식: 장비명,비용 (예: HPLC Agilent-14,12000000)</p>
            </div>
          </div>

          {/* 현재 비용 표시 */}
          {costsData?.data && Object.keys(costsData.data).length > 0 && (
            <div>
              <Label className="text-base font-semibold mb-3 block">현재 유지보수 비용</Label>
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {Object.entries(costsData.data).map(([equipment, cost]) => (
                    <div key={equipment} className="flex justify-between items-center text-sm">
                      <span className="font-medium">{equipment}</span>
                      <span>{cost.toLocaleString()}원</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

