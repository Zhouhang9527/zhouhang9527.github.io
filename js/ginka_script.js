// ======================================================
// GINKA Utility Script - 核心功能
// ======================================================

document.addEventListener('DOMContentLoaded', function() {
  autoAssignTaxonomies();
});

// Auto-detect tags and categories based on article keywords
function autoAssignTaxonomies() {
  const postBody = document.querySelector('.post-body');
  if (!postBody) return;

  const articleText = postBody.textContent.toLowerCase();
  const rules = [
    { keywords: ['pwn', 'heap', 'exploit', '漏洞利用'], tags: ['pwn', '漏洞利用'], categories: ['pwn'] },
    { keywords: ['reverse', '逆向', 'ida', '反编译'], tags: ['reverse', '逆向工程'], categories: ['reverse'] },
    { keywords: ['web', 'csrf', 'sql', 'xss', 'http'], tags: ['Web'], categories: ['web'] },
    { keywords: ['binary', 'shellcode', '汇编', '寄存器'], tags: ['二进制分析'], categories: ['binary'] }
  ];

  const existingTagTexts = new Set(
    Array.from(document.querySelectorAll('.post-tags a[rel="tag"]')).map(tag => tag.textContent.replace('#', '').trim().toLowerCase())
  );

  const categoryMetaItem = findCategoryMetaItem();
  const existingCategoryTexts = new Set();
  if (categoryMetaItem) {
    categoryMetaItem.querySelectorAll('span[itemprop="name"]').forEach(span => {
      existingCategoryTexts.add(span.textContent.trim().toLowerCase());
    });
  }

  const tagsToAdd = new Set();
  const categoriesToAdd = new Set();

  rules.forEach(rule => {
    if (!rule.keywords.some(keyword => articleText.includes(keyword.toLowerCase()))) return;
    (rule.tags || []).forEach(tag => {
      if (!existingTagTexts.has(tag.toLowerCase())) {
        tagsToAdd.add(tag);
      }
    });
    (rule.categories || []).forEach(category => {
      if (!existingCategoryTexts.has(category.toLowerCase())) {
        categoriesToAdd.add(category);
      }
    });
  });

  if (tagsToAdd.size) {
    let tagContainer = document.querySelector('.post-footer .post-tags');
    if (!tagContainer) {
      const footer = document.querySelector('.post-footer');
      if (footer) {
        tagContainer = document.createElement('div');
        tagContainer.className = 'post-tags';
        footer.insertBefore(tagContainer, footer.firstChild);
      }
    }
    if (tagContainer) {
      tagsToAdd.forEach(tag => {
        const link = document.createElement('a');
        link.href = `/tags/${slugify(tag)}/`;
        link.rel = 'tag';
        link.textContent = `# ${tag}`;
        tagContainer.appendChild(link);
      });
    }
  }

  if (categoriesToAdd.size) {
    let categoryMeta = findCategoryMetaItem();
    if (!categoryMeta) {
      const postMeta = document.querySelector('.post-meta');
      if (postMeta) {
        categoryMeta = document.createElement('span');
        categoryMeta.className = 'post-meta-item';
        categoryMeta.innerHTML = '<span class="post-meta-item-icon"><i class="far fa-folder"></i></span><span class="post-meta-item-text">分类于</span>';
        postMeta.appendChild(categoryMeta);
      }
    }
    if (categoryMeta) {
      categoriesToAdd.forEach(category => {
        categoryMeta.appendChild(document.createTextNode(' '));
        const wrapper = document.createElement('span');
        wrapper.setAttribute('itemprop', 'about');
        wrapper.setAttribute('itemscope', '');
        wrapper.setAttribute('itemtype', 'http://schema.org/Thing');

        const link = document.createElement('a');
        link.href = `/categories/${slugify(category)}/`;
        link.setAttribute('itemprop', 'url');
        link.rel = 'index';

        const nameSpan = document.createElement('span');
        nameSpan.setAttribute('itemprop', 'name');
        nameSpan.textContent = category;

        link.appendChild(nameSpan);
        wrapper.appendChild(link);
        categoryMeta.appendChild(wrapper);
      });
    }
  }
}

function findCategoryMetaItem() {
  const items = document.querySelectorAll('.post-meta .post-meta-item');
  for (const item of items) {
    const icon = item.querySelector('.post-meta-item-icon i');
    if (icon && icon.classList.contains('fa-folder')) {
      return item;
    }
  }
  return null;
}

function slugify(label) {
  return encodeURIComponent(label.trim());
}
