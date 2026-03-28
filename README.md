# LuxLu Butterfly Blog

`Hexo + Butterfly` 黑粉色 CTF 博客模板，已预设 `luxlu.top`。

## 1) 本地预览

```powershell
cd E:\story\luxlu-butterfly
npm install
npm run server
```

浏览器打开：`http://localhost:4000`

## 2) 必改配置

编辑 `E:\story\luxlu-butterfly\_config.yml`：

1. 把 `deploy.repo` 改成你的 GitHub 仓库地址
2. 推荐仓库名：`luxlu-blog`
3. `branch` 保持 `gh-pages`

编辑 `E:\story\luxlu-butterfly\_config.butterfly.yml`：

1. 把 `social` 里的 GitHub 和邮箱改成你的
2. 把 `aside.card_author.button.link` 改成你的 GitHub

## 3) 发布到 GitHub Pages

第一次发布：

```powershell
cd E:\story\luxlu-butterfly
git init
git add .
git commit -m "init butterfly blog"
git remote add origin https://github.com/<你的GitHub用户名>/luxlu-blog.git
git push -u origin main
```

后续发布（文章更新）：

```powershell
cd E:\story\luxlu-butterfly
npm run clean
npm run build
npm run deploy
```

## 4) 绑定阿里云域名 `luxlu.top`

到阿里云域名解析添加记录：

1. `@` 记录，类型 `A`，值 `185.199.108.153`
2. `@` 记录，类型 `A`，值 `185.199.109.153`
3. `@` 记录，类型 `A`，值 `185.199.110.153`
4. `@` 记录，类型 `A`，值 `185.199.111.153`
5. `www` 记录，类型 `CNAME`，值 `<你的GitHub用户名>.github.io`

然后到 GitHub 仓库 `Settings -> Pages`：

1. Source 选择 `Deploy from a branch`
2. Branch 选择 `gh-pages` + `/ (root)`
3. Custom domain 填 `luxlu.top`
4. 打开 `Enforce HTTPS`

> 本项目已经放了 `source/CNAME`，`hexo generate` 后会自动带 `CNAME` 文件。

## 5) 常用命令

```powershell
# 新建文章
npx hexo new "你的文章标题"

# 新建页面
npx hexo new page about
```
