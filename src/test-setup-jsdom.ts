// JSDOM environment setup
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for JSDOM
Object.assign(global, { TextEncoder, TextDecoder });

// Mock Audio API for SoundManager tests
const mockAudioContext = {
  sampleRate: 44100,
  createBuffer: jest.fn().mockReturnValue({
    getChannelData: jest.fn().mockReturnValue(new Float32Array(1000))
  }),
  createBufferSource: jest.fn().mockReturnValue({
    buffer: null,
    connect: jest.fn(),
    start: jest.fn()
  }),
  createGain: jest.fn().mockReturnValue({
    gain: { value: 1 },
    connect: jest.fn()
  }),
  destination: {}
};

Object.assign(global, {
  AudioContext: jest.fn().mockImplementation(() => mockAudioContext),
  webkitAudioContext: jest.fn().mockImplementation(() => mockAudioContext)
});

// Mock alert for tests
Object.assign(global, {
  alert: jest.fn()
});