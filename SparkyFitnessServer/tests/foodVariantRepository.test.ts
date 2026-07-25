import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import foodVariantRepository from '../models/foodVariant.js';
import { getClient } from '../db/poolManager.js';

vi.mock('../db/poolManager.js', () => ({
  getClient: vi.fn(),
}));

describe('foodVariantRepository.createFoodVariant', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockClient: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const findQuery = (fragment: string): { text: string; values: any[] } =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockClient.query.mock.calls
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((call: any[]) => ({ text: call[0], values: call[1] }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .find((call: any) => call.text.includes(fragment));

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    vi.mocked(getClient).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('demotes existing default variants when the new variant is inserted as default', async () => {
    mockClient.query.mockImplementation(async (text: string) => {
      if (text.startsWith('INSERT INTO food_variants')) {
        return { rows: [{ id: 'variant-new', is_default: true }] };
      }
      return { rows: [] };
    });

    await foodVariantRepository.createFoodVariant(
      {
        food_id: 'food-1',
        serving_size: 100,
        serving_unit: 'g',
        is_default: true,
      },
      'user-1'
    );

    const demote = findQuery('UPDATE food_variants SET is_default = FALSE');
    expect(demote).toBeDefined();
    expect(demote.text).toContain('WHERE food_id = $1 AND id != $2');
    expect(demote.values).toEqual(['food-1', 'variant-new']);
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('does not demote other variants when the new variant is not default', async () => {
    mockClient.query.mockImplementation(async (text: string) => {
      if (text.startsWith('INSERT INTO food_variants')) {
        return { rows: [{ id: 'variant-new', is_default: false }] };
      }
      return { rows: [] };
    });

    await foodVariantRepository.createFoodVariant(
      {
        food_id: 'food-1',
        serving_size: 100,
        serving_unit: 'g',
        is_default: false,
      },
      'user-1'
    );

    expect(
      findQuery('UPDATE food_variants SET is_default = FALSE')
    ).toBeUndefined();
    expect(mockClient.query).toHaveBeenCalledTimes(1);
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});
