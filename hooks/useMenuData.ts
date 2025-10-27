"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type MenuCategory = Tables<"menu_categories">;
type MenuItem = Tables<"menu_items"> & {
  menu_categories: MenuCategory | null;
};

interface MenuData {
  categories: MenuCategory[];
  items: MenuItem[];
}

async function fetchMenuData(tableCode: string, vegOnly?: boolean): Promise<MenuData> {
  // First get table to check veg_only status
  const { data: tableData, error: tableError } = await supabase
    .from("restaurant_tables")
    .select("id, veg_only")
    .eq("table_code", tableCode)
    .eq("is_active", true)
    .single();

  if (tableError || !tableData) {
    throw new Error("Table not found");
  }

  // Fetch categories and items in parallel
  const [categoriesResult, itemsResult] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),

    (async () => {
      const query = supabase
        .from("menu_items")
        .select(`
          id,
          name,
          description,
          price,
          original_price,
          discount_percentage,
          has_discount,
          image_url,
          is_veg,
          category_id,
          display_order,
          menu_categories!inner (
            id,
            name
          )
        `)
        .eq("is_available", true)
        .eq("menu_categories.is_active", true)
        .order("display_order", { ascending: true });

      // If this is a veg-only table, only show vegetarian items
      if (tableData.veg_only || vegOnly) {
        query.eq("is_veg", true);
      }

      return await query;
    })(),
  ]);

  if (categoriesResult.error) {
    throw new Error("Failed to load menu categories");
  }

  if (itemsResult.error) {
    throw new Error("Failed to load menu items");
  }

  return {
    categories: categoriesResult.data || [],
    items: itemsResult.data as MenuItem[],
  };
}

export function useMenuData(tableCode: string, vegOnly?: boolean) {
  return useQuery({
    queryKey: ["menu", tableCode, vegOnly],
    queryFn: () => fetchMenuData(tableCode, vegOnly),
    enabled: !!tableCode,

    // Menu data doesn't change often - cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,

    // Only refetch on mount and window focus
    refetchOnWindowFocus: true,
    refetchOnReconnect: false,
    refetchInterval: false,
  });
}
