import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface CustomerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  customers: Customer[];
  placeholder: string;
  searchField: "name" | "phone";
  className?: string;
}

export default function CustomerAutocomplete({
  value,
  onChange,
  onSelectCustomer,
  customers,
  placeholder,
  searchField,
  className,
}: CustomerAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length >= 2) {
      const searchValue = value.toLowerCase();
      const filtered = customers.filter((customer) => {
        if (searchField === "name") {
          return customer.name.toLowerCase().includes(searchValue);
        } else {
          return customer.phone.includes(value);
        }
      });
      setFilteredCustomers(filtered.slice(0, 5)); // Limit to 5 suggestions
      setIsOpen(filtered.length > 0);
    } else {
      setFilteredCustomers([]);
      setIsOpen(false);
    }
  }, [value, customers, searchField]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (filteredCustomers.length > 0) {
            setIsOpen(true);
          }
        }}
      />
      {isOpen && filteredCustomers.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors flex flex-col"
              onClick={() => handleSelect(customer)}
            >
              <span className="font-medium text-foreground">{customer.name}</span>
              <span className="text-sm text-muted-foreground">{customer.phone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
