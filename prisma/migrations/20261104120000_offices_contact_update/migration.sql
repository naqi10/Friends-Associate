-- Offices and contact details from the owner (4 Nov): Rahim Yar Khan head office address from the visiting card,
-- Multan office added, Lahore "Coming soon", Karachi removed; phone 0300-6711828 and the company Gmail.
UPDATE "Company" SET email = 'friendsassociates828@gmail.com', whatsapp = '+92 300 6711828' WHERE id = 1;

DELETE FROM "Office" WHERE city = 'Karachi';
INSERT INTO "Office" (id, city, address, phone, sort_order) VALUES
  (gen_random_uuid()::text, 'Rahim Yar Khan', 'Abu Dhabi (Dari Sanghi) Road, near Mian Pharmacy, opp. Jalandhar Sweets', '0300-6711828', 0),
  (gen_random_uuid()::text, 'Multan', 'International Model Town, Multan', '0300-6711828', 1),
  (gen_random_uuid()::text, 'Lahore', 'Coming soon', '', 2)
ON CONFLICT (city) DO UPDATE SET address = EXCLUDED.address, phone = EXCLUDED.phone, sort_order = EXCLUDED.sort_order;

-- Wording the admin may have saved from the old defaults.
UPDATE "ContentBlock" SET
  title = replace(replace(replace(title, ' from our head office in Rahim Yar Khan, with teams in Lahore and Karachi.', ', with teams in Rahim Yar Khan, Multan and Lahore.'), 'Rahim Yar Khan, Lahore and Karachi', 'Rahim Yar Khan, Multan and Lahore'), 'Lahore and Karachi', 'Multan and Lahore'),
  subtitle = replace(replace(replace(subtitle, ' from our head office in Rahim Yar Khan, with teams in Lahore and Karachi.', ', with teams in Rahim Yar Khan, Multan and Lahore.'), 'Rahim Yar Khan, Lahore and Karachi', 'Rahim Yar Khan, Multan and Lahore'), 'Lahore and Karachi', 'Multan and Lahore'),
  description = replace(replace(replace(replace(description, ' from our head office in Rahim Yar Khan, with teams in Lahore and Karachi.', ', with teams in Rahim Yar Khan, Multan and Lahore.'), 'Rahim Yar Khan, Lahore and Karachi', 'Rahim Yar Khan, Multan and Lahore'), 'Lahore and Karachi', 'Multan and Lahore'), '0312-6711828', '0300-6711828');

UPDATE "Project" SET contact_phone = '0300-6711828' WHERE contact_phone IN ('0312-6711828', '+92 312 6711828');
