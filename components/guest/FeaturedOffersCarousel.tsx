"use client";

import { useState, useEffect } from "react";
import { Gift, ChevronRight } from "lucide-react";

interface FeaturedOffersCarouselProps {
  offers: Array<{
    id: string;
    name: string;
    description?: string | null;
    image_url?: string | null;
    offer_type: string;
  }>;
  onViewOffers?: () => void;
}

export function FeaturedOffersCarousel({ offers, onViewOffers }: FeaturedOffersCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter offers that have images and take only top 3
  const featuredOffers = offers.filter(offer => offer.image_url).slice(0, 3);

  // Auto-rotate carousel
  useEffect(() => {
    if (featuredOffers.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredOffers.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [featuredOffers.length]);

  if (featuredOffers.length === 0) return null;

  return (
    <div className="mx-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-gray-900">Special Offers</h3>
        </div>
        {onViewOffers && (
          <button
            onClick={onViewOffers}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Carousel */}
      <div className="relative h-32 rounded-lg overflow-hidden">
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {featuredOffers.map((offer) => (
            <div key={offer.id} className="relative flex-shrink-0 w-full h-full">
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${offer.image_url})`,
                }}
              >
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
              </div>

              {/* Content */}
              <div className="relative z-10 flex items-center h-full p-4">
                <div className="text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      LIMITED
                    </span>
                  </div>
                  <h4 className="font-bold text-lg leading-tight mb-1">
                    {offer.name}
                  </h4>
                  {offer.description && (
                    <p className="text-sm opacity-90 line-clamp-2">
                      {offer.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Click to view offers */}
              {onViewOffers && (
                <button
                  onClick={onViewOffers}
                  className="absolute inset-0 w-full h-full bg-transparent"
                  aria-label={`View offer: ${offer.name}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Indicators */}
        {featuredOffers.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
            {featuredOffers.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  index === currentIndex
                    ? "bg-white w-4"
                    : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}