// node-hidをモック化
const mockDevices = jest.fn();
jest.mock('node-hid', () => ({
    devices: mockDevices
}));

import { getKeyboards, getMockKeyboards } from '../keyboard-test';

describe('keyboard-test (Simple)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getKeyboards', () => {
        it('should return mock keyboards when device list is empty', () => {
            mockDevices.mockReturnValue([]);
            const keyboards = getKeyboards();
            expect(keyboards).toHaveLength(2);
            expect(keyboards[0]).toHaveProperty('id', 'mock-keyboard-1');
            expect(keyboards[0]).toHaveProperty('name', 'Apple Magic Keyboard');
        });

        it('should return mock keyboards when errors occur', () => {
            mockDevices.mockImplementation(() => {
                throw new Error('HID error');
            });

            const keyboards = getKeyboards();
            expect(keyboards).toHaveLength(2);
            expect(keyboards[0]).toHaveProperty('id', 'mock-keyboard-1');
            expect(keyboards[1]).toHaveProperty('id', 'mock-keyboard-2');
        });
    });

    describe('getMockKeyboards', () => {
        it('should return mock keyboards', () => {
            const mockKeyboards = getMockKeyboards();
            expect(mockKeyboards).toHaveLength(2);
            expect(mockKeyboards[0]).toHaveProperty('id');
            expect(mockKeyboards[0]).toHaveProperty('name');
        });
    });
});