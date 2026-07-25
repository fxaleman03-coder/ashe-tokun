-- ==========================================================
-- PHASE 16 - Catalog Cleanup
-- Date: 2026-07-25
-- Description:
--   - Rename product AJO-KEY-001
--   - Remove duplicate draft product AJO-KEY-DRAFT
-- ==========================================================

UPDATE products
SET
    name = '256 Odu Opon Keychain',
    updated_at = NOW()
WHERE sku = 'AJO-KEY-001';

DELETE FROM products
WHERE sku = 'AJO-KEY-DRAFT';