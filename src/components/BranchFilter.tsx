import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { Branch } from "@/lib/store";

interface BranchFilterProps {
  value: string;
  onChange: (value: string) => void;
  branches: Branch[];
  className?: string;
}

export function BranchFilter({ value, onChange, branches, className = "w-40" }: BranchFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <Building2 className="w-4 h-4 mr-2" />
        <SelectValue placeholder="Semua Cabang" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Cabang</SelectItem>
        <SelectItem value="pusat">Pusat</SelectItem>
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            {branch.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
