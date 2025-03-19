import axios, { type AxiosRequestConfig } from "axios";
import { ref, type Ref } from "vue";
import { getToken } from "@/utils/auth";
import { message } from "@/utils/message";

interface DownloadOptions {
  url: string;
  fileName?: string;
  requestConfig?: AxiosRequestConfig;
  method?: "get" | "post";
}

interface FileDownloadHook {
  isLoading: Ref<boolean>;
  error: Ref<Error | null>;
  downloadFile: (options: DownloadOptions) => Promise<void>;
}

export function useFileDownload(): FileDownloadHook {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const getAuthHeader = () => {
    const data = getToken();
    if (!data) return {};

    return {
      Authorization: `${data.accessToken}`.trim()
    };
  };

  const parseFilenameFromHeaders = (headers: Record<string, any>): string => {
    // 优先从 Content-Disposition 解析文件名
    const disposition = headers["content-disposition"] || "";
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(disposition);

    if (matches && matches[1]) {
      return decodeURIComponent(matches[1].replace(/['"]/g, ""));
    }

    // 备用方案：使用自定义响应头
    return decodeURIComponent(headers["filename"] || "download");
  };

  const downloadFile = async ({
    url,
    fileName,
    requestConfig,
    method = "get"
  }: DownloadOptions) => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await axios[method](url, {
        responseType: "blob",
        ...requestConfig,
        headers: {
          ...getAuthHeader(),
          ...requestConfig?.headers
        }
      });

      // 创建 Blob 对象
      const blob = new Blob([response.data], {
        type: response.headers["content-type"]
      });

      // 动态生成文件名
      const finalName = fileName || parseFilenameFromHeaders(response.headers);

      // 创建下载链接
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = finalName;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();

      // 清理资源
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
    } catch (err) {
      error.value = err as Error;
      message(`文件流获取失败：${err.message}`, { type: "error" });
      console.error("文件流获取失败:", err);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    isLoading,
    error,
    downloadFile
  };
}
