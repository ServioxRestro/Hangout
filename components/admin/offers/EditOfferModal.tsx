"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { X } from "lucide-react";
import Button from "@/components/admin/Button";
import ImageUpload from "@/components/admin/ImageUpload";

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

interface EditOfferModalProps {
  offer: Offer;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditOfferModal({ offer, onClose, onSuccess }: EditOfferModalProps) {
  const [formData, setFormData] = useState({
    name: offer.name,
    description: offer.description || '',
    is_active: offer.is_active,
    priority: offer.priority,
    start_date: offer.start_date ? offer.start_date.split('T')[0] : '',
    end_date: offer.end_date ? offer.end_date.split('T')[0] : '',
    usage_limit: offer.usage_limit,
    image_url: offer.image_url || ''
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('offers')
        .update({
          name: formData.name,
          description: formData.description || null,
          is_active: formData.is_active,
          priority: formData.priority,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          usage_limit: formData.usage_limit
        })
        .eq('id', offer.id);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error updating offer:', error);
      alert('Failed to update offer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit Offer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Offer Name
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Promotional Image (Optional)
            </label>
            <ImageUpload
              currentImage={formData.image_url}
              onImageChange={(imageUrl) =>
                setFormData(prev => ({ ...prev, image_url: imageUrl || "" }))
              }
              folder="offers"
              maxSizeInMB={5}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usage Limit
              </label>
              <input
                type="number"
                min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.usage_limit || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  usage_limit: e.target.value ? Number(e.target.value) : null 
                }))}
                placeholder="Unlimited"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority (0-10)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.priority || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Offer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}