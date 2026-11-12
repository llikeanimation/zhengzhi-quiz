(function () {
  "use strict";

  var bank = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];
  var meta = Array.isArray(window.CHAPTERS) ? window.CHAPTERS : [];
  var STORAGE_KEY = "zhengzhi-chapter-quiz-v1";
  var TYPE_NAME = { single: "单选", multi: "多选" };
  var LETTERS = "ABCDEF";

  var app = document.getElementById("app");
  var storageOk = true;
  var store = loadStore();
  var state = {
    screen: "home",
    chapter: "",
    type: "",
    items: [],
    index: 0,
    selected: [],
    record: null
  };

  function loadStore() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { sets: {} };
      var data = JSON.parse(raw);
      return data && typeof data === "object" && data.sets ? data : { sets: {} };
    } catch (error) {
      storageOk = false;
      return { sets: {} };
    }
  }

  function saveStore() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      storageOk = false;
    }
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 解析里用 **加粗** 标重点，转成 <strong>，其余字符先转义。
  function rich(value) {
    return esc(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }

  function keyOf(chapter, type) {
    return chapter + "||" + type;
  }

  function progressFor(chapter, type) {
    var key = keyOf(chapter, type);
    if (!store.sets[key]) {
      store.sets[key] = { answers: {}, index: 0, scoreHalf: 0, completed: false, draft: [] };
    }
    return store.sets[key];
  }

  function itemsOf(chapter, type) {
    return bank.filter(function (q) {
      return q.chapter === chapter && q.type === type;
    });
  }

  function chapters() {
    if (meta.length) return meta;
    var map = new Map();
    bank.forEach(function (q) {
      if (!map.has(q.chapter)) {
        map.set(q.chapter, { no: q.chapterNo, name: q.chapter, single: 0, multi: 0 });
      }
      var item = map.get(q.chapter);
      if (q.type === "single") item.single += 1;
      else item.multi += 1;
    });
    return Array.from(map.values()).sort(function (a, b) { return a.no - b.no; });
  }

  function chapterParts(name) {
    var at = name.indexOf(" ");
    if (at < 0) return ["", name];
    return [name.slice(0, at), name.slice(at + 1)];
  }

  function percentOf(progress, total) {
    if (!total) return 0;
    return Math.round((progress.scoreHalf / (total * 2)) * 100);
  }

  function formatScore(half) {
    var value = half / 2;
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  function typeStatus(chapter, type, total) {
    var progress = progressFor(chapter, type);
    if (progress.completed) return "已完成 · 正确率 " + percentOf(progress, total) + "%";
    if (progress.index > 0) return "继续 · 已答 " + progress.index + " / " + total;
    return "未开始";
  }

  function chapterStatus(item) {
    var singleProgress = progressFor(item.name, "single");
    var multiProgress = progressFor(item.name, "multi");
    var done = Math.min(singleProgress.index, item.single) + Math.min(multiProgress.index, item.multi);
    var total = item.single + item.multi;
    var allDone = (item.single === 0 || singleProgress.completed) &&
      (item.multi === 0 || multiProgress.completed);
    if (allDone) return "已完成 · 点开看成绩";
    if (done > 0) return "继续 · 已答 " + done + " / " + total;
    return "进入 →";
  }

  function renderHome() {
    var list = chapters();
    var total = bank.length;
    var totalSingle = bank.filter(function (q) { return q.type === "single"; }).length;
    var totalMulti = total - totalSingle;
    app.innerHTML =
      '<header class="top"><div class="brand"><span class="seal">政</span><span><strong>政治理论</strong><small>山东专升本 · 章节刷题</small></span></div><span class="pill">按章分单选 / 多选</span></header>' +
      '<p class="eyebrow">POLITICAL THEORY · CHAPTER PRACTICE</p>' +
      '<h1>选一章，<br>按题型刷完整套。</h1>' +
      '<p class="lead">八章内容分成“单选”和“多选”两条线。每套从第 1 题顺序做到最后，交卷后立即出分，并逐题回看解析。</p>' +
      '<div class="note"><span>记</span><span><b>进度自动保存：</b>做到一半退出，下次点同一章同一题型会从上次的位置继续；做完的套题会留下正确率。</span></div>' +
      '<div class="section-title"><strong>选择章节</strong><span>共 ' + list.length + ' 章 · ' + totalSingle + ' 单选 · ' + totalMulti + ' 多选</span></div>' +
      '<div class="grid">' + list.map(function (item) {
        var parts = chapterParts(item.name);
        var singleProgress = progressFor(item.name, "single");
        var multiProgress = progressFor(item.name, "multi");
        var cls = "category";
        if ((item.single === 0 || singleProgress.completed) && (item.multi === 0 || multiProgress.completed)) cls += " done";
        else if (singleProgress.index > 0 || multiProgress.index > 0) cls += " active";
        return '<button class="' + cls + '" type="button" data-chapter="' + esc(item.name) + '">' +
          '<span class="ch-no">' + esc(parts[0]) + '</span>' +
          '<strong>' + esc(parts[1]) + '</strong>' +
          '<span>单选 ' + item.single + ' · 多选 ' + item.multi + '</span>' +
          '<em>' + esc(chapterStatus(item)) + '</em>' +
          '</button>';
      }).join("") + '</div>' +
      '<p class="storage-note">' + (storageOk ? "进度已自动保存到本机浏览器" : "当前浏览器禁用本地存储，关闭页面后进度可能丢失") + '</p>';
    state.screen = "home";
  }

  function renderTypes() {
    var parts = chapterParts(state.chapter);
    var single = itemsOf(state.chapter, "single").length;
    var multi = itemsOf(state.chapter, "multi").length;
    app.innerHTML =
      '<header class="top"><div class="brand"><span class="seal">政</span><span><strong>' + esc(parts[0]) + '</strong><small>' + esc(parts[1]) + '</small></span></div><span class="pill">' + (single + multi) + ' 道</span></header>' +
      '<button class="back" type="button" data-action="home">← 返回章节</button>' +
      '<p class="eyebrow" style="margin-top:22px">CHOOSE TYPE</p>' +
      '<h1>先做单选，<br>还是多选？</h1>' +
      '<p class="lead">两种题型分开练，各自从第 1 题顺序做到底。多选少选得一半分，多选或错选不得分。</p>' +
      '<div class="type-list">' +
      '<button class="type-card" type="button" data-type="single"' + (single ? "" : " disabled") + '>' +
      '<strong>单选</strong><span class="sub">SINGLE CHOICE</span>' +
      '<span>共 ' + single + ' 道 · 每题 1 分</span>' +
      '<em>' + (single ? esc(typeStatus(state.chapter, "single", single)) + ' →' : "这一章暂时没有单选题") + '</em></button>' +
      '<button class="type-card" type="button" data-type="multi"' + (multi ? "" : " disabled") + '>' +
      '<strong>多选</strong><span class="sub">MULTIPLE CHOICE</span>' +
      '<span>共 ' + multi + ' 道 · 少选得 0.5 分</span>' +
      '<em>' + (multi ? esc(typeStatus(state.chapter, "multi", multi)) + ' →' : "这一章暂时没有多选题") + '</em></button>' +
      '</div>' +
      '<p class="storage-note">' + (storageOk ? "进度已自动保存到本机浏览器" : "当前浏览器禁用本地存储，关闭页面后进度可能丢失") + '</p>';
    state.screen = "types";
  }

  function judge(question, selected) {
    var answer = question.answer.split("");
    if (question.type === "single") {
      return selected.length === 1 && selected[0] === question.answer ? 1 : 0;
    }
    var picked = selected.slice().sort();
    var all = answer.slice().sort();
    if (picked.length === all.length && picked.every(function (letter, i) { return letter === all[i]; })) return 1;
    if (picked.length > 0 && picked.length < all.length && picked.every(function (letter) {
      return all.indexOf(letter) >= 0;
    })) return 0.5;
    return 0;
  }

  function startSet(type) {
    state.type = type;
    state.items = itemsOf(state.chapter, type);
    state.screen = "quiz";
    if (!state.items.length) { renderTypes(); return; }
    var progress = progressFor(state.chapter, type);
    if (progress.completed) {
      state.index = 0;
      state.record = null;
      renderResult();
      return;
    }
    state.index = Math.min(progress.index, state.items.length - 1);
    state.record = progress.answers[state.index] || null;
    state.selected = state.record
      ? state.record.selected.slice()
      : (Array.isArray(progress.draft) ? progress.draft.slice() : []);
    renderQuiz();
    window.scrollTo(0, 0);
  }

  function renderQuiz() {
    var question = state.items[state.index];
    if (!question) { renderTypes(); return; }
    var answered = Boolean(state.record);
    var isMulti = question.type === "multi";
    var correct = question.answer.split("");
    var barWidth = Math.round(((state.index + (answered ? 1 : 0)) / state.items.length) * 100);
    var options = question.options.map(function (text, i) {
      var letter = LETTERS[i];
      var picked = state.selected.indexOf(letter) >= 0;
      var isCorrect = correct.indexOf(letter) >= 0;
      var cls = "option" + (isMulti ? " multi" : "");
      var mark = "";
      if (answered) {
        if (isCorrect) {
          cls += " correct";
          mark = isMulti && !picked ? '<span class="miss">漏选</span>' : "✓";
        } else if (picked) {
          cls += " wrong";
          mark = "✕";
        } else {
          cls += " dim";
        }
      } else if (picked) {
        cls += " selected";
      }
      return '<button class="' + cls + '" type="button" data-option="' + letter + '" aria-pressed="' + picked + '"' +
        (answered ? ' aria-disabled="true"' : "") + '>' +
        '<span class="letter">' + letter + '</span>' +
        '<span class="opt-text">' + esc(text) + '</span>' +
        '<span class="mark">' + mark + '</span></button>';
    }).join("");

    var feedback = "";
    if (answered) {
      var credit = state.record.credit;
      var title = credit === 1 ? "答对了" : credit === 0.5 ? "答对一半" : "答错了";
      var note = credit === 0.5 ? "少选了，这套按 0.5 分计。" : "";
      var pickedText = state.record.selected.length ? state.record.selected.join("、") : "未作答";
      feedback = '<div class="feedback' + (credit === 0.5 ? " half" : "") + '"><strong>' + title + '</strong>' +
        '<div>你的答案：<span class="picked">' + pickedText + '</span>　正确答案：<span class="answer">' + correct.join("、") + '</span>' + (note ? "　" + note : "") + '</div>' +
        (question.explanation ? '<div class="explain">' + rich(question.explanation) + '</div>' : "") +
        '</div>';
    }

    var parts = chapterParts(state.chapter);
    var actionLabel = answered
      ? (state.index === state.items.length - 1 ? "查看本套结果" : "下一题 →")
      : "确认答案";
    var disabled = !answered && state.selected.length === 0;

    app.innerHTML =
      '<div class="quiz">' +
      '<header class="quiz-head">' +
      '<div class="quiz-head-row">' +
      '<button class="back" type="button" data-action="types">← ' + TYPE_NAME[state.type] + '</button>' +
      '<span class="counter">第 <b>' + (state.index + 1) + '</b> / ' + state.items.length + '</span>' +
      '</div>' +
      '<div class="bar"><i style="width:' + barWidth + '%"></i></div>' +
      '</header>' +
      '<div class="card">' +
      '<div class="meta"><div class="tags"><span class="tag">' + esc(parts[0]) + '</span><span class="tag red">' + TYPE_NAME[question.type] + '</span></div>' +
      '<span class="serial">顺序 ' + String(state.index + 1).padStart(2, "0") + '</span></div>' +
      '<h2 class="stem">' + esc(question.stem) + '</h2>' +
      '<p class="hint">' + (isMulti
        ? "选出所有正确项；少选得 0.5 分，多选或错选不得分，全部选对得 1 分。"
        : "选出唯一正确的一项。") + '</p>' +
      '<div class="options">' + options + '</div>' +
      feedback +
      '</div>' +
      '<button class="action" id="action" type="button"' + (disabled ? " disabled" : "") + '>' + actionLabel + '</button>' +
      '</div>';
    state.screen = "quiz";
  }

  function confirmAnswer() {
    var question = state.items[state.index];
    if (!question || state.record || !state.selected.length) return;
    var credit = judge(question, state.selected);
    var progress = progressFor(state.chapter, state.type);
    var record = { selected: state.selected.slice().sort(), credit: credit };
    progress.answers[state.index] = record;
    progress.index = state.index + 1;
    progress.scoreHalf += Math.round(credit * 2);
    progress.draft = [];
    progress.completed = progress.index >= state.items.length;
    state.record = record;
    state.selected = record.selected.slice();
    saveStore();
    renderQuiz();
  }

  function nextQuestion() {
    var progress = progressFor(state.chapter, state.type);
    if (progress.completed) { renderResult(); return; }
    state.index = progress.index;
    var record = progress.answers[state.index] || null;
    state.record = record;
    state.selected = record
      ? record.selected.slice()
      : (Array.isArray(progress.draft) ? progress.draft.slice() : []);
    renderQuiz();
    window.scrollTo(0, 0);
  }

  function renderResult() {
    var progress = progressFor(state.chapter, state.type);
    var total = state.items.length;
    var single = state.type === "single";
    var right = 0, half = 0;
    state.items.forEach(function (question, i) {
      var record = progress.answers[i];
      if (!record) return;
      if (record.credit === 1) right += 1;
      else if (record.credit === 0.5) half += 1;
    });
    var wrong = total - right - half;
    var score = progress.scoreHalf / 2;
    var percent = total ? Math.round((score / total) * 100) : 0;
    var headline = percent >= 85
      ? "这一套很稳。"
      : wrong === 0 && half > 0
        ? "判断没错，就是漏选；把选项记全。"
        : percent >= 60
          ? "回看错题，再开下一套。"
          : "错题先弄懂，再往下走。";

    var review = state.items.map(function (question, index) {
      var record = progress.answers[index] || { selected: [], credit: 0 };
      var credit = record.credit || 0;
      var correct = question.answer.split("");
      var picked = record.selected || [];
      var cls = credit === 1 ? "" : credit === 0.5 ? " half" : " wrong";
      var mark = credit === 1 ? "✓" : credit === 0.5 ? "◐" : "✕";
      var isMulti = question.type === "multi";
      var options = question.options.map(function (text, i) {
        var letter = LETTERS[i];
        var isCorrect = correct.indexOf(letter) >= 0;
        var isPicked = picked.indexOf(letter) >= 0;
        var ocls = "review-option";
        var rmark = "";
        if (isCorrect) {
          ocls += isMulti && !isPicked ? " correct missed" : " correct";
          rmark = isMulti && !isPicked ? '<span class="miss">漏选</span>' : "✓";
        } else if (isPicked) {
          ocls += " wrong";
          rmark = "✕";
        } else {
          ocls += " dim";
        }
        return '<div class="' + ocls + '"><span class="rl">' + letter + '</span><span>' + esc(text) + '</span>' +
          '<span class="rm">' + rmark + '</span></div>';
      }).join("");
      var yourText = picked.length ? picked.join("、") : "未作答";
      var earned = credit === 0.5 ? ' <span class="earned">得 0.5 分</span>' : credit === 0 ? ' <span class="earned">得 0 分</span>' : "";
      return '<details class="review-item' + cls + '"' + (credit < 1 ? " open" : "") + '>' +
        '<summary><span class="review-mark">' + mark + '</span>' +
        '<span class="review-title"><strong>' + (index + 1) + '. ' + esc(question.stem) + '</strong>' +
        '<small>' + TYPE_NAME[question.type] + ' · 你的答案 ' + yourText + ' · 正确答案 ' + correct.join("、") + '</small></span></summary>' +
        '<div class="review-body">' + options +
        '<div class="review-answers">正确答案：<b>' + correct.join("、") + '</b>' + earned + '</div>' +
        (question.explanation ? '<div class="review-explain">' + rich(question.explanation) + '</div>' : "") +
        '</div></details>';
    }).join("");

    var parts = chapterParts(state.chapter);
    var stats = '<div class="result-stats">' +
      '<span class="ok">全对 <b>' + right + '</b> 题</span>' +
      (half ? '<span class="half">半对 <b>' + half + '</b> 题</span>' : "") +
      '<span class="bad">错误 <b>' + wrong + '</b> 题</span>' +
      '<span>满分 <b>' + total + '</b> 分</span></div>';

    app.innerHTML =
      '<header class="top"><div class="brand"><span class="seal">政</span><span><strong>' + esc(parts[0]) + '</strong><small>' + esc(parts[1]) + ' · ' + TYPE_NAME[state.type] + '</small></span></div><span class="pill">本套完成</span></header>' +
      '<div class="result"><div class="result-top">' +
      '<p class="eyebrow">RESULT · ' + TYPE_NAME[state.type] + ' ' + total + ' 题</p>' +
      '<div class="big">' + formatScore(progress.scoreHalf) + '<small> / ' + total + '</small></div>' +
      '<p style="margin-bottom:0">正确率 ' + percent + '%' + (single ? "" : "　·　少选按一半计分") + '</p>' +
      stats +
      '<h2 style="margin-top:18px">' + headline + '</h2>' +
      '<p style="margin-bottom:0">进度已保存，退出再打开还能看到这一套的成绩。</p>' +
      '</div>' +
      '<div class="review"><h3>逐题回看</h3>' + review + '</div>' +
      '<div class="result-actions">' +
      '<button class="action" type="button" data-action="restart">重新做这一套</button>' +
      '<button class="action secondary" type="button" data-action="types">回到单选 / 多选</button>' +
      '</div></div>';
    state.screen = "result";
  }

  function restart() {
    store.sets[keyOf(state.chapter, state.type)] = { answers: {}, index: 0, scoreHalf: 0, completed: false, draft: [] };
    saveStore();
    startSet(state.type);
  }

  app.addEventListener("click", function (event) {
    var chapterButton = event.target.closest("[data-chapter]");
    if (chapterButton) {
      state.chapter = chapterButton.getAttribute("data-chapter");
      state.type = "";
      state.items = [];
      state.index = 0;
      state.record = null;
      state.selected = [];
      renderTypes();
      window.scrollTo(0, 0);
      return;
    }

    var typeButton = event.target.closest("[data-type]");
    if (typeButton && !typeButton.disabled) {
      startSet(typeButton.getAttribute("data-type"));
      return;
    }

    var optionButton = event.target.closest("[data-option]");
    if (optionButton && !state.record) {
      var letter = optionButton.getAttribute("data-option");
      var question = state.items[state.index];
      if (!question) return;
      if (question.type === "single") {
        state.selected = [letter];
      } else {
        var at = state.selected.indexOf(letter);
        if (at >= 0) state.selected.splice(at, 1);
        else state.selected.push(letter);
        state.selected.sort();
      }
      progressFor(state.chapter, state.type).draft = state.selected.slice();
      saveStore();
      renderQuiz();
      return;
    }

    var actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      var action = actionButton.getAttribute("data-action");
      if (action === "home") renderHome();
      else if (action === "types") renderTypes();
      else if (action === "restart") restart();
      window.scrollTo(0, 0);
      return;
    }

    if (event.target.id === "action") {
      if (state.record) nextQuestion();
      else confirmAnswer();
    }
  });

  app.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" || event.isComposing) return;
    if (event.target.closest("button")) return;
    if (state.screen !== "quiz") return;
    if (state.record) nextQuestion();
    else confirmAnswer();
  });

  renderHome();
})();
