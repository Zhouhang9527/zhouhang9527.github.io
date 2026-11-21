// ===================================================
// GINKA Blog - 原生图片懒加载
// 为所有图片添加 loading="lazy" 属性
// ===================================================

hexo.extend.filter.register('after_render:html', function(str) {
  // 为图片添加原生懒加载属性
  // 跳过已经有 loading 属性的图片
  str = str.replace(/<img(?![^>]*loading\s*=)([^>]*)>/gi, '<img loading="lazy"$1>');
  
  // 为 iframe 也添加懒加载（如嵌入视频）
  str = str.replace(/<iframe(?![^>]*loading\s*=)([^>]*)>/gi, '<iframe loading="lazy"$1>');
  
  return str;
});
