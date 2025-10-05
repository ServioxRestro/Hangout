"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Gift } from "lucide-react";

interface OfferCarouselProps {
  offers: Array<{
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    offer_type: string;
  }>;
}

export function OffersCarousel({ offers }: OfferCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter offers that have images
  const offersWithImages = offers.filter(offer => offer.image_url);

  // Auto-rotate carousel
  useEffect(() => {
    if (offersWithImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % offersWithImages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [offersWithImages.length]);

  if (offersWithImages.length === 0) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % offersWithImages.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + offersWithImages.length) % offersWithImages.length);
  };

  return (
    <div className="relative mb-6">
      {/* Carousel Container */}
      <div className="relative h-48 md:h-56 rounded-xl overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg">
        {/* Current Offer */}
        <div
          className="absolute inset-0 transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          <div className="flex h-full">
            {offersWithImages.map((offer, index) => (
              <div key={offer.id} className="relative flex-shrink-0 w-full h-full">
                {/* Background Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${offer.image_url})`,
                  }}
                >
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-40" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex items-center h-full p-6">
                  <div className="max-w-md text-white">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                      <span className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                        Special Offer
                      </span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold mb-2 leading-tight">
                      {offer.name}
                    </h3>
                    {offer.description && (
                      <p className="text-sm md:text-base opacity-90 leading-relaxed">
                        {offer.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows */}
        {offersWithImages.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all duration-200"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all duration-200"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </>
        )}

        {/* Indicators */}
        {offersWithImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {offersWithImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentIndex
                    ? "bg-white w-6"
                    : "bg-white bg-opacity-50 hover:bg-opacity-75"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Offer Counter */}
      {offersWithImages.length > 1 && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm">
          {currentIndex + 1} / {offersWithImages.length}
        </div>
      )}
    </div>
  );
}