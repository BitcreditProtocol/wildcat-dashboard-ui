import { Button, cn, DrawerClose, DrawerFooter } from "@bitcredit/ui-library";
import type React from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

type InputProps = React.ComponentProps<"input">;
type RequiredInputHandler<T extends keyof InputProps> = NonNullable<InputProps[T]>;

const FIELD_ROW_CLASS =
  "flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700";
const FIELD_LABEL_CLASS = "text-sm font-medium text-gray-900 dark:text-gray-100";
const INPUT_BASE_CLASS =
  "text-right text-lg font-semibold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function ValidationMessage({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-red-500">{children}</div>;
}

function DiscountField({
  htmlFor,
  label,
  error,
  children,
}: {
  htmlFor: string;
  label: string;
  error?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className={FIELD_ROW_CLASS}>
        <label htmlFor={htmlFor} className={FIELD_LABEL_CLASS}>
          {label}
        </label>
        {children}
      </div>
      {error && <ValidationMessage>{error}</ValidationMessage>}
    </div>
  );
}

interface DaysInputFieldProps {
  label: string;
  error?: React.ReactNode;
  registration: UseFormRegisterReturn<"daysInput">;
  onBeforeInput: RequiredInputHandler<"onBeforeInput">;
  onDrop: RequiredInputHandler<"onDrop">;
  onInput: RequiredInputHandler<"onInput">;
  onKeyDown: RequiredInputHandler<"onKeyDown">;
  onPaste: RequiredInputHandler<"onPaste">;
}

export function DaysInputField({ label, error, registration, onBeforeInput, onDrop, onInput, onKeyDown, onPaste }: DaysInputFieldProps) {
  return (
    <DiscountField htmlFor="daysInput" label={label} error={error}>
      <input
        id="daysInput"
        step="1"
        type="number"
        inputMode="numeric"
        className={cn(INPUT_BASE_CLASS, "text-gray-900 dark:text-gray-100 w-24")}
        onKeyDown={onKeyDown}
        onInput={onInput}
        onBeforeInput={onBeforeInput}
        onPaste={onPaste}
        onDrop={onDrop}
        enterKeyHint="next"
        {...registration}
      />
    </DiscountField>
  );
}

interface DiscountRateInputFieldProps {
  label: string;
  error?: React.ReactNode;
  registration: UseFormRegisterReturn<"discountRateInput">;
  onChange: RequiredInputHandler<"onChange">;
  onKeyDown: RequiredInputHandler<"onKeyDown">;
}

export function DiscountRateInputField({ label, error, registration, onChange, onKeyDown }: DiscountRateInputFieldProps) {
  return (
    <DiscountField htmlFor="discountRateInput" label={label} error={error}>
      <div className="flex gap-1 items-center">
        <input
          id="discountRateInput"
          step="0.0001"
          type="text"
          inputMode="decimal"
          pattern="[0-9]*[.,]?[0-9]*"
          className={cn(INPUT_BASE_CLASS, "text-gray-900 dark:text-gray-100 w-20")}
          {...registration}
          onKeyDown={onKeyDown}
          onChange={onChange}
        />
        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">%</span>
      </div>
    </DiscountField>
  );
}

interface NetInputFieldProps {
  currency: string;
  displayValue: string;
  error?: React.ReactNode;
  isSat: boolean;
  label: string;
  registration: UseFormRegisterReturn<"netInput">;
  onBeforeInput?: InputProps["onBeforeInput"];
  onChange: RequiredInputHandler<"onChange">;
  onDrop: RequiredInputHandler<"onDrop">;
  onKeyDown: RequiredInputHandler<"onKeyDown">;
  onPaste?: InputProps["onPaste"];
}

export function NetInputField({
  currency,
  displayValue,
  error,
  isSat,
  label,
  registration,
  onBeforeInput,
  onChange,
  onDrop,
  onKeyDown,
  onPaste,
}: NetInputFieldProps) {
  return (
    <DiscountField htmlFor="netInput" label={label} error={error}>
      <div className="flex gap-1 items-center flex-1 justify-end min-w-0">
        <input
          id="netInput"
          type="text"
          inputMode={isSat ? "numeric" : "decimal"}
          className={cn(INPUT_BASE_CLASS, "text-green-600 dark:text-green-400 min-w-0 flex-1")}
          {...registration}
          {...(isSat ? { value: displayValue } : {})}
          onKeyDown={onKeyDown}
          onBeforeInput={onBeforeInput}
          onPaste={onPaste}
          onDrop={onDrop}
          onChange={onChange}
        />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">{currency}</span>
      </div>
    </DiscountField>
  );
}

export function AmountSummaryRow({
  label,
  value,
  currency,
  valueClassName,
  labelClassName = "text-gray-600 dark:text-gray-400",
  rowClassName = "text-sm",
}: {
  label: string;
  value: string;
  currency: string;
  valueClassName: string;
  labelClassName?: string;
  rowClassName?: string;
}) {
  return (
    <div className={cn("flex justify-between items-center", rowClassName)}>
      <span className={labelClassName}>{label}</span>
      <div className="flex gap-1 items-center">
        <span className={valueClassName}>{value}</span>
        <span className="text-xs text-gray-500 dark:text-gray-500">{currency}</span>
      </div>
    </div>
  );
}

export function FormActions({
  cancelLabel,
  confirmDisabled,
  confirmLabel,
  formId,
}: {
  cancelLabel: string;
  confirmDisabled: boolean;
  confirmLabel: string;
  formId: string;
}) {
  return (
    <DrawerFooter className="pt-4">
      <Button className="w-full mb-1" size="sm" type="submit" form={formId} disabled={confirmDisabled}>
        {confirmLabel}
      </Button>
      <DrawerClose asChild>
        <Button className="w-full" variant="outline" size="sm">
          {cancelLabel}
        </Button>
      </DrawerClose>
    </DrawerFooter>
  );
}
