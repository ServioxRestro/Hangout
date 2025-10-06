"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import PageHeader from "@/components/admin/PageHeader";
import Card from "@/components/admin/Card";
import Table from "@/components/admin/Table";
import Button from "@/components/admin/Button";
import {
  Download,
  Search,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Bell,
  DollarSign,
  User,
  Hash,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";

type Order = Tables<"orders"> & {
  restaurant_tables: Tables<"restaurant_tables"> | null;
  order_items: Array<
    Tables<"order_items"> & {
      menu_items: Tables<"menu_items"> | null;
    }
  >;
};

type FilterStatus =
  | "all"
  | "placed"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "paid"
  | "cancelled";

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("today");

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, searchTerm, dateFilter]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          restaurant_tables (
            id,
            table_number,
            table_code
          ),
          order_items (
            id,
            quantity,
            unit_price,
            total_price,
            menu_items (
              id,
              name,
              price,
              is_veg
            )
          ),
          created_by_admin:admin!orders_created_by_admin_fkey (
            id,
            email
          ),
          created_by_staff:staff!orders_created_by_staff_fkey (
            id,
            email,
            name
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        return;
      }

      setOrders(data as any);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.customer_phone?.includes(searchTerm) ||
          order.customer_email?.includes(searchTerm) ||
          order.restaurant_tables?.table_number
            .toString()
            .includes(searchTerm) ||
          order.id.includes(searchTerm)
      );
    }

    // Date filter
    const now = new Date();
    if (dateFilter === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(
        (order) => new Date(order.created_at || "") >= today
      );
    } else if (dateFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(
        (order) => new Date(order.created_at || "") >= weekAgo
      );
    } else if (dateFilter === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(
        (order) => new Date(order.created_at || "") >= monthAgo
      );
    }

    setFilteredOrders(filtered);
  };

  const getCreatorInfo = (order: any) => {
    if (order.created_by_type === 'admin' && order.created_by_admin) {
      return {
        type: 'Admin',
        name: order.created_by_admin.email,
        icon: '👑'
      };
    } else if (order.created_by_type === 'staff' && order.created_by_staff) {
      return {
        type: 'Staff',
        name: order.created_by_staff.name || order.created_by_staff.email,
        icon: '👤'
      };
    } else {
      return {
        type: 'System',
        name: 'Unknown',
        icon: '🤖'
      };
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      placed: {
        color: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Clock,
      },
      preparing: {
        color: "bg-yellow-50 text-yellow-700 border-yellow-200",
        icon: AlertCircle,
      },
      ready: {
        color: "bg-orange-50 text-orange-700 border-orange-200",
        icon: Bell,
      },
      served: {
        color: "bg-green-50 text-green-700 border-green-200",
        icon: CheckCircle,
      },
      completed: {
        color: "bg-gray-50 text-gray-700 border-gray-200",
        icon: CheckCircle,
      },
      paid: {
        color: "bg-purple-50 text-purple-700 border-purple-200",
        icon: CheckCircle,
      },
      cancelled: {
        color: "bg-red-50 text-red-700 border-red-200",
        icon: X,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.placed;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {status || "placed"}
      </span>
    );
  };

  const exportOrders = () => {
    // Create CSV content
    const headers = [
      "Order ID",
      "Date",
      "Table",
      "Customer Phone",
      "Items",
      "Total Amount",
      "Status",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredOrders.map((order) =>
        [
          order.id,
          new Date(order.created_at || "").toLocaleDateString(),
          order.restaurant_tables ? `Table ${order.restaurant_tables.table_number}` : "Takeaway",
          order.customer_phone || "",
          order.order_items.length + " items",
          `${formatCurrency(order.total_amount)}`,
          order.status || "placed",
        ].join(",")
      ),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-history-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const orderColumns = [
    {
      key: "id",
      title: "Order",
      render: (id: string, record: Order) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <Hash className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">#{id.slice(-6)}</div>
            <div className="text-xs text-gray-500">
              {new Date(record.created_at || "").toLocaleDateString()}{" "}
              {new Date(record.created_at || "").toLocaleTimeString()}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "table_info",
      title: "Table",
      render: (_: any, record: Order) => (
        <div className="text-center">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-1">
            <span className="font-bold text-sm">
              {record.restaurant_tables?.table_number || "📦"}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {record.restaurant_tables ?
              `Table ${record.restaurant_tables.table_number}` :
              "Takeaway"
            }
          </div>
        </div>
      ),
    },
    {
      key: "customer_phone",
      title: "Customer",
      render: (phone: string, record: Order) => (
        <div className="flex items-center">
          <User className="w-4 h-4 text-gray-400 mr-2" />
          <div>
            <div className="font-medium text-gray-900">{phone || "N/A"}</div>
            {record.customer_email && (
              <div className="text-xs text-gray-500">
                {record.customer_email}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "items",
      title: "Items",
      render: (_: any, record: Order) => (
        <div>
          <div className="font-medium">
            {record.order_items.length} item
            {record.order_items.length !== 1 ? "s" : ""}
          </div>
          <div className="text-xs text-gray-500">
            {record.order_items
              .slice(0, 2)
              .map((item) => item.menu_items?.name)
              .join(", ")}
            {record.order_items.length > 2 &&
              ` +${record.order_items.length - 2} more`}
          </div>
        </div>
      ),
    },
    {
      key: "total_amount",
      title: "Total",
      render: (amount: number) => (
        <div className="flex items-center font-semibold text-green-600">
          <DollarSign className="w-4 h-4 mr-1" />
          {formatCurrency(amount)}
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (status: string) => getStatusBadge(status),
    },
    {
      key: "creator",
      title: "Created By",
      render: (_: any, record: Order) => {
        const creator = getCreatorInfo(record);
        return (
          <div className="flex items-center">
            <span className="mr-2">{creator.icon}</span>
            <div>
              <div className="text-xs text-gray-500">{creator.type}</div>
              <div className="font-medium text-gray-900 text-sm">{creator.name}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: "actions",
      title: "Actions",
      render: (_: any, record: Order) => (
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Eye className="w-3 h-3" />}
          onClick={() => {
            // TODO: Implement order details modal
            alert(`Order details for #${record.id.slice(-6)}`);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Order History"
        description="View and analyze past orders"
        breadcrumbs={[
          { name: "Dashboard", href: "/admin/dashboard" },
          { name: "Orders", href: "/admin/orders" },
          { name: "History" },
        ]}
      >
        <Button
          variant="secondary"
          onClick={exportOrders}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Export CSV
        </Button>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Phone, email, table..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as FilterStatus)
                }
                className="block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="placed">Placed</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="served">Served</option>
                <option value="completed">Completed</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="flex items-end">
              <div className="text-sm text-gray-500">
                Showing {filteredOrders.length} of {orders.length} orders
              </div>
            </div>
          </div>
        </Card>

        {/* Orders Table */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Order History
              </h2>
              <p className="text-sm text-gray-500">
                Complete history of all restaurant orders
              </p>
            </div>
          </div>

          <Table
            data={filteredOrders}
            columns={orderColumns}
            loading={loading}
            emptyText="No orders found matching your criteria."
          />
        </Card>
      </div>
    </div>
  );
}