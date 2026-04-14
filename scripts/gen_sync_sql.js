import fs from 'fs';
import path from 'path';

const menuPath = path.join(process.cwd(), 'scripts', 'correct_menu.json');
const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

let sql = `DO $$
DECLARE
  items jsonb := $json$${JSON.stringify(menu)}$json$::jsonb;
  cat jsonb;
  item jsonb;
  v_name text;
  v_price numeric;
  v_category text;
  v_image text;
  v_is_special boolean;
BEGIN
  -- Reset availability for all products
  UPDATE public.products SET is_available = false;

  FOR cat IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    v_category := cat->>'title';
    FOR item IN SELECT * FROM jsonb_array_elements(cat->'items')
    LOOP
      v_name := item->>'name';
      v_price := (item->>'price')::numeric;
      v_image := item->>'image';
      v_is_special := COALESCE((item->>'isSpecial')::boolean, false);

      IF EXISTS (SELECT 1 FROM public.products WHERE name = v_name AND category = v_category) THEN
        UPDATE public.products SET
          price = v_price,
          image = v_image,
          is_available = true,
          is_special = v_is_special,
          updated_at = now()
        WHERE name = v_name AND category = v_category;
      ELSE
        INSERT INTO public.products (name, price, category, image, is_available, is_special)
        VALUES (v_name, v_price, v_category, v_image, true, v_is_special);
      END IF;
    END LOOP;
  END LOOP;
END $$;`;

fs.writeFileSync('scripts/sync_menu.sql', sql, 'utf-8');
console.log('SQL synchronization script generated successfully at: scripts/sync_menu.sql');
