// DetectKeyboardsUseCase - Application Layer
// Use case for discovering and listing available keyboards
// Implements the business workflow for keyboard detection

import { KeyboardManagementService, KeyboardInfo } from '@application/services/KeyboardManagementService';

export interface DetectKeyboardsRequest {
  includeDisconnected?: boolean;
  filterByVendor?: number;
  filterByProduct?: number;
}

export interface DetectKeyboardsResponse {
  keyboards: KeyboardInfo[];
  totalFound: number;
  connectedCount: number;
  timestamp: number;
}

export class DetectKeyboardsUseCase {
  constructor(
    private readonly keyboardManagementService: KeyboardManagementService
  ) {}
  
  async execute(request: DetectKeyboardsRequest = {}): Promise<DetectKeyboardsResponse> {
    const { includeDisconnected = false, filterByVendor, filterByProduct } = request;
    
    // Get keyboards based on the request parameters
    let keyboards: KeyboardInfo[];
    
    if (filterByVendor !== undefined) {
      keyboards = await this.keyboardManagementService.findKeyboardsByVendor(
        filterByVendor, 
        filterByProduct
      );
    } else {
      // Get all registered keyboards if we want to include disconnected ones
      // Otherwise, get only currently available (connected) keyboards
      if (includeDisconnected) {
        keyboards = await this.keyboardManagementService.getAllRegisteredKeyboards();
      } else {
        keyboards = await this.keyboardManagementService.discoverAvailableKeyboards();
      }
    }
    
    // Filter out disconnected keyboards if not requested
    if (!includeDisconnected) {
      keyboards = keyboards.filter(kb => kb.isConnected);
    }
    
    // Calculate statistics
    const totalFound = keyboards.length;
    const connectedCount = keyboards.filter(kb => kb.isConnected).length;
    
    return {
      keyboards,
      totalFound,
      connectedCount,
      timestamp: Date.now()
    };
  }
}