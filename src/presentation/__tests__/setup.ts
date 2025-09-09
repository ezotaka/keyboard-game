// Jest テスト環境のセットアップ

// DOM API のポリフィル
import { JSDOM } from 'jsdom';

const dom = new JSDOM('', {
  pretendToBeVisual: true,
  resources: 'usable'
});

// グローバルオブジェクトを設定
global.window = dom.window as any;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Event = dom.window.Event;

// Web Audio API のモック
class MockAudioContext {
  sampleRate = 44100;
  destination = {};
  
  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      getChannelData: jest.fn().mockReturnValue(new Float32Array(length))
    };
  }
  
  createBufferSource() {
    return {
      buffer: null,
      connect: jest.fn(),
      start: jest.fn()
    };
  }
  
  createGain() {
    return {
      gain: { value: 1 },
      connect: jest.fn()
    };
  }
}

global.window.AudioContext = MockAudioContext as any;
(global.window as any).webkitAudioContext = MockAudioContext as any;

// requestAnimationFrame のモック
global.window.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
  return setTimeout(cb, 16);
});

global.window.cancelAnimationFrame = jest.fn((id: number) => {
  clearTimeout(id);
});

// localStorage のモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(global.window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// コンソールエラーを抑制（テスト時の意図的なエラーテスト用）
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});