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
    <>
      <Select
        value={selectedMonth !== null ? String(selectedMonth) : "all"}
        onValueChange={(v) => onMonthChange(v === "all" ? null : Number(v))}
      >
        <SelectTrigger className="h-10 rounded-[10px] w-full md:w-[140px] bg-background">
          <SelectValue placeholder="Pilih Bulan" />
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
        <SelectTrigger className="h-10 rounded-[10px] w-full md:w-[120px] bg-background">
          <SelectValue placeholder="Pilih Tahun" />
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
          className="h-10 w-10 md:w-10 rounded-[10px] flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => { onMonthChange(null); onYearChange(null); }}
          title="Reset filter bulan tahun"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </>
  );
}
