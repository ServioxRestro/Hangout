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
import {
  Plus,
  QrCode,
  Download,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  CheckCircle,
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

    // Check if table number already exists
    const existing = tables.find((t) => t.table_number === tableNumber);
    if (existing) {
      alert("Table number already exists");
      setAddLoading(false);
      return;
    }

    try {
      const tableCode = `table_${tableNumber}_${Date.now().toString(36)}`;
      const qrCodeDataUrl = await generateQRCode(tableCode);

      const { data, error } = await supabase
        .from("restaurant_tables")
        .insert({
          table_number: tableNumber,
          table_code: tableCode,
          qr_code_url: qrCodeDataUrl,
          is_active: true,
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

  const deleteTable = async (tableId: string, tableNumber: number) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete Table ${tableNumber}? This action cannot be undone.`
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
      alert(`Table ${tableNumber} deleted successfully`);
    } catch (error) {
      console.error("Error:", error);
      alert("Error deleting table");
    }
  };

  const downloadQRCode = (qrCodeUrl: string, tableNumber: number) => {
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `table_${tableNumber}_qr.png`;
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
      render: (tableNumber: number) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <span className="font-bold text-blue-600">{tableNumber}</span>
          </div>
          <span className="font-medium">Table {tableNumber}</span>
        </div>
      ),
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
              downloadQRCode(record.qr_code_url!, record.table_number)
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
            onClick={() => deleteTable(record.id, record.table_number)}
            leftIcon={<Trash2 className="w-3 h-3" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Table Management"
        description="Manage restaurant tables and their QR codes"
        breadcrumbs={[
          { name: "Dashboard", href: "/admin/dashboard" },
          { name: "Tables" },
        ]}
      >
        <Button
          variant="primary"
          onClick={() => setShowAddModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add New Table
        </Button>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                All Tables
              </h2>
              <p className="text-sm text-gray-500">
                Manage your restaurant tables and generate QR codes
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Total: {tables.length} table{tables.length !== 1 ? "s" : ""}
            </div>
          </div>

          <Table
            data={tables}
            columns={tableColumns}
            loading={loading}
            emptyText="No tables created yet. Add your first table to get started."
          />
        </Card>
      </div>

      {/* Add Table Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewTableNumber("");
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

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setNewTableNumber("");
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
        title={`Table ${selectedTable?.table_number} QR Code`}
        size="sm"
      >
        {selectedTable && (
          <div className="text-center space-y-4">
            <div className="bg-gray-50 p-6 rounded-lg">
              <img
                src={selectedTable.qr_code_url!}
                alt={`QR Code for Table ${selectedTable.table_number}`}
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
                    selectedTable.table_number
                  )
                }
                leftIcon={<Download className="w-4 h-4" />}
              >
                Download QR
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
