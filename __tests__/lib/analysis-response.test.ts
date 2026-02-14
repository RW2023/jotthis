import { describe, expect, it } from 'vitest';
import { normalizeAnalysisResponse } from '@/lib/analysis-response';

describe('normalizeAnalysisResponse', () => {
  it('normalizes roadblocks from alternate keys', () => {
    const normalized = normalizeAnalysisResponse('roadblocks', {
      risks: ['Dependency delay', 'Budget overrun'],
    });

    expect(normalized).toEqual({
      roadblocks: ['Dependency delay', 'Budget overrun'],
    });
  });

  it('falls back to generic items for roadblocks', () => {
    const normalized = normalizeAnalysisResponse('roadblocks', {
      items: ['Blocked by API limits'],
    });

    expect(normalized).toEqual({
      roadblocks: ['Blocked by API limits'],
    });
  });

  it('filters non-string values', () => {
    const normalized = normalizeAnalysisResponse('roadblocks', {
      roadblocks: ['  Missing specs  ', 42, '', null],
    } as unknown as Record<string, unknown>);

    expect(normalized).toEqual({
      roadblocks: ['Missing specs'],
    });
  });
});
