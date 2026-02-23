// Search input for filtering components
import { MagnifyingGlassIcon, Cross2Icon } from "@radix-ui/react-icons";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search components...",
  inputClassName,
}: SearchBarProps) {
  return (
    <div className="relative w-full max-w-md">
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full pl-9 pr-8 py-2 text-sm rounded-lg bg-bg-primary focus:outline-none focus:ring-1 focus:ring-button transition-colors placeholder:text-text-secondary ${inputClassName ?? ""}`}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
        >
          <Cross2Icon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
