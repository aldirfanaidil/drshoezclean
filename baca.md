Situasi: Login berhasil dan data customers sudah muncul di UI. TAPI, data orders, cashFlows, branches, dan discounts masih kosong di dashboard. Padahal di database tabelnya ada isinya.

Tugas: Perbaiki fungsi fetchInitialData di src/store.ts. Pastikan fungsi tersebut melakukan hal berikut:

Fetch Semua Tabel: Gunakan Promise.all untuk mengambil data dari tabel:

orders

customers (ini sudah oke)

branches

discounts

cash_flows

store_settings

Lakukan Data Mapping (PENTING): Supabase mengembalikan format snake_case (contoh: payment_status, customer_name), sedangkan aplikasi frontend menggunakan camelCase (contoh: paymentStatus, customerName).

Buat fungsi mapper untuk mengubah format data dari Supabase agar sesuai dengan interface TypeScript di aplikasi.

Khusus untuk tabel orders: Pastikan kolom shoes (yang bertipe JSONB) di-parse dengan benar agar bisa dibaca sebagai Array oleh UI.

State Update: Setelah data di-fetch dan di-map, masukkan ke dalam state Zustand masing-masing (setOrders, setCashFlows, dll).

Contoh Logic yang diminta:

TypeScript

const { data: ordersData } = await supabase.from('orders').select('*');
const formattedOrders = ordersData.map(order => ({
  id: order.id,
  customerName: order.customer_name, // Mapping snake ke camel
  paymentStatus: order.payment_status,
  shoes: order.shoes, // JSONB biasanya sudah otomatis jadi object/array
  // ... petakan field lainnya ...
}));
set({ orders: formattedOrders });
Tolong perbaiki kode sekarang agar Dashboard dan halaman Pesanan terisi penuh.