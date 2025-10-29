"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import { GuestLayout } from "@/components/guest/GuestLayout";
import { OffersCarousel } from "@/components/guest/OffersCarousel";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { OfferDetailCard } from "@/components/guest/OfferDetailCard";
import { Package, Gift } from "lucide-react";

type Offer = Tables<"offers"> & {
  offer_items?: Array<
    Tables<"offer_items"> & {
      menu_items: Tables<"menu_items"> | null;
      menu_categories: Tables<"menu_categories"> | null;
    }
  >;
  combo_meals?: Array<
    Tables<"combo_meals"> & {
      combo_meal_items?: Array<
        Tables<"combo_meal_items"> & {
          menu_items: Tables<"menu_items"> | null;
          menu_categories: Tables<"menu_categories"> | null;
        }
      >;
    }
  >;
};

const isOfferValid = (offer: Offer) => {
  const now = new Date();

  // Check date validity
  if (offer.start_date && new Date(offer.start_date) > now) return false;
  if (offer.end_date && new Date(offer.end_date) < now) return false;

  // Check time validity
  if (offer.valid_hours_start && offer.valid_hours_end) {
    const currentTime = now.toTimeString().slice(0, 5);
    if (
      currentTime < offer.valid_hours_start ||
      currentTime > offer.valid_hours_end
    ) {
      return false;
    }
  }

  // Check day validity
  if (offer.valid_days && offer.valid_days.length > 0) {
    const currentDay = now
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    if (!offer.valid_days.includes(currentDay)) return false;
  }

  return true;
};

export default function TakeawayOffersPage() {
  const params = useParams();
  const qrCode = params?.qrCode as string;

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const { data: offersData, error: offersError } = await supabase
        .from("offers")
        .select(
          `
          *,
          offer_items (
            *,
            menu_items (*),
            menu_categories (*)
          ),
          combo_meals (
            *,
            combo_meal_items (
              *,
              menu_items (*),
              menu_categories (*)
            )
          )
        `
        )
        .eq("is_active", true)
        .eq("enabled_for_takeaway", true)
        .order("priority", { ascending: false });

      if (offersError) {
        throw new Error(offersError.message);
      }

      // Filter valid offers
      const validOffers = (offersData as Offer[])?.filter(isOfferValid) || [];
      setOffers(validOffers);
    } catch (error: any) {
      console.error("Error fetching offers:", error);
      setError(error.message || "Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GuestLayout showNavigation={false}>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner text="Loading offers..." />
        </div>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Gift className="w-6 h-6 text-purple-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Special Offers
              </h1>
              <p className="text-sm text-gray-600">Great deals just for you</p>
            </div>
          </div>
          <span className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Package className="w-3 h-3" />
            TAKEAWAY
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Offers Carousel */}
        {!error && offers.length > 0 && <OffersCarousel offers={offers} />}

        {error ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Failed to load offers
            </h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <Button variant="primary" onClick={fetchOffers}>
              Try Again
            </Button>
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No offers available
            </h3>
            <p className="text-gray-500 mb-6">
              Check back later for exciting deals and promotions
            </p>
            <Button
              variant="primary"
              onClick={() => (window.location.href = `/takeaway/${qrCode}`)}
            >
              Browse Menu
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <OfferDetailCard
                key={offer.id}
                offer={offer}
                onOrderNow={() =>
                  (window.location.href = `/takeaway/${qrCode}`)
                }
              />
            ))}
          </div>
        )}
      </div>
    </GuestLayout>
  );
}
