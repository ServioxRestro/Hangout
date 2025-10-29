/**
 * Client-Side Offer EDIT Test
 * Tests editing offers - simulating the full edit workflow from UI
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

let menuItems = [];
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
};
let createdOffers = [];

async function fetchMenuData() {
  const { data: items } = await supabase
    .from("menu_items")
    .select("id, name, price")
    .eq("is_available", true)
    .limit(5);
  
  menuItems = items || [];
  console.log(`📦 Loaded ${menuItems.length} menu items\n`);
}

// Simulate submitOffer function (matching lib/offers/submitOffer.ts)
async function submitOffer(offerType, formData, selectedItems, selectedFreeAddonItems, isEditMode, editOfferId) {
  const conditions = {};
  const benefits = {};
  
  if (formData.min_amount) conditions.min_amount = Number(formData.min_amount);
  if (formData.threshold_amount) conditions.threshold_amount = Number(formData.threshold_amount);
  
  if (formData.discount_percentage) benefits.discount_percentage = Number(formData.discount_percentage);
  if (formData.discount_amount) benefits.discount_amount = Number(formData.discount_amount);
  if (formData.max_discount_amount) benefits.max_discount_amount = Number(formData.max_discount_amount);
  if (formData.buy_quantity) benefits.buy_quantity = Number(formData.buy_quantity);
  if (formData.get_quantity) benefits.get_quantity = Number(formData.get_quantity);
  if (offerType === "item_buy_get_free" && formData.get_same_item !== undefined) benefits.get_same_item = formData.get_same_item;
  if (formData.combo_price) benefits.combo_price = Number(formData.combo_price);
  if (offerType === "combo_meal" && formData.is_customizable !== undefined) benefits.is_customizable = formData.is_customizable;
  
  const offerData = {
    offer_type: offerType,
    name: formData.name,
    description: formData.description,
    is_active: formData.is_active,
    priority: formData.priority || 5,
    target_customer_type: formData.target_customer_type,
    conditions: Object.keys(conditions).length > 0 ? conditions : null,
    benefits: Object.keys(benefits).length > 0 ? benefits : {},
  };
  
  let offer;
  
  if (isEditMode && editOfferId) {
    // UPDATE MODE
    const { data, error } = await supabase
      .from("offers")
      .update(offerData)
      .eq("id", editOfferId)
      .select()
      .single();
    
    if (error) throw error;
    offer = data;
    
    // Delete old offer_items
    await supabase.from("offer_items").delete().eq("offer_id", editOfferId);
    
    // Delete old combo_meals
    const { data: existingCombo } = await supabase
      .from("combo_meals")
      .select("id")
      .eq("offer_id", editOfferId)
      .single();
    
    if (existingCombo) {
      await supabase.from("combo_meal_items").delete().eq("combo_meal_id", existingCombo.id);
      await supabase.from("combo_meals").delete().eq("id", existingCombo.id);
    }
  } else {
    // CREATE MODE
    const { data, error } = await supabase
      .from("offers")
      .insert(offerData)
      .select()
      .single();
    
    if (error) throw error;
    offer = data;
  }
  
  // Insert offer_items
  if (selectedItems.length > 0) {
    const offerItems = selectedItems.map(item => ({
      offer_id: offer.id,
      item_type: item.item_type || null,
      menu_item_id: item.type === "item" ? item.id : null,
      quantity: item.quantity || null,
    }));
    
    await supabase.from("offer_items").insert(offerItems);
  }
  
  // Insert free addon items
  if (offerType === "item_free_addon" && selectedFreeAddonItems.length > 0) {
    const freeAddonItems = selectedFreeAddonItems.map(item => ({
      offer_id: offer.id,
      item_type: "free_addon",
      menu_item_id: item.type === "item" ? item.id : null,
      quantity: 1,
    }));
    
    await supabase.from("offer_items").insert(freeAddonItems);
  }
  
  // Create combo meal
  if (offerType === "combo_meal" && selectedItems.length > 0) {
    const { data: comboMeal } = await supabase
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
    
    const comboItems = selectedItems.map(item => ({
      combo_meal_id: comboMeal.id,
      menu_item_id: item.type === "item" ? item.id : null,
      quantity: item.quantity || 1,
      is_required: item.is_required ?? true,
      is_selectable: item.is_selectable ?? false,
    }));
    
    await supabase.from("combo_meal_items").insert(comboItems);
  }
  
  return offer;
}

async function testEditWorkflow() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║       Client-Side Offer EDIT Test Suite                   ║");
  console.log("║       Testing Create → Edit workflow                       ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  await fetchMenuData();
  
  // TEST 1: Edit simple cart_percentage offer
  console.log("\n🧪 Test 1: Edit cart_percentage offer");
  try {
    // Step 1: Create original offer
    testResults.total++;
    const originalOffer = await submitOffer(
      "cart_percentage",
      {
        name: "Original - 10% Off",
        description: "Original description",
        is_active: true,
        priority: 5,
        target_customer_type: "all",
        discount_percentage: "10",
        max_discount_amount: "100",
        min_amount: "500",
      },
      [],
      [],
      false
    );
    createdOffers.push(originalOffer.id);
    console.log(`✅ PASS: Original offer created (ID: ${originalOffer.id})`);
    testResults.passed++;
    
    // Step 2: Edit the offer
    testResults.total++;
    const editedOffer = await submitOffer(
      "cart_percentage",
      {
        name: "EDITED - 20% Off",
        description: "Updated description",
        is_active: true,
        priority: 10,
        target_customer_type: "all",
        discount_percentage: "20",
        max_discount_amount: "200",
        min_amount: "600",
      },
      [],
      [],
      true,
      originalOffer.id
    );
    
    if (editedOffer.name === "EDITED - 20% Off" && 
        editedOffer.benefits.discount_percentage === 20 &&
        editedOffer.conditions.min_amount === 600) {
      console.log(`✅ PASS: Offer edited successfully`);
      testResults.passed++;
    } else {
      console.log(`❌ FAIL: Edit didn't apply correctly`);
      testResults.failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    testResults.failed++;
  }
  
  // TEST 2: Edit BOGO offer (with items)
  console.log("\n🧪 Test 2: Edit BOGO offer with item changes");
  try {
    // Step 1: Create original BOGO
    testResults.total++;
    const originalBogo = await submitOffer(
      "item_buy_get_free",
      {
        name: "Original BOGO - Buy 1 Get 1",
        description: "Original BOGO",
        is_active: true,
        priority: 5,
        target_customer_type: "all",
        buy_quantity: "1",
        get_quantity: "1",
        get_same_item: false,
      },
      [
        { type: "item", id: menuItems[0].id, item_type: "buy", quantity: 1 },
        { type: "item", id: menuItems[1].id, item_type: "get", quantity: 1 },
      ],
      [],
      false
    );
    createdOffers.push(originalBogo.id);
    console.log(`✅ PASS: Original BOGO created (ID: ${originalBogo.id})`);
    testResults.passed++;
    
    // Verify initial items
    testResults.total++;
    const { data: initialItems } = await supabase
      .from("offer_items")
      .select("*")
      .eq("offer_id", originalBogo.id);
    
    if (initialItems.length === 2) {
      console.log(`✅ PASS: Initial items count correct (2)`);
      testResults.passed++;
    } else {
      console.log(`❌ FAIL: Initial items count (expected 2, got ${initialItems.length})`);
      testResults.failed++;
    }
    
    // Step 2: Edit BOGO with different items
    testResults.total++;
    await submitOffer(
      "item_buy_get_free",
      {
        name: "EDITED BOGO - Buy 2 Get 2",
        description: "Edited BOGO",
        is_active: true,
        priority: 8,
        target_customer_type: "all",
        buy_quantity: "2",
        get_quantity: "2",
        get_same_item: false,
      },
      [
        { type: "item", id: menuItems[2].id, item_type: "buy", quantity: 2 },
        { type: "item", id: menuItems[3].id, item_type: "get", quantity: 2 },
      ],
      [],
      true,
      originalBogo.id
    );
    
    // Verify edited items
    const { data: editedItems } = await supabase
      .from("offer_items")
      .select("*")
      .eq("offer_id", originalBogo.id);
    
    if (editedItems.length === 2 && 
        editedItems[0].menu_item_id === menuItems[2].id &&
        editedItems[1].menu_item_id === menuItems[3].id) {
      console.log(`✅ PASS: Items replaced correctly (old items deleted, new items added)`);
      testResults.passed++;
    } else {
      console.log(`❌ FAIL: Items not replaced correctly`);
      console.log(`   Expected: 2 items (${menuItems[2].id}, ${menuItems[3].id})`);
      console.log(`   Got: ${editedItems.length} items`);
      testResults.failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    testResults.failed++;
  }
  
  // TEST 3: Edit combo_meal offer
  console.log("\n🧪 Test 3: Edit combo_meal offer");
  try {
    // Step 1: Create original combo
    testResults.total++;
    const originalCombo = await submitOffer(
      "combo_meal",
      {
        name: "Original Combo - 2 Items",
        description: "Original combo",
        is_active: true,
        priority: 5,
        target_customer_type: "all",
        combo_price: "199",
        is_customizable: false,
      },
      [
        { type: "item", id: menuItems[0].id, quantity: 1, is_required: true, is_selectable: false },
        { type: "item", id: menuItems[1].id, quantity: 1, is_required: true, is_selectable: false },
      ],
      [],
      false
    );
    createdOffers.push(originalCombo.id);
    console.log(`✅ PASS: Original combo created (ID: ${originalCombo.id})`);
    testResults.passed++;
    
    // Step 2: Edit combo
    testResults.total++;
    await submitOffer(
      "combo_meal",
      {
        name: "EDITED Combo - 3 Items",
        description: "Edited combo",
        is_active: true,
        priority: 7,
        target_customer_type: "all",
        combo_price: "299",
        is_customizable: true,
      },
      [
        { type: "item", id: menuItems[0].id, quantity: 1, is_required: true, is_selectable: false },
        { type: "item", id: menuItems[1].id, quantity: 1, is_required: true, is_selectable: false },
        { type: "item", id: menuItems[2].id, quantity: 1, is_required: false, is_selectable: true },
      ],
      [],
      true,
      originalCombo.id
    );
    
    // Verify combo was replaced
    const { data: comboMeals } = await supabase
      .from("combo_meals")
      .select("id")
      .eq("offer_id", originalCombo.id);
    
    if (comboMeals.length === 1) {
      console.log(`✅ PASS: Only one combo_meals record exists (old deleted)`);
      testResults.passed++;
      
      // Verify combo items count
      testResults.total++;
      const { data: comboItems } = await supabase
        .from("combo_meal_items")
        .select("*")
        .eq("combo_meal_id", comboMeals[0].id);
      
      if (comboItems.length === 3) {
        console.log(`✅ PASS: Combo items updated to 3`);
        testResults.passed++;
      } else {
        console.log(`❌ FAIL: Combo items count (expected 3, got ${comboItems.length})`);
        testResults.failed++;
      }
    } else {
      console.log(`❌ FAIL: Multiple combo_meals records (expected 1, got ${comboMeals.length})`);
      testResults.failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    testResults.failed++;
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
  console.log("════════════════════════════════════════════════════════════");
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

testEditWorkflow();
