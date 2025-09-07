// KeyboardDetectionService - HIDデバイス検知実装
// Green フェーズ: テストを通すための最小限実装

import * as HID from 'node-hid';
import { Keyboard } from '@domain/entities/Keyboard';
import { KeyboardId } from '@domain/value-objects/KeyboardId';
import { KeyboardConnectionState, HIDDevice } from '@shared/types/keyboard.types';

export interface DeviceMonitoringCallbacks {
  onDeviceConnected: (keyboard: Keyboard) => void;
  onDeviceDisconnected: (devicePath: string) => void;
}

export class KeyboardDetectionService {
  private isMonitoringActive: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private lastDetectedDevices: HIDDevice[] = [];
  private callbacks?: DeviceMonitoringCallbacks;

  async detectKeyboards(): Promise<Keyboard[]> {
    try {
      const hidDevices = HID.devices();
      const keyboardDevices = this.filterKeyboardDevices(hidDevices);
      
      return keyboardDevices.map(device => this.createKeyboardFromHIDDevice(device));
    } catch (error: any) {
      throw new Error(`Failed to detect keyboards: ${error.message}`);
    }
  }

  private filterKeyboardDevices(devices: any[]): HIDDevice[] {
    return devices.filter(device => this.isKeyboardDevice(device));
  }

  private isKeyboardDevice(device: any): boolean {
    // HID Usage Page 1 (Generic Desktop) + Usage 6 (Keyboard)
    return device.usagePage === 1 && device.usage === 6;
  }

  createKeyboardFromHIDDevice(hidDevice: any): Keyboard {
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

  async startMonitoring(callbacks: DeviceMonitoringCallbacks): Promise<void> {
    if (this.isMonitoringActive) {
      throw new Error('Monitoring is already active');
    }

    this.callbacks = callbacks;
    this.isMonitoringActive = true;
    
    // Initial detection
    this.lastDetectedDevices = await this.getHIDDevices();
    
    // Start periodic monitoring (every 1 second)
    this.monitoringInterval = setInterval(async () => {
      await this.performPeriodicCheck();
    }, 1000);
  }

  async stopMonitoring(): Promise<void> {
    this.isMonitoringActive = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.callbacks = undefined;
    this.lastDetectedDevices = [];
  }

  isMonitoring(): boolean {
    return this.isMonitoringActive;
  }

  async performPeriodicCheck(): Promise<void> {
    if (!this.isMonitoringActive || !this.callbacks) {
      return;
    }

    try {
      const currentDevices = await this.getHIDDevices();
      
      // Detect new connections
      const newDevices = currentDevices.filter(
        current => !this.lastDetectedDevices.some(
          last => last.path === current.path
        )
      );

      // Detect disconnections
      const disconnectedDevices = this.lastDetectedDevices.filter(
        last => !currentDevices.some(
          current => current.path === last.path
        )
      );

      // Notify callbacks
      for (const device of newDevices) {
        if (this.isKeyboardDevice(device)) {
          const keyboard = this.createKeyboardFromHIDDevice(device);
          this.callbacks.onDeviceConnected(keyboard);
        }
      }

      for (const device of disconnectedDevices) {
        if (this.isKeyboardDevice(device)) {
          this.callbacks.onDeviceDisconnected(device.path);
        }
      }

      this.lastDetectedDevices = currentDevices;
    } catch (error) {
      console.error('Error during periodic device check:', error);
    }
  }

  private async getHIDDevices(): Promise<HIDDevice[]> {
    const hidDevices = HID.devices();
    return hidDevices
      .filter(device => device.path) // Filter out devices without path
      .map(device => ({
        vendorId: device.vendorId,
        productId: device.productId,
        path: device.path as string, // Type assertion since we filtered
        manufacturer: device.manufacturer,
        product: device.product,
        interface: device.interface,
        usage: device.usage,
        usagePage: device.usagePage
      }));
  }

  async getDeviceInfo(devicePath: string): Promise<HIDDevice | null> {
    try {
      const devices = await this.getHIDDevices();
      return devices.find(device => device.path === devicePath) || null;
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  }
}