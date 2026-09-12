# 語音產生活動草稿：實作與部署交接

更新日期：2026-09-12。語音辨識與草稿整理已改用 **OpenRouter**，不再讀取 `OPENAI_API_KEY` 或直連 OpenAI。已在 Supabase 以現有 `VITE_OPENROUTER_API_KEY` 成功驗證真實語音辨識及結構化輸出，未讀取或輸出金鑰值。`voice-draft` v3 與 migration `20260911142112` 已部署；`line-api` 保留 v4。前端由本批 main 提交發布至 Vercel。

## OpenRouter 語音流程

點擊麥克風 → 驗證 LINE 身分 → 分句辨識並顯示繁體中文 → 停止並等待最後一句 → 整理草稿 → 使用者確認後建立。

- 語音辨識：`qwen/qwen3-asr-1.7b`，經 OpenRouter `/audio/transcriptions`；OpenCC 轉為繁體中文。
- 草稿整理：`google/gemini-2.5-flash-lite`，經 OpenRouter `/chat/completions`，使用 strict JSON Schema、支援參數篩選與伺服器欄位驗證。
- 這是「逐句更新」，不是逐字零延遲。瀏覽器以 AudioWorklet 收音，約 2–4 秒一段完整 16kHz WAV，經加密 WebSocket 送至 Supabase。伺服器依序辨識，停止後等最後一段回覆，才整理草稿。
- 不支援 AudioWorklet 的瀏覽器沿用完整錄音後辨識，會明確提示文字不會在錄音中更新。麥克風或服務失敗提供文字替代流程。
- LINE token 放在第一個加密 WebSocket 訊息，不出現在 URL。通過 LINE 官方驗證後，才保留額度並呼叫付費服務。
- 每日最多 10 次語音工作階段、10 次草稿整理；每段不超過 6 秒、每工作階段最多 45 段／100 秒音訊，佇列最多 3 段，伺服器 135 秒結束。正常錄音仍最多 90 秒。
- 設定／額度錯誤不鼓勵無效重錄；服務失敗保留已辨識文字。未成功辨識的工作階段及伺服器整理失敗退還額度，跨午夜按原本的資料庫日期退還。
- 音訊與文字會由 OpenRouter 及其模型供應商處理；本專案不保存音檔，不記錄逐字稿或憑證。不要把這解讀為對上游供應商保存政策的保證。

## 已實作流程

語音說明 → 系統整理 → 點擊草稿欄位修改 → 確認並建立活動。

- 語音入口採「一句自然說明＋草稿補齊」：首要引導只要求「做什麼、什麼時候、在哪裡」，集合地點、名額、費用與攜帶物品收在可展開提示；系統不會在尚未完成擷取時假裝欄位已辨識。
- 錄音回饋採「觸覺優先、聲音備援、視覺同步」：開始、停止、取消才觸發短震動；裝置不支援震動時播放低音量短提示音；介面一定同步切換按鈕、狀態文字與真實麥克風音量條。任一裝置能力失敗都不阻斷錄音流程。
- 錄音開始後只自動將即時辨識框帶入可視區一次，不會因每段辨識結果反覆捲動畫面。取消錄音與取消整理皆有明確文字結果；動態效果遵守 `prefers-reduced-motion`。
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
- `src/composables/useLiveActivityVoice.ts`：即時連線、分句文字、停止等待最後一句、取消／背景釋放麥克風。
- `src/services/voicePcm.ts`、`public/voice-capture-worklet.js`：PCM 收音、音量回饋、重採樣與完整 WAV 分段。
- `src/services/voiceFeedback.ts`：開始／停止／取消的短震動與無震動裝置提示音備援；沒有支援時安靜降級為純視覺回饋。
- `src/composables/useActivityRecorder.ts`：不支援即時收音的備援錄音生命週期、取消及記憶體期限。
- `src/composables/useVoiceActivityDraft.ts`：欄位狀態、確認規則、草稿快照。
- `src/services/voiceDraftService.ts`：經身分驗證的語音 API；`activityImageService.ts`：圖片壓縮／簽名上傳。
- `supabase/functions/voice-draft/`：語音轉文字與結構化擷取。
- `supabase/functions/_shared/voiceProvider.ts`：僅伺服器端的 OpenRouter 金鑰、模型、錯誤映射與繁體轉換。
- `supabase/functions/_shared/voiceSocket.ts`、`voiceAudio.ts`：身分驗證後的音訊串流、限額、格式驗證與退還額度。
- `supabase/functions/_shared/` 其餘檔案：LINE 驗證、輸入契約、活動時間／費用／圖片驗證。
- `supabase/migrations/20260911111605_voice_activity_drafts_and_images.sql`：新增費用金額、公開圖片桶、私有用量表、僅 service_role 可使用的限額 RPC。
- `supabase/migrations/20260911142112_voice_live_and_failed_quota.sql`：分離語音／整理額度與失敗退款；遠端 migration 版本與此檔一致。

## 已完成的驗證

- `npm run typecheck` 通過。
- `npm test`：16 個測試檔、82 項測試通過；包含震動優先、聲音備援、純視覺降級、單一狀態播報、漸進式提示與即時音量狀態。
- `npm run build` 通過；仍有既有單包超過 500KB 的提醒，路由分包留待效能階段。
- Deno 實際入口與 WebSocket 單元測試：8 項通過，包括 OpenRouter 402、伺服器金鑰舊名稱相容、繁體中文、未登入禁止付費請求、最後一句、失敗退還及靜音／格式限制。
- `scripts/qa-voice-create.mjs`：320／390／768／1280px 直向與 844×390px 橫向均無頁面、展開式說話提示或設定面板橫向溢出；欄位高至少 86px；可修改欄位，主操作可捲至導覽列上方點擊，直向裝置的麥克風入口在首屏可見。
- `scripts/qa-voice-live.mjs`：320／390／768／1280px 直向與 844×390px 橫向均無橫向溢出；以合成語音檔走 Chromium 原生收音與 AudioWorklet，驗證音量條、錄音中可見的即時文字、停止後整理、關閉收音，沒有發布活動。LINE／WebSocket／整理回應為隔離測試資料，不是假裝正式辨識。
- **另行真實 API 驗證**：使用非個人資訊的約 5 秒測試音檔，OpenRouter 成功辨識「明天下午三點到四點，在大安森林公園健走」，Gemini 以簡化 schema 成功輸出活動類型；兩段 API 合計約 5.4 秒。這不等同完整 LINE 手機端驗收。測試用臨時函式 `voice-provider-check` 已刪除，正式服務不依賴它。

**雲端資料庫已驗證**：既有 `supabase/tests/voice_activity_security.sql` 安全檢查與本批 `supabase/tests/voice_quota.sql` 額度／跨午夜／ACL 檢查通過，測試交易均回滾。此次未建立、刪除或更動活動／報名。僅恢復 2026-09-11 單一測試者先前失敗消耗的 10 次 voice 額度。

**尚未實機驗證**：實際 LINE／iOS／Android 麥克風、震動／聲音回饋與完整草稿流程、Google 地點實際選取、雲端圖片上傳與發布活動。震動支援由瀏覽器與作業系統決定；不支援時會改用短提示音，再不支援則仍有視覺回饋。金鑰 API 驗證成功不等於所有實機／網路環境都成功。

## 部署紀錄

- Supabase migrations：`20260911111605_voice_activity_drafts_and_images`、`20260911142112_voice_live_and_failed_quota` 已套用。
- Edge Functions：`line-api` v4（此次未改）、`voice-draft` v3，狀態 ACTIVE。
- 前端正式網址：[發起活動](https://houban-web-app.vercel.app/create)。本批 main 提交觸發正式 Vercel 部署，發布後確認 HTML／資源版本與新版隱私說明。
- 雲端 HTTP 邊界檢查：語音 OPTIONS 204、未登入 401、不允許來源 403。真實 WebSocket upgrade 成功，未驗證身分的音訊被拒絕，沒有呼叫付費模型。
- 安全顧問只有 3 項 INFO：私人收藏／報名／用量表「RLS 已啟用但沒有 policy」為刻意拒絕直接存取，僅由驗證 LINE 身分的伺服器處理。[Supabase 說明](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)。

## 伺服器設定（已相容目前的 Secret）

1. 在 [本專案 Supabase Secrets](https://supabase.com/dashboard/project/dpyputseylxmvitagkgh/functions/secrets) 設定 `OPENROUTER_API_KEY`。為相容現況，伺服器亦接受目前已存在的 `VITE_OPENROUTER_API_KEY`；新名稱優先。**這個相容名稱只在 Supabase 讀取，不可放入 Vite／Vercel 前端環境變數。**
2. 可選設定 `OPENROUTER_TRANSCRIPTION_MODEL`、`OPENROUTER_EXTRACTION_MODEL`；未設定即使用上述已測試模型。不可把舊 OpenAI model ID 直接代入。
3. 舊 `OPENAI_API_KEY` 不再使用，此次未刪除既有 Secret。金鑰不得貼入對話、前端、Git 或日誌；帳戶額度與每把金鑰的 spending limit 都會影響請求。

## 回歸與後續驗收

1. 本機執行 typecheck、Vitest、build。Deno 與 npm 依賴隔離，避免 Deno 自動安裝前端 package.json：

```powershell
$env:DENO_NO_PACKAGE_JSON = '1'
npx deno test --no-config --node-modules-dir=none --lock=supabase/deno.lock --allow-env --allow-net supabase/tests/voice_draft_test.ts
```

2. 本機啟動 4175 後執行兩個 QA script；`PLAYWRIGHT_MODULE_PATH` 可指向已安裝的 Playwright。Live QA 需非個人資料的 WAV，可透過 `QA_AUDIO_FILE` 指定。Windows 可生成測試檔：

```powershell
Add-Type -AssemblyName System.Speech
New-Item -ItemType Directory -Force -Path 'outputs/voice-live-qa'
$qaSpeech = New-Object System.Speech.Synthesis.SpeechSynthesizer
$qaSpeech.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::NotSet, [System.Speech.Synthesis.VoiceAge]::NotSet, 0, [Globalization.CultureInfo]::GetCultureInfo('zh-TW'))
$qaSpeech.SetOutputToWaveFile((Join-Path (Get-Location) 'outputs/voice-live-qa/speech-fixture.wav'))
$qaSpeech.Speak('明天下午三點到四點，在大安森林公園健走。')
$qaSpeech.Dispose()
node scripts/qa-voice-live.mjs
node scripts/qa-voice-create.mjs
```

3. [正式 LIFF](https://liff.line.me/2011461980-fDJU0gL6) 實機測試：登入 → 錄音時看見繁體文字 → 停止後最後一句保留 → 草稿欄位正確／缺漏標示 → 確認地點 → 編輯 → 確認並建立。代理不擷取瀏覽器登入憑證，也不啟用使用者麥克風。
4. iOS Safari、Android Chrome、LINE 內建瀏覽器補測：拒絕權限、背景中斷、慢網路、額度不足、重試、草稿恢復、鍵盤與導覽列遮擋。
5. 退版時先回復前端，再回復 voice-draft 原始碼；不要刪除新增 migration／資料。單包超過 500KB 的既有提醒留待路由分包階段。

## 官方依據

- [Supabase：管理 Edge Function Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase：WebSockets](https://supabase.com/docs/guides/functions/websockets)
- [OpenRouter：Speech to text](https://openrouter.ai/docs/guides/overview/multimodal/stt)
- [OpenRouter：Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs)
- [Vite：環境變數與前端暴露範圍](https://vite.dev/guide/env-and-mode)
- [Google：Autocomplete Data API](https://developers.google.com/maps/documentation/javascript/place-autocomplete-data)
- [Google：Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies)
