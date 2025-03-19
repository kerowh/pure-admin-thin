<script setup lang="ts">
import { PlusDialog } from "plus-pro-components";
import { ref, watchEffect, computed } from "vue";
import { Close, SuccessFilled, WarningFilled } from "@element-plus/icons-vue";
import type { UploadFile, UploadRawFile, UploadInstance } from "element-plus";
import { useFileUpload, type FileFieldName } from "@/utils/http/useFileUpload";
import ReLoading from "@/components/ReLoading";
import { useFileDownload } from "@/utils/http/useFileDownload";
import { formatFileSize, formatDate } from "@/utils/tools";
import { message } from "@/utils/message";

interface ImportProps {
  visible: boolean;
  maxFileSize?: number;
  fileTypes?: string[];
  action: string;
  data?: Record<string, any>;
  templateUrl: string;
  fileFieldName?: FileFieldName;
}
const props = withDefaults(defineProps<ImportProps>(), {
  visible: false,
  maxFileSize: 5,
  fileTypes: () => ["xls", "xlsx"],
  data: () => ({}),
  fileFieldName: "multipartFile"
});
const emits = defineEmits(["update:visible", "success", "uploadedClose"]);

const dialogVisible = ref(false);
const uploadRef = ref<UploadInstance>();
const currentFile = ref<UploadRawFile>();
const uploadTime = ref<Date>();
const uploaded = ref(false);

const {
  isLoading: uploadLoading,
  files,
  uploadFiles,
  cancelAll,
  retryUpload,
  reset
} = useFileUpload({
  url: props.action,
  data: props.data,
  allowedTypes: props.fileTypes,
  maxFileSize: props.maxFileSize,
  maxRetries: Infinity,
  fileFieldName: props.fileFieldName,
  onSuccess: (res: any) => {
    uploaded.value = true;
    emits("success", res);
  },
  onValidationError: () => {
    handleDel();
  }
});

const {
  downloadFile,
  error: downloadFileError,
  isLoading: downloadFileLoading
} = useFileDownload();

//是否是生产环境
const isProduction = import.meta.env.PROD;
//匹配域名
const regUrl = /^https?:\/\/(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(?=\/|$)/;

const fileProgress = computed<number>(() => {
  const [file] = files.value;
  return file?.progress;
});

const fileUploadError = computed<string>(() => {
  const [file] = files.value;
  return file?.error;
});

const handleDownloadTemplate = async () => {
  await downloadFile({
    url: isProduction
      ? props.templateUrl
      : props.templateUrl.replace(regUrl, "/downloadApi")
  });
  if (!downloadFileError.value) {
    message("文件流获取成功", { type: "success" });
  }
};

const handleFileChange = ({ raw }: UploadFile) => {
  currentFile.value = raw;
};

const handleUpload = () => {
  if (currentFile.value) {
    uploadFiles([currentFile.value]);
    uploadTime.value = new Date();
  }
};

const handleDel = () => {
  uploadTime.value = null;
  currentFile.value = null;
  reset();
};

const handleCancel = () => {
  dialogVisible.value = false;
};

const handleClose = () => {
  handleDel();
  emits("update:visible", false);
  if (uploaded.value) {
    emits("uploadedClose");
    uploaded.value = false;
  }
};

watchEffect(() => {
  if (props.visible) {
    dialogVisible.value = true;
  }
});
</script>

<template>
  <PlusDialog
    v-model="dialogVisible"
    width="382px"
    :show-close="false"
    style="padding: 0"
    draggable
    @close="handleClose"
  >
    <template #header>
      <div class="import_header">
        <span class="import_title">批量导入</span>
        <el-icon size="20" class="cursor-pointer" @click="handleCancel">
          <Close />
        </el-icon>
      </div>
    </template>
    <template #default>
      <div class="import_body">
        <div class="download_template">
          <div class="download_template_left">
            <p>下载模板</p>
            <span>根据提示信息完善表格内容</span>
          </div>
          <el-button
            :disabled="downloadFileLoading"
            @click="handleDownloadTemplate"
          >
            <template #icon>
              <IconifyIconOnline
                v-if="!downloadFileLoading"
                icon="ant-design:download-outlined"
              />
              <ReLoading v-else />
            </template>
            下载模板
          </el-button>
        </div>
        <div class="upload_area">
          <el-upload
            ref="uploadRef"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :show-file-list="false"
            class="w-full"
          >
            <template #trigger>
              <div
                v-if="!currentFile && !files.length"
                class="upload_area_content"
              >
                <div class="no_selected_file">
                  <p><span>点击上传</span> / 拖拽到此区域</p>
                </div>
              </div>
            </template>
            <div
              v-if="!!currentFile || files.length"
              class="upload_area_content"
            >
              <div class="selected_file">
                <div class="selected_file_info">
                  <div class="selected_file_info_top">
                    <p>{{ currentFile.name }}</p>
                    <div v-if="uploadLoading && files.length" class="loading">
                      <ReLoading :size="16" />
                      <span>{{ fileProgress }} %</span>
                    </div>
                    <div v-else-if="files.length" class="result_status">
                      <el-icon
                        v-if="!!fileUploadError"
                        color="#F5463D"
                        size="16px"
                      >
                        <WarningFilled />
                      </el-icon>
                      <el-icon v-else color="#00B25C" size="16px">
                        <SuccessFilled />
                      </el-icon>
                    </div>
                  </div>
                  <div class="selected_file_info_bottom">
                    <span>
                      文件大小：{{ formatFileSize(currentFile.size) }}
                    </span>
                    <span v-if="files.length && uploadTime">
                      上传日期：{{
                        formatDate(uploadTime, "YYYY/M/D HH:mm:ss")
                      }}
                    </span>
                  </div>
                </div>
                <div v-if="files.length" class="selected_file_actions">
                  <el-button
                    v-if="uploadLoading"
                    link
                    type="primary"
                    @click="cancelAll"
                  >
                    取消上传
                  </el-button>
                  <div v-else-if="!!fileUploadError" class="flex">
                    <el-button link type="primary" @click="() => retryUpload()">
                      重新上传
                    </el-button>
                    <el-button link type="primary" @click="handleDel">
                      删除
                    </el-button>
                  </div>
                  <el-button v-else link type="primary" @click="handleDel">
                    继续上传
                  </el-button>
                </div>
              </div>
            </div>
            <template #tip>
              <span v-if="!!fileUploadError" class="error-tip">
                {{ fileUploadError }}
              </span>
              <span v-else class="upload-tip">
                只能上传{{ props.fileTypes.join(" / ") }}格式文件， 且不超过{{
                  props.maxFileSize
                }}MB
              </span>
            </template>
          </el-upload>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="import_footer">
        <el-button :disabled="uploadLoading" @click="handleCancel"
          >取消</el-button
        >
        <el-button
          type="primary"
          :disabled="!currentFile || !!files.length"
          @click="handleUpload"
        >
          上传
        </el-button>
      </div>
    </template>
  </PlusDialog>
</template>

<style scoped lang="scss">
.import_header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background: url("@/assets/import_bg.jpg") no-repeat;
  background-size: 100% 100%;

  .import_title {
    font-size: 18px;
    font-weight: 600;
    color: #000;
  }
}

.import_body {
  padding: 8px 24px 0;

  .download_template {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: #f7faff;
    border: 1px dashed #d5d8dd;

    &_left {
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      p {
        margin-bottom: 16px;
        font-size: 14px;
        font-weight: 500;
        color: #161e2e;
      }

      span {
        font-size: 12px;
        color: #555d6d;
      }
    }
  }

  .upload_area {
    margin-top: 24px;

    &_content {
      box-sizing: border-box;
      width: 100%;
      padding: 24px;
      background: #f7faff;
      border: 1px dashed #d5d8dd;

      .no_selected_file {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 96px;

        p {
          font-size: 14px;
          color: #555d6d;

          span {
            font-size: 14px;
            font-weight: 500;
            color: #0154d9;
          }
        }
      }

      .selected_file {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 100%;
        min-height: 96px;

        &_info {
          display: flex;
          flex-direction: column;

          &_top {
            display: flex;
            align-items: center;

            p {
              max-width: 170px;
              margin-right: 8px;
              overflow: hidden;
              font-size: 14px;
              color: #161e2e;
              text-align: left;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .loading {
              display: flex;
              align-items: center;

              span {
                margin-left: 4px;
                font-size: 12px;
                color: #0158f0;
              }
            }

            .result_status {
              width: 16px;
              height: 16px;
            }
          }

          &_bottom {
            display: flex;
            flex-direction: column;
            margin-top: 8px;
            font-size: 12px;
            color: #7d8695;

            span:last-child {
              margin-top: 4px;
            }
          }
        }

        &_actions {
          display: flex;
          margin-top: 20px;
          font-size: 25px;
          color: #0154d9;
        }
      }
    }

    .upload-tip {
      font-size: 12px;
      font-weight: 400;
      color: #7d8695;
    }

    .error-tip {
      font-size: 12px;
      font-weight: 400;
      color: #f5463d;
    }
  }
}

.import_footer {
  display: flex;
  justify-content: flex-end;
  padding: 8px 24px 24px;
}

:deep(.el-upload-dragger) {
  padding: 0;
  border: none;
  border-radius: 0;
}

:deep(.el-upload-list) {
  margin: 0;
}
</style>
