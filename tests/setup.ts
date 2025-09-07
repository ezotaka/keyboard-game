// Global test setup
// This file is executed before each test file

// Mock Electron APIs for testing
const mockElectron = {
  app: {
    quit: jest.fn(),
    on: jest.fn(),
    getPath: jest.fn(() => '/mock/path')
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: {
      openDevTools: jest.fn()
    }
  })),
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn()
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn()
  }
};

// Mock node-hid for testing
const mockHID = {
  devices: jest.fn(() => []),
  HID: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    read: jest.fn(),
    close: jest.fn()
  }))
};

jest.mock('electron', () => mockElectron);
jest.mock('node-hid', () => mockHID);

// Global test utilities
(global as any).mockElectron = mockElectron;
(global as any).mockHID = mockHID;