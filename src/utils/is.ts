export function isNumber(value: any): value is number {
  return typeof value === "number" && !isNaN(value);
}

export function isString(value: any): value is string {
  return typeof value === "string";
}

export function isBoolean(value: any): value is boolean {
  return typeof value === "boolean";
}

export function isArray(value: any): value is Array<any> {
  return Array.isArray(value);
}
export function isObject(value: any): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

//是否是空值
export function isEmpty(value: any): boolean {
  return value === null || value === undefined || value === "";
}

//递归比较两个对象是否相等 （空值不严格相等）
export function isObjEquivalent(a, b) {
  if (isEmpty(a)) {
    a = null;
  }
  if (isEmpty(b)) {
    b = null;
  }

  // 比较基本类型
  if (typeof a !== "object" || a === null) {
    return a === b;
  }

  // 比较数组
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!isObjEquivalent(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  // 比较对象
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }
  for (let key of keysA) {
    if (!keysB.includes(key) || !isObjEquivalent(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

// 递归比较两个对象是否相等 （空值严格相等）
export function isDeepEqual(obj1: any, obj2: any): boolean {
  // 基本类型直接比较
  if (obj1 === obj2) return true;
  if (
    typeof obj1 !== "object" ||
    typeof obj2 !== "object" ||
    obj1 === null ||
    obj2 === null
  )
    return false;

  // 特殊对象类型处理
  const constructor1 = obj1.constructor;
  const constructor2 = obj2.constructor;
  if (constructor1 !== constructor2) return false;

  // 处理数组、Map、Set等
  if (constructor1 === Date) return obj1.getTime() === obj2.getTime();
  if (constructor1 === Map || constructor1 === Set) {
    if (obj1.size !== obj2.size) return false;
    // Map/Set 需要递归比较每个元素
  }

  // 递归比较所有属性
  const keys1 = Reflect.ownKeys(obj1);
  const keys2 = Reflect.ownKeys(obj2);
  if (keys1.length !== keys2.length) return false;

  return keys1.every(key => {
    if (!obj2.hasOwnProperty(key)) return false;
    return isDeepEqual(obj1[key], obj2[key]);
  });
}
