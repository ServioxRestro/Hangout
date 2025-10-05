"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import Table from "@/components/admin/Table";
import Modal from "@/components/admin/Modal";
import FormField from "@/components/admin/FormField";
import Input from "@/components/admin/Input";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  UserCheck,
  Shield,
} from "lucide-react";
import { createAdminHash } from "@/lib/auth";
import RoleGuard from "@/components/admin/RoleGuard";

interface Staff {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  created_by?: string | null;
  password_hash?: string;
}

type StaffRole = "waiter" | "manager";

const roleConfig = {
  waiter: {
    label: "Waiter",
    icon: UserCheck,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    description: "Can view orders, create orders, update order status",
  },
  manager: {
    label: "Manager",
    icon: Shield,
    color: "bg-green-50 text-green-700 border-green-200",
    description: "Access to orders, menu, offers, tables",
  },
};

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "waiter" as StaffRole,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching staff:", error);
        return;
      }

      setStaff(data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    if (!selectedStaff && !formData.password.trim()) {
      errors.password = "Password is required";
    } else if (!selectedStaff && formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (!formData.role) {
      errors.role = "Role is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      // Get current admin ID from session
      const sessionResponse = await fetch("/api/admin/verify", {
        method: "GET",
        credentials: "include",
      });

      if (!sessionResponse.ok) {
        setFormErrors({ general: "Session expired. Please login again." });
        return;
      }

      const sessionData = await sessionResponse.json();
      const adminId = sessionData.user?.id;

      if (!adminId) {
        setFormErrors({ general: "Unable to identify admin user." });
        return;
      }

      const passwordHash = await createAdminHash(formData.password);

      const { error } = await supabase.from("staff").insert({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password_hash: passwordHash,
        role: formData.role,
        created_by: adminId,
      });

      if (error) {
        if (error.code === "23505" && error.message.includes("email")) {
          setFormErrors({ email: "Email already exists" });
        } else {
          console.error("Error creating staff:", error);
          setFormErrors({ general: "Failed to create staff member" });
        }
        return;
      }

      await fetchStaff();
      handleCloseModal();
    } catch (error) {
      console.error("Error creating staff:", error);
      setFormErrors({ general: "Failed to create staff member" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !selectedStaff) return;

    setSubmitting(true);
    try {
      const updateData: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
      };

      if (formData.password.trim()) {
        updateData.password_hash = await createAdminHash(formData.password);
      }

      const { error } = await supabase
        .from("staff")
        .update(updateData)
        .eq("id", selectedStaff.id);

      if (error) {
        if (error.code === "23505" && error.message.includes("email")) {
          setFormErrors({ email: "Email already exists" });
        } else {
          console.error("Error updating staff:", error);
          setFormErrors({ general: "Failed to update staff member" });
        }
        return;
      }

      await fetchStaff();
      handleCloseModal();
    } catch (error) {
      console.error("Error updating staff:", error);
      setFormErrors({ general: "Failed to update staff member" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStaff) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", selectedStaff.id);

      if (error) {
        console.error("Error deleting staff:", error);
        return;
      }

      await fetchStaff();
      handleCloseModal();
    } catch (error) {
      console.error("Error deleting staff:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (staffMember: Staff) => {
    try {
      const { error } = await supabase
        .from("staff")
        .update({ is_active: !staffMember.is_active })
        .eq("id", staffMember.id);

      if (error) {
        console.error("Error updating staff status:", error);
        return;
      }

      await fetchStaff();
    } catch (error) {
      console.error("Error updating staff status:", error);
    }
  };

  const openCreateModal = () => {
    setSelectedStaff(null);
    setFormData({ name: "", email: "", password: "", role: "waiter" });
    setFormErrors({});
    setCreateModalOpen(true);
  };

  const openEditModal = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      password: "",
      role:
        staffMember.role === "waiter" || staffMember.role === "manager"
          ? staffMember.role
          : "waiter",
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  const openDeleteModal = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setDeleteModalOpen(true);
  };

  const handleCloseModal = () => {
    setCreateModalOpen(false);
    setEditModalOpen(false);
    setDeleteModalOpen(false);
    setSelectedStaff(null);
    setFormData({ name: "", email: "", password: "", role: "waiter" });
    setFormErrors({});
    setShowPassword(false);
  };

  const getRoleBadge = (role: string) => {
    const validRole =
      role === "waiter" || role === "manager" ? (role as StaffRole) : null;
    const config = validRole ? roleConfig[validRole] : null;

    if (!config) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-gray-50 text-gray-700 border-gray-200">
          {role || "Unknown"}
        </span>
      );
    }

    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
          isActive
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-red-50 text-red-700 border-red-200"
        }`}
      >
        {isActive ? "Active" : "Inactive"}
      </span>
    );
  };

  const columns = [
    {
      key: "name",
      title: "Name",
      render: (value: any, staff: Staff) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{staff.name}</div>
            <div className="text-sm text-gray-500">{staff.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      title: "Role",
      render: (value: any, staff: Staff) => (
        <div>
          {getRoleBadge(staff.role)}
          <div className="text-xs text-gray-500 mt-1">
            {staff.role === "waiter" || staff.role === "manager"
              ? roleConfig[staff.role as StaffRole]?.description
              : "No description"}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (value: any, staff: Staff) => getStatusBadge(staff.is_active),
    },
    {
      key: "created_at",
      title: "Created",
      render: (value: any, staff: Staff) => (
        <div className="text-sm text-gray-500">
          {staff.created_at
            ? new Date(staff.created_at).toLocaleDateString()
            : "N/A"}
        </div>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (value: any, staff: Staff) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openEditModal(staff)}
            leftIcon={<Edit2 className="w-3 h-3" />}
          >
            Edit
          </Button>
          <Button
            variant={staff.is_active ? "secondary" : "primary"}
            size="sm"
            onClick={() => handleToggleActive(staff)}
          >
            {staff.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => openDeleteModal(staff)}
            leftIcon={<Trash2 className="w-3 h-3" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <RoleGuard
      requiredRoute="/admin/staff"
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              <Users className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Admin Access Required
            </h3>
            <p className="text-gray-600 mb-4">
              Only the main administrator can manage staff accounts.
            </p>
            <button
              onClick={() => (window.location.href = "/admin/dashboard")}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Staff Management"
          description="Manage restaurant staff members and their roles"
        >
          <Button
            variant="primary"
            onClick={openCreateModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Staff Member
          </Button>
        </PageHeader>

        {/* Role Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {Object.entries(roleConfig).map(([role, config]) => {
            const Icon = config.icon;
            const staffCount = staff.filter(
              (s) => s.role === role && s.is_active
            ).length;

            return (
              <Card key={role}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                          role === "waiter" ? "bg-blue-100" : "bg-green-100"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            role === "waiter"
                              ? "text-blue-600"
                              : "text-green-600"
                          }`}
                        />
                      </div>
                      <h3 className="font-medium text-gray-900">
                        {config.label}
                      </h3>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {staffCount}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{config.description}</p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Staff Table */}
        <Card>
          <Table
            columns={columns}
            data={staff}
            loading={loading}
            emptyText="No staff members found"
          />
        </Card>

        {/* Create Staff Modal */}
        <Modal
          isOpen={createModalOpen}
          onClose={handleCloseModal}
          title="Add Staff Member"
          size="md"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            {formErrors.general && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {formErrors.general}
              </div>
            )}

            <FormField label="Full Name" required>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter full name"
                leftIcon={<User className="w-4 h-4" />}
                error={!!formErrors.name}
              />
              {formErrors.name && (
                <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>
              )}
            </FormField>

            <FormField label="Email Address" required>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email address"
                leftIcon={<Mail className="w-4 h-4" />}
                error={!!formErrors.email}
              />
              {formErrors.email && (
                <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>
              )}
            </FormField>

            <FormField label="Password" required>
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Enter password"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                error={!!formErrors.password}
              />
              {formErrors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {formErrors.password}
                </p>
              )}
            </FormField>

            <FormField label="Role" required>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as StaffRole,
                  })
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(roleConfig).map(([role, config]) => (
                  <option key={role} value={role}>
                    {config.label} - {config.description}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create Staff Member
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Staff Modal */}
        <Modal
          isOpen={editModalOpen}
          onClose={handleCloseModal}
          title={`Edit ${selectedStaff?.name || "Staff Member"}`}
          size="md"
        >
          <form onSubmit={handleEdit} className="space-y-4">
            {formErrors.general && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {formErrors.general}
              </div>
            )}

            <FormField label="Full Name" required>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter full name"
                leftIcon={<User className="w-4 h-4" />}
                error={!!formErrors.name}
              />
              {formErrors.name && (
                <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>
              )}
            </FormField>

            <FormField label="Email Address" required>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email address"
                leftIcon={<Mail className="w-4 h-4" />}
                error={!!formErrors.email}
              />
              {formErrors.email && (
                <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>
              )}
            </FormField>

            <FormField
              label="New Password"
              description="Leave blank to keep current password"
            >
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Enter new password (optional)"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                error={!!formErrors.password}
              />
              {formErrors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {formErrors.password}
                </p>
              )}
            </FormField>

            <FormField label="Role" required>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as StaffRole,
                  })
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(roleConfig).map(([role, config]) => (
                  <option key={role} value={role}>
                    {config.label} - {config.description}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                leftIcon={<Edit2 className="w-4 h-4" />}
              >
                Update Staff Member
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={handleCloseModal}
          title="Delete Staff Member"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-medium">{selectedStaff?.name}</span>? This
              action cannot be undone.
            </p>

            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                loading={submitting}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Delete Staff Member
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </RoleGuard>
  );
}
