(function () {
  "use strict";

  var bank = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];
  var meta = Array.isArray(window.CHAPTERS) ? window.CHAPTERS : [];
  var app = document.getElementById("app");

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function chapterParts(name) {
    var at = name.indexOf(" ");
    if (at < 0) return ["", name];
    return [name.slice(0, at), name.slice(at + 1)];
  }

  function itemsOf(name) {
    return bank.filter(function (q) { return q.chapter === name; });
  }

  function chapters() {
    return meta.slice().sort(function (a, b) { return a.no - b.no; });
  }

  /* 题目里的 ___ 换成横线，==重点== 换成红色加粗 */
  function questionHTML(text) {
    return esc(text)
      .replace(/_{3,}/g, '<span class="blank"></span>')
      .replace(/==([^=]+)==/g, '<strong class="hl">$1</strong>');
  }

  function renderHome() {
    var list = chapters();
    var ready = list.filter(function (c) { return c.ready; });
    var pending = list.filter(function (c) { return !c.ready; });
    var total = bank.length;
    var pendingNames = pending.map(function (c) { return chapterParts(c.name)[0]; }).join("、");

    document.title = "政治理论 · 章节背诵";
    app.innerHTML =
      '<header class="top"><div class="brand"><span class="seal">政</span><span><strong>政治理论</strong><small>山东专升本 · 填空背诵</small></span></div><span class="pill">答案折叠</span></header>' +
      '<p class="eyebrow">POLITICAL THEORY · RECITE</p>' +
      '<h1>选一章，<br>逐题背一遍。</h1>' +
      '<p class="lead">每章的填空按整理稿顺序排在一页。先自己回想横线里该填什么，再点开题目对答案；也可以一键全部展开对照。</p>' +
      '<p class="progress"><b>' + ready.length + '</b> / ' + list.length + ' 章已整理 · ' + total + ' 题</p>' +
      '<div class="note"><span>记</span><span><b>答案默认收起：</b>点题目任意位置展开，点「全部展开」可以一次对照本章所有答案。</span></div>' +
      '<div class="section-title"><strong>选择章节</strong><span>已整理 ' + ready.length + ' 章 · ' + total + ' 题</span></div>' +
      (ready.length
        ? '<div class="grid' + (ready.length === 1 ? " solo" : "") + '">' + ready.map(function (item) {
            var parts = chapterParts(item.name);
            return '<button class="category" type="button" data-chapter="' + esc(item.name) + '" data-no="' + item.no + '">' +
              '<span class="ch-no">' + esc(parts[0]) + '</span>' +
              '<strong>' + esc(parts[1]) + '</strong>' +
              '<span class="count">共 ' + itemsOf(item.name).length + ' 题</span>' +
              '<em>点开背诵 →</em>' +
              '</button>';
          }).join("") + '</div>'
        : '<p class="empty">还没有整理好的章节。</p>') +
      (pending.length
        ? '<p class="pending-note"><b>待整理：</b>' + esc(pendingNames) + '。整理稿发我后，按同样格式加进来。</p>'
        : "") +
      '<p class="foot-note">共 ' + list.length + ' 章 · ' + total + ' 题。答案来自整理稿，发现错漏告诉我。</p>';
    window.scrollTo(0, 0);
  }

  function renderQuestion(question, index) {
    var answer = question.answer
      ? '<p class="q-answer">' + esc(question.answer) + '</p>'
      : '<p class="q-answer missing">答案待补</p>';
    return '<details class="q-item">' +
      '<summary>' +
      '<span class="q-no">' + String(index + 1).padStart(2, "0") + '</span>' +
      '<span class="q-main"><span class="q-stem">' + questionHTML(question.question) + '</span></span>' +
      '<span class="q-toggle"><span class="tg-closed">看答案</span><span class="tg-open">收起</span></span>' +
      '</summary>' +
      '<div class="q-body">' +
      '<div class="q-block"><span class="q-label">答案</span>' + answer + '</div>' +
      '</div></details>';
  }

  function renderChapter(name) {
    var parts = chapterParts(name);
    var items = itemsOf(name);
    document.title = parts[1] + " · 政治理论";
    app.innerHTML =
      '<div class="reader">' +
      '<header class="reader-top">' +
      '<button class="back" type="button" data-action="home">← 目录</button>' +
      '<span class="reader-name">政治理论 · 填空背诵</span>' +
      '<span class="reader-count">' + items.length + ' 题</span>' +
      '</header>' +
      '<div class="chapter-intro">' +
      '<p class="eyebrow">' + esc(parts[0]) + '</p>' +
      '<h1>' + esc(parts[1]) + '</h1>' +
      '<p class="lead">共 ' + items.length + ' 题。先自己回想横线里该填什么，再点开对答案。</p>' +
      '</div>' +
      '<div class="toolbar">' +
      '<span class="toolbar-hint">点题目任意位置展开 / 收起</span>' +
      '<div class="tool-btns">' +
      '<button class="tool-btn" type="button" data-action="expand">全部展开</button>' +
      '<button class="tool-btn" type="button" data-action="collapse">全部收起</button>' +
      '</div></div>' +
      '<div class="q-list">' + items.map(renderQuestion).join("") + '</div>' +
      '<p class="reader-foot">本章完 · 答案来自整理稿，发现错漏告诉我。</p>' +
      '</div>';
    window.scrollTo(0, 0);
  }

  function setAll(open) {
    var list = document.querySelectorAll(".q-item");
    for (var i = 0; i < list.length; i++) list[i].open = open;
  }

  function chapterByNo(no) {
    var list = chapters();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].no) === String(no)) return list[i];
    }
    return null;
  }

  function route() {
    var match = /^#ch(\d+)$/.exec(location.hash || "");
    if (match) {
      var chapter = chapterByNo(match[1]);
      if (chapter && chapter.ready) { renderChapter(chapter.name); return; }
    }
    renderHome();
  }

  app.addEventListener("click", function (event) {
    var card = event.target.closest("[data-chapter]");
    if (card) {
      location.hash = "#ch" + card.getAttribute("data-no");
      return;
    }

    var action = event.target.closest("[data-action]");
    if (!action) return;
    var name = action.getAttribute("data-action");
    if (name === "home") {
      if (location.hash) location.hash = "";
      else renderHome();
      return;
    }
    if (name === "expand") setAll(true);
    else if (name === "collapse") setAll(false);
  });

  window.addEventListener("hashchange", route);
  route();
})();
