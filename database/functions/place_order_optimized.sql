-- Optimized function to place orders with minimal database round trips
-- Reduces 11 sequential queries to 1 function call
-- Handles both new orders and adding items to existing orders

CREATE OR REPLACE FUNCTION place_order_optimized(
  p_table_code TEXT,
  p_customer_phone TEXT,
  p_guest_user_id UUID,
  p_order_type TEXT DEFAULT 'dine-in',
  p_cart_items JSONB,
  p_cart_total NUMERIC,
  p_offer_id UUID DEFAULT NULL,
  p_offer_discount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_id UUID;
  v_session_id UUID;
  v_order_id UUID;
  v_kot_number INTEGER;
  v_kot_batch_id UUID;
  v_existing_order_total NUMERIC;
  v_result JSONB;
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
    SELECT id INTO v_session_id
    FROM table_sessions
    WHERE table_id = v_table_id
      AND status = 'active'
      AND customer_phone = p_customer_phone;

    -- Create session if doesn't exist
    IF v_session_id IS NULL THEN
      INSERT INTO table_sessions (
        table_id,
        customer_phone,
        guest_user_id,
        status,
        session_started_at,
        total_orders,
        total_amount
      ) VALUES (
        v_table_id,
        p_customer_phone,
        p_guest_user_id,
        'active',
        NOW(),
        0,
        0
      )
      RETURNING id INTO v_session_id;
    ELSE
      -- Update guest_user_id if not set
      UPDATE table_sessions
      SET guest_user_id = COALESCE(guest_user_id, p_guest_user_id)
      WHERE id = v_session_id;
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
    -- Create new order
    INSERT INTO orders (
      table_id,
      table_session_id,
      customer_phone,
      guest_user_id,
      total_amount,
      status,
      order_type,
      notes
    ) VALUES (
      v_table_id,
      v_session_id,
      p_customer_phone,
      p_guest_user_id,
      p_cart_total,
      'placed',
      p_order_type,
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

  -- 6. Insert order items in bulk
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
    (item->>'price')::NUMERIC,
    (item->>'price')::NUMERIC * (item->>'quantity')::INTEGER,
    v_kot_number,
    v_kot_batch_id,
    'placed'
  FROM jsonb_array_elements(p_cart_items) AS item;

  -- 7. Create offer_usage record if offer was applied
  IF p_offer_id IS NOT NULL AND p_offer_discount > 0 THEN
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
        p_offer_id,
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

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION place_order_optimized TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION place_order_optimized IS 'Optimized order placement function that handles session management, order creation, and item insertion in a single transaction. Reduces 11 queries to 1 RPC call.';
