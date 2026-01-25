import { useState } from "react";
import { useAppStore, Branch } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Edit, Trash2, Building2, MapPin, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function BranchesPage() {
  const { branches, orders, addBranch, updateBranch, deleteBranch } = useAppStore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      phone: "",
      isActive: true,
    });
    setEditingBranch(null);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast({ title: "Error", description: "Nama cabang wajib diisi", variant: "destructive" });
      return;
    }

    if (editingBranch) {
      updateBranch(editingBranch.id, formData);
      toast({ title: "Berhasil", description: "Cabang berhasil diperbarui" });
    } else {
      addBranch(formData);
      toast({ title: "Berhasil", description: "Cabang berhasil ditambahkan" });
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      isActive: branch.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (branch: Branch) => {
    if (confirm(`Hapus cabang "${branch.name}"?`)) {
      deleteBranch(branch.id);
      toast({ title: "Berhasil", description: "Cabang berhasil dihapus" });
    }
  };

  const getBranchOrderCount = (branchId: string) => {
    return orders.filter((o) => o.branchId === branchId).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cabang</h1>
          <p className="text-muted-foreground">Kelola cabang toko</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Tambah Cabang
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBranch ? "Edit Cabang" : "Tambah Cabang"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nama Cabang *</Label>
                <Input
                  placeholder="Cabang Utama"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Alamat</Label>
                <Input
                  placeholder="Jl. Contoh No. 123"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input
                  placeholder="0812-xxxx-xxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Status Aktif</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => {
                  resetForm();
                  setIsDialogOpen(false);
                }}>
                  Batal
                </Button>
                <Button className="flex-1" onClick={handleSubmit}>
                  {editingBranch ? "Simpan Perubahan" : "Tambah Cabang"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cabang</p>
                <p className="text-2xl font-bold">{branches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Building2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cabang Aktif</p>
                <p className="text-2xl font-bold">{branches.filter(b => b.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <Building2 className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cabang Nonaktif</p>
                <p className="text-2xl font-bold">{branches.filter(b => !b.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Cabang</CardTitle>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada cabang</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead>Pesanan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell>
                        {branch.address ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {branch.address}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {branch.phone ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {branch.phone}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{getBranchOrderCount(branch.id)}</TableCell>
                      <TableCell>
                        <Badge variant={branch.isActive ? "default" : "secondary"}>
                          {branch.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(branch.createdAt), "dd MMM yyyy", { locale: id })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(branch)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(branch)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
