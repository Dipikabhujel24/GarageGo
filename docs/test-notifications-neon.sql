-- GarageGo notification manual test (run in Neon SQL Editor)
-- Replace :customer_id and :user_id with values from step 1.

-- STEP 1: Find your test customer (copy Id and UserId)
SELECT c."Id" AS customer_id,
       c."UserId" AS user_id,
       c."Name",
       c."Email"
FROM "Customers" c
ORDER BY c."Id"
LIMIT 10;

-- STEP 2: Overdue credit row (triggers customer email + bell after POST /api/notifications/run-checks)
-- Use a date older than 1 month. ReminderSentAt must be NULL.
INSERT INTO "ServiceHistories" (
  "CustomerId", "HistoryType", "Title", "Description",
  "Amount", "PaymentStatus", "ServiceDate", "ReminderSentAt"
)
VALUES (
  1,  -- <-- your customer_id
  'Service',
  'Test overdue credit',
  'Manual Neon test for notification coursework',
  250.00,
  'Credit',
  NOW() AT TIME ZONE 'UTC' - INTERVAL '45 days',
  NULL
);

-- STEP 3: Low stock part (admin email + admin bell)
UPDATE "Parts"
SET "Quantity" = 3,
    "LastLowStockNotifiedAt" = NULL
WHERE "Id" = 1;  -- <-- pick a real part id

-- STEP 4: Optional — insert in-app notification directly (UI only, no email)
INSERT INTO "AppNotifications" (
  "Audience", "UserId", "Type", "Title", "Message", "LinkUrl",
  "DedupeKey", "IsRead", "IsDismissed", "CreatedAt", "ReferenceId", "ReferenceType"
)
VALUES (
  'Customer',
  1,  -- <-- your user_id (Users.Id, NOT Customers.Id)
  'credit_reminder',
  'Test payment reminder',
  'This is a manual Neon test notification for the customer bell.',
  '/history',
  'manual-test-credit-1',
  false,
  false,
  NOW() AT TIME ZONE 'UTC',
  NULL,
  NULL
);

-- STEP 5: Verify rows
SELECT * FROM "AppNotifications" ORDER BY "Id" DESC LIMIT 10;
SELECT "Id", "CustomerId", "PaymentStatus", "ServiceDate", "ReminderSentAt"
FROM "ServiceHistories"
ORDER BY "Id" DESC LIMIT 5;
