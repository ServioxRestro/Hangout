// Test configuration
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test data
const TEST_PHONE = '8638774545';
const TEST_GUEST_NAME = 'Test User';

// Helper functions
async function getActiveTable() {
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error) throw new Error(`Failed to get table: ${error.message}`);
  return data;
}

async function getMenuItems(limit = 3) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, price, is_veg')
    .eq('is_available', true)
    .limit(limit);

  if (error) throw new Error(`Failed to get menu items: ${error.message}`);
  return data;
}

async function getOrCreateGuestUser(phone, name) {
  // Check if guest user exists
  let { data: existingUser } = await supabase
    .from('guest_users')
    .select('*')
    .eq('phone', phone)
    .single();

  if (existingUser) {
    return existingUser;
  }

  // Create new guest user
  const { data: newUser, error } = await supabase
    .from('guest_users')
    .insert({
      phone: phone,
      name: name,
      first_visit_at: new Date().toISOString(),
      last_login_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create guest user: ${error.message}`);
  return newUser;
}

async function cleanupTestData(sessionId, orderId) {
  console.log('\n🧹 Cleaning up test data...');

  // Delete order items first (foreign key constraint)
  if (orderId) {
    await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    // Delete order
    await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);
  }

  // Delete session
  if (sessionId) {
    await supabase
      .from('table_sessions')
      .delete()
      .eq('id', sessionId);
  }

  console.log('✅ Cleanup completed');
}

function logTestResult(testName, passed, details) {
  const icon = passed ? '✅' : '❌';
  console.log(`\n${icon} ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

function measureTime(label, startTime) {
  const endTime = Date.now();
  const duration = endTime - startTime;
  console.log(`⏱️  ${label}: ${duration}ms`);
  return duration;
}

module.exports = {
  supabase,
  TEST_PHONE,
  TEST_GUEST_NAME,
  getActiveTable,
  getMenuItems,
  getOrCreateGuestUser,
  cleanupTestData,
  logTestResult,
  measureTime
};
