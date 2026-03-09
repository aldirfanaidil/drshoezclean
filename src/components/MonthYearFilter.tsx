import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarDays, X } from "lucide-react";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

interface MonthYearFilterProps {
  selectedMonth: number | null;  // 0-11, null = semua
  selectedYear: number | null;   // null = semua
  onMonthChange: (month: number | null) => void;
  onYearChange: (year: number | null) => void;
  availableYears?: number[];
}

export function MonthYearFilter({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  availableYears,
}: MonthYearFilterProps) {
  const currentYear = new Date().getFullYear();
  const years = availableYears && availableYears.length > 0
    ? [...new Set(availableYears)].sort((a, b) => b - a)
    : [currentYear, currentYear - 1, currentYear - 2];

  const hasFilter = selectedMonth !== null || selectedYear !== null;

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="w-4 h-4 text-muted-foreground hidden sm:block" />
      <Select
        value={selectedMonth !== null ? String(selectedMonth) : "all"}
        onValueChange={(v) => onMonthChange(v === "all" ? null : Number(v))}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Bulan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Bulan</SelectItem>
          {MONTHS.map((name, index) => (
            <SelectItem key={index} value={String(index)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedYear !== null ? String(selectedYear) : "all"}
        onValueChange={(v) => onYearChange(v === "all" ? null : Number(v))}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Tahun" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Tahun</SelectItem>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilter && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => { onMonthChange(null); onYearChange(null); }}
          title="Reset filter"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
