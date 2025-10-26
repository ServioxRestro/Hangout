"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import QRCode from "qrcode";
import type { Tables } from "@/types/database.types";
import PageHeader from "@/components/admin/PageHeader";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import Modal from "@/components/admin/Modal";
import FormField from "@/components/admin/FormField";
import Input from "@/components/admin/Input";
import Table from "@/components/admin/Table";
import RoleGuard from "@/components/admin/RoleGuard";
import {
  Plus,
  QrCode,
  Download,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  CheckCircle,
  Users,
} from "lucide-react";

type RestaurantTable = Tables<"restaurant_tables">;

export default function TableManagement() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(
    null
  );
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newTableVegOnly, setNewTableVegOnly] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .order("table_number", { ascending: true });

      if (error) {
        console.error("Error fetching tables:", error);
        return;
      }

      setTables(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (tableCode: string) => {
    try {
      const baseUrl = (
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      ).trim();
      const qrUrl = `${baseUrl}/t/${tableCode}`.trim();
      return await QRCode.toDataURL(qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
      return null;
    }
  };

  const addTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);

    const tableNumber = parseInt(newTableNumber);
    if (isNaN(tableNumber) || tableNumber <= 0) {
      alert("Please enter a valid table number");
      setAddLoading(false);
      return;
    }

    // Check if this exact table (number + type) already exists
    const existing = tables.find(
      (t) => t.table_number === tableNumber && t.veg_only === newTableVegOnly
    );
    if (existing) {
      const tableType = newTableVegOnly ? "Veg-only (V)" : "Regular";
      alert(
        `${tableType} Table ${tableNumber} already exists. Please choose a different number.`
      );
      setAddLoading(false);
      return;
    }

    try {
      const tableCode = `${newTableVegOnly ? "veg_" : ""}table_${tableNumber}_${Date.now().toString(36)}`;
      const qrCodeDataUrl = await generateQRCode(tableCode);

      const { data, error } = await supabase
        .from("restaurant_tables")
        .insert({
          table_number: tableNumber,
          table_code: tableCode,
          qr_code_url: qrCodeDataUrl,
          is_active: true,
          veg_only: newTableVegOnly,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding table:", error);
        alert("Error adding table");
        setAddLoading(false);
        return;
      }

      setTables((prev) => [...prev, data]);
      setNewTableNumber("");
      setNewTableVegOnly(false);
      setShowAddModal(false);
    } catch (error) {
      console.error("Error:", error);
      alert("Error adding table");
    } finally {
      setAddLoading(false);
    }
  };

  const toggleTableStatus = async (tableId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("restaurant_tables")
        .update({ is_active: !isActive })
        .eq("id", tableId);

      if (error) {
        console.error("Error updating table:", error);
        return;
      }

      setTables((prev) =>
        prev.map((table) =>
          table.id === tableId ? { ...table, is_active: !isActive } : table
        )
      );
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const deleteTable = async (tableId: string, tableNumber: number, vegOnly: boolean) => {
    const displayNumber = vegOnly ? `V${tableNumber}` : tableNumber.toString();
    const confirmed = window.confirm(
      `Are you sure you want to delete Table ${displayNumber}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("restaurant_tables")
        .delete()
        .eq("id", tableId);

      if (error) {
        console.error("Error deleting table:", error);
        alert("Error deleting table");
        return;
      }

      setTables((prev) => prev.filter((table) => table.id !== tableId));
      alert(`Table ${displayNumber} deleted successfully`);
    } catch (error) {
      console.error("Error:", error);
      alert("Error deleting table");
    }
  };

  const downloadQRCode = (qrCodeUrl: string, tableNumber: number, vegOnly: boolean) => {
    const displayNumber = vegOnly ? `V${tableNumber}` : tableNumber.toString();
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `table_${displayNumber}_qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyTableCode = async (tableCode: string) => {
    try {
      await navigator.clipboard.writeText(tableCode);
      alert("Table code copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const viewQRCode = (table: RestaurantTable) => {
    setSelectedTable(table);
    setShowQRModal(true);
  };

  const tableColumns = [
    {
      key: "table_number",
      title: "Table Number",
      render: (tableNumber: number, record: RestaurantTable) => {
        const displayNumber = record.veg_only ? `V${tableNumber}` : tableNumber.toString();
        return (
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
              record.veg_only ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              <span className={`font-bold text-sm ${
                record.veg_only ? 'text-green-600' : 'text-blue-600'
              }`}>{displayNumber}</span>
            </div>
            <div>
              <div className="font-medium">Table {displayNumber}</div>
              {record.veg_only && (
                <span className="text-xs text-green-600 font-medium">
                  🟢 Veg-Only
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "table_code",
      title: "Table Code",
      render: (code: string) => (
        <div className="flex items-center space-x-2">
          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
            {code.length > 20 ? `${code.substring(0, 20)}...` : code}
          </code>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => copyTableCode(code)}
            leftIcon={<Copy className="w-3 h-3" />}
          >
            Copy
          </Button>
        </div>
      ),
    },
    {
      key: "is_active",
      title: "Status",
      render: (isActive: boolean) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
            isActive
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          <CheckCircle
            className={`w-3 h-3 mr-1 ${
              isActive ? "text-green-500" : "text-red-500"
            }`}
          />
          {isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (_: any, record: RestaurantTable) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => viewQRCode(record)}
            leftIcon={<QrCode className="w-3 h-3" />}
          >
            QR Code
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              downloadQRCode(record.qr_code_url!, record.table_number, record.veg_only)
            }
            leftIcon={<Download className="w-3 h-3" />}
          >
            Download
          </Button>
          <Button
            size="sm"
            variant={record.is_active ? "warning" : "success"}
            onClick={() =>
              toggleTableStatus(record.id, record.is_active || false)
            }
            leftIcon={
              record.is_active ? (
                <EyeOff className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )
            }
          >
            {record.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => deleteTable(record.id, record.table_number, record.veg_only)}
            leftIcon={<Trash2 className="w-3 h-3" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <RoleGuard requiredRoute="/admin/tables/management">
      <div>
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Table Management</h1>
            <p className="text-gray-600 mt-1">Manage restaurant tables and their QR codes</p>
          </div>
        <Button
          variant="primary"
          onClick={() => setShowAddModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add New Table
        </Button>
      </div>

      <div className="space-y-8">
        {/* Regular Tables */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <h2 className="text-lg font-semibold text-gray-900">Regular Tables</h2>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                {tables.filter(t => !t.veg_only).length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
              <div className="text-gray-600">Loading tables...</div>
            </div>
          ) : tables.filter(t => !t.veg_only).length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <p className="text-gray-500">No regular tables created yet.</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {tables.filter(t => !t.veg_only).map((table) => (
                <Card key={table.id} className="border-2 border-blue-200 hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    {/* Table Number */}
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                        <span className="text-2xl font-bold text-blue-600">{table.table_number}</span>
                      </div>
                      <div className="font-semibold text-gray-900">Table {table.table_number}</div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex justify-center mb-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          table.is_active
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        <CheckCircle
                          className={`w-3 h-3 mr-1 ${
                            table.is_active ? "text-green-500" : "text-red-500"
                          }`}
                        />
                        {table.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Table Code */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 text-center mb-1">Table Code</div>
                      <code className="block text-xs bg-gray-100 px-2 py-1 rounded font-mono text-center truncate">
                        {table.table_code}
                      </code>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => viewQRCode(table)}
                        leftIcon={<QrCode className="w-3 h-3" />}
                        className="w-full"
                      >
                        View QR
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant={table.is_active ? "warning" : "success"}
                          onClick={() => toggleTableStatus(table.id, table.is_active || false)}
                          className="text-xs"
                        >
                          {table.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => deleteTable(table.id, table.table_number, table.veg_only)}
                          leftIcon={<Trash2 className="w-3 h-3" />}
                          className="text-xs"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Veg-Only Tables */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <h2 className="text-lg font-semibold text-gray-900">Veg-Only Tables</h2>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                {tables.filter(t => t.veg_only).length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-4"></div>
              <div className="text-gray-600">Loading tables...</div>
            </div>
          ) : tables.filter(t => t.veg_only).length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <p className="text-gray-500">No veg-only tables created yet.</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {tables.filter(t => t.veg_only).map((table) => (
                <Card key={table.id} className="border-2 border-green-200 hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    {/* Veg Badge */}
                    <div className="absolute top-2 right-2">
                      <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold border border-green-200">
                        🟢 VEG
                      </span>
                    </div>

                    {/* Table Number */}
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                        <span className="text-2xl font-bold text-green-600">V{table.table_number}</span>
                      </div>
                      <div className="font-semibold text-gray-900">Table V{table.table_number}</div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex justify-center mb-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          table.is_active
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        <CheckCircle
                          className={`w-3 h-3 mr-1 ${
                            table.is_active ? "text-green-500" : "text-red-500"
                          }`}
                        />
                        {table.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Table Code */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 text-center mb-1">Table Code</div>
                      <code className="block text-xs bg-gray-100 px-2 py-1 rounded font-mono text-center truncate">
                        {table.table_code}
                      </code>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => viewQRCode(table)}
                        leftIcon={<QrCode className="w-3 h-3" />}
                        className="w-full"
                      >
                        View QR
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant={table.is_active ? "warning" : "success"}
                          onClick={() => toggleTableStatus(table.id, table.is_active || false)}
                          className="text-xs"
                        >
                          {table.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => deleteTable(table.id, table.table_number, table.veg_only)}
                          leftIcon={<Trash2 className="w-3 h-3" />}
                          className="text-xs"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Table Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewTableNumber("");
          setNewTableVegOnly(false);
        }}
        title="Add New Table"
        size="sm"
      >
        <form onSubmit={addTable} className="space-y-4">
          <FormField
            label="Table Number"
            required
            description="Enter a unique number for this table"
          >
            <Input
              type="number"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              placeholder="e.g., 1, 2, 3..."
              required
              min="1"
            />
          </FormField>

          <FormField
            label="Table Type"
            description="Choose whether this table should only display vegetarian items"
          >
            <div className="space-y-3">
              <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                style={{
                  borderColor: !newTableVegOnly ? '#3B82F6' : '#E5E7EB',
                  backgroundColor: !newTableVegOnly ? '#EFF6FF' : 'white'
                }}
              >
                <input
                  type="radio"
                  name="tableType"
                  checked={!newTableVegOnly}
                  onChange={() => setNewTableVegOnly(false)}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">Regular Table</div>
                  <div className="text-sm text-gray-600">Shows all menu items (veg & non-veg)</div>
                </div>
              </label>

              <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                style={{
                  borderColor: newTableVegOnly ? '#10B981' : '#E5E7EB',
                  backgroundColor: newTableVegOnly ? '#ECFDF5' : 'white'
                }}
              >
                <input
                  type="radio"
                  name="tableType"
                  checked={newTableVegOnly}
                  onChange={() => setNewTableVegOnly(true)}
                  className="w-4 h-4 text-green-600"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    🟢 Veg-Only Table
                  </div>
                  <div className="text-sm text-gray-600">Shows only vegetarian items</div>
                </div>
              </label>
            </div>
          </FormField>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setNewTableNumber("");
                setNewTableVegOnly(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              loading={addLoading}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Table
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={showQRModal}
        onClose={() => {
          setShowQRModal(false);
          setSelectedTable(null);
        }}
        title={`Table ${selectedTable?.veg_only ? `V${selectedTable.table_number}` : selectedTable?.table_number} QR Code`}
        size="sm"
      >
        {selectedTable && (() => {
          const displayNumber = selectedTable.veg_only ? `V${selectedTable.table_number}` : selectedTable.table_number.toString();
          return (
            <div className="text-center space-y-4">
              <div className="bg-gray-50 p-6 rounded-lg">
                <img
                  src={selectedTable.qr_code_url!}
                  alt={`QR Code for Table ${displayNumber}`}
                  className="w-64 h-64 mx-auto border-2 border-gray-200 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">Table Code:</p>
                <code className="block text-xs bg-gray-100 p-2 rounded font-mono break-all">
                  {selectedTable.table_code}
                </code>
              </div>

              <div className="flex justify-center space-x-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => copyTableCode(selectedTable.table_code)}
                  leftIcon={<Copy className="w-4 h-4" />}
                >
                  Copy Code
                </Button>
                <Button
                  variant="primary"
                  onClick={() =>
                    downloadQRCode(
                      selectedTable.qr_code_url!,
                      selectedTable.table_number,
                      selectedTable.veg_only
                    )
                  }
                  leftIcon={<Download className="w-4 h-4" />}
                >
                Download QR
              </Button>
            </div>
          </div>
          );
        })()}
      </Modal>
      </div>
    </RoleGuard>
  );
}
