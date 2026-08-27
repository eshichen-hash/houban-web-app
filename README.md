# 公園好伴｜Vue 核心流程 v0.2

這是從既有高擬真單檔原型拆出的獨立 Vue 3 + Vite + Vue Router 正式開發基礎。它不會覆蓋 `formal-site`，目前仍使用本地假資料，不連接 Google、LINE、GitHub、Vercel 或 Supabase。

## 開發指令

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

本地預覽埠號依啟動指令而定；例如：`npm run dev -- --host 127.0.0.1 --port 4175`

## 路由

- `/`：首次進入引導
- `/explore`：今日推薦、輪播、收藏、日期／興趣篩選與結果列表
- `/park/:id`：依公園查看活動列表
- `/activity/:id`：活動詳情、信任資訊與報名 CTA
- `/registration/:id`：報名確認
- `/success/:id`：報名成功
- `/create`：三步快速發起活動
- `/manage`：本地示意的我發起的活動
- `/my`：已報名與收藏活動

## 元件責任

- `AppShell.vue`：路由外層、背景層與底部導覽顯示規則。
- `BottomNav.vue`：探索／發起／我的三個一級導覽。
- `EventCard.vue`：推薦卡與結果卡共用的活動資訊、收藏、詳情與分享操作。
- `FilterPanel.vue`：日期與興趣篩選的展開／收合與選擇事件。
- `useAppState.ts`：本地假資料的查詢、收藏、報名與建立活動 actions。

## 本階段已建立的正式邊界

- `src/data/events.ts`：本地假資料與型別；之後可替換成 API repository，不需要改動畫面元件。
- `src/composables/useAppState.ts`：唯一的前端狀態入口，收藏、報名、建立活動與篩選狀態會保存在瀏覽器本機。
- `src/components/`：跨頁共用的品牌、導覽、活動卡與篩選元件。
- `src/views/`：以 URL 可直接進入的頁面為單位，保留之後接 LIFF／Supabase 的路由邊界。
- `vercel.json`：保留 Vue Router history mode 的 fallback 設定，後續部署時可直接使用。

本階段的「正式」是指前端架構與核心流程可持續開發，不代表第三方服務與正式資料庫已上線。

## 下一階段順序

1. 先完成前端元件與狀態的 UX／RWD 回歸。
2. 建立 GitHub repository 與 branch／PR 流程。
3. 設定 Vercel preview deployment 與環境變數。
4. 接入 LIFF 登入與 LINE 分享。
5. 設計 Supabase schema、RLS、Storage，再把本地 actions 替換成 API。
6. 最後接入 Google Places、Place ID 去重與地圖選公園。
