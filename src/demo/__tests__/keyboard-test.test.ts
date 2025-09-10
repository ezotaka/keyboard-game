// node-hidをモック化
const mockDevices = jest.fn();
jest.mock('node-hid', () => ({
    devices: mockDevices
}));

import { getKeyboards, getMockKeyboards } from '../keyboard-test';

describe('keyboard-test', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // コンソール出力をモック化
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('getKeyboards', () => {
        it('should return keyboard devices with correct filtering', () => {
            const mockHidDevices = [
                {
                    path: '/dev/hidraw0',
                    vendorId: 1452,
                    productId: 641,
                    product: 'Apple Internal Keyboard',
                    manufacturer: 'Apple Inc.',
                    usagePage: 1,
                    usage: 6,
                    release: 1,
                    interface: 0
                },
                {
                    path: '/dev/hidraw1',
                    vendorId: 1234,
                    productId: 5678,
                    product: 'External Keyboard',
                    manufacturer: 'Generic',
                    usagePage: 1,
                    usage: 6,
                    release: 1,
                    interface: 0
                },
                {
                    path: '/dev/hidraw2',
                    vendorId: 9999,
                    productId: 1111,
                    product: 'Mouse Device',
                    manufacturer: 'MouseCorp',
                    usagePage: 1,
                    usage: 2,  // マウス（キーボードではない）
                    release: 1,
                    interface: 0
                }
            ];

            mockDevices.mockReturnValue(mockHidDevices as any);

            const keyboards = getKeyboards();

            expect(keyboards).toHaveLength(2);
            expect(keyboards[0]).toEqual({
                id: '/dev/hidraw0',
                name: 'Apple Internal Keyboard',
                vendorId: 1452,
                productId: 641,
                path: '/dev/hidraw0'
            });
        });

        it('should handle devices without product name', () => {
            const mockHidDevices = [
                {
                    path: '/dev/hidraw0',
                    vendorId: 1452,
                    productId: 641,
                    product: undefined,
                    manufacturer: 'Apple Inc.',
                    usagePage: 1,
                    usage: 6,
                    release: 1,
                    interface: 0
                }
            ];

            mockDevices.mockReturnValue(mockHidDevices as any);

            const keyboards = getKeyboards();

            expect(keyboards).toHaveLength(1);
            expect(keyboards[0].name).toBe('Unknown Keyboard');
        });

        it('should return empty array when no keyboards found', () => {
            mockDevices.mockReturnValue([]);

            const keyboards = getKeyboards();

            expect(keyboards).toEqual([]);
        });

        it('should filter out non-keyboard devices', () => {
            const mockHidDevices = [
                {
                    path: '/dev/hidraw0',
                    vendorId: 1452,
                    productId: 641,
                    product: 'Mouse',
                    manufacturer: 'Apple Inc.',
                    usagePage: 1,
                    usage: 2,  // マウス
                    release: 1,
                    interface: 0
                },
                {
                    path: '/dev/hidraw1',
                    vendorId: 1234,
                    productId: 5678,
                    product: 'Gamepad',
                    manufacturer: 'Generic',
                    usagePage: 1,
                    usage: 5,  // ゲームパッド
                    release: 1,
                    interface: 0
                }
            ];

            mockDevices.mockReturnValue(mockHidDevices as any);

            const keyboards = getKeyboards();

            expect(keyboards).toEqual([]);
        });

        it('should handle node-hid errors gracefully', () => {
            mockDevices.mockImplementation(() => {
                throw new Error('HID error');
            });

            const keyboards = getKeyboards();

            expect(keyboards).toEqual([]);
            expect(console.error).toHaveBeenCalledWith('キーボード検知エラー:', expect.any(Error));
        });
    });

    describe('getMockKeyboards', () => {
        it('should return predefined mock keyboards', () => {
            const mockKeyboards = getMockKeyboards();

            expect(mockKeyboards).toHaveLength(3);
            
            expect(mockKeyboards[0]).toEqual({
                id: 'mock-keyboard-1',
                name: 'Apple Magic Keyboard',
                vendorId: 1452,
                productId: 100,
                path: 'mock-path-1'
            });

            expect(mockKeyboards[1]).toEqual({
                id: 'mock-keyboard-2',
                name: 'Logitech MX Keys',
                vendorId: 1133,
                productId: 200,
                path: 'mock-path-2'
            });

            expect(mockKeyboards[2]).toEqual({
                id: 'mock-keyboard-3',
                name: 'Microsoft Natural Keyboard',
                vendorId: 1118,
                productId: 300,
                path: 'mock-path-3'
            });
        });

        it('should return consistent results on multiple calls', () => {
            const mockKeyboards1 = getMockKeyboards();
            const mockKeyboards2 = getMockKeyboards();

            expect(mockKeyboards1).toEqual(mockKeyboards2);
        });
    });
});