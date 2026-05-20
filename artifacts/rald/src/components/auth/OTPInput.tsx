import { useRef, useState } from "react";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  disabled,
}: OTPInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.split("").slice(0, length);
  while (digits.length < length) digits.push("");

  const handleChange = (index: number, char: string) => {
    const d = char.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = d;
    onChange(next.join(""));
    if (d && index < length - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < length - 1)
      inputs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    onChange(pasted.padEnd(length, "").slice(0, length));
    const lastIndex = Math.min(pasted.length, length - 1);
    inputs.current[lastIndex]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" data-testid="otp-input">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`
            w-11 h-12 text-center text-lg font-semibold rounded-lg border
            bg-card text-foreground transition-all duration-200 outline-none
            ${digit ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.2)]" : "border-border"}
            focus:border-primary focus:shadow-[0_0_0_2px_hsl(var(--primary)/0.2)]
            disabled:opacity-50
          `}
          data-testid={`otp-digit-${i}`}
        />
      ))}
    </div>
  );
}
