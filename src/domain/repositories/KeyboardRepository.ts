// KeyboardRepository Interface - Domain Layer
// This interface defines the contract for keyboard persistence operations
// Following Clean Architecture principles: Domain defines interface, Infrastructure implements

import { Keyboard } from '@domain/entities/Keyboard';
import { KeyboardId } from '@domain/value-objects/KeyboardId';

export interface KeyboardRepository {
  // Core CRUD operations
  save(keyboard: Keyboard): Promise<void>;
  findById(id: KeyboardId): Promise<Keyboard | null>;
  findAll(): Promise<Keyboard[]>;
  delete(id: KeyboardId): Promise<void>;
  exists(id: KeyboardId): Promise<boolean>;
  
  // Keyboard-specific queries
  findByDevicePath(devicePath: string): Promise<Keyboard | null>;
  findConnectedKeyboards(): Promise<Keyboard[]>;
  findByVendorAndProduct(vendorId: number, productId: number): Promise<Keyboard[]>;
  
  // Device monitoring operations
  startDeviceMonitoring(): Promise<void>;
  stopDeviceMonitoring(): Promise<void>;
  isMonitoring(): boolean;
}

// Event-based device change notifications
export interface DeviceChangeListener {
  onKeyboardConnected(keyboard: Keyboard): Promise<void>;
  onKeyboardDisconnected(keyboardId: KeyboardId): Promise<void>;
}