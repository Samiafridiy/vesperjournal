import { useState, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PasswordRule = {
  key: string;
  label: string;
  test: (s: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { key: "len",     label: "At least 8 characters",            test: (s) => s.length >= 8 },
  { key: "upper",   label: "1 uppercase letter (A–Z)",         test: (s) => /[A-Z]/.test(s) },
  { key: "lower",   label: "1 lowercase letter (a–z)",         test: (s) => /[a-z]/.test(s) },
  { key: "num",     label: "1 number (0–9)",                   test: (s) => /\d/.test(s) },
  { key: "special", label: "1 special character (!@#$%^&*)",   test: (s) => /[!@#$%^&*()_\-+=\[\]{};:,.<>?/\\|`~]/.test(s) },
];

export function isStrongPassword(s: string) {
  return PASSWORD_RULES.every((r) => r.test(s));
}

export function PasswordField({
  value,
  onChange,
  showStrength = false,
  placeholder,
  autoComplete = "current-password",
  required = true,
}: {
  value: string;
  onChange: (v: string) => void;
  showStrength?: boolean;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          required={required}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="bg-surface-2 border-border h-11 pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-md flex items-center justify-center text-soft hover:text-foreground hover:bg-accent transition-colors"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {showStrength && (
        <ul className="grid grid-cols-1 gap-1 mt-1">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(value);
            return (
              <li
                key={r.key}
                className={cn(
                  "flex items-center gap-2 text-[11px]",
                  ok ? "text-pos" : value.length === 0 ? "text-faint" : "text-neg",
                )}
              >
                {ok
                  ? <Check className="size-3 shrink-0" />
                  : <X className="size-3 shrink-0" />}
                <span>{r.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}