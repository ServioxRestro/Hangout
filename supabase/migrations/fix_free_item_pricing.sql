-- Fix place_order_optimized to handle free items correctly
-- This ensures free items are stored with unit_price = 0 and total_price = 0

CREATE OR REPLACE FUNCTION place_order_optimized(
  p_table_code TEXT,
  p_customer_phone TEXT,
  p_cart_items JSONB,  -- Now includes: [{id, quantity, price, isFree}]
  p_cart_total NUMERIC,
  p_guest_user_id UUID DEFAULT NULL,
  p_order_type TEXT DEFAULT 'dine-in',
  p_offer_id UUID DEFAULT NULL,
  p_offer_discount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_table_id UUID;
  v_session_id UUID;
  v_order_id UUID;
  v_kot_number INTEGER;
  v_kot_batch_id UUID;
  v_existing_order_total NUMERIC;
  v_result JSONB;
  v_offer_data JSONB;
  v_session_locked_offer_id UUID;
BEGIN
  -- 1. Get table ID (only for dine-in)
  IF p_order_type = 'dine-in' THEN
    SELECT id INTO v_table_id
    FROM restaurant_tables
    WHERE table_code = p_table_code AND is_active = true;

    IF v_table_id IS NULL THEN
      RAISE EXCEPTION 'Table not found or inactive';
    END IF;
  END IF;

  -- 2. Handle table session (only for dine-in)
  IF p_order_type = 'dine-in' THEN
    -- Check for existing active session
    SELECT id, locked_offer_id INTO v_session_id, v_session_locked_offer_id
    FROM table_sessions
    WHERE table_id = v_table_id
      AND status = 'active'
      AND customer_phone = p_customer_phone;

    -- Create session if doesn't exist
    IF v_session_id IS NULL THEN
      -- Get offer data for locking
      IF p_offer_id IS NOT NULL THEN
        SELECT jsonb_build_object(
          'offer_id', id,
          'name', name,
          'offer_type', offer_type,
          'conditions', conditions,
          'benefits', benefits,
          'locked_at', NOW()
        ) INTO v_offer_data
        FROM offers
        WHERE id = p_offer_id;
      END IF;

      INSERT INTO table_sessions (
        table_id,
        customer_phone,
        guest_user_id,
        status,
        session_started_at,
        total_orders,
        total_amount,
        locked_offer_id,
        locked_offer_data,
        offer_applied_at
      ) VALUES (
        v_table_id,
        p_customer_phone,
        p_guest_user_id,
        'active',
        NOW(),
        0,
        0,
        p_offer_id,
        v_offer_data,
        CASE WHEN p_offer_id IS NOT NULL THEN NOW() ELSE NULL END
      )
      RETURNING id, locked_offer_id INTO v_session_id, v_session_locked_offer_id;
    ELSE
      -- Update guest_user_id if not set
      UPDATE table_sessions
      SET guest_user_id = COALESCE(guest_user_id, p_guest_user_id)
      WHERE id = v_session_id;
      
      -- Use session's locked offer if one exists
      IF v_session_locked_offer_id IS NOT NULL AND p_offer_id IS NULL THEN
        p_offer_id := v_session_locked_offer_id;
      END IF;
    END IF;
  END IF;

  -- 3. Check for existing active order in session
  SELECT id, total_amount INTO v_order_id, v_existing_order_total
  FROM orders
  WHERE (p_order_type = 'dine-in' AND table_session_id = v_session_id)
     OR (p_order_type = 'takeaway' AND customer_phone = p_customer_phone AND status NOT IN ('completed', 'paid', 'cancelled'))
  ORDER BY created_at DESC
  LIMIT 1;

  -- 4. Get next KOT number
  v_kot_number := get_next_kot_number();
  v_kot_batch_id := gen_random_uuid();

  -- 5. Create or update order
  IF v_order_id IS NULL THEN
    -- Create new order WITH session_offer_id
    INSERT INTO orders (
      table_id,
      table_session_id,
      customer_phone,
      guest_user_id,
      total_amount,
      status,
      order_type,
      session_offer_id,
      notes
    ) VALUES (
      v_table_id,
      v_session_id,
      p_customer_phone,
      p_guest_user_id,
      p_cart_total,
      'placed',
      p_order_type,
      COALESCE(p_offer_id, v_session_locked_offer_id),
      CASE
        WHEN p_order_type = 'dine-in' THEN 'Order placed via QR code'
        ELSE 'Takeaway order'
      END
    )
    RETURNING id INTO v_order_id;

    -- Update session total_orders (new order created)
    IF p_order_type = 'dine-in' THEN
      UPDATE table_sessions
      SET total_orders = total_orders + 1,
          total_amount = total_amount + p_cart_total,
          updated_at = NOW()
      WHERE id = v_session_id;
    END IF;
  ELSE
    -- Update existing order
    UPDATE orders
    SET total_amount = total_amount + p_cart_total,
        updated_at = NOW()
    WHERE id = v_order_id;

    -- Update session total_amount (items added to existing order)
    IF p_order_type = 'dine-in' THEN
      UPDATE table_sessions
      SET total_amount = total_amount + p_cart_total,
          updated_at = NOW()
      WHERE id = v_session_id;
    END IF;
  END IF;

  -- 6. Insert order items in bulk with free item handling
  INSERT INTO order_items (
    order_id,
    menu_item_id,
    quantity,
    unit_price,
    total_price,
    kot_number,
    kot_batch_id,
    status
  )
  SELECT
    v_order_id,
    (item->>'id')::UUID,
    (item->>'quantity')::INTEGER,
    -- ✅ FIX: Set unit_price to 0 for free items
    CASE 
      WHEN COALESCE((item->>'isFree')::BOOLEAN, false) = true THEN 0
      ELSE (item->>'price')::NUMERIC
    END,
    -- ✅ FIX: Set total_price to 0 for free items
    CASE 
      WHEN COALESCE((item->>'isFree')::BOOLEAN, false) = true THEN 0
      ELSE (item->>'price')::NUMERIC * (item->>'quantity')::INTEGER
    END,
    v_kot_number,
    v_kot_batch_id,
    'placed'
  FROM jsonb_array_elements(p_cart_items) AS item;

  -- 7. Create offer_usage record if offer was applied
  IF COALESCE(p_offer_id, v_session_locked_offer_id) IS NOT NULL AND p_offer_discount > 0 THEN
    -- Check if offer usage already exists for this session
    IF NOT EXISTS (
      SELECT 1 FROM offer_usage
      WHERE (p_order_type = 'dine-in' AND table_session_id = v_session_id)
         OR (p_order_type = 'takeaway' AND order_id = v_order_id)
    ) THEN
      INSERT INTO offer_usage (
        offer_id,
        order_id,
        table_session_id,
        customer_phone,
        discount_amount,
        used_at
      ) VALUES (
        COALESCE(p_offer_id, v_session_locked_offer_id),
        v_order_id,
        v_session_id,
        p_customer_phone,
        p_offer_discount,
        NOW()
      );
    END IF;
  END IF;

  -- 8. Return result
  v_result := jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'session_id', v_session_id,
    'kot_number', v_kot_number,
    'kot_batch_id', v_kot_batch_id,
    'is_new_order', (v_existing_order_total IS NULL)
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Order placement failed: %', SQLERRM;
END;
$$;

-- Add comment explaining the fix
COMMENT ON FUNCTION place_order_optimized IS 'Places an order with proper handling of free items. Free items (isFree=true) are stored with unit_price=0 and total_price=0.';