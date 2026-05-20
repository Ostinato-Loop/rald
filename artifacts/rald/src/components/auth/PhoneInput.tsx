import { useState } from "react";
import { ChevronDown } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "+27", flag: "🇿🇦", name: "South Africa" },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PhoneInput({ value, onChange, disabled }: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState("+234");
  const [showDropdown, setShowDropdown] = useState(false);

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    onChange(`${countryCode}${raw}`);
  };

  const localNumber = value.startsWith(countryCode)
    ? value.slice(countryCode.length)
    : value;

  return (
    <div className="relative flex items-center w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1.5 px-3 py-2.5 border-r border-border bg-muted/50 rounded-l-lg text-sm font-medium text-foreground hover:bg-muted transition-colors min-w-[90px]"
        data-testid="country-code-selector"
      >
        <span>{selectedCountry.flag}</span>
        <span className="text-xs">{countryCode}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden w-48">
          {COUNTRY_CODES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                setCountryCode(c.code);
                setShowDropdown(false);
                onChange(`${c.code}${localNumber}`);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent/50 transition-colors text-left"
            >
              <span>{c.flag}</span>
              <span className="font-medium">{c.code}</span>
              <span className="text-muted-foreground text-xs">{c.name}</span>
            </button>
          ))}
        </div>
      )}

      <input
        type="tel"
        value={localNumber}
        onChange={handleChange}
        disabled={disabled}
        placeholder="080 0000 0000"
        className="flex-1 px-3 py-2.5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none rounded-r-lg"
        data-testid="phone-number-input"
      />
    </div>
  );
}
