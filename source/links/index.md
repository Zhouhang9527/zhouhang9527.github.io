---
title: 友情链接
date: 2025-10-09 17:35:15
type: "links"
comments: false
---

# 友情链接

欢迎交换友情链接！本站专注于网络安全、逆向工程等领域，如果你也从事相关领域，欢迎互换友链。

## 申请友链

请在评论区留言或通过邮件联系我，提供以下信息：
- 网站名称
- 网站地址
- 网站描述
- 网站图标（可选）

## 我的信息

- **网站名称**: GINKA
- **网站地址**: https://Zhouhang9527.github.io
- **网站描述**: 专注于网络安全、逆向工程、安全研究的技术博客
- **网站图标**: https://Zhouhang9527.github.io/images/avatar.png

## 友情链接

<div class="links-container">
  <div class="link-card">
    <div class="link-avatar">
      <img src="/images/nssctf.ico" alt="NSSCTF" />
    </div>
    <div class="link-info">
      <h3><a href="https://www.nssctf.cn/" target="_blank" rel="noopener">NSSCTF</a></h3>
      <p>国内知名的网络安全技能学习平台，提供丰富的CTF题目和学习资源。</p>
    </div>
  </div>
</div>

<style>
.links-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.link-card {
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px) saturate(1.8);
  -webkit-backdrop-filter: blur(20px) saturate(1.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
  animation: fadeIn 0.8s ease-out forwards;
}

.link-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.2);
}

.link-avatar {
  width: 60px;
  height: 60px;
  margin-right: 20px;
  flex-shrink: 0;
}

.link-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  object-fit: cover;
}

.link-info h3 {
  margin: 0 0 8px 0;
  font-family: 'LXGW WenKai', cursive;
}

.link-info h3 a {
  color: #333;
  text-decoration: none;
  transition: color 0.3s ease;
}

.link-info h3 a:hover {
  color: #5b99e5;
}

.link-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
