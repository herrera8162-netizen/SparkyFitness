import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => innerRef.current!);

    const handleStep = (direction: 'up' | 'down') => {
      const input = innerRef.current;
      if (!input || input.disabled || input.readOnly) return;

      const stepAttr = input.getAttribute('step');
      const minAttr = input.getAttribute('min');
      const maxAttr = input.getAttribute('max');

      const currentVal = input.value === '' ? 0 : parseFloat(input.value);
      if (isNaN(currentVal)) return;

      let stepAmount = 1;
      if (stepAttr && stepAttr !== 'any') {
        const parsedStep = parseFloat(stepAttr);
        if (!isNaN(parsedStep) && parsedStep > 0) {
          stepAmount = parsedStep;
        }
      }

      const stepDecimals = stepAmount.toString().split('.')[1]?.length || 0;
      const valDecimals = input.value.split('.')[1]?.length || 0;
      const precision = Math.max(stepDecimals, valDecimals, 2);

      let nextVal =
        direction === 'up' ? currentVal + stepAmount : currentVal - stepAmount;

      if (minAttr !== null && minAttr !== '') {
        const minVal = parseFloat(minAttr);
        if (!isNaN(minVal) && nextVal < minVal) {
          nextVal = minVal;
        }
      }
      if (maxAttr !== null && maxAttr !== '') {
        const maxVal = parseFloat(maxAttr);
        if (!isNaN(maxVal) && nextVal > maxVal) {
          nextVal = maxVal;
        }
      }

      const formattedVal = Number(nextVal.toFixed(precision)).toString();

      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      if (valueSetter) {
        valueSetter.call(input, formattedVal);
      } else {
        input.value = formattedVal;
      }

      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const inputElement = (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          'dark:[color-scheme:dark]',
          type === 'number' && [
            '[appearance:textfield]',
            '[&::-webkit-outer-spin-button]:appearance-none',
            '[&::-webkit-inner-spin-button]:appearance-none',
            'pr-6',
          ],
          className
        )}
        ref={innerRef}
        {...props}
      />
    );

    if (type !== 'number') return inputElement;

    return (
      <div className="relative group/input w-full">
        {inputElement}
        <div className="absolute right-0 top-0 flex flex-col w-5 h-full border-l bg-muted/5 opacity-0 group-hover/input:opacity-100 transition-opacity z-10">
          <button
            type="button"
            tabIndex={-1}
            disabled={props.disabled || props.readOnly}
            className="flex flex-1 items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors border-b"
            onClick={() => handleStep('up')}
          >
            <ChevronUp className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={props.disabled || props.readOnly}
            className="flex flex-1 items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => handleStep('down')}
          >
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
