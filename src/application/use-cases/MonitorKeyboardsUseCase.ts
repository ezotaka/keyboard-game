// MonitorKeyboardsUseCase - Application Layer
// Use case for starting and managing keyboard device monitoring
// Handles the business workflow for real-time keyboard detection

import { KeyboardManagementService, KeyboardInfo } from '@application/services/KeyboardManagementService';
import { Keyboard } from '@domain/entities/Keyboard';
import { KeyboardId } from '@domain/value-objects/KeyboardId';

export interface MonitorKeyboardsRequest {
  enableCallbacks?: boolean;
  onKeyboardConnected?: (keyboard: KeyboardInfo) => void;
  onKeyboardDisconnected?: (keyboardId: string) => void;
}

export interface MonitorKeyboardsResponse {
  monitoringStarted: boolean;
  initialKeyboardCount: number;
  initialKeyboards: KeyboardInfo[];
  timestamp: number;
}

export interface StopMonitoringResponse {
  monitoringStopped: boolean;
  finalKeyboardCount: number;
  timestamp: number;
}

export class MonitorKeyboardsUseCase {
  private unsubscribeCallback?: () => void;
  
  constructor(
    private readonly keyboardManagementService: KeyboardManagementService
  ) {}
  
  async startMonitoring(request: MonitorKeyboardsRequest = {}): Promise<MonitorKeyboardsResponse> {
    const { enableCallbacks = true, onKeyboardConnected, onKeyboardDisconnected } = request;
    
    // Check if monitoring is already active
    if (this.keyboardManagementService.isMonitoring()) {
      throw new Error('Keyboard monitoring is already active');
    }
    
    // Set up event callbacks if requested
    if (enableCallbacks && (onKeyboardConnected || onKeyboardDisconnected)) {
      this.unsubscribeCallback = this.keyboardManagementService.onDeviceChange(
        (event, keyboard) => {
          try {
            if (event === 'connected' && onKeyboardConnected && keyboard instanceof Keyboard) {
              const keyboardInfo: KeyboardInfo = {
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
              onKeyboardConnected(keyboardInfo);
            } else if (event === 'disconnected' && onKeyboardDisconnected && keyboard instanceof KeyboardId) {
              onKeyboardDisconnected(keyboard.getValue());
            }
          } catch (error) {
            console.error('Error in monitoring callback:', error);
          }
        }
      );
    }
    
    // Get initial keyboard state
    const initialKeyboards = await this.keyboardManagementService.discoverAvailableKeyboards();
    
    // Start monitoring
    await this.keyboardManagementService.startKeyboardMonitoring();
    
    return {
      monitoringStarted: true,
      initialKeyboardCount: initialKeyboards.length,
      initialKeyboards,
      timestamp: Date.now()
    };
  }
  
  async stopMonitoring(): Promise<StopMonitoringResponse> {
    // Check if monitoring is active
    if (!this.keyboardManagementService.isMonitoring()) {
      return {
        monitoringStopped: false,
        finalKeyboardCount: 0,
        timestamp: Date.now()
      };
    }
    
    // Get final keyboard count before stopping
    const finalKeyboards = await this.keyboardManagementService.discoverAvailableKeyboards();
    
    // Unsubscribe from callbacks
    if (this.unsubscribeCallback) {
      this.unsubscribeCallback();
      this.unsubscribeCallback = undefined;
    }
    
    // Stop monitoring
    await this.keyboardManagementService.stopKeyboardMonitoring();
    
    return {
      monitoringStopped: true,
      finalKeyboardCount: finalKeyboards.length,
      timestamp: Date.now()
    };
  }
  
  isMonitoring(): boolean {
    return this.keyboardManagementService.isMonitoring();
  }
  
  async getCurrentKeyboards(): Promise<KeyboardInfo[]> {
    return await this.keyboardManagementService.discoverAvailableKeyboards();
  }
  
  // Convenience method to restart monitoring with new callbacks
  async restartMonitoring(request: MonitorKeyboardsRequest = {}): Promise<MonitorKeyboardsResponse> {
    if (this.keyboardManagementService.isMonitoring()) {
      await this.stopMonitoring();
      
      // Wait a brief moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return await this.startMonitoring(request);
  }
}