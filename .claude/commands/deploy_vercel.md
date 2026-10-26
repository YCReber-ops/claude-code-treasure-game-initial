---
description: 將本機專案部署到 Vercel,完成後回報可在網路上瀏覽的網址
allowed-tools: Bash(npm run build:*), Bash(npx vercel:*), Read, Write
---

把目前的專案部署到 Vercel(正式環境),完成後把網址給使用者。請一律用繁體中文回覆。

## 步驟

1. **先確認可建置**:執行 `npm run build`。失敗就停止,回報錯誤,不要部署。
2. **確認 Vercel 設定**:
   - 此專案(Vite)的輸出資料夾是 `build/`,不是 Vercel 預設的 `dist/`。
   - 若專案根目錄沒有 `vercel.json`,建立它,內容為:
     `{ "buildCommand": "npm run build", "outputDirectory": "build" }`
   - 已存在就先讀取,內容正確就不要改。
3. **確認已登入**:執行 `npx vercel whoami`。
   - 若尚未登入,停止並告訴使用者在輸入框輸入 `! npx vercel login` 完成登入後再重新執行 `/deploy_vercel`。不要自己嘗試登入或要求使用者貼出 token。
4. **部署**:執行 `npx vercel --prod --yes`。第一次執行會自動建立並連結 Vercel 專案(連結資訊存在 `.vercel/`)。
5. **取得網址**:從輸出中找出 `Production:` 或 `Aliased:` 那一行的網址(`https://...vercel.app`)。必要時用 `npx vercel ls` 補查。

## 回報格式

- 第一行直接給出網址,例如:`🌐 https://your-project.vercel.app`
- 接著簡短說明:部署是否成功、使用的專案名稱。
- **務必附上這項限制**:此專案的登入/排行榜依賴 `server/index.mjs`(Node + SQLite 檔案資料庫),Vercel 是 serverless,不會執行這個 server,也無法保存 SQLite 檔案。因此部署後 **訪客模式可正常遊玩**,但 **註冊、登入與排行榜會無法使用**(`/api` 請求會失敗)。若使用者想讓這些功能上線,建議把後端改成可持久化的方案(例如 Vercel Postgres / Turso / Supabase),或把 API 部署到支援長駐程序與磁碟的主機,並詢問是否要協助。
- 不要把 `.vercel/`、token 或環境變數內容貼到回覆中。
