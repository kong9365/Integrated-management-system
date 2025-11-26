/**
 * 분석법 매핑 파일 업로드 다이얼로그
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
import { Label } from "@/components/ui/label";
import { Upload, FileText, X, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AnalysisMappingDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 분석법 매핑 데이터 조회
  const { data: mappingData } = useQuery<{ success: boolean; data: Record<string, string> }>({
    queryKey: ["analysis-mapping"],
    queryFn: async () => {
      const response = await fetch("/api/cds/analysis-mapping");
      if (!response.ok) {
        // 파일이 없을 수 있으므로 빈 객체 반환
        return { success: true, data: {} };
      }
      return response.json();
    },
  });

  // 파일 업로드 mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/cds/analysis-mapping/upload", {
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
      queryClient.invalidateQueries({ queryKey: ["analysis-mapping"] });
      queryClient.invalidateQueries({ queryKey: ["cds-utilization-options"] });
      toast({
        title: "업로드 완료",
        description: "분석법 매핑이 업데이트되었습니다.",
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full mb-3">
          <FlaskConical className="mr-2 h-4 w-4" />
          분석법 매핑 관리
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-600" />
            분석법 매핑 관리
          </DialogTitle>
          <DialogDescription>
            Excel 또는 CSV 파일을 업로드하여 분석법 필터에 표시될 데이터를 매핑할 수 있습니다.
            <br />
            <span className="text-xs text-gray-500 mt-2 block">
              향후 업로드한 파일의 내용을 기반으로 분석법 필터 데이터가 매핑되어 표시됩니다.
            </span>
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
                id="analysis-mapping-file-input"
              />
              <label htmlFor="analysis-mapping-file-input" className="cursor-pointer">
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
              <p>CSV 파일 형식: 원본분석법,매핑분석법 (예: HPLC-Method-1,GC-MS-Method-A)</p>
              <p className="mt-1">Excel 파일 형식: 첫 번째 열(원본분석법), 두 번째 열(매핑분석법)</p>
            </div>
          </div>

          {/* 현재 매핑 표시 */}
          {mappingData?.data && Object.keys(mappingData.data).length > 0 && (
            <div>
              <Label className="text-base font-semibold mb-3 block">현재 분석법 매핑</Label>
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {Object.entries(mappingData.data).map(([original, mapped]) => (
                    <div key={original} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                      <span className="font-medium text-gray-700">{original}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-purple-600">{mapped}</span>
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

