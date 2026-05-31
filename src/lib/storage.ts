import fs from 'fs';
import path from 'path';

/**
 * 数据存储工具
 * 根据环境变量决定存储路径：
 * - 开发环境（DEV）：使用项目根目录下的 data/ 目录
 * - 生产环境（PROD）：使用 /tmp/ 目录（临时存储，部署后数据会丢失）
 */

// 获取数据存储目录
export function getDataDir(): string {
  const env = process.env.COZE_PROJECT_ENV;
  
  // 生产环境使用 /tmp 目录
  if (env === 'PROD') {
    return '/tmp';
  }
  
  // 开发环境使用项目根目录下的 data 目录
  return path.join(process.cwd(), 'data');
}

// 获取数据文件路径
export function getDataFilePath(filename: string): string {
  return path.join(getDataDir(), filename);
}

// 确保数据目录存在
export function ensureDataDir(): void {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// 从文件读取 JSON 数据
export function readJsonFile<T>(filename: string, defaultValue: T): T {
  try {
    ensureDataDir();
    const filePath = getDataFilePath(filename);
    
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`[Storage] Error reading ${filename}:`, error);
  }
  return defaultValue;
}

// 写入 JSON 数据到文件
export function writeJsonFile<T>(filename: string, data: T): boolean {
  try {
    ensureDataDir();
    const filePath = getDataFilePath(filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`[Storage] Error writing ${filename}:`, error);
    return false;
  }
}

// 常用数据文件名
export const DATA_FILES = {
  WISHES: 'wishes.json',
  FOLLOWERS: 'followers.json',
  TRIP_PLANS: 'trip-plans.json',
} as const;
