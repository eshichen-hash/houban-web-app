# LINE 身分與 Supabase 安全發布驗證

日期：2026-09-06

## 正式入口

- Canonical 網址：`https://houban-web-app.vercel.app`
- LIFF：`https://liff.line.me/2011461980-fDJU0gL6`
- `houban-web-app-5asd.vercel.app` 僅作舊網址轉址，不再作為獨立正式版本。

## 已完成

1. 前端只把 `liff.getIDToken()` 取得的原始 token 傳到 `line-api` Edge Function。
2. Edge Function向 LINE `POST /oauth2/v2.1/verify` 驗證 token、channel、issuer 與到期時間；所有個人資料及寫入動作都依驗證後的 `sub` 授權。
3. `discoverable_events` 僅提供 active／full 活動，並排除穩定的 LINE `organizer_id`；`registrations`、`favorites` 對瀏覽器角色 deny-by-default，寫入只經 Edge Function 的 service role。
   `parks` 只允許公開讀取，原型時期的匿名新增、修改與刪除權限已移除。
4. 三個 `SECURITY DEFINER` RPC 已設定空 `search_path`，並撤銷 `public`、`anon`、`authenticated` 的執行權，只授予 `service_role`。
5. 報名／取消具冪等性及列鎖；名額有資料庫上下界；已取消／結束活動不可報名；簽到同時驗證主辦者。
6. 雲端空清單會覆蓋舊本機狀態；已移除 `user-me`、假主辦活動、假參加者與假今日行程。
7. 活動管理的編輯、異動、取消、結束及簽到，都在伺服器確認成功後才顯示成功訊息。

## 驗證結果

- `npm run typecheck`：通過。
- `npm test`：10 個測試檔、49 個測試通過。
- `npm run build`：通過；主 bundle 仍有超過 500 kB 的既知提示，列入下一批路由分包。
- `deno check supabase/functions/line-api/index.ts`：通過。
- Migrations：已補齊 `20260904082459_init_houban_schema` 本機基線；`20260906082129_secure_line_identity_and_transactions`、`20260906083131_hide_line_user_ids_from_public_events`、`20260906084716_lock_down_parks` 已套用。
- SQL transaction test：通過且 rollback；涵蓋重複報名、額滿、取消／結束活動拒絕報名、重複取消與角色權限。
- Edge Function 無 token／錯誤 token：均回傳 HTTP 401。
- 公開活動 view：HTTP 200 且沒有 `organizer_id`；直接查詢該欄位為 HTTP 401。
- Migration 前後資料筆數：10 筆活動、4 筆報名，未刪除。
- Supabase 原有 9 個 security warning 已清除；私人表僅剩「RLS 開啟且無 policy」資訊提示，這是刻意的 deny-by-default。

## 發布後人工驗收

必須在 LINE App 內用真實 LIFF session 驗收：開啟、建立、報名、重複點擊、取消、收藏、查看自己主辦活動與名單。測試不可記錄或貼出 ID token。

## 下一批（原第 5 項）

- 持續開頁跨午夜更新。
- 管理編輯與建立流程共用時間模型。
- 圖片上傳改用正式 Storage 流程。
- Vue Router 頁面 lazy load 與 vendor chunk 分包。
