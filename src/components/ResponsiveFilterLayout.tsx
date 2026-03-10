import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Filter, RefreshCw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ResponsiveFilterLayoutProps {
  onRefresh?: () => void;
  children: React.ReactNode;
}

export function ResponsiveFilterLayout({ onRefresh, children }: ResponsiveFilterLayoutProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full mb-4">
      {/* Mobile View */}
      <div className="flex md:hidden gap-2 w-full">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1 h-10 rounded-[10px] gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-xl px-4 pb-6 pt-4 max-h-[85vh] overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Filter Data</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-y-4 gap-x-3 w-full">
              {children}
            </div>
            <div className="mt-8 flex gap-2 w-full">
              <Button 
                variant="default" 
                className="w-full flex-1 h-10 rounded-[10px]" 
                onClick={() => setOpen(false)}
              >
                Terapkan
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        {onRefresh && (
          <Button variant="outline" className="h-10 px-4 rounded-[10px]" onClick={onRefresh} title="Refresh Data">
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex flex-row items-center justify-between w-full bg-card border rounded-xl p-3 shadow-sm">
        <div className="flex flex-row items-center gap-3 flex-wrap">
          {children}
        </div>
        <div>
          {onRefresh && (
            <Button variant="outline" className="h-10 px-4 rounded-[10px]" onClick={onRefresh} title="Refresh Data">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
