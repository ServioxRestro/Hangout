import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { cookies } from "next/headers";

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const sessionCookie = request.cookies.get("admin-session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate session data
    try {
      const sessionData = JSON.parse(atob(sessionCookie.value));

      // Check if session is expired
      if (Date.now() > sessionData.exp) {
        return NextResponse.json({ error: "Session expired" }, { status: 401 });
      }

      // Allow super_admin, waiter, and manager roles
      const allowedRoles = ['super_admin', 'waiter', 'manager'];
      if (!allowedRoles.includes(sessionData.role)) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    } catch (err) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const period = searchParams.get("period") || "30d"; // 7d, 30d, 90d, 1y, all

    // Calculate date range
    let dateFilter = "";
    const now = new Date();

    if (startDate && endDate) {
      dateFilter = `created_at >= '${startDate}' AND created_at <= '${endDate}'`;
    } else {
      switch (period) {
        case "7d":
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = `created_at >= '${sevenDaysAgo.toISOString()}'`;
          break;
        case "30d":
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter = `created_at >= '${thirtyDaysAgo.toISOString()}'`;
          break;
        case "90d":
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          dateFilter = `created_at >= '${ninetyDaysAgo.toISOString()}'`;
          break;
        case "1y":
          const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          dateFilter = `created_at >= '${oneYearAgo.toISOString()}'`;
          break;
        case "all":
          dateFilter = "1=1";
          break;
      }
    }

    // Fetch overview metrics
    const [
      revenueData,
      ordersData,
      customersData,
      menuItemsData,
      offersData,
      tablesData,
    ] = await Promise.all([
      fetchRevenueMetrics(dateFilter),
      fetchOrdersMetrics(dateFilter),
      fetchCustomersMetrics(dateFilter),
      fetchMenuMetrics(dateFilter),
      fetchOffersMetrics(dateFilter),
      fetchTablesMetrics(dateFilter),
    ]);

    return NextResponse.json({
      period,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      overview: {
        totalRevenue: revenueData.total,
        totalOrders: ordersData.total,
        totalCustomers: customersData.total,
        averageOrderValue: ordersData.total > 0 ? revenueData.total / ordersData.total : 0,
      },
      revenue: revenueData,
      orders: ordersData,
      customers: customersData,
      menu: menuItemsData,
      offers: offersData,
      tables: tablesData,
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

// Revenue Analytics
async function fetchRevenueMetrics(dateFilter: string) {
  // Total revenue from paid bills
  const { data: bills, error } = await supabase
    .from("bills")
    .select("final_amount, payment_method, created_at, payment_status")
    .eq("payment_status", "paid");

  if (error) throw error;

  const filteredBills = bills?.filter((bill) => {
    if (dateFilter === "1=1") return true;
    if (!bill.created_at) return false;
    const createdAt = new Date(bill.created_at);
    return eval(dateFilter.replace(/created_at/g, `new Date('${bill.created_at}')`));
  }) || [];

  const total = filteredBills.reduce((sum, bill) => sum + Number(bill.final_amount), 0);

  // Group by payment method
  const byPaymentMethod = filteredBills.reduce((acc: any, bill) => {
    const method = bill.payment_method || "unknown";
    acc[method] = (acc[method] || 0) + Number(bill.final_amount);
    return acc;
  }, {});

  // Revenue trend (daily)
  const revenueByDate = filteredBills.reduce((acc: any, bill) => {
    if (!bill.created_at) return acc;
    const date = new Date(bill.created_at).toISOString().split("T")[0];
    acc[date] = (acc[date] || 0) + Number(bill.final_amount);
    return acc;
  }, {});

  const trend = Object.entries(revenueByDate)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total,
    byPaymentMethod,
    trend,
    count: filteredBills.length,
  };
}

// Orders Analytics
async function fetchOrdersMetrics(dateFilter: string) {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, status, order_type, created_at, total_amount");

  if (error) throw error;

  const filteredOrders = orders?.filter((order) => {
    if (dateFilter === "1=1") return true;
    if (!order.created_at) return false;
    return eval(dateFilter.replace(/created_at/g, `new Date('${order.created_at}')`));
  }) || [];

  // Group by status
  const byStatus = filteredOrders.reduce((acc: any, order) => {
    const status = order.status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Group by type
  const byType = filteredOrders.reduce((acc: any, order) => {
    acc[order.order_type] = (acc[order.order_type] || 0) + 1;
    return acc;
  }, {});

  // Orders trend (daily)
  const ordersByDate = filteredOrders.reduce((acc: any, order) => {
    if (!order.created_at) return acc;
    const date = new Date(order.created_at).toISOString().split("T")[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const trend = Object.entries(ordersByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total: filteredOrders.length,
    byStatus,
    byType,
    trend,
    completed: byStatus.paid || 0,
    cancelled: byStatus.cancelled || 0,
  };
}

// Customers Analytics
async function fetchCustomersMetrics(dateFilter: string) {
  const { data: customers, error } = await supabase
    .from("guest_users")
    .select("id, phone, total_orders, total_spent, visit_count, created_at, first_visit_at");

  if (error) throw error;

  const filteredCustomers = customers?.filter((customer) => {
    if (dateFilter === "1=1") return true;
    if (!customer.created_at) return false;
    return eval(dateFilter.replace(/created_at/g, `new Date('${customer.created_at}')`));
  }) || [];

  // New vs returning
  const newCustomers = filteredCustomers.filter((c) => (c.visit_count || 0) === 1).length;
  const returningCustomers = filteredCustomers.filter((c) => (c.visit_count || 0) > 1).length;

  // Top customers by spend
  const topCustomers = [...(customers || [])]
    .sort((a, b) => Number(b.total_spent) - Number(a.total_spent))
    .slice(0, 10)
    .map((c) => ({
      phone: c.phone,
      totalSpent: Number(c.total_spent),
      totalOrders: c.total_orders,
      visitCount: c.visit_count,
    }));

  // Customer acquisition trend
  const customersByDate = filteredCustomers.reduce((acc: any, customer) => {
    const visitDate = customer.first_visit_at || customer.created_at;
    if (!visitDate) return acc;
    const date = new Date(visitDate).toISOString().split("T")[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const trend = Object.entries(customersByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total: filteredCustomers.length,
    new: newCustomers,
    returning: returningCustomers,
    topCustomers,
    trend,
    averageSpend: filteredCustomers.length > 0
      ? filteredCustomers.reduce((sum, c) => sum + Number(c.total_spent), 0) / filteredCustomers.length
      : 0,
  };
}

// Menu Analytics
async function fetchMenuMetrics(dateFilter: string) {
  // Get order items with menu item details
  const { data: orderItems, error } = await supabase
    .from("order_items")
    .select(`
      id,
      quantity,
      total_price,
      menu_item_id,
      created_at,
      menu_items (
        id,
        name,
        category_id,
        is_veg,
        price,
        menu_categories (
          name
        )
      )
    `);

  if (error) throw error;

  const filteredItems = orderItems?.filter((item) => {
    if (dateFilter === "1=1") return true;
    return eval(dateFilter.replace(/created_at/g, `new Date('${item.created_at}')`));
  }) || [];

  // Top selling items
  const itemSales = filteredItems.reduce((acc: any, item) => {
    const menuItem = item.menu_items as any;
    if (!menuItem) return acc;

    const itemId = menuItem.id;
    if (!acc[itemId]) {
      acc[itemId] = {
        name: menuItem.name,
        category: menuItem.menu_categories?.name || "Uncategorized",
        quantity: 0,
        revenue: 0,
        isVeg: menuItem.is_veg,
      };
    }
    acc[itemId].quantity += item.quantity;
    acc[itemId].revenue += Number(item.total_price);
    return acc;
  }, {});

  const topItems = Object.values(itemSales)
    .sort((a: any, b: any) => b.quantity - a.quantity)
    .slice(0, 10);

  // Sales by category
  const categorySales = filteredItems.reduce((acc: any, item) => {
    const menuItem = item.menu_items as any;
    if (!menuItem?.menu_categories) return acc;

    const category = menuItem.menu_categories.name;
    if (!acc[category]) {
      acc[category] = { quantity: 0, revenue: 0 };
    }
    acc[category].quantity += item.quantity;
    acc[category].revenue += Number(item.total_price);
    return acc;
  }, {});

  // Veg vs Non-veg
  const vegNonVeg = filteredItems.reduce(
    (acc: any, item) => {
      const menuItem = item.menu_items as any;
      if (!menuItem) return acc;

      if (menuItem.is_veg) {
        acc.veg.quantity += item.quantity;
        acc.veg.revenue += Number(item.total_price);
      } else {
        acc.nonVeg.quantity += item.quantity;
        acc.nonVeg.revenue += Number(item.total_price);
      }
      return acc;
    },
    { veg: { quantity: 0, revenue: 0 }, nonVeg: { quantity: 0, revenue: 0 } }
  );

  return {
    topItems,
    byCategory: categorySales,
    vegNonVeg,
    totalItemsSold: filteredItems.reduce((sum, item) => sum + item.quantity, 0),
  };
}

// Offers Analytics
async function fetchOffersMetrics(dateFilter: string) {
  const { data: offers, error } = await supabase
    .from("offers")
    .select("id, name, offer_type, usage_count, is_active, created_at");

  if (error) throw error;

  // Get offer usage
  const { data: offerUsage, error: usageError } = await supabase
    .from("offer_usage")
    .select("offer_id, discount_amount, used_at");

  if (usageError) throw usageError;

  const filteredUsage = offerUsage?.filter((usage) => {
    if (dateFilter === "1=1") return true;
    return eval(dateFilter.replace(/created_at/g, `new Date('${usage.used_at}')`));
  }) || [];

  // Calculate metrics per offer
  const offerMetrics = offers?.map((offer) => {
    const usages = filteredUsage.filter((u) => u.offer_id === offer.id);
    const totalDiscount = usages.reduce((sum, u) => sum + Number(u.discount_amount), 0);

    return {
      id: offer.id,
      name: offer.name,
      type: offer.offer_type,
      usageCount: usages.length,
      totalDiscount,
      isActive: offer.is_active,
    };
  });

  // Sort by usage
  const topOffers = offerMetrics
    ?.sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10) || [];

  // Total discount given
  const totalDiscount = filteredUsage.reduce(
    (sum, usage) => sum + Number(usage.discount_amount),
    0
  );

  return {
    totalOffers: offers?.length || 0,
    activeOffers: offers?.filter((o) => o.is_active).length || 0,
    totalUsage: filteredUsage.length,
    totalDiscount,
    topOffers,
  };
}

// Tables Analytics
async function fetchTablesMetrics(dateFilter: string) {
  const { data: sessions, error } = await supabase
    .from("table_sessions")
    .select(`
      id,
      table_id,
      status,
      total_amount,
      created_at,
      session_ended_at,
      restaurant_tables (
        table_number,
        veg_only
      )
    `);

  if (error) throw error;

  const filteredSessions = sessions?.filter((session) => {
    if (dateFilter === "1=1") return true;
    if (!session.created_at) return false;
    return eval(dateFilter.replace(/created_at/g, `new Date('${session.created_at}')`));
  }) || [];

  // Revenue per table
  const tableRevenue = filteredSessions.reduce((acc: any, session) => {
    const table = session.restaurant_tables as any;
    if (!table) return acc;

    const tableNum = table.table_number;
    if (!acc[tableNum]) {
      acc[tableNum] = {
        tableNumber: tableNum,
        sessions: 0,
        revenue: 0,
        isVegOnly: table.veg_only,
      };
    }
    acc[tableNum].sessions += 1;
    acc[tableNum].revenue += Number(session.total_amount || 0);
    return acc;
  }, {});

  const topTables = Object.values(tableRevenue)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 10);

  // Average session duration
  const completedSessions = filteredSessions.filter(
    (s) => s.status === "completed" && s.session_ended_at
  );

  const avgDuration = completedSessions.length > 0
    ? completedSessions.reduce((sum, s) => {
        if (!s.created_at) return sum;
        const start = new Date(s.created_at).getTime();
        const end = new Date(s.session_ended_at!).getTime();
        return sum + (end - start);
      }, 0) / completedSessions.length / (1000 * 60) // in minutes
    : 0;

  return {
    totalSessions: filteredSessions.length,
    activeSessions: filteredSessions.filter((s) => s.status === "active").length,
    topTables,
    averageSessionDuration: Math.round(avgDuration),
  };
}
