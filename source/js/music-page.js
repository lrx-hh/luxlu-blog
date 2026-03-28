(function () {
  const PLAYLIST_ID = "2348551439";

  function buildShellHtml() {
    return (
      '<h2>luxlu 的歌单</h2>' +
      '<p class="music-tip">已固定加载歌单 ID：<code>' + PLAYLIST_ID + '</code></p>' +
      '<div class="music-player-fixed">' +
      '<iframe title="netease-playlist-' + PLAYLIST_ID + '" ' +
      'src="https://music.163.com/outchain/player?type=0&id=' + PLAYLIST_ID + '&auto=0&height=430" ' +
      'width="100%" height="520" frameborder="0" allow="autoplay; encrypted-media" loading="lazy"></iframe>' +
      '</div>' +
      '<p class="music-open-link">如果播放器加载慢，可直接打开：' +
      '<a href="https://music.163.com/#/my/m/music/playlist?id=' + PLAYLIST_ID + '" target="_blank" rel="noopener">网易云歌单链接</a></p>'
    );
  }

  function normalizeMusicPage() {
    const shell = document.getElementById("music-page-shell");
    if (!shell) return;
    if (shell.dataset.fixedMusic === "1") return;

    // If old cached markup is loaded by pjax, force replace to fixed embed view.
    shell.innerHTML = buildShellHtml();
    shell.dataset.fixedMusic = "1";
  }

  document.addEventListener("DOMContentLoaded", normalizeMusicPage);
  document.addEventListener("pjax:complete", normalizeMusicPage);
})();
