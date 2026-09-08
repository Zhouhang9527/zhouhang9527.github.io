document.addEventListener('page:loaded', function () {
  document.querySelectorAll('.post-like-btn').forEach(function (btn) {
    if (btn.dataset.ginkaBound === '1') return;
    btn.dataset.ginkaBound = '1';

    var postPath = btn.dataset.postPath;
    var likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
    if (likedPosts[postPath]) {
      var initialHeart = btn.querySelector('.fa-heart');
      var initialText = btn.querySelector('.like-text');
      if (initialHeart) initialHeart.classList.add('liked');
      if (initialText) initialText.textContent = '已点赞';
    }

    btn.addEventListener('click', function () {
      var heart = btn.querySelector('.fa-heart');
      var likeText = btn.querySelector('.like-text');
      var likeCount = btn.querySelector('.like-count');
      if (!heart || !likeText || !likeCount) return;

      var isLiked = heart.classList.contains('liked');
      var currentCount = parseInt((likeCount.textContent.match(/\d+/) || ['0'])[0], 10);

      if (isLiked) {
        heart.classList.remove('liked');
        likeText.textContent = '点赞';
        likeCount.textContent = '(' + Math.max(0, currentCount - 1) + ')';
      } else {
        heart.classList.add('liked');
        likeText.textContent = '已点赞';
        likeCount.textContent = '(' + (currentCount + 1) + ')';
        heart.style.transform = 'scale(1.3)';
        window.setTimeout(function () {
          heart.style.transform = 'scale(1)';
        }, 300);
      }

      likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
      if (isLiked) {
        delete likedPosts[postPath];
      } else {
        likedPosts[postPath] = true;
      }
      localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
    });
  });

  var warning = document.getElementById('ginka-dislike-warning');
  if (warning) {
    document.querySelectorAll('.post-dislike-btn').forEach(function (btn) {
      if (btn.dataset.ginkaBound === '1') return;
      btn.dataset.ginkaBound = '1';
      btn.addEventListener('click', function () {
        warning.style.display = 'flex';
        window.setTimeout(function () {
          warning.style.display = 'none';
        }, 3000);
      });
    });

    var closeBtn = warning.querySelector('.ginka-close');
    if (closeBtn && closeBtn.dataset.ginkaBound !== '1') {
      closeBtn.dataset.ginkaBound = '1';
      closeBtn.addEventListener('click', function () {
        warning.style.display = 'none';
      });
    }
  }

  document.querySelectorAll('.views-count').forEach(function (counter) {
    var postPath = counter.dataset.postPath;
    if (!postPath) return;
    if (counter.dataset.ginkaViewBooted === '1') return;
    counter.dataset.ginkaViewBooted = '1';

    var storageKey = 'postViews_' + postPath;
    var cachedViews = localStorage.getItem(storageKey);
    if (cachedViews) {
      counter.textContent = cachedViews;
    }

    window.setTimeout(function () {
      var currentViews = parseInt(localStorage.getItem(storageKey) || '0', 10);
      var newViews = currentViews + 1;

      counter.textContent = String(newViews);
      localStorage.setItem(storageKey, String(newViews));
      counter.style.transform = 'scale(1.1)';
      counter.style.color = '#5b99e5';

      window.setTimeout(function () {
        counter.style.transform = 'scale(1)';
        counter.style.color = '#666';
      }, 300);
    }, 1000);
  });
});
