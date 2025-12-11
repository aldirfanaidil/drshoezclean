import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Hook to sync Supabase real-time changes to the store.
 * Call this in AdminLayout to enable auto-refresh when data changes.
 */
export function useRealtimeSync() {
    const { refreshData, isInitialized } = useAppStore();
    const { toast } = useToast();
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        // Only setup subscription after initial data is loaded
        if (!isInitialized) return;

        console.log("Setting up Supabase real-time subscriptions...");

        // Create a channel for real-time updates
        const channel = supabase
            .channel("db-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "orders" },
                (payload) => {
                    console.log("Orders change:", payload.eventType);
                    handleTableChange("orders", payload);
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "customers" },
                (payload) => {
                    console.log("Customers change:", payload.eventType);
                    handleTableChange("customers", payload);
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "cash_flows" },
                (payload) => {
                    console.log("CashFlows change:", payload.eventType);
                    handleTableChange("cash_flows", payload);
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "discounts" },
                (payload) => {
                    console.log("Discounts change:", payload.eventType);
                    handleTableChange("discounts", payload);
                }
            )
            .subscribe((status) => {
                console.log("Realtime subscription status:", status);
                if (status === "SUBSCRIBED") {
                    console.log("Successfully subscribed to real-time updates");
                }
            });

        channelRef.current = channel;

        function handleTableChange(table: string, payload: any) {
            // Show toast notification for new data
            if (payload.eventType === "INSERT") {
                toast({
                    title: "Data Baru",
                    description: `Ada ${getTableLabel(table)} baru masuk`,
                });
            }

            // Refetch all data silently in the background
            refreshData();
        }

        function getTableLabel(table: string): string {
            switch (table) {
                case "orders": return "pesanan";
                case "customers": return "pelanggan";
                case "cash_flows": return "arus kas";
                case "discounts": return "diskon";
                default: return "data";
            }
        }

        // Cleanup on unmount
        return () => {
            console.log("Cleaning up real-time subscriptions...");
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [isInitialized, refreshData, toast]);
}
