// KeyboardManagementService - Application Service
// Orchestrates keyboard-related use cases and coordinates between domain services
// This is the main entry point for keyboard management operations

import { Keyboard } from '@domain/entities/Keyboard';
import { KeyboardId } from '@domain/value-objects/KeyboardId';
import { KeyboardDetectionService } from '@domain/services/KeyboardDetectionService';
import { DeviceChangeListener } from '@domain/repositories/KeyboardRepository';

export interface KeyboardStatistics {
  totalKeyboards: number;
  connectedKeyboards: number;
  keyboardsByVendor: Map<number, number>;
  averageInputsPerKeyboard: number;
}

export interface KeyboardInfo {
  id: string;
  devicePath: string;
  manufacturer?: string;
  product?: string;
  vendorId: number;
  productId: number;
  isConnected: boolean;
  lastInputTimestamp?: number;
  deviceInfo: string;
}

export class KeyboardManagementService implements DeviceChangeListener {
  private deviceChangeCallbacks: Array<(event: 'connected' | 'disconnected', keyboard: Keyboard | KeyboardId) => void> = [];
  
  constructor(
    private readonly keyboardDetectionService: KeyboardDetectionService
  ) {}
  
  // Primary use cases
  async startKeyboardMonitoring(): Promise<void> {
    await this.keyboardDetectionService.startMonitoring();
  }
  
  async stopKeyboardMonitoring(): Promise<void> {
    await this.keyboardDetectionService.stopMonitoring();
  }
  
  async discoverAvailableKeyboards(): Promise<KeyboardInfo[]> {
    const keyboards = await this.keyboardDetectionService.detectAvailableKeyboards();
    return keyboards.map(keyboard => this.mapToKeyboardInfo(keyboard));
  }
  
  async getAllRegisteredKeyboards(): Promise<KeyboardInfo[]> {
    const keyboards = await this.keyboardDetectionService.getAllRegisteredKeyboards();
    return keyboards.map(keyboard => this.mapToKeyboardInfo(keyboard));
  }
  
  // Keyboard lookup operations
  async findKeyboardByPath(devicePath: string): Promise<KeyboardInfo | null> {
    const keyboard = await this.keyboardDetectionService.findKeyboardByDevicePath(devicePath);
    return keyboard ? this.mapToKeyboardInfo(keyboard) : null;
  }
  
  async findKeyboardById(keyboardId: string): Promise<KeyboardInfo | null> {
    const id = new KeyboardId(keyboardId);
    const keyboard = await this.keyboardDetectionService.findKeyboardById(id);
    return keyboard ? this.mapToKeyboardInfo(keyboard) : null;
  }
  
  async findKeyboardsByVendor(vendorId: number, productId?: number): Promise<KeyboardInfo[]> {
    let keyboards: Keyboard[];
    
    if (productId !== undefined) {
      keyboards = await this.keyboardDetectionService.findKeyboardsByVendorProduct(vendorId, productId);
    } else {
      const allKeyboards = await this.keyboardDetectionService.getAllRegisteredKeyboards();
      keyboards = allKeyboards.filter(kb => kb.getVendorId() === vendorId);
    }
    
    return keyboards.map(keyboard => this.mapToKeyboardInfo(keyboard));
  }
  
  // Input tracking
  async recordKeyboardInput(keyboardId: string, timestamp?: number): Promise<void> {
    const id = new KeyboardId(keyboardId);
    const inputTimestamp = timestamp || Date.now();
    
    await this.keyboardDetectionService.recordKeyboardInput(id, inputTimestamp);
  }
  
  // Keyboard management
  async registerNewKeyboard(
    devicePath: string,
    vendorId: number,
    productId: number,
    manufacturer?: string,
    product?: string
  ): Promise<KeyboardInfo> {
    const keyboardId = KeyboardId.fromDevicePath(devicePath);
    
    const keyboard = new Keyboard({
      id: keyboardId,
      devicePath,
      vendorId,
      productId,
      manufacturer,
      product,
      connectionState: require('@shared/types/keyboard.types').KeyboardConnectionState.CONNECTED
    });
    
    // Validate before registration
    this.keyboardDetectionService.validateKeyboardForRegistration(keyboard);
    
    await this.keyboardDetectionService.registerKeyboard(keyboard);
    
    return this.mapToKeyboardInfo(keyboard);
  }
  
  async unregisterKeyboard(keyboardId: string): Promise<void> {
    const id = new KeyboardId(keyboardId);
    await this.keyboardDetectionService.unregisterKeyboard(id);
  }
  
  // Business intelligence
  async getKeyboardStatistics(): Promise<KeyboardStatistics> {
    const stats = await this.keyboardDetectionService.getKeyboardStatistics();
    
    // Calculate average inputs per keyboard (mock calculation for now)
    const averageInputsPerKeyboard = stats.totalKeyboards > 0 ? 
      Math.round(Math.random() * 100) : 0; // TODO: Implement actual input tracking
    
    return {
      ...stats,
      averageInputsPerKeyboard
    };
  }
  
  // Validation utilities
  async isKeyboardRegistered(keyboardId: string): Promise<boolean> {
    const id = new KeyboardId(keyboardId);
    return await this.keyboardDetectionService.isKeyboardRegistered(id);
  }
  
  async isDevicePathAvailable(devicePath: string): Promise<boolean> {
    const isInUse = await this.keyboardDetectionService.isDevicePathInUse(devicePath);
    return !isInUse;
  }
  
  // Status check
  isMonitoring(): boolean {
    return this.keyboardDetectionService.isMonitoringActive();
  }
  
  // Device change event handling (implements DeviceChangeListener)
  async onKeyboardConnected(keyboard: Keyboard): Promise<void> {
    // Notify all registered callbacks
    this.deviceChangeCallbacks.forEach(callback => {
      try {
        callback('connected', keyboard);
      } catch (error) {
        console.error('Error in device change callback:', error);
      }
    });
  }
  
  async onKeyboardDisconnected(keyboardId: KeyboardId): Promise<void> {
    // Notify all registered callbacks
    this.deviceChangeCallbacks.forEach(callback => {
      try {
        callback('disconnected', keyboardId);
      } catch (error) {
        console.error('Error in device change callback:', error);
      }
    });
  }
  
  // Event subscription management
  onDeviceChange(callback: (event: 'connected' | 'disconnected', keyboard: Keyboard | KeyboardId) => void): () => void {
    this.deviceChangeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.deviceChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.deviceChangeCallbacks.splice(index, 1);
      }
    };
  }
  
  // Helper method to convert domain entity to DTO
  private mapToKeyboardInfo(keyboard: Keyboard): KeyboardInfo {
    return {
      id: keyboard.getId().getValue(),
      devicePath: keyboard.getDevicePath(),
      manufacturer: keyboard.getManufacturer(),
      product: keyboard.getProduct(),
      vendorId: keyboard.getVendorId(),
      productId: keyboard.getProductId(),
      isConnected: keyboard.isConnected(),
      lastInputTimestamp: keyboard.getLastInputTimestamp(),
      deviceInfo: keyboard.getDeviceInfo()
    };
  }
}