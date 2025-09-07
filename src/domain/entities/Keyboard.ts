// Keyboard Domain Entity - Green フェーズ実装

import { KeyboardId } from '../value-objects/KeyboardId';
import { KeyboardConnectionState } from '@shared/types/keyboard.types';

export interface KeyboardConstructorProps {
  id: KeyboardId;
  devicePath: string;
  vendorId: number;
  productId: number;
  manufacturer?: string;
  product?: string;
  connectionState: KeyboardConnectionState;
}

export class Keyboard {
  private readonly id: KeyboardId;
  private readonly devicePath: string;
  private readonly vendorId: number;
  private readonly productId: number;
  private readonly manufacturer?: string;
  private readonly product?: string;
  private connectionState: KeyboardConnectionState;
  private lastInputTimestamp?: number;

  constructor(props: KeyboardConstructorProps) {
    this.validateProps(props);
    
    this.id = props.id;
    this.devicePath = props.devicePath;
    this.vendorId = props.vendorId;
    this.productId = props.productId;
    this.manufacturer = props.manufacturer;
    this.product = props.product;
    this.connectionState = props.connectionState;
  }

  private validateProps(props: KeyboardConstructorProps): void {
    if (!props.devicePath || props.devicePath.trim().length === 0) {
      throw new Error('Device path cannot be empty');
    }

    if (props.vendorId < 0) {
      throw new Error('Vendor ID must be a positive number');
    }

    if (props.productId < 0) {
      throw new Error('Product ID must be a positive number');
    }
  }

  // Getters
  getId(): KeyboardId {
    return this.id;
  }

  getDevicePath(): string {
    return this.devicePath;
  }

  getVendorId(): number {
    return this.vendorId;
  }

  getProductId(): number {
    return this.productId;
  }

  getManufacturer(): string | undefined {
    return this.manufacturer;
  }

  getProduct(): string | undefined {
    return this.product;
  }

  getConnectionState(): KeyboardConnectionState {
    return this.connectionState;
  }

  getLastInputTimestamp(): number | undefined {
    return this.lastInputTimestamp;
  }

  // Connection state management
  updateConnectionState(newState: KeyboardConnectionState): void {
    this.connectionState = newState;
  }

  isConnected(): boolean {
    return this.connectionState === KeyboardConnectionState.CONNECTED;
  }

  // Input tracking
  recordInputTimestamp(timestamp: number): void {
    this.lastInputTimestamp = timestamp;
  }

  // Equality (based on ID)
  equals(other: Keyboard | null | undefined): boolean {
    if (!other || !(other instanceof Keyboard)) {
      return false;
    }
    return this.id.equals(other.id);
  }

  // Device information
  getDeviceInfo(): string {
    const manufacturer = this.manufacturer || 'Unknown';
    const product = this.product || 'Unknown';
    const vendorHex = `0x${this.vendorId.toString(16).padStart(4, '0')}`;
    const productHex = `0x${this.productId.toString(16).padStart(4, '0')}`;
    
    return `${manufacturer} ${product} (${vendorHex}:${productHex})`;
  }
}