// 工具函数：生成ID、时间戳、计算记录大小

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getCurrentTimestamp() {
  return new Date().toISOString();
}

export function calculateRecordSize(record) {
  return JSON.stringify(record).length;
}


