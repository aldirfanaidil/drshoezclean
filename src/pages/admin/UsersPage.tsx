import { useState } from "react";
import { useAppStore, User } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Edit, Trash2, UserCog, Users } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// Master admin email - only this user can edit superuser roles
const MASTER_ADMIN_EMAIL = "aldi@gmail.com";

export default function UsersPage() {
  const { toast } = useToast();
  const { users, addUser, updateUser, deleteUser, currentUser } = useAppStore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "cashier" as "superuser" | "admin" | "cashier",
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      role: "cashier",
      isActive: true,
    });
  };

  // Check if current user is the master admin
  const isMasterAdmin = currentUser?.username === MASTER_ADMIN_EMAIL;

  // Check if current user can edit a specific user's role
  const canEditUserRole = (targetUser: User) => {
    // Master admin can edit anyone
    if (isMasterAdmin) return true;
    // Non-master superusers cannot edit other superusers
    if (targetUser.role === "superuser") return false;
    // Can edit cashier and admin
    return true;
  };

  // Get available roles based on current user permissions
  const getAvailableRoles = (isEditing: boolean, targetUser?: User | null) => {
    // Master admin can assign any role
    if (isMasterAdmin) {
      return ["superuser", "admin", "cashier"] as const;
    }
    // Non-master admin cannot assign superuser role
    // But if editing an existing superuser, keep it as option (locked)
    if (isEditing && targetUser?.role === "superuser") {
      return ["superuser"] as const; // Locked to superuser, can't change
    }
    return ["admin", "cashier"] as const;
  };

  const handleAddUser = () => {
    if (!formData.username || !formData.password) {
      toast({ title: "Error", description: "Username dan password wajib diisi", variant: "destructive" });
      return;
    }

    if (users.some((u) => u.username === formData.username)) {
      toast({ title: "Error", description: "Username sudah digunakan", variant: "destructive" });
      return;
    }

    addUser(formData);
    toast({ title: "Berhasil", description: "Pengguna berhasil ditambahkan" });
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;

    const updates: Partial<User> = {
      username: formData.username,
      role: formData.role,
      isActive: formData.isActive,
    };

    if (formData.password) {
      updates.password = formData.password;
    }

    updateUser(selectedUser.id, updates);
    toast({ title: "Berhasil", description: "Pengguna berhasil diperbarui" });
    setIsEditDialogOpen(false);
    setSelectedUser(null);
    resetForm();
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;

    if (selectedUser.id === currentUser?.id) {
      toast({ title: "Error", description: "Tidak dapat menghapus akun sendiri", variant: "destructive" });
      return;
    }

    deleteUser(selectedUser.id);
    toast({ title: "Berhasil", description: "Pengguna berhasil dihapus" });
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const openEditDialog = (user: User) => {
    // Check permission
    if (!canEditUserRole(user) && user.role === "superuser") {
      toast({
        title: "Akses Ditolak",
        description: "Anda tidak memiliki izin untuk mengedit user superuser",
        variant: "destructive"
      });
      return;
    }

    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: "",
      role: user.role,
      isActive: user.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const toggleUserStatus = (user: User) => {
    if (user.id === currentUser?.id) {
      toast({ title: "Error", description: "Tidak dapat menonaktifkan akun sendiri", variant: "destructive" });
      return;
    }
    updateUser(user.id, { isActive: !user.isActive });
    toast({
      title: "Berhasil",
      description: `Pengguna ${user.isActive ? "dinonaktifkan" : "diaktifkan"}`,
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superuser":
        return <Badge className="bg-primary text-primary-foreground">Superuser</Badge>;
      case "admin":
        return <Badge className="bg-info text-info-foreground">Admin</Badge>;
      case "cashier":
        return <Badge variant="secondary">Kasir</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pengguna</h1>
          <p className="text-muted-foreground">Kelola akun pengguna sistem</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Pengguna
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="opacity-0 animate-fade-in stagger-item">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pengguna</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="opacity-0 animate-fade-in stagger-item">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <UserCog className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pengguna Aktif</p>
                <p className="text-2xl font-bold">{users.filter((u) => u.isActive).length}</p>
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
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={user.isActive}
                      onCheckedChange={() => toggleUserStatus(user)}
                      disabled={user.id === currentUser?.id}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.createdAt), "dd MMM yyyy", { locale: id })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => { setSelectedUser(user); setIsDeleteDialogOpen(true); }}
                        disabled={user.id === currentUser?.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                placeholder="Masukkan username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Masukkan password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(v: "superuser" | "admin" | "cashier") => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles(false).map((role) => (
                    <SelectItem key={role} value={role}>
                      {role === "superuser" && "Superuser (Akses Penuh)"}
                      {role === "admin" && "Admin (Dashboard, Pesanan, Diskon, Laporan, Pelanggan)"}
                      {role === "cashier" && "Kasir (Dashboard, Pesanan, Diskon, Laporan, Pelanggan)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Batal</Button>
            <Button onClick={handleAddUser}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password Baru (kosongkan jika tidak diubah)</Label>
              <Input
                type="password"
                placeholder="Masukkan password baru"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(v: "superuser" | "admin" | "cashier") => setFormData({ ...formData, role: v })}
                disabled={!isMasterAdmin && selectedUser?.role === "superuser"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles(true, selectedUser).map((role) => (
                    <SelectItem key={role} value={role}>
                      {role === "superuser" && "Superuser"}
                      {role === "admin" && "Admin"}
                      {role === "cashier" && "Kasir"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isMasterAdmin && selectedUser?.role === "superuser" && (
                <p className="text-xs text-muted-foreground">Role superuser tidak dapat diubah</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
            <Button onClick={handleUpdateUser}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Pengguna</DialogTitle>
          </DialogHeader>
          <p>Apakah Anda yakin ingin menghapus pengguna "{selectedUser?.username}"?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
