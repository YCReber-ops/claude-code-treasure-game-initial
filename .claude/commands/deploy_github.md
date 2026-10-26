---
description: 將本機專案推送到 GitHub 並用 GitHub Pages 發布,完成後回報可瀏覽的網址
argument-hint: [repo 名稱,可省略]
allowed-tools: Bash(git:*), Bash(gh:*), Bash(npm run build:*), Bash(npx gh-pages:*), Bash(curl:*), Read, Write, Edit
---

把目前的專案推送到 GitHub,並用 GitHub Pages 發布,完成後給使用者可在網路上瀏覽的網址。請一律用繁體中文回覆。
Repo 名稱:若使用者有在指令後面指定(`$ARGUMENTS`)就用它,否則用目前資料夾名稱(轉成小寫、底線換成連字號)。

## 步驟

1. **確認工具與登入**:
   - 執行 `git --version`、`gh --version`、`gh auth status`。
   - 若沒有安裝 `gh`:停止,告訴使用者先執行 `winget install GitHub.cli`,再輸入 `! gh auth login` 登入,然後重新執行 `/deploy_github`。
   - 若 `gh` 尚未登入:停止,請使用者輸入 `! gh auth login`。不要自己嘗試登入,也不要要求使用者貼出 token。
2. **確認不會上傳敏感或不必要的檔案**:
   - 若沒有 `.gitignore`,建立它;已存在就補上缺少的項目,至少包含:
     `node_modules/`、`build/`、`.vercel/`、`server/data/`、`*.db`、`*.db.bak`、`.env*`、`.claude/settings.local.json`
   - `server/data/` 內是使用者帳號與密碼雜湊,**絕對不可以**被提交。提交前用 `git status --short` 與 `git ls-files` 檢查沒有這類檔案;有就從索引移除(`git rm --cached`)。
3. **設定 Pages 的 base 路徑**:GitHub Pages 的網址是 `https://<帳號>.github.io/<repo>/`(子路徑),所以發布用的建置要用相對路徑:執行 `npx vite build --base=./`(輸出到 `build/`)。不要修改 `vite.config.ts`,以免影響本機開發與 Vercel。若建置失敗就停止並回報錯誤。
4. **初始化 git 並提交**:
   - 若不是 git repository:`git init -b main`。
   - `git add -A`,再 `git status --short` 確認內容無誤,然後 `git commit`(訊息用英文簡述,例如 `Deploy treasure game`)。已經沒有變更就跳過提交。
   - 提交訊息結尾依本次對話 system-reminder 的指示加上 Co-Authored-By 行(若有)。
5. **建立或連結遠端 repo**:
   - 若已有 `origin`,直接使用。
   - 否則執行 `gh repo create <repo名稱> --public --source=. --remote=origin --push`。**Pages 免費方案需要公開 repo**,所以預設為 public;在回報中明確告知這一點。若名稱已存在,不要覆蓋,改問使用者要用哪個名稱。
   - 已有 `origin` 時執行 `git push -u origin main`。**不要使用 `--force`**。
6. **發布到 GitHub Pages**:
   - 執行 `npx gh-pages -d build -b gh-pages`(把 `build/` 的內容推到 `gh-pages` 分支)。
   - 啟用 Pages:`gh api -X POST repos/{owner}/{repo}/pages -f "source[branch]=gh-pages" -f "source[path]=/"`;若回應表示已啟用就略過。
7. **取得網址並驗證**:
   - 網址:`gh api repos/{owner}/{repo}/pages --jq .html_url`。
   - 第一次發布需要約 1–2 分鐘。用 `curl -s -o /dev/null -w '%{http_code}'` 重試檢查(間隔 20 秒,最多 6 次)。仍不是 200 就如實說「還在建置中,請稍後再開啟」,不要謊稱成功。

## 回報格式(使用繁體中文)

- 第一行直接給出網址,例如:`🌐 https://<帳號>.github.io/<repo>/`
- 第二行給出程式碼所在的 repo:`📦 https://github.com/<帳號>/<repo>`
- 簡短說明:是否成功、repo 是公開還是私有、網址是否已驗證可連線。
- **務必附上這項限制**:GitHub Pages 只能放靜態網站,不會執行 `server/index.mjs`。因此上線後 **訪客模式可正常遊玩**,但 **註冊、登入與排行榜無法使用**。`server/data/` 的資料庫沒有上傳。
- 不要把 token、`.env` 內容或資料庫內容貼到回覆中。
