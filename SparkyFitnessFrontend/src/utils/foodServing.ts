type ServingLike = {
  serving_size?: number | null;
  serving_unit?: string | null;
  serving_description?: string | null;
};

export function formatServingLabel(variant: ServingLike): string {
  const description = variant.serving_description?.trim();
  if (description) return description;

  const unit = variant.serving_unit?.trim() || '';
  if (variant.serving_size == null) return unit;
  return `${variant.serving_size} ${unit}`.trim();
}

// Label for the unit dropdown option itself, where an adjacent Quantity input
// already supplies the multiplier. Omitting serving_size here avoids a
// "Quantity: 5, Unit: 5 piece" display that reads as 25 total pieces.
export function formatUnitOptionLabel(variant: ServingLike): string {
  const description = variant.serving_description?.trim();
  if (description) return description;

  return variant.serving_unit?.trim() || '';
}

export function formatQuantityServingLabel(
  quantity: number,
  variant: ServingLike
): string {
  const desc = variant.serving_description?.trim();
  if (desc) {
    if (variant.serving_size === quantity) {
      return desc;
    }
    // If description starts with "[serving_size] of " or "[serving_size] ", e.g. "0.25 of 0.25 cup" or "0.25 cup"
    const sizeStr =
      variant.serving_size != null ? String(variant.serving_size) : '';
    if (sizeStr) {
      if (desc.startsWith(`${sizeStr} of `)) {
        return `${quantity} of ${desc.slice(sizeStr.length + 4)}`.trim();
      }
      if (desc.startsWith(`${sizeStr} `)) {
        return `${quantity} ${desc.slice(sizeStr.length + 1)}`.trim();
      }
    }
    return `${quantity} of ${desc}`.trim();
  }

  return `${quantity} ${variant.serving_unit || ''}`.trim();
}
