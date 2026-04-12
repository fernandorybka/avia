"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  templateId: string;
};

function parseFilename(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (basicMatch?.[1]) {
    return basicMatch[1];
  }

  return fallback;
}

export function PreparedTemplateDownloadButton({ templateId }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      const response = await fetch(`/api/prepared-models/${templateId}/download`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Falha ao baixar o modelo.");
      }

      const blob = await response.blob();
      const filename = parseFilename(
        response.headers.get("content-disposition"),
        "modelo-pronto.docx"
      );

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      toast.success("Download concluído com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível concluir o download.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button size="sm" onClick={handleDownload} disabled={isDownloading}>
      {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {isDownloading ? "Baixando..." : "Baixar"}
    </Button>
  );
}
