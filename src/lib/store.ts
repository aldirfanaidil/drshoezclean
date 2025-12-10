
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";

export interface ShoeItem {
  id: string;
  brand: string;
  service: string;
  serviceType: string;
  price: number;
  discountId?: string;
  discountAmount?: number;
  processStatus?: string;
}

export interface Order {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  shoes: ShoeItem[];
  entryDate: string;
  estimatedDate: string;
  pickupDate?: string;
  notes?: string;
  paymentStatus: "unpaid" | "paid" | "cancelled";
  paymentMethod?: "cash" | "transfer" | "qris";
  subtotal: number;
  discount: number;
  total: number;
  branchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export interface Discount {
  id: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  isActive: boolean;
  createdAt: string;
}

export interface CashFlow {
  id: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  date: string;
  orderId?: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: "superuser" | "admin" | "cashier";
  isActive: boolean;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export interface StoreSettings {
  name: string;
  tagline: string;
  phone: string;
  address: string;
  email: string;
  website: string;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  qrPayment?: string;
  logo?: string;
  whatsappNotificationEnabled?: boolean;
}

// Helper to map DB columns (snake_case) to app models (camelCase)
const mapOrderFromDB = (data: any): Order => ({
  id: data.id,
  invoiceNumber: data.invoice_number,
  customerId: data.customer_id,
  customerName: data.customer_name,
  customerPhone: data.customer_phone,
  shoes: data.shoes || [], // JSONB column
  entryDate: data.entry_date,
  estimatedDate: data.estimated_date,
  pickupDate: data.pickup_date,
  notes: data.notes,
  paymentStatus: data.payment_status,
  paymentMethod: data.payment_method,
  subtotal: data.subtotal,
  discount: data.discount,
  total: data.total,
  branchId: data.branch_id,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

const mapCustomerFromDB = (data: any): Customer => ({
  id: data.id,
  name: data.name,
  phone: data.phone,
  totalOrders: data.total_orders,
  totalSpent: data.total_spent,
  createdAt: data.created_at,
});

const mapDiscountFromDB = (data: any): Discount => ({
  id: data.id,
  name: data.name,
  type: data.type,
  value: data.value,
  isActive: data.is_active,
  createdAt: data.created_at,
});

const mapCashFlowFromDB = (data: any): CashFlow => ({
  id: data.id,
  type: data.type,
  category: data.category,
  description: data.description,
  amount: data.amount,
  date: data.date,
  orderId: data.order_id,
  createdAt: data.created_at,
});

const mapUserFromDB = (data: any): User => ({
  id: data.id,
  username: data.username,
  password: data.password,
  role: data.role,
  isActive: data.is_active,
  createdAt: data.created_at,
});

const mapBranchFromDB = (data: any): Branch => ({
  id: data.id,
  name: data.name,
  address: data.address,
  phone: data.phone,
  isActive: data.is_active,
  createdAt: data.created_at,
});

const mapSettingsFromDB = (data: any): StoreSettings => ({
  name: data.name,
  tagline: data.tagline,
  phone: data.phone,
  address: data.address,
  email: data.email,
  website: data.website,
  bankName: data.bank_name,
  bankAccount: data.bank_account,
  accountHolder: data.account_holder,
  qrPayment: data.qr_payment,
  logo: data.logo,
  whatsappNotificationEnabled: data.whatsapp_notification_enabled,
});

const initialSettings: StoreSettings = {
  name: "Dr.ShoezClean",
  tagline: "@dr.shoezclean",
  phone: "+62 812-1456-7890",
  address: "Jl. Contoh Alamat No. 123, Jakarta",
  email: "info@drshoezclean.com",
  website: "www.drshoezclean.com",
  bankName: "BCA",
  bankAccount: "123-456-7890",
  accountHolder: "Dr.ShoezClean",
};

interface AppState {
  orders: Order[];
  customers: Customer[];
  discounts: Discount[];
  cashFlows: CashFlow[];
  users: User[];
  branches: Branch[];
  settings: StoreSettings;
  currentUser: User | null;

  // Actions
  fetchInitialData: () => Promise<void>;

  // Auth
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;

  // Orders
  addOrder: (order: Omit<Order, "id" | "createdAt" | "updatedAt">) => Promise<Order>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  getOrder: (id: string) => Order | undefined;

  // Customers
  addCustomer: (customer: Omit<Customer, "id" | "createdAt" | "totalOrders" | "totalSpent">) => Promise<Customer>; // Made async to support DB ID generation

  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  getCustomer: (id: string) => Customer | undefined;
  findCustomerByPhone: (phone: string) => Customer | undefined;

  // Discounts
  addDiscount: (discount: Omit<Discount, "id" | "createdAt">) => Promise<void>;
  updateDiscount: (id: string, updates: Partial<Discount>) => Promise<void>;
  deleteDiscount: (id: string) => Promise<void>;

  // Cash Flow
  addCashFlow: (cashFlow: Omit<CashFlow, "id" | "createdAt">) => Promise<void>;
  deleteCashFlow: (id: string) => Promise<void>;

  // Users
  addUser: (user: Omit<User, "id" | "createdAt">) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  // Branches
  addBranch: (branch: Omit<Branch, "id" | "createdAt">) => Promise<void>;
  updateBranch: (id: string, updates: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;

  // Settings
  updateSettings: (settings: Partial<StoreSettings>) => Promise<void>;
}

export const useAppStore = create<AppState>()(persist((set, get) => ({
  orders: [],
  customers: [],
  discounts: [],
  cashFlows: [],
  users: [],
  branches: [],
  settings: initialSettings,
  currentUser: null,

  fetchInitialData: async () => {
    try {
      const [
        { data: ordersData, error: ordersError },
        { data: customersData, error: customersError },
        { data: discountsData, error: discountsError },
        { data: cashFlowsData, error: cashFlowsError },
        { data: usersData, error: usersError },
        { data: branchesData, error: branchesError },
        { data: settingsData, error: settingsError },
      ] = await Promise.all([
        supabase.from("orders").select("*"),
        supabase.from("customers").select("*"),
        supabase.from("discounts").select("*"),
        supabase.from("cash_flows").select("*"),
        supabase.from("app_users").select("*"),
        supabase.from("branches").select("*"),
        supabase.from("store_settings").select("*").single(),
      ]);

      console.group("fetchInitialData Debug Object");
      console.log("Orders:", ordersData?.length, ordersError);
      console.log("Customers:", customersData?.length, customersError);
      console.log("Discounts:", discountsData?.length, discountsError);
      console.log("CashFlows:", cashFlowsData?.length, cashFlowsError);
      console.log("Users:", usersData?.length, usersError);
      console.log("Branches:", branchesData?.length, branchesError);
      console.log("Settings:", settingsData, settingsError);
      console.groupEnd();

      if (ordersError) console.error("Error fetching orders:", ordersError);
      if (customersError) console.error("Error fetching customers:", customersError);
      if (discountsError) console.error("Error fetching discounts:", discountsError);
      if (cashFlowsError) console.error("Error fetching cashFlows:", cashFlowsError);
      if (usersError) console.error("Error fetching users:", usersError);
      if (branchesError) console.error("Error fetching branches:", branchesError);

      let finalSettings = initialSettings;

      if (settingsError) {
        if (settingsError.code === 'PGRST116') {
          console.warn("No store settings found in DB. Inserting default settings.");

          const defaultSettingsPayload = {
            name: initialSettings.name,
            tagline: initialSettings.tagline,
            phone: initialSettings.phone,
            address: initialSettings.address,
            email: initialSettings.email,
            website: initialSettings.website,
            bank_name: initialSettings.bankName,
            bank_account: initialSettings.bankAccount,
            account_holder: initialSettings.accountHolder,
            // optional fields
            qr_payment: initialSettings.qrPayment,
            logo: initialSettings.logo,
            whatsapp_notification_enabled: initialSettings.whatsappNotificationEnabled
          };

          // Attempt to insert default settings
          const { error: insertError } = await supabase.from("store_settings").insert(defaultSettingsPayload);
          if (insertError) {
            console.error("Failed to insert default store settings:", insertError);
            // Keep finalSettings as initialSettings if insertion fails
          } else {
            console.log("Default store settings inserted successfully.");
            finalSettings = initialSettings; // Use initial settings as fallback after insert
          }
        } else {
          // It's a different error fetching settings
          console.error("Error fetching store settings:", settingsError);
          // Keep finalSettings as initialSettings
        }
      } else if (settingsData) {
        // Settings data was fetched successfully
        finalSettings = mapSettingsFromDB(settingsData);
      }
      // If settingsData is null and no error occurred, finalSettings remains initialSettings.

      set({
        orders: (ordersData || []).map(mapOrderFromDB),
        customers: (customersData || []).map(mapCustomerFromDB),
        discounts: (discountsData || []).map(mapDiscountFromDB),
        cashFlows: (cashFlowsData || []).map(mapCashFlowFromDB),
        users: (usersData || []).map(mapUserFromDB),
        branches: (branchesData || []).map(mapBranchFromDB),
        settings: finalSettings,
      });

    } catch (e) {
      console.error("Critical error in fetchInitialData:", e);
      // Ensure settings are set to initial values in case of critical error during other fetches
      set({
        settings: initialSettings,
      });
    }
  },

  login: async (username, password) => {
    try {
      console.log("Attempting login for:", username);

      // Import hash function dynamically
      const { hashPassword } = await import("@/lib/hash");

      // Hash the input password
      const hashedPassword = await hashPassword(password);

      // Query app_users table - check hashed password
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("username", username)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Login Error:", error);
        return false;
      }

      if (!data) {
        console.warn("Login failed: User not found.");
        return false;
      }

      // Verify password (support both hashed and plain text for migration)
      const passwordMatch = data.password === hashedPassword || data.password === password;

      if (!passwordMatch) {
        console.warn("Login failed: Password incorrect.");
        return false;
      }

      console.log("Login successful for:", data.username);
      set({ currentUser: mapUserFromDB(data) });
      return true;
    } catch (err) {
      console.error("Unexpected Login error:", err);
      return false;
    }
  },

  logout: () => {
    set({ currentUser: null });
  },

  addOrder: async (orderData) => {
    // Generate temp ID for optimistic update
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();

    const optimisticOrder: Order = {
      ...orderData,
      id: tempId,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic update local
    set((state) => ({ orders: [...state.orders, optimisticOrder] }));

    // DB Insert - Let Supabase generate ID
    const { data: insertedOrder, error } = await supabase.from("orders").insert({
      // id: id, // Don't send ID, let DB generate it to avoid conflicts or bad format if UUID is expected but text sent etc.
      invoice_number: optimisticOrder.invoiceNumber,
      customer_id: optimisticOrder.customerId,
      customer_name: optimisticOrder.customerName,
      customer_phone: optimisticOrder.customerPhone,
      shoes: optimisticOrder.shoes, // JSONB
      // Convert empty strings to null for dates
      entry_date: optimisticOrder.entryDate || null,
      estimated_date: optimisticOrder.estimatedDate || null,
      pickup_date: optimisticOrder.pickupDate || null,
      notes: optimisticOrder.notes,
      payment_status: optimisticOrder.paymentStatus,
      payment_method: optimisticOrder.paymentMethod,
      subtotal: optimisticOrder.subtotal,
      discount: optimisticOrder.discount,
      total: optimisticOrder.total,
      branch_id: optimisticOrder.branchId,
      created_at: now,
      updated_at: now,
    }).select().single();

    if (error) {
      console.error("Failed to add order:", error);
      // Rollback optimistic update?
      set((state) => ({ orders: state.orders.filter(o => o.id !== tempId) }));
      throw error;
    }

    if (insertedOrder) {
      // Replace optimistic order with real one
      const realOrder = mapOrderFromDB(insertedOrder);
      set((state) => ({
        orders: state.orders.map(o => o.id === tempId ? realOrder : o)
      }));

      // Update customer stats logic
      const customer = get().customers.find((c) => c.id === realOrder.customerId);
      if (customer) {
        get().updateCustomer(customer.id, {
          totalOrders: customer.totalOrders + 1,
          totalSpent: customer.totalSpent + realOrder.total,
        });
      }

      // Add cash flow if paid
      if (realOrder.paymentStatus === "paid") {
        get().addCashFlow({
          type: "income",
          category: "Pesanan",
          description: `Pembayaran ${realOrder.invoiceNumber}`,
          amount: realOrder.total,
          date: now,
          orderId: realOrder.id,
        });
      }

      return realOrder;
    }

    return optimisticOrder;
  },

  updateOrder: async (id, updates) => {
    // Optimistic
    const order = get().getOrder(id);
    if (!order) return;

    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o
      ),
    }));

    // DB Update
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName;
    if (updates.customerPhone !== undefined) dbUpdates.customer_phone = updates.customerPhone;
    if (updates.shoes !== undefined) dbUpdates.shoes = updates.shoes;
    if (updates.entryDate !== undefined) dbUpdates.entry_date = updates.entryDate;
    if (updates.estimatedDate !== undefined) dbUpdates.estimated_date = updates.estimatedDate;
    if (updates.pickupDate !== undefined) dbUpdates.pickup_date = updates.pickupDate;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
    if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
    if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
    if (updates.discount !== undefined) dbUpdates.discount = updates.discount;
    if (updates.total !== undefined) dbUpdates.total = updates.total;
    if (updates.branchId !== undefined) dbUpdates.branch_id = updates.branchId;

    await supabase.from("orders").update(dbUpdates).eq("id", id);

    // Handle payment status change
    if (updates.paymentStatus === "paid" && order.paymentStatus !== "paid") {
      get().addCashFlow({
        type: "income",
        category: "Pesanan",
        description: `Pembayaran ${order.invoiceNumber}`,
        amount: updates.total || order.total || 0,
        date: new Date().toISOString(),
        orderId: id,
      });
    }
  },

  deleteOrder: async (id) => {
    // Optimistic
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== id),
      cashFlows: state.cashFlows.filter((cf) => cf.orderId !== id),
    }));

    // DB Delete
    await supabase.from("orders").delete().eq("id", id);
    // Also delete associated cash flows?
    // Supabase cascade delete would handle this if configured, but let's manual delete to be safe or rely on cascade
    if (get().cashFlows.some(cf => cf.orderId === id)) {
      await supabase.from("cash_flows").delete().eq("order_id", id);
    }
  },

  getOrder: (id) => get().orders.find((o) => o.id === id),

  addCustomer: async (customerData) => {
    // Wait for DB to generate ID to ensure consistency
    const now = new Date().toISOString();

    // DB Insert
    const { data: insertedCustomer, error } = await supabase.from("customers").insert({
      // id: Generated by DB
      name: customerData.name,
      phone: customerData.phone,
      total_orders: 0,
      total_spent: 0,
      created_at: now,
    }).select().single();

    if (error) {
      console.error("Failed to add customer:", error);
      throw error;
    }

    if (!insertedCustomer) {
      throw new Error("Customer insert returned no data");
    }

    const realCustomer = mapCustomerFromDB(insertedCustomer);
    set((state) => ({ customers: [...state.customers, realCustomer] }));

    return realCustomer;
  },

  updateCustomer: async (id, updates) => {
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.totalOrders !== undefined) dbUpdates.total_orders = updates.totalOrders;
    if (updates.totalSpent !== undefined) dbUpdates.total_spent = updates.totalSpent;

    await supabase.from("customers").update(dbUpdates).eq("id", id);
  },

  getCustomer: (id) => get().customers.find((c) => c.id === id),

  findCustomerByPhone: (phone) =>
    get().customers.find((c) => c.phone === phone),

  addDiscount: async (discountData) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const discount: Discount = {
      ...discountData,
      id,
      createdAt: now,
    };
    set((state) => ({ discounts: [...state.discounts, discount] }));

    await supabase.from("discounts").insert({
      id,
      name: discount.name,
      type: discount.type,
      value: discount.value,
      is_active: discount.isActive,
      created_at: now,
    });
  },

  updateDiscount: async (id, updates) => {
    set((state) => ({
      discounts: state.discounts.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    }));

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.value !== undefined) dbUpdates.value = updates.value;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    await supabase.from("discounts").update(dbUpdates).eq("id", id);
  },

  deleteDiscount: async (id) => {
    set((state) => ({
      discounts: state.discounts.filter((d) => d.id !== id),
    }));
    await supabase.from("discounts").delete().eq("id", id);
  },

  addCashFlow: async (cashFlowData) => {
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    const optimisticCashFlow: CashFlow = {
      ...cashFlowData,
      id: tempId,
      createdAt: now,
    };
    set((state) => ({ cashFlows: [...state.cashFlows, optimisticCashFlow] }));

    const { data: insertedCF, error } = await supabase.from("cash_flows").insert({
      // id, // Remove ID
      type: optimisticCashFlow.type,
      category: optimisticCashFlow.category,
      description: optimisticCashFlow.description,
      amount: optimisticCashFlow.amount,
      date: optimisticCashFlow.date,
      order_id: optimisticCashFlow.orderId,
      created_at: now,
    }).select().single();

    if (error) {
      console.error("Failed to add cash flow:", error);
      set(state => ({ cashFlows: state.cashFlows.filter(c => c.id !== tempId) }));
    } else if (insertedCF) {
      const realCF = mapCashFlowFromDB(insertedCF);
      set(state => ({
        cashFlows: state.cashFlows.map(c => c.id === tempId ? realCF : c)
      }));
    }
  },

  deleteCashFlow: async (id) => {
    set((state) => ({
      cashFlows: state.cashFlows.filter((cf) => cf.id !== id),
    }));
    await supabase.from("cash_flows").delete().eq("id", id);
  },

  addUser: async (userData) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const user: User = {
      ...userData,
      id,
      createdAt: now,
    };
    set((state) => ({ users: [...state.users, user] }));

    await supabase.from("app_users").insert({
      id,
      username: user.username,
      password: user.password,
      role: user.role,
      is_active: user.isActive,
      created_at: now,
    });
  },

  updateUser: async (id, updates) => {
    set((state) => ({
      users: state.users.map((u) =>
        u.id === id ? { ...u, ...updates } : u
      ),
    }));

    const dbUpdates: any = {};
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.password !== undefined) dbUpdates.password = updates.password;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    await supabase.from("app_users").update(dbUpdates).eq("id", id);
  },

  deleteUser: async (id) => {
    set((state) => ({
      users: state.users.filter((u) => u.id !== id),
    }));
    await supabase.from("app_users").delete().eq("id", id);
  },

  addBranch: async (branchData) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const branch: Branch = {
      ...branchData,
      id,
      createdAt: now,
    };
    set((state) => ({ branches: [...state.branches, branch] }));

    await supabase.from("branches").insert({
      id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      is_active: branch.isActive,
      created_at: now,
    });
  },

  updateBranch: async (id, updates) => {
    set((state) => ({
      branches: state.branches.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    }));

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    await supabase.from("branches").update(dbUpdates).eq("id", id);
  },

  deleteBranch: async (id) => {
    set((state) => ({
      branches: state.branches.filter((b) => b.id !== id),
    }));
    await supabase.from("branches").delete().eq("id", id);
  },

  updateSettings: async (settings) => {
    set((state) => ({
      settings: { ...state.settings, ...settings },
    }));

    const dbUpdates: any = {};
    if (settings.name !== undefined) dbUpdates.name = settings.name;
    if (settings.tagline !== undefined) dbUpdates.tagline = settings.tagline;
    if (settings.phone !== undefined) dbUpdates.phone = settings.phone;
    if (settings.address !== undefined) dbUpdates.address = settings.address;
    if (settings.email !== undefined) dbUpdates.email = settings.email;
    if (settings.website !== undefined) dbUpdates.website = settings.website;
    if (settings.bankName !== undefined) dbUpdates.bank_name = settings.bankName;
    if (settings.bankAccount !== undefined) dbUpdates.bank_account = settings.bankAccount;
    if (settings.accountHolder !== undefined) dbUpdates.account_holder = settings.accountHolder;
    if (settings.qrPayment !== undefined) dbUpdates.qr_payment = settings.qrPayment;
    if (settings.logo !== undefined) dbUpdates.logo = settings.logo;
    if (settings.whatsappNotificationEnabled !== undefined) dbUpdates.whatsapp_notification_enabled = settings.whatsappNotificationEnabled;

    // Assuming there is only one settings row, but we don't know the ID? 
    // We should probably upsert using a known method or fetch it first. 
    // For now, let's assume we update the single row if exists, or insert if not.
    // Ideally we should store the settings ID in state. 
    // Workaround: Update all rows? or fetch single and update? 
    // Let's assume user has 1 row.
    const { data } = await supabase.from("store_settings").select("id").single();
    if (data) {
      await supabase.from("store_settings").update(dbUpdates).eq("id", data.id);
    } else {
      await supabase.from("store_settings").insert(dbUpdates);
    }
  },
}), {
  name: "app-storage",
  partialize: (state) => ({ currentUser: state.currentUser }),
}));
