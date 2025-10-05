"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Card from "@/components/admin/Card";
import Button from "@/components/admin/Button";
import RoleGuard from "@/components/admin/RoleGuard";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Gift,
  Percent,
  Clock,
  Users,
  Tag,
  ShoppingBag,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  Settings,
  Copy,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import CreateOfferModal from "@/components/admin/offers/CreateOfferModal";
import EditOfferModal from "@/components/admin/offers/EditOfferModal";

type Offer = {
  id: string;
  name: string;
  description: string | null;
  offer_type: string;
  is_active: boolean;
  priority: number | null;
  start_date: string | null;
  end_date: string | null;
  usage_limit: number | null;
  usage_count: number | null;
  conditions: any;
  benefits: any;
  valid_days: string[] | null;
  valid_hours_start: string | null;
  valid_hours_end: string | null;
  target_customer_type: string | null;
  promo_code: string | null;
  image_url: string | null;
  image_path?: string | null;
  min_orders_count?: number | null;
  created_at: string | null;
  updated_at: string | null;
};

const offerTypeConfig = {
  cart_percentage: { icon: Percent, label: "Cart % Discount", color: "blue" },
  cart_flat_amount: { icon: Tag, label: "Cart Flat Discount", color: "green" },
  cart_threshold_item: { icon: Gift, label: "Threshold Item", color: "purple" },
  item_buy_get_free: { icon: ShoppingBag, label: "Buy X Get Y", color: "orange" },
  item_free_addon: { icon: Plus, label: "Free Add-on", color: "teal" },
  item_percentage: { icon: Percent, label: "Item % Discount", color: "pink" },
  time_based: { icon: Clock, label: "Time-based", color: "yellow" },
  customer_based: { icon: Users, label: "Customer Segment", color: "indigo" },
  combo_meal: { icon: ShoppingBag, label: "Combo Meal", color: "red" },
  promo_code: { icon: Tag, label: "Promo Code", color: "gray" },
};

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [offers, statusFilter, typeFilter, searchTerm]);

  const applyFilters = () => {
    let filtered = [...offers];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(offer => 
        statusFilter === "active" ? offer.is_active : !offer.is_active
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(offer => offer.offer_type === typeFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(offer => 
        offer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (offer.description && offer.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (offer.promo_code && offer.promo_code.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredOffers(filtered);
  };

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOfferStatus = async (offerId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("offers")
        .update({ is_active: !isActive })
        .eq("id", offerId);

      if (error) throw error;
      fetchOffers();
    } catch (error) {
      console.error("Error updating offer:", error);
    }
  };

  const deleteOffer = async (offerId: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;

    try {
      const { error } = await supabase
        .from("offers")
        .delete()
        .eq("id", offerId);

      if (error) throw error;
      fetchOffers();
    } catch (error) {
      console.error("Error deleting offer:", error);
    }
  };

  const duplicateOffer = async (offer: Offer) => {
    try {
      const newOffer = {
        ...offer,
        name: `${offer.name} (Copy)`,
        is_active: false // Duplicate as inactive
      };
      delete (newOffer as any).id;
      delete (newOffer as any).created_at;
      delete (newOffer as any).updated_at;
      delete (newOffer as any).usage_count;

      const { error } = await supabase
        .from("offers")
        .insert([newOffer]);

      if (error) throw error;
      fetchOffers();
    } catch (error) {
      console.error("Error duplicating offer:", error);
    }
  };

  const bulkToggleStatus = async (active: boolean) => {
    if (selectedOffers.length === 0) return;

    try {
      const { error } = await supabase
        .from("offers")
        .update({ is_active: active })
        .in("id", selectedOffers);

      if (error) throw error;
      setSelectedOffers([]);
      fetchOffers();
    } catch (error) {
      console.error("Error bulk updating offers:", error);
    }
  };

  const bulkDelete = async () => {
    if (selectedOffers.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedOffers.length} offer(s)?`)) return;

    try {
      const { error } = await supabase
        .from("offers")
        .delete()
        .in("id", selectedOffers);

      if (error) throw error;
      setSelectedOffers([]);
      fetchOffers();
    } catch (error) {
      console.error("Error bulk deleting offers:", error);
    }
  };

  const toggleOfferSelection = (offerId: string) => {
    setSelectedOffers(prev => 
      prev.includes(offerId) 
        ? prev.filter(id => id !== offerId)
        : [...prev, offerId]
    );
  };

  const selectAllOffers = () => {
    setSelectedOffers(
      selectedOffers.length === filteredOffers.length 
        ? [] 
        : filteredOffers.map(offer => offer.id)
    );
  };

  const getOfferBenefitDisplay = (offer: Offer) => {
    const { benefits, offer_type } = offer;
    
    switch (offer_type) {
      case "cart_percentage":
        return `${benefits.discount_percentage}% off`;
      case "cart_flat_amount":
        return `${formatCurrency(benefits.discount_amount)} off`;
      case "cart_threshold_item":
        return `Free ${benefits.free_category || "item"}`;
      case "item_buy_get_free":
        return `Buy ${offer.conditions?.buy_quantity || 1} Get ${benefits.get_quantity || 1}`;
      case "time_based":
        return `${benefits.discount_percentage || benefits.discount_amount}${benefits.discount_percentage ? "%" : ""} off`;
      case "promo_code":
        return offer.promo_code || "Code-based";
      default:
        return "Custom offer";
    }
  };

  const getOfferConditionDisplay = (offer: Offer) => {
    const { conditions, offer_type } = offer;
    
    switch (offer_type) {
      case "cart_percentage":
      case "cart_flat_amount":
        return conditions?.min_amount ? `Min order: ${formatCurrency(conditions.min_amount)}` : "No minimum";
      case "cart_threshold_item":
        return `Min: ${formatCurrency(conditions?.min_amount || 0)} + ${formatCurrency(conditions?.threshold_amount || 0)}`;
      case "time_based":
        if (offer.valid_hours_start && offer.valid_hours_end) {
          return `${offer.valid_hours_start.slice(0, 5)} - ${offer.valid_hours_end.slice(0, 5)}`;
        }
        return "All day";
      case "customer_based":
        return offer.target_customer_type || "All customers";
      default:
        return "Custom conditions";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <RoleGuard requiredRoute="/admin/offers">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
            <h1 className="text-2xl font-bold text-gray-900">Offer Management</h1>
            <p className="text-gray-600 mt-1">
              Create and manage promotional offers for your restaurant
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              leftIcon={<TrendingUp className="w-4 h-4" />}
            >
              Analytics
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Offer
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search offers by name, description, or promo code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="min-w-[150px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="min-w-[200px]">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="cart_percentage">Cart % Discount</option>
                <option value="cart_flat_amount">Cart Flat Discount</option>
                <option value="cart_threshold_item">Threshold Item</option>
                <option value="item_buy_get_free">Buy X Get Y</option>
                <option value="item_free_addon">Free Add-on</option>
                <option value="item_percentage">Item % Discount</option>
                <option value="time_based">Time-based</option>
                <option value="customer_based">Customer Segment</option>
                <option value="combo_meal">Combo Meal</option>
                <option value="promo_code">Promo Code</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(searchTerm || statusFilter !== "all" || typeFilter !== "all") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedOffers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedOffers.length} offer(s) selected
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => bulkToggleStatus(true)}
                    leftIcon={<Eye className="w-4 h-4" />}
                  >
                    Activate
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => bulkToggleStatus(false)}
                    leftIcon={<EyeOff className="w-4 h-4" />}
                  >
                    Deactivate
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={bulkDelete}
                    leftIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Offers</p>
              <p className="text-2xl font-bold text-gray-900">
                {offers.filter(o => o.is_active).length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Gift className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Offers</p>
              <p className="text-2xl font-bold text-gray-900">{offers.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Tag className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Promo Codes</p>
              <p className="text-2xl font-bold text-gray-900">
                {offers.filter(o => o.offer_type === 'promo_code').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Time-based</p>
              <p className="text-2xl font-bold text-gray-900">
                {offers.filter(o => o.offer_type === 'time_based').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Offers List */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedOffers.length === filteredOffers.length && filteredOffers.length > 0}
                onChange={selectAllOffers}
                className="rounded border-gray-300 mr-3"
              />
              <h2 className="text-lg font-medium text-gray-900">
                All Offers ({filteredOffers.length})
              </h2>
            </div>
            {filteredOffers.length > 0 && (
              <div className="text-sm text-gray-500">
                {offers.filter(o => o.is_active).length} active, {offers.filter(o => !o.is_active).length} inactive
              </div>
            )}
          </div>
        </div>
        
        {filteredOffers.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No offers yet</h3>
            <p className="text-gray-500 mb-6">Create your first promotional offer to attract customers.</p>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Your First Offer
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredOffers.map((offer) => {
              const config = offerTypeConfig[offer.offer_type as keyof typeof offerTypeConfig];
              const Icon = config?.icon || Gift;
              const isSelected = selectedOffers.includes(offer.id);
              
              return (
                <div key={offer.id} className={`p-6 ${isSelected ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOfferSelection(offer.id)}
                        className="rounded border-gray-300"
                      />
                      {offer.image_url ? (
                        <img
                          src={offer.image_url}
                          alt={offer.name}
                          className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                        />
                      ) : (
                        <div className={`p-2 bg-${config?.color || 'gray'}-100 rounded-lg`}>
                          <Icon className={`w-6 h-6 text-${config?.color || 'gray'}-600`} />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900">{offer.name}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            offer.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {offer.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {offer.promo_code && (
                            <span className="px-2 py-1 text-xs font-mono bg-blue-100 text-blue-800 rounded">
                              {offer.promo_code}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{offer.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span className="font-medium">{config?.label || offer.offer_type}</span>
                          <span>•</span>
                          <span>{getOfferBenefitDisplay(offer)}</span>
                          <span>•</span>
                          <span>{getOfferConditionDisplay(offer)}</span>
                          {(offer.usage_count || 0) > 0 && (
                            <>
                              <span>•</span>
                              <span>Used {offer.usage_count} times</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleOfferStatus(offer.id, offer.is_active)}
                        leftIcon={offer.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      >
                        {offer.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateOffer(offer)}
                        leftIcon={<Copy className="w-4 h-4" />}
                      >
                        Duplicate
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingOffer(offer)}
                        leftIcon={<Edit className="w-4 h-4" />}
                      >
                        Edit
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteOffer(offer.id)}
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Create Offer Modal */}
      {showCreateModal && (
        <CreateOfferModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchOffers();
          }}
        />
      )}

      {/* Edit Offer Modal */}
      {editingOffer && (
        <EditOfferModal
          offer={editingOffer}
          onClose={() => setEditingOffer(null)}
          onSuccess={() => {
            setEditingOffer(null);
            fetchOffers();
          }}
        />
      )}
      </div>
    </RoleGuard>
  );
}