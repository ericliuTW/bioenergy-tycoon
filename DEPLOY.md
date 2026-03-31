# 部署教學：GitHub + Vercel

## 步驟一：建立 GitHub Repository

1. 開啟終端機（Terminal），進入專案資料夾：
   ```bash
   cd bioenergy-tycoon
   ```

2. 初始化 Git 並建立第一次提交：
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Bioenergy Tycoon game"
   ```

3. 到 GitHub 網站，點右上角 **+** > **New repository**
   - Repository name: `bioenergy-tycoon`
   - 選擇 **Public**（學生才能透過 Vercel 存取）
   - **不要**勾選 Initialize with README（我們已經有了）
   - 點 **Create repository**

4. 依照 GitHub 頁面上的提示，連結遠端並推送：
   ```bash
   git remote add origin https://github.com/你的帳號/bioenergy-tycoon.git
   git branch -M main
   git push -u origin main
   ```

## 步驟二：部署到 Vercel

1. 到 [vercel.com](https://vercel.com)，用 GitHub 帳號登入

2. 點 **Add New** > **Project**

3. 在 **Import Git Repository** 列表中找到 `bioenergy-tycoon`，點 **Import**

4. 設定頁面：
   - **Framework Preset**: 選 `Other`
   - **Root Directory**: 維持空白（預設為根目錄）
   - **Build Command**: 留空（純靜態檔案，不需要建置）
   - **Output Directory**: 留空或填 `.`
   - 不需要設定環境變數

5. 點 **Deploy**

6. 等約 30 秒部署完成後，Vercel 會給你一個網址，例如：
   ```
   https://bioenergy-tycoon.vercel.app
   ```

7. 將此網址分享給學生即可！

## 步驟三：更新遊戲

每次修改程式碼後，只要推送到 GitHub，Vercel 就會自動重新部署：

```bash
git add .
git commit -m "更新遊戲內容"
git push
```

約 30 秒後，學生刷新網頁就能看到最新版本。

## 自訂網域名稱（選用）

在 Vercel 的 Project Settings > Domains 可以設定自訂網域，例如 `game.yourschool.edu.tw`。

## 注意事項

- 遊戲是純前端應用，**不需要後端伺服器**
- 20 位學生同時開網址各玩各的，完全沒有伺服器負載問題
- 每位學生的遊戲資料存在各自的瀏覽器中，不會互相影響
- 確保學生使用 **Chrome 瀏覽器**以獲得最佳體驗
- Vercel 免費方案每月 100GB 流量，對 20 位學生綽綽有餘

## 備用方案：GitHub Pages

如果 Vercel 有問題，也可以用 GitHub Pages：

1. 到 GitHub repository > **Settings** > **Pages**
2. Source 選 **Deploy from a branch**
3. Branch 選 `main`，folder 選 `/ (root)`
4. 點 **Save**
5. 約 1-2 分鐘後，網址為 `https://你的帳號.github.io/bioenergy-tycoon/`
