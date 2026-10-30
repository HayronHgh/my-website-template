import { describe, expect, it } from 'vitest';
import { readingProgress, rulerDetent } from '@/lib/blog/reading-ruler';
describe('reading ruler chapter detents', () => {
  it('accumulates small movement and advances exactly one heading per detent', () => {
    const first = rulerDetent(0, 20, 2, 8);
    expect(first).toEqual({offset:20,index:2});
    expect(rulerDetent(first.offset,28,2,8)).toEqual({offset:0,index:3});
    expect(rulerDetent(0,900,2,8).index).toBe(3);
  });
  it('supports reversing and stops at either end without accumulating overscroll', () => {
    expect(rulerDetent(20,-20,2,8)).toEqual({offset:0,index:2});
    expect(rulerDetent(0,-48,2,8).index).toBe(1);
    expect(rulerDetent(0,-300,0,8)).toEqual({offset:0,index:0});
    expect(rulerDetent(0,300,7,8)).toEqual({offset:0,index:7});
  });
  it('bounds progress to the article', () => {
    expect(readingProgress(0,400,2400)).toBe(0);
    expect(readingProgress(1400,400,2400)).toBe(.5);
    expect(readingProgress(3000,400,2400)).toBe(1);
  });
});
