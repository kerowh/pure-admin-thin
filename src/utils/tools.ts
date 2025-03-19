/**
 * 转换文件大小单位
 * @param sizeBytes 文件字节数
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(sizeBytes: number): string {
  // 输入校验
  if (typeof sizeBytes !== "number" || sizeBytes < 0) {
    throw new Error("Invalid file size input");
  }

  // 单位阈值判断
  const MB_THRESHOLD = 1024 * 1024; // 1MB = 1048576字节
  if (sizeBytes >= MB_THRESHOLD) {
    const sizeMB = sizeBytes / MB_THRESHOLD;
    return `${sizeMB.toFixed(2)} MB`; // 两位小数处理
  }

  const sizeKB = sizeBytes / 1024;
  return `${sizeKB.toFixed(2)} KB`;
}

/**
 * attrs 转换驼峰命名
 * @param attrs attrs对象
 */
export const getCamelCaseAttrs = attrs => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(attrs)) {
    const camelCaseKey = key.replace(/-([a-z])/g, (_, char) =>
      char.toUpperCase()
    );
    result[camelCaseKey] = value;
  }
  return result;
};

/**
 * 将日期对象格式化为指定格式的字符串
 * @param date 日期对象
 * @param format 格式字符串（支持：YYYY/YY/MM/M/DD/D/HH/H/hh/h/mm/m/ss/s）
 */
export function formatDate(date: Date, format: string): string {
  // 参数校验
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error("Invalid Date object");
  }

  // 时间组件提取
  const components = {
    YYYY: date.getFullYear().toString(),
    YY: date.getFullYear().toString().slice(-2),
    MM: (date.getMonth() + 1).toString().padStart(2, "0"),
    M: (date.getMonth() + 1).toString(),
    DD: date.getDate().toString().padStart(2, "0"),
    D: date.getDate().toString(),
    HH: date.getHours().toString().padStart(2, "0"),
    H: date.getHours().toString(),
    hh: (date.getHours() % 12 || 12).toString().padStart(2, "0"),
    h: (date.getHours() % 12 || 12).toString(),
    mm: date.getMinutes().toString().padStart(2, "0"),
    m: date.getMinutes().toString(),
    ss: date.getSeconds().toString().padStart(2, "0"),
    s: date.getSeconds().toString()
  };

  // 格式替换
  return format.replace(
    /(YYYY|YY|MM|M|DD|D|HH|H|hh|h|mm|m|ss|s)/g,
    match => components[match as keyof typeof components] || match
  );
}
