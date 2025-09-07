// キーボード関連の型定義

export interface HIDDevice {
  vendorId: number;
  productId: number;
  path: string;
  manufacturer?: string;
  product?: string;
  interface?: number;
  usage?: number;
  usagePage?: number;
}

export interface KeyInput {
  key: string;
  keyCode: number;
  timestamp: number;
  devicePath: string;
}

export enum KeyboardConnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

export interface KeyboardProperties {
  id: string;
  devicePath: string;
  vendorId: number;
  productId: number;
  manufacturer?: string;
  product?: string;
  connectionState: KeyboardConnectionState;
  lastInputTimestamp?: number;
}