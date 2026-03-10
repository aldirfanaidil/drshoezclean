[plugin:vite:react-swc] × Merge conflict marker encountered.
    ╭─[C:/Users/ALDI IRFAN AIDIL/Desktop/drshoezclean-main/src/pages/admin/DashboardPage.tsx:36:1]
 33 │   Activity,
 34 │ } from "lucide-react";
 35 │ import { BranchFilter } from "@/components/BranchFilter";
 36 │ <<<<<<< HEAD
    · ───────
 37 │ import { MonthYearFilter } from "@/components/MonthYearFilter";
 38 │ =======
 38 │ >>>>>>> ca752285cda78ccc8abe7be14e798ad6fed40741
    ╰────
  × Merge conflict marker encountered.
    ╭─[C:/Users/ALDI IRFAN AIDIL/Desktop/drshoezclean-main/src/pages/admin/DashboardPage.tsx:38:1]
 35 │ import { BranchFilter } from "@/components/BranchFilter";
 36 │ <<<<<<< HEAD
 37 │ import { MonthYearFilter } from "@/components/MonthYearFilter";
 38 │ =======
    · ───────
 39 │ >>>>>>> ca752285cda78ccc8abe7be14e798ad6fed40741
 40 │ import {
 40 │   AreaChart,
    ╰────
  × Merge conflict marker encountered.
    ╭─[C:/Users/ALDI IRFAN AIDIL/Desktop/drshoezclean-main/src/pages/admin/DashboardPage.tsx:39:1]
 36 │ <<<<<<< HEAD
 37 │ import { MonthYearFilter } from "@/components/MonthYearFilter";
 38 │ =======
 39 │ >>>>>>> ca752285cda78ccc8abe7be14e798ad6fed40741
    · ───────
 40 │ import {
 41 │   AreaChart,
 41 │   Area,
    ╰────
  × Merge conflict marker encountered.
     ╭─[C:/Users/ALDI IRFAN AIDIL/Desktop/drshoezclean-main/src/pages/admin/DashboardPage.tsx:104:1]
 101 │   const [selectedBranch, setSelectedBranch] = useState<string>("all");
 102 │   const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
 103 │   const [lastUpdate, setLastUpdate] = useState(new Date());
 104 │ <<<<<<< HEAD
     · ───────
 105 │   const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
 106 │   const [selectedYear, setSelectedYear] = useState<number | null>(null);
 106 │ 
     ╰────
  × Merge conflict marker encountered.
     ╭─[C:/Users/ALDI IRFAN AIDIL/Desktop/drshoezclean-main/src/pages/admin/DashboardPage.tsx:113:1]
 110 │     const years = orders.map((o) => new Date(o.createdAt).getFullYear());
 111 │     return [...new Set(years)].sort((a, b) => b - a);
 112 │   }, [orders]);
 113 │ =======
     · ───────
 114 │ >>>>>>> ca752285cda78ccc8abe7be14e798ad6fed40741
 115 │   const [isRefreshing, setIsRefreshing] = useState(false);
 115 │ 
     ╰────
  × Merge conflict marker encountered.
     ╭─[C:/Users/ALDI IRFAN AIDIL/Desktop/drshoezclean-main/src/pages/admin/DashboardPage.tsx:114:1]
 111 │     return [...new Set(years)].sort((a, b) => b - a);
 112 │   }, [orders]);
 113 │ =======
 114 │ >>>>>>> ca752285cda78ccc8abe7be14e798ad6fed40741
     · ───────
 115 │   const [isRefreshing, setIsRefreshing] = useState(false);
 116 │ 
 116 │   // Auto-refresh every 30 seconds
     ╰────
  × Merge conflict marker encountered.
     ╭─[C:/Users/ALDI IRFAN AIDIL/Desktop/drshoezclean-main/src/pages/admin/DashboardPage.tsx:149:1]
 146 │ 
 147 │   const filteredOrders = useMemo(() => {
 148 │     return orders.filter((order) => {
 149 │ <<<<<<< HEAD
     · ───────
 150 │       const orderDate = parseISO(order.createdAt);
 151 │ 
 151 │       // Month/Year filter (takes priority if set)
     ╰────
  × Merge conflict marker encountered.
     ╭─[C:/Users/ALDI IRFAN AIDIL/Desktop/drshoezclean-main/src/pages/admin/DashboardPage.tsx:161:1]
 158 │         if (!isAfter(orderDate, filterStartDate)) return false;
 159 │       }
 160 │ 
 161 │ =======
     · ───────
 162 │       const afterStartDate = isAfter(parseISO(order.createdAt), filterStartDate);
 163 │ >>>>>>> ca752285cda78ccc8abe7be14e798ad6fed40741
 163 │       const matchesBranch =
     ╰────
  × Merge conflict marker encountered.
     ╭─[C:/Users/ALDI IRFAN AIDIL/Desktop/drshoezclean-main/src/pages/admin/DashboardPage.tsx:163:1]
 160 │ 
 161 │ =======
 162 │       const afterStartDate = isAfter(parseISO(order.createdAt), filterStartDate);
 163 │ >>>>>>> ca752285cda78ccc8abe7be14e798ad6fed40741
     · ───────
 164 │       const matchesBranch =
 165 │         selectedBranch === "all" ||
 165 │         (selectedBranch === "pusat" && !order.branchId) ||
     ╰────
  × Merge conflict marker encountered.
     ╭─[C:/Users/ALDI IRFAN AIDIL/Desktop/drshoezclean-main/src/pages/admin/DashboardPage.tsx:168:1]
 165 │         selectedBranch === "all" ||
 166 │         (selectedBranch === "pusat" && !order.branchId) ||
 167 │         order.branchId === selectedBranch;
 168 │ <<<<<<< HEAD
     · ───────
 169 │       return matchesBranch;
 170 │     });
 170 │   }, [orders, filterStartDate, selectedBranch, selectedMonth, selectedYear, lastUpdate]);
     ╰────
  × Merge conflict marker encountered.
     ╭─[C:/Users/ALDI IRFAN AIDIL/Desktop/drshoezclean-main/src/pages/admin/DashboardPage.tsx:172:1]
 169 │       return matchesBranch;
 170 │     });
 171 │   }, [orders, filterStartDate, selectedBranch, selectedMonth, selectedYear, lastUpdate]);
 172 │ =======
     · ───────
 173 │       return afterStartDate && matchesBranch;
 174 │     });
 174 │   }, [orders, filterStartDate, selectedBranch, lastUpdate]);
     ╰────
  × Expression expected
     ╭─[C:/Users/ALDI IRFAN AIDIL/Desktop/drshoezclean-main/src/pages/admin/DashboardPage.tsx:174:1]
 171 │   }, [orders, filterStartDate, selectedBranch, selectedMonth, selectedYear, lastUpdate]);
 172 │ =======
 173 │       return afterStartDate && matchesBranch;
 174 │     });
     ·      ─
 175 │   }, [orders, filterStartDate, selectedBranch, lastUpdate]);
 176 │ >>>>>>> ca752285cda78ccc8abe7be14e798ad6fed40741
 176 │ 
     ╰────


Caused by:
    Syntax Error
C:/Users/ALDI IRFAN AIDIL/Desktop/drshoezclean-main/src/pages/admin/DashboardPage.tsx
Click outside, press Esc key, or fix the code to dismiss.
You can also disable this overlay by setting server.hmr.overlay to false in vite.config.ts.