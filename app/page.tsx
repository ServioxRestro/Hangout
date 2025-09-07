export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to{" "}
          {process.env.NEXT_PUBLIC_RESTAURANT_NAME || "Hangout Restaurant"}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Scan the QR code at your table to view the menu and place your order
        </p>
      </div>
    </div>
  );
}
