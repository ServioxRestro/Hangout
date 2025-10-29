import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

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

      // Only super_admin can access analytics
      if (sessionData.role !== 'super_admin') {
        return NextResponse.json({ error: "Insufficient permissions - Analytics requires Super Admin role" }, { status: 403 });
      }
    } catch (err) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const period = searchParams.get("period") || "30d"; // 7d, 30d, 90d, 1y, all

    // Calculate date range
    let startDateStr: string | null = null;
    let endDateStr: string | null = null;
    const now = new Date();

    if (startDate && endDate) {
      startDateStr = startDate;
      endDateStr = endDate;
    } else {
      let daysBack = 30;
      switch (period) {
        case "7d":
          daysBack = 7;
          break;
        case "30d":
          daysBack = 30;
          break;
        case "90d":
          daysBack = 90;
          break;
        case "1y":
          daysBack = 365;
          break;
        case "all":
          daysBack = 0; // No filter
          break;
      }

      if (daysBack > 0) {
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - daysBack);
        startDateStr = startDate.toISOString();
        endDateStr = now.toISOString();
      }
    }

    // Fetch all analytics data in parallel using optimized queries
    const [
      revenueData,
      ordersData,
      customersData,
      menuItemsData,
      offersData,
      tablesData,
    ] = await Promise.all([
      fetchRevenueMetrics(startDateStr, endDateStr),
      fetchOrdersMetrics(startDateStr, endDateStr),
      fetchCustomersMetrics(startDateStr, endDateStr),
      fetchMenuMetrics(startDateStr, endDateStr),
      fetchOffersMetrics(startDateStr, endDateStr),
      fetchTablesMetrics(startDateStr, endDateStr),
    ]);

    return NextResponse.json({
      period,
      startDate: startDateStr || undefined,
      endDate: endDateStr || undefined,
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

// Revenue Analytics - Optimized with Supabase filtering
async function fetchRevenueMetrics(startDate: string | null, endDate: string | null) {
  let query = supabase
    .from("bills")
    .select("final_amount, payment_method, created_at, payment_status")
    .eq("payment_status", "paid");

  // Apply date filtering at database level
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data: bills, error } = await query;

  if (error) throw error;

  const total = bills?.reduce((sum, bill) => sum + Number(bill.final_amount), 0) || 0;

  // Group by payment method
  const byPaymentMethod = bills?.reduce((acc: any, bill) => {
    const method = bill.payment_method || "unknown";
    acc[method] = (acc[method] || 0) + Number(bill.final_amount);
    return acc;
  }, {}) || {};

  // Revenue trend (daily)
  const revenueByDate = bills?.reduce((acc: any, bill) => {
    if (!bill.created_at) return acc;
    const date = new Date(bill.created_at).toISOString().split("T")[0];
    acc[date] = (acc[date] || 0) + Number(bill.final_amount);
    return acc;
  }, {}) || {};

  const trend = Object.entries(revenueByDate)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total,
    byPaymentMethod,
    trend,
    count: bills?.length || 0,
  };
}

// Orders Analytics - Optimized with Supabase filtering
async function fetchOrdersMetrics(startDate: string | null, endDate: string | null) {
  let query = supabase
    .from("orders")
    .select("id, status, order_type, created_at, total_amount");

  // Apply date filtering at database level
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data: orders, error } = await query;

  if (error) throw error;

  // Group by status
  const byStatus = orders?.reduce((acc: any, order) => {
    const status = order.status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {}) || {};

  // Group by type
  const byType = orders?.reduce((acc: any, order) => {
    acc[order.order_type] = (acc[order.order_type] || 0) + 1;
    return acc;
  }, {}) || {};

  // Orders trend (daily)
  const ordersByDate = orders?.reduce((acc: any, order) => {
    if (!order.created_at) return acc;
    const date = new Date(order.created_at).toISOString().split("T")[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {}) || {};

  const trend = Object.entries(ordersByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total: orders?.length || 0,
    byStatus,
    byType,
    trend,
    completed: byStatus.paid || 0,
    cancelled: byStatus.cancelled || 0,
  };
}

// Customers Analytics - Optimized with Supabase filtering
async function fetchCustomersMetrics(startDate: string | null, endDate: string | null) {
  let query = supabase
    .from("guest_users")
    .select("id, phone, total_orders, total_spent, visit_count, created_at, first_visit_at");

  // Apply date filtering at database level
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data: customers, error } = await query;

  if (error) throw error;

  // New vs returning
  const newCustomers = customers?.filter((c) => (c.visit_count || 0) === 1).length || 0;
  const returningCustomers = customers?.filter((c) => (c.visit_count || 0) > 1).length || 0;

  // Top customers by spend (from all customers, not just filtered)
  const { data: allCustomers } = await supabase
    .from("guest_users")
    .select("phone, total_spent, total_orders, visit_count")
    .order("total_spent", { ascending: false })
    .limit(10);

  const topCustomers = allCustomers?.map((c) => ({
    phone: c.phone,
    totalSpent: Number(c.total_spent),
    totalOrders: c.total_orders || 0,
    visitCount: c.visit_count || 0,
  })) || [];

  // Customer acquisition trend
  const customersByDate = customers?.reduce((acc: any, customer) => {
    const visitDate = customer.first_visit_at || customer.created_at;
    if (!visitDate) return acc;
    const date = new Date(visitDate).toISOString().split("T")[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {}) || {};

  const trend = Object.entries(customersByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalSpent = customers?.reduce((sum, c) => sum + Number(c.total_spent || 0), 0) || 0;
  const averageSpend = customers && customers.length > 0 ? totalSpent / customers.length : 0;

  return {
    total: customers?.length || 0,
    new: newCustomers,
    returning: returningCustomers,
    topCustomers,
    trend,
    averageSpend,
  };
}

// Menu Analytics - Optimized with Supabase filtering
async function fetchMenuMetrics(startDate: string | null, endDate: string | null) {
  let query = supabase
    .from("order_items")
    .select(`
      id,
      quantity,
      total_price,
      menu_item_id,
      created_at,
      menu_items!inner (
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

  // Apply date filtering at database level
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data: orderItems, error } = await query;

  if (error) throw error;

  // Top selling items
  const itemSales = orderItems?.reduce((acc: any, item) => {
    const menuItem = item.menu_items as any;
    if (!menuItem) return acc;

    const itemId = menuItem.id;
    if (!acc[itemId]) {
      acc[itemId] = {
        id: itemId,
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
  }, {}) || {};

  const topItems = Object.values(itemSales)
    .sort((a: any, b: any) => b.quantity - a.quantity)
    .slice(0, 10);

  // Sales by category
  const categorySales = orderItems?.reduce((acc: any, item) => {
    const menuItem = item.menu_items as any;
    if (!menuItem?.menu_categories) return acc;

    const category = menuItem.menu_categories.name;
    if (!acc[category]) {
      acc[category] = { quantity: 0, revenue: 0 };
    }
    acc[category].quantity += item.quantity;
    acc[category].revenue += Number(item.total_price);
    return acc;
  }, {}) || {};

  // Veg vs Non-veg
  const vegNonVeg = orderItems?.reduce(
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
  ) || { veg: { quantity: 0, revenue: 0 }, nonVeg: { quantity: 0, revenue: 0 } };

  const totalItemsSold = orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalRevenue = orderItems?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0;

  return {
    topItems,
    byCategory: categorySales,
    vegNonVeg,
    totalItemsSold,
    totalRevenue,
  };
}

// Offers Analytics - Optimized with Supabase filtering
async function fetchOffersMetrics(startDate: string | null, endDate: string | null) {
  // Get all offers (including inactive ones for historical data)
  const { data: offers, error } = await supabase
    .from("offers")
    .select("id, name, offer_type, usage_count, is_active, created_at");

  if (error) throw error;

  // Get offer usage with date filtering
  // Use LEFT JOIN to include usage even if offer was deleted
  let usageQuery = supabase
    .from("offer_usage")
    .select("offer_id, discount_amount, used_at, offers(name)");

  if (startDate) {
    usageQuery = usageQuery.gte("used_at", startDate);
  }
  if (endDate) {
    usageQuery = usageQuery.lte("used_at", endDate);
  }

  const { data: offerUsage, error: usageError } = await usageQuery;

  if (usageError) throw usageError;

  // Create a map of offer IDs to names from existing offers
  const offerMap = new Map(offers?.map(o => [o.id, o]) || []);

  // Calculate metrics per offer (including deleted offers with usage)
  const offerMetrics: Array<{
    id: string;
    name: string;
    type: string;
    usageCount: number;
    totalDiscount: number;
    isActive: boolean;
  }> = [];

  // Add metrics for existing offers
  offers?.forEach((offer) => {
    const usages = offerUsage?.filter((u) => u.offer_id === offer.id) || [];
    const totalDiscount = usages.reduce((sum, u) => sum + Number(u.discount_amount), 0);

    offerMetrics.push({
      id: offer.id,
      name: offer.name,
      type: offer.offer_type,
      usageCount: usages.length,
      totalDiscount,
      isActive: offer.is_active,
    });
  });

  // Add metrics for deleted offers that have usage
  const deletedOfferUsage = offerUsage?.filter(u => !offerMap.has(u.offer_id)) || [];
  const deletedOfferIds = new Set(deletedOfferUsage.map(u => u.offer_id));

  deletedOfferIds.forEach((offerId) => {
    const usages = deletedOfferUsage.filter(u => u.offer_id === offerId);
    const totalDiscount = usages.reduce((sum, u) => sum + Number(u.discount_amount), 0);
    // Try to get name from first usage record, fallback to "Deleted Offer"
    const offerName = usages[0]?.offers?.name || "Deleted Offer";

    offerMetrics.push({
      id: offerId,
      name: `${offerName} (Deleted)`,
      type: "unknown",
      usageCount: usages.length,
      totalDiscount,
      isActive: false,
    });
  });

  // Sort by usage
  const byOffer = offerMetrics
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10);

  // Total discount given
  const totalDiscount = offerUsage?.reduce(
    (sum, usage) => sum + Number(usage.discount_amount),
    0
  ) || 0;

  return {
    totalOffers: offers?.length || 0,
    activeOffers: offers?.filter((o) => o.is_active).length || 0,
    totalUsage: offerUsage?.length || 0,
    totalDiscount,
    byOffer,
  };
}

// Tables Analytics - Optimized with Supabase filtering
async function fetchTablesMetrics(startDate: string | null, endDate: string | null) {
  let query = supabase
    .from("table_sessions")
    .select(`
      id,
      table_id,
      status,
      total_amount,
      created_at,
      session_ended_at,
      session_started_at,
      restaurant_tables!inner (
        id,
        table_number,
        table_code,
        veg_only
      )
    `);

  // Apply date filtering at database level
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data: sessions, error } = await query;

  if (error) throw error;

  // Revenue per table
  const tableMetrics = sessions?.reduce((acc: any, session) => {
    const table = session.restaurant_tables as any;
    if (!table) return acc;

    const tableNum = table.table_number;
    const tableCode = table.table_code;
    
    if (!acc[tableNum]) {
      acc[tableNum] = {
        tableNumber: tableNum,
        tableCode: tableCode,
        sessions: 0,
        revenue: 0,
        totalDuration: 0,
        completedSessions: 0,
        isVegOnly: table.veg_only,
      };
    }
    
    acc[tableNum].sessions += 1;
    acc[tableNum].revenue += Number(session.total_amount || 0);

    // Calculate duration for completed sessions
    if (session.status === "completed" && session.session_ended_at && session.session_started_at) {
      const start = new Date(session.session_started_at).getTime();
      const end = new Date(session.session_ended_at).getTime();
      acc[tableNum].totalDuration += (end - start) / (1000 * 60); // in minutes
      acc[tableNum].completedSessions += 1;
    }
    
    return acc;
  }, {}) || {};

  // Calculate average duration and prepare top tables
  const topTables = Object.values(tableMetrics)
    .map((t: any) => ({
      tableNumber: t.tableNumber,
      tableCode: t.tableCode,
      sessions: t.sessions,
      revenue: t.revenue,
      averageSessionDuration: t.completedSessions > 0 
        ? Math.round(t.totalDuration / t.completedSessions)
        : 0,
    }))
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 10);

  // Prepare data for byTable (all tables with metrics)
  const byTable = Object.values(tableMetrics).map((t: any) => ({
    tableNumber: t.tableNumber,
    sessions: t.sessions,
    revenue: t.revenue,
  }));

  // Calculate overall average session duration
  const completedSessions = sessions?.filter(
    (s) => s.status === "completed" && s.session_ended_at && s.session_started_at
  ) || [];

  const avgDuration = completedSessions.length > 0
    ? completedSessions.reduce((sum, s) => {
        const start = new Date(s.session_started_at!).getTime();
        const end = new Date(s.session_ended_at!).getTime();
        return sum + (end - start);
      }, 0) / completedSessions.length / (1000 * 60) // in minutes
    : 0;

  const totalRevenue = sessions?.reduce((sum, s) => sum + Number(s.total_amount || 0), 0) || 0;

  return {
    totalSessions: sessions?.length || 0,
    activeSessions: sessions?.filter((s) => s.status === "active").length || 0,
    completedSessions: completedSessions.length,
    topTables,
    byTable,
    averageSessionDuration: Math.round(avgDuration),
    totalRevenue,
  };
}

