/**
 * Client-Side Offer Creation & Edit Test
 * Tests all valid offer types from the UI perspective
 * Simulates form submission data matching the actual UI
 */

const { createClient } = require("@supabase/supabase-js");
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/"/g, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/"/g, '');

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Get sample menu items
let menuItems = [];
let menuCategories = [];

async function fetchMenuData() {
  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name")
    .limit(3);
  
  const { data: items } = await supabase
    .from("menu_items")
    .select("id, name, price, is_veg")
    .eq("is_available", true)
    .limit(5);
  
  menuCategories = categories || [];
  menuItems = items || [];
  
  console.log(`📦 Loaded ${menuItems.length} menu items and ${menuCategories.length} categories\n`);
}

// Test cases matching UI offer types and database constraints
const testCases = [
  {
    offerType: "cart_percentage",
    name: "UI Test - 10% Cart Discount",
    formData: {
      name: "UI Test - 10% Cart Discount",
      description: "Get 10% off on orders above ₹500",
      image_url: "",
      is_active: true,
      priority: 5,
      start_date: "",
      end_date: "",
      usage_limit: "",
      promo_code: "",
      valid_days: [],
      valid_hours_start: "",
      valid_hours_end: "",
      target_customer_type: "all",
      discount_percentage: "10",
      discount_amount: "",
      max_discount_amount: "100",
      max_price: "",
      buy_quantity: "",
      get_quantity: "",
      get_same_item: false,
      free_category: "",
      combo_price: "",
      is_customizable: false,
      min_amount: "500",
      threshold_amount: "",
      min_quantity: "",
      min_orders_count: "",
    },
    selectedItems: [],
    selectedFreeAddonItems: [],
    expectedBenefits: {
      discount_percentage: 10,
      max_discount_amount: 100,
    },
    expectedConditions: {
      min_amount: 500,
    },
  },
  {
    offerType: "cart_flat_amount",
    name: "UI Test - ₹50 Flat Discount",
    formData: {
      name: "UI Test - ₹50 Flat Discount",
      description: "Flat ₹50 off on orders above ₹300",
      image_url: "",
      is_active: true,
      priority: 5,
      start_date: "",
      end_date: "",
      usage_limit: "",
      promo_code: "",
      valid_days: [],
      valid_hours_start: "",
      valid_hours_end: "",
      target_customer_type: "all",
      discount_percentage: "",
      discount_amount: "50",
      max_discount_amount: "",
      max_price: "",
      buy_quantity: "",
      get_quantity: "",
      get_same_item: false,
      free_category: "",
      combo_price: "",
      is_customizable: false,
      min_amount: "300",
      threshold_amount: "",
      min_quantity: "",
      min_orders_count: "",
    },
    selectedItems: [],
    selectedFreeAddonItems: [],
    expectedBenefits: {
      discount_amount: 50,
    },
    expectedConditions: {
      min_amount: 300,
    },
  },
  {
    offerType: "item_buy_get_free",
    name: "UI Test - BOGO",
    formData: {
      name: "UI Test - BOGO",
      description: "Buy 2 Get 1 Free",
      image_url: "",
      is_active: true,
      priority: 5,
      start_date: "",
      end_date: "",
      usage_limit: "",
      promo_code: "",
      valid_days: [],
      valid_hours_start: "",
      valid_hours_end: "",
      target_customer_type: "all",
      discount_percentage: "",
      discount_amount: "",
      max_discount_amount: "",
      max_price: "",
      buy_quantity: "2",
      get_quantity: "1",
      get_same_item: false,
      free_category: "",
      combo_price: "",
      is_customizable: false,
      min_amount: "",
      threshold_amount: "",
      min_quantity: "",
      min_orders_count: "",
    },
    selectedItems: [], // Will be populated with actual menu items
    selectedFreeAddonItems: [],
    requiresItems: true,
    itemTypes: ["buy", "get"],
    expectedBenefits: {
      buy_quantity: 2,
      get_quantity: 1,
      get_same_item: false,
    },
  },
  {
    offerType: "cart_threshold_item",
    name: "UI Test - Free Item on ₹1000",
    formData: {
      name: "UI Test - Free Item on ₹1000",
      description: "Get free item when cart exceeds ₹1000",
      image_url: "",
      is_active: true,
      priority: 5,
      start_date: "",
      end_date: "",
      usage_limit: "",
      promo_code: "",
      valid_days: [],
      valid_hours_start: "",
      valid_hours_end: "",
      target_customer_type: "all",
      discount_percentage: "",
      discount_amount: "",
      max_discount_amount: "",
      max_price: "",
      buy_quantity: "",
      get_quantity: "",
      get_same_item: false,
      free_category: "",
      combo_price: "",
      is_customizable: false,
      min_amount: "",
      threshold_amount: "1000",
      min_quantity: "",
      min_orders_count: "",
    },
    selectedItems: [], // Will be populated
    selectedFreeAddonItems: [],
    requiresItems: true,
    itemTypes: ["get_free"],
    expectedConditions: {
      threshold_amount: 1000,
    },
  },
  {
    offerType: "item_free_addon",
    name: "UI Test - Free Addon",
    formData: {
      name: "UI Test - Free Addon",
      description: "Buy item and get free addon",
      image_url: "",
      is_active: true,
      priority: 5,
      start_date: "",
      end_date: "",
      usage_limit: "",
      promo_code: "",
      valid_days: [],
      valid_hours_start: "",
      valid_hours_end: "",
      target_customer_type: "all",
      discount_percentage: "",
      discount_amount: "",
      max_discount_amount: "",
      max_price: "",
      buy_quantity: "",
      get_quantity: "",
      get_same_item: false,
      free_category: "",
      combo_price: "",
      is_customizable: false,
      min_amount: "",
      threshold_amount: "",
      min_quantity: "",
      min_orders_count: "",
    },
    selectedItems: [], // Buy items
    selectedFreeAddonItems: [], // Free addon items
    requiresItems: true,
    requiresFreeAddon: true,
    itemTypes: ["buy", "free_addon"],
  },
  {
    offerType: "combo_meal",
    name: "UI Test - Combo Meal",
    formData: {
      name: "UI Test - Combo Meal",
      description: "3-Item Combo",
      image_url: "",
      is_active: true,
      priority: 5,
      start_date: "",
      end_date: "",
      usage_limit: "",
      promo_code: "",
      valid_days: [],
      valid_hours_start: "",
      valid_hours_end: "",
      target_customer_type: "all",
      discount_percentage: "",
      discount_amount: "",
      max_discount_amount: "",
      max_price: "",
      buy_quantity: "",
      get_quantity: "",
      get_same_item: false,
      free_category: "",
      combo_price: "299",
      is_customizable: true,
      min_amount: "",
      threshold_amount: "",
      min_quantity: "",
      min_orders_count: "",
    },
    selectedItems: [], // Will be populated
    selectedFreeAddonItems: [],
    requiresItems: true,
    isCombo: true,
    expectedBenefits: {
      combo_price: 299,
      is_customizable: true,
    },
  },
  {
    offerType: "promo_code",
    name: "UI Test - Promo Code",
    formData: {
      name: "UI Test - Promo Code",
      description: "Use code SAVE20 for discount",
      image_url: "",
      is_active: true,
      priority: 5,
      start_date: "",
      end_date: "",
      usage_limit: "100",
      promo_code: "SAVE20",
      valid_days: ["monday", "tuesday", "wednesday"],
      valid_hours_start: "10:00",
      valid_hours_end: "22:00",
      target_customer_type: "all",
      discount_percentage: "20",
      discount_amount: "",
      max_discount_amount: "200",
      max_price: "",
      buy_quantity: "",
      get_quantity: "",
      get_same_item: false,
      free_category: "",
      combo_price: "",
      is_customizable: false,
      min_amount: "500",
      threshold_amount: "",
      min_quantity: "",
      min_orders_count: "",
    },
    selectedItems: [],
    selectedFreeAddonItems: [],
    expectedBenefits: {
      discount_percentage: 20,
      max_discount_amount: 200,
    },
    expectedConditions: {
      min_amount: 500,
    },
  },
];

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: [],
};

let createdOffers = [];

// Simulate the submitOffer function from lib/offers/submitOffer.ts
async function simulateUISubmit(testCase) {
  const { offerType, formData, selectedItems, selectedFreeAddonItems } = testCase;
  
  // Build conditions and benefits (matching lib/offers/submitOffer.ts logic)
  const conditions = {};
  const benefits = {};
  
  if (formData.min_amount) conditions.min_amount = Number(formData.min_amount);
  if (formData.threshold_amount) conditions.threshold_amount = Number(formData.threshold_amount);
  if (formData.min_quantity) conditions.min_quantity = Number(formData.min_quantity);
  if (formData.min_orders_count) conditions.min_orders_count = Number(formData.min_orders_count);
  
  if (formData.discount_percentage) benefits.discount_percentage = Number(formData.discount_percentage);
  if (formData.discount_amount) benefits.discount_amount = Number(formData.discount_amount);
  if (formData.max_discount_amount) benefits.max_discount_amount = Number(formData.max_discount_amount);
  if (formData.max_price) benefits.max_price = Number(formData.max_price);
  if (formData.buy_quantity) benefits.buy_quantity = Number(formData.buy_quantity);
  if (formData.get_quantity) benefits.get_quantity = Number(formData.get_quantity);
  // Only add get_same_item for BOGO offers
  if (offerType === "item_buy_get_free" && formData.get_same_item !== undefined) benefits.get_same_item = formData.get_same_item;
  if (formData.free_category) benefits.free_category = formData.free_category;
  if (formData.combo_price) benefits.combo_price = Number(formData.combo_price);
  // Only add is_customizable for combo_meal offers
  if (offerType === "combo_meal" && formData.is_customizable !== undefined) benefits.is_customizable = formData.is_customizable;
  
  // Build offer object
  const offerData = {
    offer_type: offerType,
    name: formData.name,
    description: formData.description,
    image_url: formData.image_url || "",
    is_active: formData.is_active,
    priority: formData.priority || 5,
    start_date: formData.start_date || null,
    end_date: formData.end_date || null,
    usage_limit: formData.usage_limit ? Number(formData.usage_limit) : null,
    promo_code: formData.promo_code || null,
    valid_days: formData.valid_days.length > 0 ? formData.valid_days : null,
    valid_hours_start: formData.valid_hours_start || null,
    valid_hours_end: formData.valid_hours_end || null,
    target_customer_type: formData.target_customer_type,
    conditions: Object.keys(conditions).length > 0 ? conditions : null,
    benefits: Object.keys(benefits).length > 0 ? benefits : {},
    min_orders_count: formData.min_orders_count ? Number(formData.min_orders_count) : null,
  };
  
  // Create offer
  const { data: offer, error } = await supabase
    .from("offers")
    .insert(offerData)
    .select()
    .single();
  
  if (error) throw error;
  
  // Handle offer_items
  if (selectedItems.length > 0) {
    const offerItems = selectedItems.map(item => ({
      offer_id: offer.id,
      item_type: item.item_type || null,
      menu_item_id: item.type === "item" ? item.id : null,
      menu_category_id: item.type === "category" ? item.id : null,
      quantity: item.quantity || null,
    }));
    
    const { error: itemsError } = await supabase
      .from("offer_items")
      .insert(offerItems);
    
    if (itemsError) throw itemsError;
  }
  
  // Handle free addon items
  if (offerType === "item_free_addon" && selectedFreeAddonItems.length > 0) {
    const freeAddonItems = selectedFreeAddonItems.map(item => ({
      offer_id: offer.id,
      item_type: "free_addon",
      menu_item_id: item.type === "item" ? item.id : null,
      menu_category_id: item.type === "category" ? item.id : null,
      quantity: 1,
    }));
    
    const { error: freeAddonError } = await supabase
      .from("offer_items")
      .insert(freeAddonItems);
    
    if (freeAddonError) throw freeAddonError;
  }
  
  // Handle combo meals
  if (offerType === "combo_meal" && selectedItems.length > 0) {
    const { data: comboMeal, error: comboError } = await supabase
      .from("combo_meals")
      .insert({
        offer_id: offer.id,
        name: formData.name,
        description: formData.description,
        combo_price: Number(formData.combo_price),
        is_customizable: formData.is_customizable,
      })
      .select()
      .single();
    
    if (comboError) throw comboError;
    
    const comboItems = selectedItems.map(item => ({
      combo_meal_id: comboMeal.id,
      menu_item_id: item.type === "item" ? item.id : null,
      menu_category_id: item.type === "category" ? item.id : null,
      quantity: item.quantity || 1,
      is_required: item.is_required ?? true,
      is_selectable: item.is_selectable ?? false,
    }));
    
    const { error: comboItemsError } = await supabase
      .from("combo_meal_items")
      .insert(comboItems);
    
    if (comboItemsError) throw comboItemsError;
  }
  
  return offer;
}

async function runTests() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║       Client-Side Offer Creation Test Suite               ║");
  console.log("║       Testing UI → Database data flow                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  await fetchMenuData();
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.offerType} - ${testCase.name}`);
    
    try {
      // Populate items if needed
      if (testCase.requiresItems && menuItems.length > 0) {
        if (testCase.offerType === "item_buy_get_free") {
          testCase.selectedItems = [
            { type: "item", id: menuItems[0].id, name: menuItems[0].name, item_type: "buy", quantity: 2 },
            { type: "item", id: menuItems[1].id, name: menuItems[1].name, item_type: "get", quantity: 1 },
          ];
        } else if (testCase.offerType === "cart_threshold_item") {
          testCase.selectedItems = [
            { type: "item", id: menuItems[0].id, name: menuItems[0].name, item_type: "get_free", quantity: 1 },
          ];
        } else if (testCase.offerType === "item_free_addon") {
          testCase.selectedItems = [
            { type: "item", id: menuItems[0].id, name: menuItems[0].name, item_type: "buy", quantity: 1 },
          ];
          testCase.selectedFreeAddonItems = [
            { type: "item", id: menuItems[1].id, name: menuItems[1].name },
          ];
        } else if (testCase.offerType === "combo_meal") {
          testCase.selectedItems = [
            { type: "item", id: menuItems[0].id, name: menuItems[0].name, quantity: 1, is_required: true, is_selectable: false },
            { type: "item", id: menuItems[1].id, name: menuItems[1].name, quantity: 1, is_required: true, is_selectable: false },
            { type: "item", id: menuItems[2].id, name: menuItems[2].name, quantity: 1, is_required: false, is_selectable: true },
          ];
        }
      }
      
      // Create offer
      testResults.total++;
      const offer = await simulateUISubmit(testCase);
      createdOffers.push(offer.id);
      console.log(`✅ PASS: Offer created successfully`);
      console.log(`   Offer ID: ${offer.id}`);
      testResults.passed++;
      
      // Verify benefits
      if (testCase.expectedBenefits) {
        testResults.total++;
        const benefitsMatch = JSON.stringify(offer.benefits) === JSON.stringify(testCase.expectedBenefits);
        if (!benefitsMatch) {
          console.log(`❌ FAIL: Benefits mismatch`);
          console.log(`   Expected: ${JSON.stringify(testCase.expectedBenefits)}`);
          console.log(`   Got: ${JSON.stringify(offer.benefits)}`);
          testResults.failed++;
        } else {
          console.log(`✅ PASS: Benefits correct`);
          testResults.passed++;
        }
      }
      
      // Verify conditions
      if (testCase.expectedConditions) {
        testResults.total++;
        const conditionsMatch = JSON.stringify(offer.conditions) === JSON.stringify(testCase.expectedConditions);
        if (!conditionsMatch) {
          console.log(`❌ FAIL: Conditions mismatch`);
          console.log(`   Expected: ${JSON.stringify(testCase.expectedConditions)}`);
          console.log(`   Got: ${JSON.stringify(offer.conditions)}`);
          testResults.failed++;
        } else {
          console.log(`✅ PASS: Conditions correct`);
          testResults.passed++;
        }
      }
      
      // Verify offer_items
      if (testCase.requiresItems) {
        testResults.total++;
        const { data: offerItems } = await supabase
          .from("offer_items")
          .select("*")
          .eq("offer_id", offer.id);
        
        const expectedCount = testCase.selectedItems.length + (testCase.selectedFreeAddonItems?.length || 0);
        if (offerItems.length !== expectedCount) {
          console.log(`❌ FAIL: Offer items count mismatch (expected ${expectedCount}, got ${offerItems.length})`);
          testResults.failed++;
        } else {
          console.log(`✅ PASS: Offer items count correct (${offerItems.length})`);
          testResults.passed++;
          
          // Verify item types
          if (testCase.itemTypes) {
            testResults.total++;
            const actualTypes = [...new Set(offerItems.map(item => item.item_type))].sort();
            const expectedTypes = [...testCase.itemTypes].sort();
            if (JSON.stringify(actualTypes) === JSON.stringify(expectedTypes)) {
              console.log(`✅ PASS: Item types correct (${actualTypes.join(", ")})`);
              testResults.passed++;
            } else {
              console.log(`❌ FAIL: Item types mismatch`);
              console.log(`   Expected: ${expectedTypes.join(", ")}`);
              console.log(`   Got: ${actualTypes.join(", ")}`);
              testResults.failed++;
            }
          }
        }
      }
      
      // Verify combo meals
      if (testCase.isCombo) {
        testResults.total++;
        const { data: comboMeals } = await supabase
          .from("combo_meals")
          .select("id, combo_price, is_customizable")
          .eq("offer_id", offer.id);
        
        if (comboMeals.length !== 1) {
          console.log(`❌ FAIL: Combo meals count (expected 1, got ${comboMeals.length})`);
          testResults.failed++;
        } else {
          console.log(`✅ PASS: Combo meal created`);
          testResults.passed++;
          
          testResults.total++;
          const { data: comboItems } = await supabase
            .from("combo_meal_items")
            .select("*")
            .eq("combo_meal_id", comboMeals[0].id);
          
          if (comboItems.length !== testCase.selectedItems.length) {
            console.log(`❌ FAIL: Combo items count (expected ${testCase.selectedItems.length}, got ${comboItems.length})`);
            testResults.failed++;
          } else {
            console.log(`✅ PASS: Combo items count correct (${comboItems.length})`);
            testResults.passed++;
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ FAIL: ${error.message}`);
      testResults.failed++;
      testResults.details.push({
        offerType: testCase.offerType,
        error: error.message,
      });
    }
  }
  
  // Cleanup
  console.log("\n🧹 Cleaning up test data...");
  for (const offerId of createdOffers) {
    await supabase.from("offers").delete().eq("id", offerId);
  }
  console.log("✅ Cleanup complete\n");
  
  // Summary
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                      TEST SUMMARY                          ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%\n`);
  
  if (testResults.details.length > 0) {
    console.log("\n⚠️  Failed Tests Details:");
    testResults.details.forEach(detail => {
      console.log(`   - ${detail.offerType}: ${detail.error}`);
    });
  }
  
  console.log("════════════════════════════════════════════════════════════");
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

runTests();
