"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import FormField from "@/components/admin/FormField";
import Input from "@/components/admin/Input";
import {
  Settings,
  Building2,
  Phone,
  FileText,
  Percent,
  Save,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface RestaurantSetting {
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description: string;
}

interface TaxSetting {
  id: string;
  name: string;
  rate: number;
  is_active: boolean;
  applies_to: string;
  display_order: number;
}

export default function SettingsPage() {
  const [restaurantSettings, setRestaurantSettings] = useState<Record<string, string>>({});
  const [taxSettings, setTaxSettings] = useState<TaxSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    try {
      const response = await fetch("/api/admin/verify", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        window.location.href = "/admin/login";
        return;
      }

      const { user } = await response.json();
      if (user.role === 'waiter') {
        // Waiters don't have access to settings
        window.location.href = "/admin/orders";
        return;
      }

      setCurrentUser(user);
      fetchSettings();
    } catch (error) {
      console.error("Error checking user access:", error);
      window.location.href = "/admin/login";
    }
  };

  const fetchSettings = async () => {
    try {
      // Fetch restaurant settings
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurant_settings")
        .select("*");

      if (restaurantError) throw restaurantError;

      const settingsMap: Record<string, string> = {};
      restaurantData?.forEach((setting: RestaurantSetting) => {
        settingsMap[setting.setting_key] = setting.setting_value;
      });
      setRestaurantSettings(settingsMap);

      // Fetch tax settings
      const { data: taxData, error: taxError } = await supabase
        .from("tax_settings")
        .select("*")
        .order("display_order");

      if (taxError) throw taxError;

      setTaxSettings(taxData || []);
    } catch (error) {
      console.error("Error fetching settings:", error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const updateRestaurantSetting = (key: string, value: string) => {
    setRestaurantSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateTaxSetting = (id: string, field: string, value: any) => {
    setTaxSettings(prev =>
      prev.map(tax =>
        tax.id === id ? { ...tax, [field]: value } : tax
      )
    );
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Save restaurant settings
      for (const [key, value] of Object.entries(restaurantSettings)) {
        const { error } = await supabase
          .from("restaurant_settings")
          .upsert({
            setting_key: key,
            setting_value: value,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'setting_key'
          });

        if (error) throw error;
      }

      // Save tax settings
      for (const taxSetting of taxSettings) {
        const { error } = await supabase
          .from("tax_settings")
          .update({
            name: taxSetting.name,
            rate: taxSetting.rate,
            is_active: taxSetting.is_active,
            applies_to: taxSetting.applies_to,
            updated_at: new Date().toISOString()
          })
          .eq("id", taxSetting.id);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-gray-600">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure restaurant information and billing settings
          </p>
        </div>
        <Button
          variant="primary"
          onClick={saveSettings}
          loading={saving}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save Settings
        </Button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Restaurant Information */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Restaurant Information</h2>
            </div>

            <div className="space-y-4">
              <FormField label="Restaurant Name" required>
                <Input
                  type="text"
                  value={restaurantSettings.restaurant_name || ''}
                  onChange={(e) => updateRestaurantSetting('restaurant_name', e.target.value)}
                  placeholder="Enter restaurant name"
                  leftIcon={<Building2 className="w-4 h-4" />}
                />
              </FormField>

              <FormField label="Address">
                <Input
                  type="text"
                  value={restaurantSettings.restaurant_address || ''}
                  onChange={(e) => updateRestaurantSetting('restaurant_address', e.target.value)}
                  placeholder="Enter restaurant address"
                />
              </FormField>

              <FormField label="Phone Number">
                <Input
                  type="tel"
                  value={restaurantSettings.restaurant_phone || ''}
                  onChange={(e) => updateRestaurantSetting('restaurant_phone', e.target.value)}
                  placeholder="Enter phone number"
                  leftIcon={<Phone className="w-4 h-4" />}
                />
              </FormField>

              <FormField label="GST Number" description="Optional - Leave empty if not applicable">
                <Input
                  type="text"
                  value={restaurantSettings.gst_number || ''}
                  onChange={(e) => updateRestaurantSetting('gst_number', e.target.value)}
                  placeholder="Enter GST number (e.g., 07AABCU9603R1ZX)"
                  leftIcon={<FileText className="w-4 h-4" />}
                />
              </FormField>
            </div>
          </div>
        </Card>

        {/* Tax Configuration */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Percent className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Tax Configuration</h2>
            </div>

            <div className="space-y-4">
              {taxSettings.map((tax) => (
                <div key={tax.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={tax.name}
                        onChange={(e) => updateTaxSetting(tax.id, 'name', e.target.value)}
                        className="font-medium"
                        placeholder="Tax name"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={tax.is_active}
                          onChange={(e) => updateTaxSetting(tax.id, 'is_active', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-600">Active</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Rate (%)">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={tax.rate}
                        onChange={(e) => updateTaxSetting(tax.id, 'rate', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </FormField>

                    <FormField label="Applies To">
                      <select
                        value={tax.applies_to}
                        onChange={(e) => updateTaxSetting(tax.id, 'applies_to', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Items</option>
                        <option value="food">Food Only</option>
                        <option value="beverages">Beverages Only</option>
                      </select>
                    </FormField>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Changes to tax settings will apply to all new bills generated after saving.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Preview Section */}
      <Card className="mt-8">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill Preview</h3>
          <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
            <div className="text-center mb-4">
              <div className="font-bold">{restaurantSettings.restaurant_name || 'Restaurant Name'}</div>
              {restaurantSettings.restaurant_address && (
                <div>{restaurantSettings.restaurant_address}</div>
              )}
              {restaurantSettings.restaurant_phone && (
                <div>Phone: {restaurantSettings.restaurant_phone}</div>
              )}
              {restaurantSettings.gst_number && (
                <div>GST: {restaurantSettings.gst_number}</div>
              )}
            </div>
            <div className="border-t border-gray-300 my-2"></div>
            <div>Bill No: BILL-2024-001</div>
            <div>Date: {new Date().toLocaleDateString()}</div>
            <div>Table: 5</div>
            <div className="border-t border-gray-300 my-2"></div>
            <div>Sample Item         1  ₹100.00  ₹100.00</div>
            <div className="border-t border-gray-300 my-2"></div>
            <div>Subtotal:                      ₹100.00</div>
            {taxSettings.filter(t => t.is_active).map(tax => (
              <div key={tax.id}>
                {tax.name} @ {tax.rate}%: {' '.repeat(Math.max(0, 20 - tax.name.length))} ₹{(100 * tax.rate / 100).toFixed(2)}
              </div>
            ))}
            <div className="border-t border-gray-300 my-2"></div>
            <div className="font-bold">
              TOTAL: {' '.repeat(20)} ₹{(100 + taxSettings.filter(t => t.is_active).reduce((sum, t) => sum + (100 * t.rate / 100), 0)).toFixed(2)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}