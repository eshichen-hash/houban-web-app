# 公園好伴｜Vue 核心流程

正式前端開發目錄，使用 Vue 3、TypeScript、Vite 與 Vue Router；不會覆蓋舊版 `formal-site` 原型。

## 目前階段（2026-09-06）

已接入 Supabase、LIFF SDK 與地點搜尋。LINE 個人資料、收藏、報名與主辦管理已改走伺服器驗證邊界；瀏覽器提供的 profile 或 user ID 不再作為授權依據。

專案擁有者已確認現有活動與報名全為測試資料。本次安全 migration 保留既有 10 筆活動與 4 筆報名。

驗證紀錄：[第一批穩定性](qa/phase1-stability-2026-09-06/verification.md)、[LINE／Supabase 安全發布](qa/security-release-2026-09-06/verification.md)。

## 正式部署

- 正式網站：<https://houban-web-app.vercel.app>
- LIFF：<https://liff.line.me/2011461980-fDJU0gL6>
- `houban-web-app-5asd.vercel.app` 是舊專案網址，只保留導向 canonical 網址的轉址。

## 開發與檢查

建議使用 Node.js 22 或 24；本批使用 Node.js 24.18.0 驗證。

```bash
npm ci
npm run dev -- --host 127.0.0.1 --port 4175 --strictPort
```

開啟 [本機探索頁](http://127.0.0.1:4175/explore) 或 [本機發起頁](http://127.0.0.1:4175/create)。`--strictPort` 可避免原埠被占用時無聲切換到另一個網址。

其他檢查指令：

```bash
npm run typecheck
npm test
npm run test:watch
npm run build
```

測試位於 `tests/`，使用 Vitest、Vue Test Utils 與 happy-dom。服務／元件測試會 mock 雲端與登入，不會建立真實活動或操作測試資料庫；不等同 LINE、Supabase 的完整端到端驗證。

## 環境設定

依 `.env.example` 在本機設定 `.env`；不要將實際金鑰提交到 Git：

- `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`：公開瀏覽器連線；舊專案可暫用 `VITE_SUPABASE_ANON_KEY`。
- `VITE_LIFF_ID`：LIFF 應用程式 ID。前端只取得原始 ID token，身分由 Edge Function 向 LINE 驗證。
- `VITE_GOOGLE_MAPS_API_KEY`：地點搜尋用瀏覽器金鑰，須在 Google Cloud 設定適用網域與 API 限制。

所有 `VITE_` 變數都可能出現在前端程式中。**不得放入 Supabase service-role／secret key、LINE Channel Secret 或其他後端秘密。**

## 路由

- `/`：首次進入引導；`/?preview=onboarding` 可預覽引導。
- `/explore`：位置／範圍、今日推薦、日期／興趣篩選與結果。
- `/park/:id`：依公園查看活動。
- `/activity/:id`、`/registration/:id`、`/success/:id`：詳情、報名、成功。
- `/create`：三步快速發起活動。
- `/manage`：目前 LINE 使用者實際發起的活動與名單管理。
- `/my`：行程與收藏。
- `/notifications`：通知介面（尚需串接正式通知來源）。

## 程式責任

- `src/components/AppShell.vue`：頁面背景與響應式主導覽。
- `src/views/CreateView.vue`：組合表單、送出中／錯誤提示及成功後導頁。
- `src/composables/useCreateEventDraft.ts`：表單草稿、選定地點、自動名稱／介紹與送出驗證。
- `src/utils/eventDateTime.ts`：台北時區、實際日期篩選、開始／結束時間與舊資料時間字串解析。
- `src/utils/calendarUtils.ts`：日曆連結與 ICS 產生。
- `src/composables/useAppState.ts`：前端狀態與 actions；雲端空清單也是正式結果，不再合併舊的個人假資料。
- `src/services/`：由 `discoverable_events` 安全 view 公開讀取、LIFF token 及受驗證 Edge API 邊界。
- `supabase/functions/line-api/`：驗證 LINE ID token，依可信任 `sub` 執行個人與寫入操作。
- `supabase/migrations/`：RLS、權限、資料約束與交易 RPC 的版本化 migration。
- `src/data/events.ts`：型別與原型用種子資料；正式資料來源與種子資料仍需分離。

目前新建活動只支援單一日期：結束時間必須晚於開始時間，不會默默改成隔日。「本週」定義為今天到本週日；今日推薦不受下方日期／興趣窄篩選影響。

## 下一批優先順序

1. 在 LINE App 內完成真實 LIFF 帳號的建立、報名、取消、收藏、管理端到端驗收。
2. 處理持續開頁跨午夜更新與管理／建立共用時間模型。
3. 圖片改走 Supabase Storage 上傳，不再使用本機示意圖流程。
4. 路由與 vendor 分包。目前正式 build 可完成，但主 JavaScript 仍超過 Vite 的 500 kB 提示門檻。
