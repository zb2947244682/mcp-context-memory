import { getCurrentTimestamp, calculateRecordSize } from "./utils.js";

export const memoryStats = {
  totalTopics: 0,
  totalRecords: 0,
  totalMemorySize: 0,
  lastAccessTime: null,
  accessCount: 0
};

export function updateStats(action, topic = null, record = null) {
  memoryStats.lastAccessTime = getCurrentTimestamp();
  memoryStats.accessCount++;

  if (action === "add_topic") {
    memoryStats.totalTopics++;
  } else if (action === "add_record") {
    memoryStats.totalRecords++;
    if (record) {
      memoryStats.totalMemorySize += calculateRecordSize(record);
    }
  } else if (action === "remove_topic") {
    memoryStats.totalTopics--;
  } else if (action === "remove_record") {
    memoryStats.totalRecords--;
    if (record) {
      memoryStats.totalMemorySize -= calculateRecordSize(record);
    }
  }
}


