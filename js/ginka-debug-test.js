(function () {
  'use strict';

  function log(msg) {
    var logEl = document.getElementById('log');
    if (!logEl) return;
    var time = new Date().toLocaleTimeString();
    logEl.innerHTML += '[' + time + '] ' + msg + '<br>';
    logEl.scrollTop = logEl.scrollHeight;
    console.log(msg);
  }

  function clearLog() {
    var logEl = document.getElementById('log');
    if (logEl) logEl.innerHTML = '';
  }

  function checkATRI() {
    if (typeof window.ATRI !== 'undefined') {
      log('✅ ATRI 对象存在');
      log('ATRI 类型: ' + typeof window.ATRI);
      log('ATRI 方法: ' + Object.keys(window.ATRI).join(', '));
      return;
    }
    log('❌ ATRI 对象不存在！');
  }

  function checkConfig() {
    if (typeof window.ATRI === 'undefined' || !window.ATRI.config) {
      log('❌ 配置对象不存在');
      return;
    }

    log('✅ 配置对象存在');
    var config = window.ATRI.config;

    if (config.messages && config.messages.talk) {
      log('✅ talk 台词数量: ' + config.messages.talk.length);
      config.messages.talk.forEach(function (msg, index) {
        log('  ' + (index + 1) + '. ' + msg);
      });
    } else {
      log('❌ talk 台词不存在');
    }

    if (config.voiceVolume !== undefined) {
      log('✅ 语音音量配置: ' + config.voiceVolume);
    } else {
      log('❌ 语音音量配置不存在');
    }
  }

  function testTalkMessages() {
    if (typeof window.ATRI === 'undefined' || !window.ATRI.config) return;
    var talk = window.ATRI.config.messages.talk;
    if (!talk || !talk.length) return;

    var randomMsg = talk[Math.floor(Math.random() * talk.length)];
    log('🎭 随机台词: ' + randomMsg);
    if (window.ATRI.showMessage) {
      window.ATRI.showMessage(randomMsg, 3000);
      log('✅ 已调用 showMessage');
    }
  }

  function testVolumeBtn() {
    var volumeBtn = document.getElementById('atri-volume');
    if (!volumeBtn) {
      log('❌ 找不到音量按钮');
      return;
    }

    log('✅ 找到音量按钮');
    var icon = volumeBtn.querySelector('i');
    if (icon) {
      log('图标类名: ' + icon.className);
      log('图标颜色: ' + icon.style.color);
    }

    var stored = localStorage.getItem('atri_voice_volume');
    log('存储的语音音量: ' + (stored || '无'));
  }

  function checkLocalStorage() {
    log('=== LocalStorage 内容 ===');
    ['atri_voice_volume', 'music_volume', 'music_playing', 'music_current_time'].forEach(function (key) {
      var value = localStorage.getItem(key);
      log(key + ': ' + (value || '(空)'));
    });
  }

  function testLyrics() {
    var audio = document.getElementById('bg-music');
    if (!audio) {
      log('❌ 找不到音频元素');
      return;
    }

    log('✅ 找到音频元素');
    log('当前时间: ' + audio.currentTime);
    log('播放状态: ' + (audio.paused ? '暂停' : '播放中'));
    log('当前标题: ' + document.title);
  }

  function checkTitle() {
    log('当前页面标题: ' + document.title);
  }

  window.clearLog = clearLog;
  window.checkATRI = checkATRI;
  window.checkConfig = checkConfig;
  window.testTalkMessages = testTalkMessages;
  window.testVolumeBtn = testVolumeBtn;
  window.checkLocalStorage = checkLocalStorage;
  window.testLyrics = testLyrics;
  window.checkTitle = checkTitle;

  window.addEventListener('load', function () {
    log('=== 页面加载完成 ===');
    window.setTimeout(function () {
      log('延迟 2 秒后检查...');
      checkATRI();
    }, 2000);
  });

  window.addEventListener('error', function (event) {
    log('❌ JavaScript 错误: ' + event.message);
  });
})();
