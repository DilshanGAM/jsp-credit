"use client";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { UserType } from "@/types/user";
import axios from "axios";
import toast from "react-hot-toast";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserType[]>([]);
    const [formData, setFormData] = useState({
        email: "",
        name: "",
        phone: "",
        address: "",
        nic: "",
        status: "",
    });
    const [editingUser, setEditingUser] = useState<UserType | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            const token = localStorage.getItem("token");
            axios
                .get("/api/user/customers", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
                .then((res) => {
                    setUsers(res.data);
                })
                .catch((err) => {
                    toast.error(err.response.data.message);
                });
        };

        fetchUsers();
    }, []);

    const handleSave = async () => {
        const token = localStorage.getItem("token");
        try {
            if (editingUser) {
                await axios.put(`/api/user/`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                toast.success("User updated successfully");
            } else {
                await axios.post("/api/user/customers", formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                toast.success("User added successfully");
            }
            setIsDialogOpen(false);
            setEditingUser(null);
            setFormData({ email: "", name: "", phone: "", address: "", nic: "", status: "" });
        } catch (err) {
            toast.error("Failed to save user");
        }
    };

    const handleEdit = (user: UserType) => {
        setEditingUser(user);
        setFormData(user);
        setIsDialogOpen(true);
    };

    const handleDelete = async (email: string) => {
        const token = localStorage.getItem("token");
        try {
            await axios.delete(`/api/user/${email}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setUsers(users.filter((user) => user.email !== email));
            toast.success("User deleted successfully");
        } catch (err) {
            toast.error("Failed to delete user");
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Customer Management</h1>
            <Button
                className="mb-4 bg-blueGreen text-white"
                onClick={() => {
                    setEditingUser(null);
                    setFormData({ email: "", name: "", phone: "", address: "", nic: "", status: "" });
                    setIsDialogOpen(true);
                }}
            >
                Add Customer
            </Button>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>NIC</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.email}>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.phone}</TableCell>
                            <TableCell>{user.address}</TableCell>
                            <TableCell>{user.role}</TableCell>
                            <TableCell>{user.nic}</TableCell>
                            <TableCell>{user.status}</TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button>Actions</Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => handleEdit(user)}>Edit</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDelete(user.email)}>Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                disabled={!!editingUser}
                            />
                        </div>
                        <div>
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="nic">NIC</Label>
                            <Input
                                id="nic"
                                type="text"
                                value={formData.nic}
                                onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="">Select Status</option>
                                <option value="active">Active</option>
                                <option value="deactivated">Deactivated</option>
                                <option value="blocked">Blocked</option>
                            </select>
                        </div>
                        <Button className="bg-blueGreen text-white w-full" onClick={handleSave}>
                            Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
