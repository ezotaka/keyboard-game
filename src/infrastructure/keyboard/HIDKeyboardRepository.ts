// HIDKeyboardRepository - Infrastructure Layer Implementation
// Implements KeyboardRepository using node-hid for actual keyboard detection
// This bridges the domain and infrastructure concerns

import { KeyboardRepository, DeviceChangeListener } from '@domain/repositories/KeyboardRepository';
import { Keyboard } from '@domain/entities/Keyboard';
import { KeyboardId } from '@domain/value-objects/KeyboardId';
import { KeyboardConnectionState } from '@shared/types/keyboard.types';
import * as HID from 'node-hid';

// HID Device type definition
interface HIDDevice {
  vendorId: number;
  productId: number;
  path: string;
  manufacturer?: string;
  product?: string;
  interface?: number;
  usage?: number;
  usagePage?: number;
}

export class HIDKeyboardRepository implements KeyboardRepository {
  private keyboardStore: Map<string, Keyboard> = new Map();
  private isMonitoringActive = false;
  private monitoringInterval?: NodeJS.Timeout;
  private lastDetectedDevices: HIDDevice[] = [];
  private deviceChangeListener?: DeviceChangeListener;
  
  constructor(private readonly pollIntervalMs: number = 1000) {}
  
  // Core CRUD operations
  async save(keyboard: Keyboard): Promise<void> {
    this.keyboardStore.set(keyboard.getId().getValue(), keyboard);
  }
  
  async findById(id: KeyboardId): Promise<Keyboard | null> {
    return this.keyboardStore.get(id.getValue()) || null;
  }
  
  async findAll(): Promise<Keyboard[]> {
    // Combine stored keyboards with currently detected HID keyboards
    const currentlyDetectedKeyboards = await this.detectCurrentKeyboards();
    
    // Merge stored keyboards with detected ones, prioritizing stored versions
    const keyboardMap = new Map<string, Keyboard>();
    
    // Add currently detected keyboards first
    currentlyDetectedKeyboards.forEach(keyboard => {
      keyboardMap.set(keyboard.getId().getValue(), keyboard);
    });
    
    // Override with stored versions if they exist
    this.keyboardStore.forEach(keyboard => {
      keyboardMap.set(keyboard.getId().getValue(), keyboard);
    });
    
    return Array.from(keyboardMap.values());
  }
  
  async delete(id: KeyboardId): Promise<void> {
    this.keyboardStore.delete(id.getValue());
  }
  
  async exists(id: KeyboardId): Promise<boolean> {
    if (this.keyboardStore.has(id.getValue())) {
      return true;
    }
    
    // Check if keyboard exists in current HID devices
    const currentKeyboards = await this.detectCurrentKeyboards();
    return currentKeyboards.some(kb => kb.getId().equals(id));
  }
  
  // Keyboard-specific queries
  async findByDevicePath(devicePath: string): Promise<Keyboard | null> {
    // Check stored keyboards first
    for (const keyboard of this.keyboardStore.values()) {
      if (keyboard.getDevicePath() === devicePath) {
        return keyboard;
      }
    }
    
    // Check currently detected keyboards
    const currentKeyboards = await this.detectCurrentKeyboards();
    return currentKeyboards.find(kb => kb.getDevicePath() === devicePath) || null;
  }
  
  async findConnectedKeyboards(): Promise<Keyboard[]> {
    const allKeyboards = await this.findAll();
    return allKeyboards.filter(keyboard => keyboard.isConnected());
  }
  
  async findByVendorAndProduct(vendorId: number, productId: number): Promise<Keyboard[]> {
    const allKeyboards = await this.findAll();
    return allKeyboards.filter(
      keyboard => keyboard.getVendorId() === vendorId && 
                 keyboard.getProductId() === productId
    );
  }
  
  // Device monitoring operations
  async startDeviceMonitoring(): Promise<void> {
    if (this.isMonitoringActive) {
      throw new Error('Device monitoring is already active');
    }
    
    this.isMonitoringActive = true;
    this.lastDetectedDevices = await this.getHIDDevices();
    
    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.performPeriodicCheck();
    }, this.pollIntervalMs);
  }
  
  async stopDeviceMonitoring(): Promise<void> {
    this.isMonitoringActive = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.lastDetectedDevices = [];
  }
  
  isMonitoring(): boolean {
    return this.isMonitoringActive;
  }
  
  // Set device change listener for monitoring callbacks
  setDeviceChangeListener(listener: DeviceChangeListener): void {
    this.deviceChangeListener = listener;
  }
  
  // Private implementation methods
  private async detectCurrentKeyboards(): Promise<Keyboard[]> {
    try {
      const hidDevices = await this.getHIDDevices();
      const keyboardDevices = this.filterKeyboardDevices(hidDevices);
      
      return keyboardDevices.map(device => this.createKeyboardFromHIDDevice(device));
    } catch (error: any) {
      console.error('Failed to detect current keyboards:', error);
      return [];
    }
  }
  
  private async getHIDDevices(): Promise<HIDDevice[]> {
    const hidDevices = HID.devices();
    return hidDevices
      .filter(device => device.path) // Filter out devices without path
      .map(device => ({
        vendorId: device.vendorId,
        productId: device.productId,
        path: device.path as string,
        manufacturer: device.manufacturer,
        product: device.product,
        interface: device.interface,
        usage: device.usage,
        usagePage: device.usagePage
      }));
  }
  
  private filterKeyboardDevices(devices: HIDDevice[]): HIDDevice[] {
    // HID Usage Page 1 (Generic Desktop) + Usage 6 (Keyboard)
    return devices.filter(device => 
      device.usagePage === 1 && device.usage === 6
    );
  }
  
  private createKeyboardFromHIDDevice(hidDevice: HIDDevice): Keyboard {
    const keyboardId = KeyboardId.fromDevicePath(hidDevice.path);
    
    return new Keyboard({
      id: keyboardId,
      devicePath: hidDevice.path,
      vendorId: hidDevice.vendorId,
      productId: hidDevice.productId,
      manufacturer: hidDevice.manufacturer,
      product: hidDevice.product,
      connectionState: KeyboardConnectionState.CONNECTED
    });
  }
  
  private async performPeriodicCheck(): Promise<void> {
    if (!this.isMonitoringActive || !this.deviceChangeListener) {
      return;
    }
    
    try {
      const currentDevices = await this.getHIDDevices();
      const currentKeyboardDevices = this.filterKeyboardDevices(currentDevices);
      
      // Detect new connections
      const newDevices = currentKeyboardDevices.filter(
        current => !this.lastDetectedDevices.some(
          last => last.path === current.path
        )
      );
      
      // Detect disconnections
      const disconnectedDevices = this.filterKeyboardDevices(this.lastDetectedDevices).filter(
        last => !currentKeyboardDevices.some(
          current => current.path === last.path
        )
      );
      
      // Notify about new connections
      for (const device of newDevices) {
        const keyboard = this.createKeyboardFromHIDDevice(device);
        await this.save(keyboard); // Store the new keyboard
        await this.deviceChangeListener.onKeyboardConnected(keyboard);
      }
      
      // Notify about disconnections
      for (const device of disconnectedDevices) {
        const keyboardId = KeyboardId.fromDevicePath(device.path);
        
        // Update stored keyboard state if it exists
        const storedKeyboard = await this.findById(keyboardId);
        if (storedKeyboard) {
          storedKeyboard.updateConnectionState(KeyboardConnectionState.DISCONNECTED);
          await this.save(storedKeyboard);
        }
        
        await this.deviceChangeListener.onKeyboardDisconnected(keyboardId);
      }
      
      this.lastDetectedDevices = currentDevices;
    } catch (error) {
      console.error('Error during periodic device check:', error);
    }
  }
  
  // Utility methods for debugging and diagnostics
  async getDeviceInfo(devicePath: string): Promise<HIDDevice | null> {
    try {
      const devices = await this.getHIDDevices();
      return devices.find(device => device.path === devicePath) || null;
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  }
  
  // Get current HID device count for diagnostics
  async getHIDDeviceCount(): Promise<number> {
    const devices = await this.getHIDDevices();
    return devices.length;
  }
  
  async getKeyboardDeviceCount(): Promise<number> {
    const devices = await this.getHIDDevices();
    const keyboardDevices = this.filterKeyboardDevices(devices);
    return keyboardDevices.length;
  }
}