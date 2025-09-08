// KeyboardDetectionService - Domain Service
// Implements business logic for keyboard detection and management
// Following Clean Architecture: Domain service uses repository interface

import { Keyboard } from '@domain/entities/Keyboard';
import { KeyboardId } from '@domain/value-objects/KeyboardId';
import { KeyboardRepository } from '@domain/repositories/KeyboardRepository';

export class KeyboardDetectionService {
  private isMonitoring = false;
  
  constructor(private readonly keyboardRepository: KeyboardRepository) {}
  
  // Core keyboard detection business logic
  async detectAvailableKeyboards(): Promise<Keyboard[]> {
    return await this.keyboardRepository.findConnectedKeyboards();
  }
  
  // Device monitoring management
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      throw new Error('Device monitoring is already active');
    }
    
    await this.keyboardRepository.startDeviceMonitoring();
    this.isMonitoring = true;
  }
  
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return; // Already stopped, no error
    }
    
    await this.keyboardRepository.stopDeviceMonitoring();
    this.isMonitoring = false;
  }
  
  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }
  
  // Keyboard registration and management
  async registerKeyboard(keyboard: Keyboard): Promise<void> {
    await this.keyboardRepository.save(keyboard);
  }
  
  // Keyboard lookup operations
  async findKeyboardByDevicePath(devicePath: string): Promise<Keyboard | null> {
    return await this.keyboardRepository.findByDevicePath(devicePath);
  }
  
  async findKeyboardsByVendorProduct(vendorId: number, productId: number): Promise<Keyboard[]> {
    return await this.keyboardRepository.findByVendorAndProduct(vendorId, productId);
  }
  
  async findKeyboardById(id: KeyboardId): Promise<Keyboard | null> {
    return await this.keyboardRepository.findById(id);
  }
  
  async getAllRegisteredKeyboards(): Promise<Keyboard[]> {
    return await this.keyboardRepository.findAll();
  }
  
  // Input tracking business logic
  async recordKeyboardInput(keyboardId: KeyboardId, timestamp: number): Promise<void> {
    const keyboard = await this.keyboardRepository.findById(keyboardId);
    
    if (!keyboard) {
      throw new Error(`Keyboard with ID ${keyboardId.getValue()} not found`);
    }
    
    keyboard.recordInputTimestamp(timestamp);
    await this.keyboardRepository.save(keyboard);
  }
  
  // Business logic for keyboard validation
  async isKeyboardRegistered(keyboardId: KeyboardId): Promise<boolean> {
    return await this.keyboardRepository.exists(keyboardId);
  }
  
  async isDevicePathInUse(devicePath: string): Promise<boolean> {
    const keyboard = await this.keyboardRepository.findByDevicePath(devicePath);
    return keyboard !== null;
  }
  
  // Keyboard lifecycle management
  async unregisterKeyboard(keyboardId: KeyboardId): Promise<void> {
    const exists = await this.keyboardRepository.exists(keyboardId);
    
    if (!exists) {
      throw new Error(`Keyboard with ID ${keyboardId.getValue()} not found`);
    }
    
    await this.keyboardRepository.delete(keyboardId);
  }
  
  // Business rules for keyboard connection validation
  validateKeyboardForRegistration(keyboard: Keyboard): void {
    // Business rule: Only connected keyboards can be registered
    if (!keyboard.isConnected()) {
      throw new Error('Cannot register disconnected keyboard');
    }
    
    // Business rule: Device path must be unique
    // This would typically be enforced at repository level, 
    // but we can add domain validation here if needed
  }
  
  // Get keyboard statistics (business intelligence)
  async getKeyboardStatistics(): Promise<{
    totalKeyboards: number;
    connectedKeyboards: number;
    keyboardsByVendor: Map<number, number>;
  }> {
    const allKeyboards = await this.keyboardRepository.findAll();
    const connectedKeyboards = await this.keyboardRepository.findConnectedKeyboards();
    
    const keyboardsByVendor = new Map<number, number>();
    
    allKeyboards.forEach(keyboard => {
      const vendorId = keyboard.getVendorId();
      const count = keyboardsByVendor.get(vendorId) || 0;
      keyboardsByVendor.set(vendorId, count + 1);
    });
    
    return {
      totalKeyboards: allKeyboards.length,
      connectedKeyboards: connectedKeyboards.length,
      keyboardsByVendor
    };
  }
}