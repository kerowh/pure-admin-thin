import { ref, h } from "vue";
import type { Ref } from "vue";
import { http } from "@/utils/http";
import axios from "axios";
import type { AxiosRequestConfig, CancelTokenSource } from "axios";
import { message } from "@/utils/message";
interface FileUploadOptions {
  url: string;
  headers?: Record<string, string>;
  data?: Record<string, any>;
  allowedTypes?: string[];
  maxFileSize?: number; // MB
  multiple?: boolean;
  maxRetries?: number; // 最大重试次数
  timeout?: number; // 超时时间（毫秒）
  autoRetry?: boolean; // 自动重试
  //自定义文件参数名
  fileFieldName?: FileFieldName;
  onSuccess?: (response: any, file: File) => void;
  onError?: (error: string, file: File) => void;
  onRetry?: (file: File, retryCount: number) => void;
  onValidationError?: (errors: string[]) => void;
}

export type FileFieldName = "multipartFile" | "file" | "attachment"; // 可扩展允许的字段名

interface UploadFile<T extends FileFieldName> {
  fileData: {
    [key in T]?: File;
  };
  progress: number;
  error: string | null;
  cancelTokenSource: CancelTokenSource;
  retryCount: number; // 当前重试次数
  maxRetries: number; // 最大重试次数
  timeout: number; // 超时设置
  autoRetry: boolean; // 是否自动重试
}

interface FileUploadReturn {
  uploadFiles: (files: FileList | File[]) => Promise<void>;
  files: Ref<UploadFile<FileFieldName>[]>;
  isLoading: Ref<boolean>;
  cancelAll: () => void;
  reset: () => void;
  retryUpload: (file?: File) => void; // 重试方法
}

interface UploadFileResponse {
  code: number;
  msg: string;
  data: any;
}

export function useFileUpload(options: FileUploadOptions): FileUploadReturn {
  const files = ref<UploadFile<FileFieldName>[]>([]);
  const isLoading = ref(false);
  const fileFieldName: FileFieldName = options.fileFieldName || "multipartFile";

  // 验证逻辑
  const validateFiles = (filesToValidate: File[]) => {
    const errors: string[] = [];
    if (!options.multiple && filesToValidate.length > 1) {
      errors.push("不支持多文件上传");
    }

    //获取文件后缀名
    const getSuffix = (filename: string): string => {
      // 使用空值合并运算符处理无后缀的情况
      return filename.split(".").pop()?.toLowerCase() || "";
    };

    filesToValidate.forEach(file => {
      if (
        options.allowedTypes &&
        !options.allowedTypes.includes(file.type) &&
        !options.allowedTypes.includes(getSuffix(file.name))
      ) {
        errors.push(`文件 ${file.name} 类型不合法`);
      }
      if (
        options.maxFileSize &&
        file.size > options.maxFileSize * 1024 * 1024
      ) {
        errors.push(`文件 ${file.name} 超过大小限制`);
      }
    });
    if (errors.length > 0) {
      message(() => h("p", errors.join("\n")), {
        type: "error"
      });
      options.onValidationError?.(errors);
      throw new Error("文件验证失败");
    }
  };

  // 创建上传文件对象
  const createUploadFile = (file: File): UploadFile<FileFieldName> => ({
    fileData: {
      [fileFieldName]: file
    },
    progress: 0,
    error: null,
    cancelTokenSource: axios.CancelToken.source(),
    retryCount: 0,
    autoRetry: options.autoRetry || false,
    maxRetries: options.maxRetries || 3,
    timeout: options.timeout || 30000
  });

  // 执行单个文件上传
  const executeUpload = async (
    uploadFile: UploadFile<FileFieldName>,
    index: number
  ) => {
    const formData = new FormData();
    formData.append(fileFieldName, uploadFile.fileData[fileFieldName]);

    if (options.data) {
      Object.entries(options.data).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const config: AxiosRequestConfig = {
      headers: {
        "Content-Type": "multipart/form-data",
        ...options.headers
      },
      cancelToken: uploadFile.cancelTokenSource.token,
      timeout: uploadFile.timeout,
      onUploadProgress: progressEvent => {
        if (progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          files.value[index].progress = progress;
        }
      }
    };

    try {
      const { data } = await http.request<UploadFileResponse>(
        "post",
        options.url || "/noApi/gcbiz/op/file/V1/upload",
        {
          data: formData,
          ...config
        }
      );
      message("上传成功", {
        type: "success"
      });
      options.onSuccess?.(data, uploadFile.fileData[fileFieldName]);
    } catch (err) {
      if (axios.isCancel(err)) {
        files.value[index].error = "上传已取消";
      } else {
        handleUploadError(err, uploadFile, index);
      }
    }
  };

  // 处理上传错误
  const handleUploadError = (
    err: any,
    uploadFile: UploadFile<FileFieldName>,
    index: number
  ) => {
    let errorMessage = err.message || err.msg || err.data || "文件上传失败";
    // 处理超时错误
    if (err.code === "ECONNABORTED") {
      errorMessage = `上传超时（${uploadFile.timeout}ms）`;
    }

    // 更新错误信息
    files.value[index].error = errorMessage;
    options.onError?.(errorMessage, uploadFile.fileData[fileFieldName]);

    // 自动重试逻辑
    if (uploadFile.autoRetry && uploadFile.retryCount < uploadFile.maxRetries) {
      files.value[index].retryCount += 1;
      options.onRetry?.(
        uploadFile.fileData[fileFieldName],
        files.value[index].retryCount
      );
      setTimeout(
        () => retrySingleUpload(index),
        1000 * files.value[index].retryCount
      );
    }
  };

  // 重试单个文件上传
  const retrySingleUpload = async (index: number) => {
    const fileData = files.value[index];
    if (fileData.retryCount > fileData.maxRetries) return;

    // 创建新的取消令牌
    fileData.cancelTokenSource = axios.CancelToken.source();
    fileData.error = null;
    fileData.progress = 0;

    try {
      await executeUpload(fileData, index);
    } catch (err) {
      handleUploadError(err, fileData, index);
    }
  };

  // 上传入口函数
  const uploadFiles = async (inputFiles: FileList | File[]) => {
    isLoading.value = true;
    const filesArray = Array.from(inputFiles);

    try {
      validateFiles(filesArray);
    } catch (error) {
      isLoading.value = false;
      return error;
    }

    // 初始化文件列表
    files.value = filesArray.map(createUploadFile);

    // 执行所有上传任务
    await Promise.all(
      files.value.map((file, index) =>
        executeUpload(file, index).catch(err =>
          handleUploadError(err, file, index)
        )
      )
    );

    isLoading.value = false;
  };

  // 重试方法
  const retryUpload = async (targetFile?: File) => {
    if (targetFile) {
      const index = files.value.findIndex(
        f => f.fileData[fileFieldName] === targetFile
      );
      if (index !== -1) {
        isLoading.value = true;
        await retrySingleUpload(index);
        isLoading.value = false;
      }
    } else {
      isLoading.value = true;
      await Promise.all(
        files.value
          .filter(f => f.error)
          .map((...args) => retrySingleUpload(args[1]))
      );
      isLoading.value = false;
    }
  };

  const cancelAll = () => {
    files.value.forEach(file => {
      file.cancelTokenSource.cancel("用户取消上传");
      file.error = "上传已取消";
    });
  };

  const reset = () => {
    files.value = [];
    isLoading.value = false;
  };

  return {
    uploadFiles,
    files,
    isLoading,
    cancelAll,
    reset,
    retryUpload // 暴露重试方法
  };
}
