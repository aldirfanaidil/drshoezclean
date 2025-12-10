import { useState } from "react";
import { useAppStore, Discount } from "@/lib/store";
import { formatCurrency } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Percent } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function DiscountsPage() {
  const { toast } = useToast();
  const { discounts, addDiscount, updateDiscount, deleteDiscount } = useAppStore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "percentage" as "percentage" | "fixed",
    value: 0,
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "percentage",
      value: 0,
      isActive: true,
    });
  };

  const handleAddDiscount = () => {
    if (!formData.name || formData.value <= 0) {
      toast({ title: "Error", description: "Lengkapi semua data", variant: "destructive" });
      return;
    }

    addDiscount(formData);
    toast({ title: "Berhasil", description: "Diskon berhasil ditambahkan" });
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleUpdateDiscount = () => {
    if (!selectedDiscount) return;

    updateDiscount(selectedDiscount.id, formData);
    toast({ title: "Berhasil", description: "Diskon berhasil diperbarui" });
    setIsEditDialogOpen(false);
    setSelectedDiscount(null);
    resetForm();
  };

  const handleDeleteDiscount = () => {
    if (!selectedDiscount) return;

    deleteDiscount(selectedDiscount.id);
    toast({ title: "Berhasil", description: "Diskon berhasil dihapus" });
    setIsDeleteDialogOpen(false);
    setSelectedDiscount(null);
  };

  const openEditDialog = (discount: Discount) => {
    setSelectedDiscount(discount);
    setFormData({
      name: discount.name,
      type: discount.type,
      value: discount.value,
      isActive: discount.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const toggleDiscountStatus = (discount: Discount) => {
    updateDiscount(discount.id, { isActive: !discount.isActive });
    toast({
      title: "Berhasil",
      description: `Diskon ${discount.isActive ? "dinonaktifkan" : "diaktifkan"}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Diskon</h1>
          <p className="text-muted-foreground">Kelola diskon untuk pesanan</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Diskon
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="opacity-0 animate-fade-in stagger-item">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Percent className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Diskon</p>
                <p className="text-2xl font-bold">{discounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="opacity-0 animate-fade-in stagger-item">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Percent className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diskon Aktif</p>
                <p className="text-2xl font-bold">{discounts.filter((d) => d.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Nilai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Tidak ada diskon
                  </TableCell>
                </TableRow>
              ) : (
                discounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell className="font-medium">{discount.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {discount.type === "percentage" ? "Persentase" : "Nominal"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {discount.type === "percentage" ? `${discount.value}%` : formatCurrency(discount.value)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={discount.isActive}
                        onCheckedChange={() => toggleDiscountStatus(discount)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(discount.createdAt), "dd MMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(discount)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => { setSelectedDiscount(discount); setIsDeleteDialogOpen(true); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Diskon Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Diskon</Label>
              <Input
                placeholder="Misal: Promo Lebaran"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipe Diskon</Label>
              <Select
                value={formData.type}
                onValueChange={(v: "percentage" | "fixed") => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Persentase (%)</SelectItem>
                  <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nilai</Label>
              <Input
                type="number"
                placeholder={formData.type === "percentage" ? "10" : "10000"}
                value={formData.value || ""}
                onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Batal</Button>
            <Button onClick={handleAddDiscount}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Diskon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Diskon</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipe Diskon</Label>
              <Select
                value={formData.type}
                onValueChange={(v: "percentage" | "fixed") => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Persentase (%)</SelectItem>
                  <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nilai</Label>
              <Input
                type="number"
                value={formData.value || ""}
                onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
            <Button onClick={handleUpdateDiscount}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Diskon</DialogTitle>
          </DialogHeader>
          <p>Apakah Anda yakin ingin menghapus diskon "{selectedDiscount?.name}"?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteDiscount}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
