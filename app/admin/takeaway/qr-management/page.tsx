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
} from "lucide-react";

type TakeawayQR = Tables<"takeaway_qr_codes">;

export default function TakeawayQRManagement() {
  const [qrCodes, setQrCodes] = useState<TakeawayQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedQR, setSelectedQR] = useState<TakeawayQR | null>(null);
  const [newQRVegOnly, setNewQRVegOnly] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    fetchQRCodes();
  }, []);

  const fetchQRCodes = async () => {
    try {
      const { data, error } = await supabase
        .from("takeaway_qr_codes")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching QR codes:", error);
        return;
      }

      setQrCodes(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (qrCode: string) => {
    try {
      const baseUrl = (
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      ).trim();
      const qrUrl = `${baseUrl}/takeaway/${qrCode}`.trim();
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

  const addQRCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);

    try {
      // Generate unique code
      const timestamp = Date.now().toString(36);
      const qrCodeText = `takeaway_${newQRVegOnly ? "veg" : "regular"}_${timestamp}`;
      const qrCodeDataUrl = await generateQRCode(qrCodeText);

      const { data, error } = await supabase
        .from("takeaway_qr_codes")
        .insert({
          qr_code: qrCodeText,
          qr_code_url: qrCodeDataUrl,
          is_veg_only: newQRVegOnly,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding QR code:", error);
        alert("Error adding QR code");
        setAddLoading(false);
        return;
      }

      setQrCodes((prev) => [...prev, data]);
      setNewQRVegOnly(false);
      setShowAddModal(false);
      alert("Takeaway QR code created successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert("Error adding QR code");
    } finally {
      setAddLoading(false);
    }
  };

  const toggleQRStatus = async (qrId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("takeaway_qr_codes")
        .update({ is_active: !isActive })
        .eq("id", qrId);

      if (error) {
        console.error("Error updating QR code:", error);
        return;
      }

      setQrCodes((prev) =>
        prev.map((qr) =>
          qr.id === qrId ? { ...qr, is_active: !isActive } : qr
        )
      );
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const deleteQRCode = async (qrId: string, isVegOnly: boolean) => {
    const qrType = isVegOnly ? "Veg-Only" : "Regular";
    const confirmed = window.confirm(
      `Are you sure you want to delete Takeaway ${qrType} QR Code? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("takeaway_qr_codes")
        .delete()
        .eq("id", qrId);

      if (error) {
        console.error("Error deleting QR code:", error);
        alert("Error deleting QR code");
        return;
      }

      setQrCodes((prev) => prev.filter((qr) => qr.id !== qrId));
      alert(`Takeaway ${qrType} QR Code deleted successfully`);
    } catch (error) {
      console.error("Error:", error);
      alert("Error deleting QR code");
    }
  };

  const downloadQRCode = (qrCodeUrl: string, isVegOnly: boolean) => {
    const qrType = isVegOnly ? "veg" : "regular";
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `takeaway_${qrType}_qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyQRCode = async (qrCode: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const fullUrl = `${baseUrl}/takeaway/${qrCode}`;
      await navigator.clipboard.writeText(fullUrl);
      alert("Takeaway URL copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const viewQRCode = (qr: TakeawayQR) => {
    setSelectedQR(qr);
    setShowQRModal(true);
  };

  const qrColumns = [
    {
      key: "type",
      title: "QR Type",
      render: (_: any, record: TakeawayQR) => (
        <div className="flex items-center">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
              record.is_veg_only ? "bg-green-100" : "bg-purple-100"
            }`}
          >
            <span
              className={`font-bold text-sm ${
                record.is_veg_only ? "text-green-600" : "text-purple-600"
              }`}
            >
              {record.is_veg_only ? "🟢" : "🟣"}
            </span>
          </div>
          <div>
            <div className="font-medium">
              Takeaway {record.is_veg_only ? "Veg-Only" : "Regular"}
            </div>
            {record.is_veg_only && (
              <span className="text-xs text-green-600 font-medium">
                Only vegetarian items
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "qr_code",
      title: "QR Code",
      render: (code: string) => (
        <div className="flex items-center space-x-2">
          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
            {code.length > 30 ? `${code.substring(0, 30)}...` : code}
          </code>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => copyQRCode(code)}
            leftIcon={<Copy className="w-3 h-3" />}
          >
            Copy URL
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
      render: (_: any, record: TakeawayQR) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => viewQRCode(record)}
            leftIcon={<QrCode className="w-3 h-3" />}
          >
            View QR
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => downloadQRCode(record.qr_code_url!, record.is_veg_only)}
            leftIcon={<Download className="w-3 h-3" />}
          >
            Download
          </Button>
          <Button
            size="sm"
            variant={record.is_active ? "warning" : "success"}
            onClick={() => toggleQRStatus(record.id, record.is_active || false)}
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
            onClick={() => deleteQRCode(record.id, record.is_veg_only)}
            leftIcon={<Trash2 className="w-3 h-3" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <RoleGuard requiredRoute="/admin/takeaway/qr-management">
      <div>
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Takeaway QR Management
            </h1>
            <p className="text-gray-600 mt-1">
              Create and manage takeaway QR codes for customers
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create QR Code
          </Button>
        </div>

        <div>
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  All Takeaway QR Codes
                </h2>
                <p className="text-sm text-gray-500">
                  Manage your takeaway QR codes - multiple customers can order from same QR
                </p>
              </div>
              <div className="text-sm text-gray-500">
                Total: {qrCodes.length} QR code{qrCodes.length !== 1 ? "s" : ""}
              </div>
            </div>

            <Table
              data={qrCodes}
              columns={qrColumns}
              loading={loading}
              emptyText="No QR codes created yet. Create your first takeaway QR code to get started."
            />
          </Card>
        </div>

        {/* Add QR Code Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setNewQRVegOnly(false);
          }}
          title="Create Takeaway QR Code"
          size="sm"
        >
          <form onSubmit={addQRCode} className="space-y-4">
            <FormField
              label="QR Code Type"
              description="Choose whether this QR should only display vegetarian items"
            >
              <div className="space-y-3">
                <label
                  className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                  style={{
                    borderColor: !newQRVegOnly ? "#9333EA" : "#E5E7EB",
                    backgroundColor: !newQRVegOnly ? "#FAF5FF" : "white",
                  }}
                >
                  <input
                    type="radio"
                    name="qrType"
                    checked={!newQRVegOnly}
                    onChange={() => setNewQRVegOnly(false)}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">
                      Regular Takeaway
                    </div>
                    <div className="text-sm text-gray-600">
                      Shows all menu items (veg & non-veg)
                    </div>
                  </div>
                </label>

                <label
                  className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                  style={{
                    borderColor: newQRVegOnly ? "#10B981" : "#E5E7EB",
                    backgroundColor: newQRVegOnly ? "#ECFDF5" : "white",
                  }}
                >
                  <input
                    type="radio"
                    name="qrType"
                    checked={newQRVegOnly}
                    onChange={() => setNewQRVegOnly(true)}
                    className="w-4 h-4 text-green-600"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      🟢 Veg-Only Takeaway
                    </div>
                    <div className="text-sm text-gray-600">
                      Shows only vegetarian items
                    </div>
                  </div>
                </label>
              </div>
            </FormField>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Multiple customers can order simultaneously from the same QR code. Orders will be grouped by customer name in the admin view.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setNewQRVegOnly(false);
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
                Create QR Code
              </Button>
            </div>
          </form>
        </Modal>

        {/* QR Code Modal */}
        <Modal
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setSelectedQR(null);
          }}
          title={`Takeaway ${selectedQR?.is_veg_only ? "Veg-Only" : "Regular"} QR Code`}
          size="sm"
        >
          {selectedQR && (
            <div className="text-center space-y-4">
              <div className="bg-gray-50 p-6 rounded-lg">
                <img
                  src={selectedQR.qr_code_url!}
                  alt={`Takeaway QR Code`}
                  className="w-64 h-64 mx-auto border-2 border-gray-200 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">QR Code:</p>
                <code className="block text-xs bg-gray-100 p-2 rounded font-mono break-all">
                  {selectedQR.qr_code}
                </code>
              </div>

              <div className="flex justify-center space-x-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => copyQRCode(selectedQR.qr_code)}
                  leftIcon={<Copy className="w-4 h-4" />}
                >
                  Copy URL
                </Button>
                <Button
                  variant="primary"
                  onClick={() =>
                    downloadQRCode(
                      selectedQR.qr_code_url!,
                      selectedQR.is_veg_only
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
    </RoleGuard>
  );
}
