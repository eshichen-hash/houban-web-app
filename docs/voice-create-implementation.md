# 語音產生活動草稿：實作與部署交接

更新日期：2026-09-11。新版程式與本機測試已完成。已確認 Supabase 存有 `OPENAI_API_KEY` 的設定紀錄（未讀取金鑰值）。資料庫 migration `20260911111605` 已套用，SQL 安全回歸測試通過；`line-api` v3 與 `voice-draft` v1 已部署。前端發布狀態與實機驗證見下方部署紀錄。

## 已實作流程

語音說明 → 系統整理 → 點擊草稿欄位修改 → 確認並建立活動。

- 移除舊三步驟建立表單，改為語音入口與可編輯草稿。文字替代入口只在麥克風不支援／權限失敗時顯示。
- 錄音最多 90 秒，剩 15 秒提示；取消、離頁或背景錄音時釋放麥克風。錄音僅在記憶體，失敗重試最長保留 5 分鐘，不寫入本專案資料庫、Storage 或 localStorage。
- LINE ID token 由伺服器向 LINE 驗證後，才可使用語音整理、簽名圖片上傳與建立活動；不依前端 profile 或自行傳入的 user ID 授權。
- 系統整理缺漏資料不猜日期／時間／地點。未提供名額或費用時建議 12 人／免費並標示「系統建議」。公園與集合地點各自需要確認。
- 九個草稿欄位皆為整列按鈕，至少 86px 高，具文字狀態、提示圖示與編輯圖示。對應設定面板以底部 dialog 開啟，確認後才套用，取消保留原值。
- 日期、開始／結束時間、Google 地點搜尋與地址確認、集合地點、3–50 名額、免費／NT$1–9999、攜帶物品、名稱與介紹皆可修改。
- 系統配圖使用已生成的三款活動插圖，不是每次建立活動即時呼叫圖片生成 API；素材與提示詞記錄在 `public/activity-presets/README.md`。可上傳自己的圖片；前端保持比例縮小至最長邊 1600px、轉 WebP，雲端限 5MB。
- 草稿在此裝置保留 24 小時，只儲存結構欄位、不儲存錄音／逐字稿；重新開啟需選擇恢復或捨棄。發布成功才移除；重試使用同一建立 ID。
- 建立按鈕會引導補齊第一個缺漏欄位；等待真正儲存成功才進入管理頁。管理頁同步保留開始／結束時間及付費金額。

## 程式責任

- `src/views/CreateView.vue`：流程、登入、草稿恢復與提交。
- `src/components/create/voice/`：語音入口、草稿卡、欄位設定面板、地點搜尋／預覽。
- `src/composables/useActivityRecorder.ts`：錄音生命週期、取消及記憶體期限。
- `src/composables/useVoiceActivityDraft.ts`：欄位狀態、確認規則、草稿快照。
- `src/services/voiceDraftService.ts`：經身分驗證的語音 API；`activityImageService.ts`：圖片壓縮／簽名上傳。
- `supabase/functions/voice-draft/`：語音轉文字與結構化擷取。
- `supabase/functions/_shared/`：LINE 驗證、輸入契約、活動時間／費用／圖片驗證。
- `supabase/migrations/20260911111605_voice_activity_drafts_and_images.sql`：新增費用金額、公開圖片桶、私有用量表、僅 service_role 可使用的限額 RPC。

## 已完成的驗證

- `npm run typecheck` 通過。
- `npm test`：13 個測試檔、66 項測試通過。
- `npm run build` 通過；仍有既有單包超過 500KB 的提醒，路由分包留待效能階段。
- `npx deno check supabase/functions/voice-draft/index.ts supabase/functions/line-api/index.ts` 通過。
- `scripts/qa-voice-create.mjs`：320／390／768／1280px 均無頁面或設定面板橫向溢出；欄位高至少 86px；可修改欄位，主操作可捲至導覽列上方點擊，麥克風入口在首屏可見。
- 瀏覽器 QA 使用獨立 Edge 測試環境，模擬麥克風不支援，攔截雲端寫入；沒有錄製使用者的真實語音或建立雲端活動。

**雲端資料庫已驗證**：`supabase/tests/voice_activity_security.sql` 已執行通過，測試交易已回滾；既有 12 場活動、5 筆報名保留。名額／費用限制、圖片路徑授權的函式規則也有本機單元測試。

**尚未實機驗證**：實際 LINE／iOS／Android 麥克風、OpenAI 真實請求、Google 地點實際選取與用量、雲端圖片上傳、雲端發布活動。金鑰設定存在不等於已確認金鑰有效或帳戶額度充足。

## 部署紀錄

- Supabase migration：`20260911111605_voice_activity_drafts_and_images`，已套用。
- Edge Functions：`line-api` v3、`voice-draft` v1，狀態 ACTIVE。
- 前端候選版本：`a78b9cf`，Vercel 預覽部署 `9CeYU1PihLdmocgy75qdk1pEAwqf` 已 Ready。雲端頁面與圖片正常、麥克風按鈕 88px、無橫向溢出或主控台錯誤；依下列順序從 main 發布至正式網址。
- 雲端 HTTP 邊界檢查：語音預檢 OPTIONS 為 204；語音與一般 API 的未登入／假憑證均為 401；語音不允許來源為 403。
- 安全顧問的「RLS 已啟用但沒有 policy」提示對私人收藏／報名／用量表是刻意的拒絕直接存取設計，僅由驗證 LINE 身分的伺服器處理。

## 專案擁有者先完成的設定

1. 前往 [OpenAI API keys](https://platform.openai.com/api-keys)，建立供本專案使用的 API key，名稱可用 `houban-voice`。金鑰完整值只在建立時顯示，請安全保管。請確認 API 帳戶有可用額度；API 費用與 ChatGPT 訂閱分開。
2. 前往 [本專案的 Supabase Edge Functions Secrets](https://supabase.com/dashboard/project/dpyputseylxmvitagkgh/functions/secrets)。確認專案名稱是 `houban-web-app`。
3. 新增名稱 **OPENAI_API_KEY**；值填入上述金鑰，按 Save。不要加 `VITE_` 前綴，不要放入前端、Git 或對話。只需回覆「已設定」，不需提供金鑰或含完整值的截圖。

## 後續部署順序

1. 確認伺服器 Secrets 與 LINE Channel 設定；保留既有正式版本。
2. 審核並套用上述加法式 migration，再執行 SQL 回歸測試；測試以交易回滾結束。
3. 部署新版 `line-api` 與 `voice-draft`。兩者自行驗證 LINE token，不以關閉平台 JWT 驗證作為匿名授權。
4. 先驗證未登入拒絕、跨使用者圖片路徑拒絕、費用／時間限制、每日配額、上傳成功與失敗、建立重試不重複。
5. 保留已通過檢查的 Git 候選分支與上一版 main `29f744d`，以 fast-forward 更新 main 觸發正式 Vercel 部署；確認 Vercel Ready 與正式 `/create` 頁面的新版入口。若失敗，保持或回復上一版前端；新增資料欄位不刪除。
6. 請專案擁有者在正式 LIFF 網址實機測試 LINE 登入 → 語音 → 確認地點 → 編輯 → 建立。代理未啟用使用者的麥克風，也未擷取瀏覽器登入憑證，不能將模擬／未登入測試當成真實語音驗證。
7. iOS Safari、Android Chrome 與 LINE 內建瀏覽器補充實機檢查：拒絕權限、背景中斷、慢網路、逾時重試、草稿恢復、底部鍵盤與導覽列遮擋。

## 官方依據

- [Supabase：管理 Edge Function Secrets](https://supabase.com/docs/guides/functions/secrets)
- [OpenAI：建立與管理 API key](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key)
- [OpenAI：Speech to text](https://developers.openai.com/api/docs/guides/speech-to-text)
- [OpenAI：Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Google：Autocomplete Data API](https://developers.google.com/maps/documentation/javascript/place-autocomplete-data)
- [Google：Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies)
