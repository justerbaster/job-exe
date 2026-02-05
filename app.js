(function () {
  "use strict";

  // Background music (starts after XP boot)
  var bgMusic = document.getElementById("bg-music");
  if (bgMusic) {
    bgMusic.volume = 0.5;
    bgMusic.loop = true;
  }

  // Windows XP boot: ~6s then desktop + tiger music
  (function runXpBoot() {
    var bootEl = document.getElementById("xp-boot");
    if (!bootEl) return;
    var startupSound = new Audio("assets/xp-startup.mp3");
    startupSound.volume = 0.7;
    startupSound.play().catch(function () {});
    setTimeout(function () {
      bootEl.classList.add("xp-boot-done");
      setTimeout(function () {
        if (bootEl.parentNode) bootEl.parentNode.removeChild(bootEl);
        if (bgMusic) bgMusic.play().catch(function () {});
      }, 650);
    }, 6000);
  })();

  // Live clock
  function updateTime() {
    const el = document.getElementById("tray-time");
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }
  updateTime();
  setInterval(updateTime, 1000);

  // Window management
  const windows = document.querySelectorAll(".window");
  const desktop = document.querySelector(".desktop");

  function bringToFront(win) {
    windows.forEach(function (w) {
      w.classList.remove("front");
    });
    win.classList.add("front");
  }

  function getNextPosition() {
    const offset = 24;
    const count = document.querySelectorAll(".window:not(.minimized)").length;
    return {
      left: 80 + (count % 4) * offset,
      top: 60 + Math.floor(count / 4) * offset
    };
  }

  // Drag
  windows.forEach(function (win) {
    const titleBar = win.querySelector(".window-titlebar");
    if (!titleBar) return;

    let drag = null;

    titleBar.addEventListener("mousedown", function (e) {
      if (e.target.closest(".window-buttons")) return;
      bringToFront(win);
      drag = {
        x: e.clientX - win.offsetLeft,
        y: e.clientY - win.offsetTop
      };
    });

    document.addEventListener("mousemove", function (e) {
      if (!drag) return;
      win.style.left = (e.clientX - drag.x) + "px";
      win.style.top = (e.clientY - drag.y) + "px";
      win.style.right = "auto";
      win.style.bottom = "auto";
    });

    document.addEventListener("mouseup", function () {
      drag = null;
    });

    win.addEventListener("mousedown", function () {
      bringToFront(win);
    });

    // Buttons
    const btnClose = win.querySelector(".btn-close");
    const btnMin = win.querySelector(".btn-minimize");
    const btnMax = win.querySelector(".btn-maximize");

    function deactivateTaskbarFor(winEl) {
      var realId = winEl.dataset.window;
      document.querySelectorAll(".taskbar-item[data-window]").forEach(function (t) {
        var id = t.getAttribute("data-window");
        if ((windowIdMap[id] || id) === realId) t.classList.remove("active");
      });
    }

    if (btnClose) {
      btnClose.addEventListener("click", function (e) {
        e.stopPropagation();
        playCriticalStopSound();
        win.classList.add("minimized");
        win.style.display = "none";
        deactivateTaskbarFor(win);
      });
    }

    if (btnMin) {
      btnMin.addEventListener("click", function (e) {
        e.stopPropagation();
        win.classList.add("minimized");
        win.style.display = "none";
        deactivateTaskbarFor(win);
      });
    }

    if (btnMax) {
      btnMax.addEventListener("click", function (e) {
        e.stopPropagation();
        if (win.classList.toggle("maximized")) {
          win.style.left = "0";
          win.style.top = "0";
          win.style.right = "0";
          win.style.bottom = "36px";
          win.style.width = "auto";
          win.style.height = "auto";
        } else {
          var pos = getNextPosition();
          win.style.left = pos.left + "px";
          win.style.top = pos.top + "px";
          win.style.right = "auto";
          win.style.bottom = "auto";
          win.style.width = "";
          win.style.height = "";
        }
      });
    }
  });

  const windowIdMap = { ie: "ie", computer: "welcome" };

  function openWindow(id) {
    const realId = windowIdMap[id] || id;
    const win = document.getElementById("window-" + realId);
    if (!win) return;
    win.classList.remove("minimized");
    win.style.display = "";
    bringToFront(win);
    if (!win.classList.contains("maximized")) {
      if (realId === "dexscreener") {
        var w = 480;
        var h = 360;
        win.style.left = (window.innerWidth / 2 - w / 2) + "px";
        win.style.top = ((window.innerHeight - 36) / 2 - h / 2) + "px";
        win.style.width = w + "px";
        win.style.height = h + "px";
      } else {
        var pos = getNextPosition();
        win.style.left = pos.left + "px";
        win.style.top = pos.top + "px";
      }
    }
    document.querySelectorAll('.taskbar-item[data-window="' + id + '"]').forEach(function (t) {
      t.classList.add("active");
    });
  }

  function toggleWindow(id) {
    const realId = windowIdMap[id] || id;
    const win = document.getElementById("window-" + realId);
    if (!win) return;
    if (win.classList.contains("minimized")) {
      openWindow(id);
    } else {
      win.classList.add("minimized");
      win.style.display = "none";
      document.querySelectorAll('.taskbar-item[data-window="' + id + '"]').forEach(function (t) {
        t.classList.remove("active");
      });
    }
  }

  // Desktop icons: open window or external link
  document.querySelectorAll(".desktop-icon").forEach(function (icon) {
    icon.addEventListener("dblclick", function () {
      var url = this.getAttribute("data-url");
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      var id = this.getAttribute("data-window");
      if (!id) return;
      var realId = windowIdMap[id] || id;
      if (document.getElementById("window-" + realId)) {
        openWindow(id);
      }
    });
  });

  // Folder items: open file preview on click
  document.querySelectorAll(".folder-item-clickable[data-open]").forEach(function (item) {
    item.addEventListener("click", function () {
      var id = this.getAttribute("data-open");
      var src = this.getAttribute("data-src");
      if (id === "photo-preview" && src) {
        var previewImg = document.getElementById("window-photo-preview-img");
        var previewTitle = document.getElementById("window-photo-preview-title");
        var name = this.getAttribute("data-name") || this.textContent.trim() || "Photo";
        if (previewImg) previewImg.src = src;
        if (previewTitle) previewTitle.textContent = name;
        openWindow(id);
        return;
      }
      if (id && document.getElementById("window-" + id)) {
        openWindow(id);
      }
    });
  });

  // YouTube window: set size when opening
  var youtubeWin = document.getElementById("window-youtube");
  if (youtubeWin) {
    youtubeWin.style.width = "480px";
    youtubeWin.style.height = "320px";
  }

  // Taskbar: toggle window
  document.querySelectorAll(".taskbar-item[data-window]").forEach(function (item) {
    item.addEventListener("click", function () {
      var id = this.getAttribute("data-window");
      var realId = windowIdMap[id] || id;
      if (document.getElementById("window-" + realId)) {
        toggleWindow(id);
      }
    });
  });

  // Initial positions
  var positions = {
    welcome: { left: 280, top: 80 },
    notepad: { left: 80, top: 200 },
    chat: { left: 520, top: 220 },
    "cv-folder": { left: 100, top: 320 },
    linkedin: { left: 320, top: 320 },
    portfolio: { left: 540, top: 100 },
    phantom: { left: 540, top: 280 },
    pumpfun: { left: 200, top: 400 },
    dexscreener: null,
    youtube: { left: 120, top: 80 },
    "resume-pdf": { left: 200, top: 60 },
    photos: { left: 150, top: 100 },
    "photo-preview": { left: 220, top: 80 }
  };

  ["welcome", "notepad", "chat", "cv-folder", "linkedin", "portfolio", "phantom", "pumpfun", "youtube", "resume-pdf", "photos", "photo-preview"].forEach(function (id) {
    var win = document.getElementById("window-" + id);
    var pos = positions[id];
    if (win && pos && pos.left != null) {
      win.style.left = pos.left + "px";
      win.style.top = pos.top + "px";
    }
  });

  var firstWin = document.getElementById("window-welcome") || document.getElementById("window-notepad") || document.getElementById("window-chat");
  if (firstWin && !firstWin.classList.contains("minimized")) firstWin.classList.add("front");

  // Sticky note drag
  var sticky = document.getElementById("sticky-todo");
  if (sticky) {
    var stickyDrag = null;
    sticky.addEventListener("mousedown", function (e) {
      stickyDrag = {
        x: e.clientX - sticky.getBoundingClientRect().left,
        y: e.clientY - sticky.getBoundingClientRect().top
      };
    });
    document.addEventListener("mousemove", function (e) {
      if (!stickyDrag) return;
      var left = e.clientX - stickyDrag.x;
      var top = e.clientY - stickyDrag.y;
      sticky.style.right = "auto";
      sticky.style.left = left + "px";
      sticky.style.top = top + "px";
    });
    document.addEventListener("mouseup", function () {
      stickyDrag = null;
    });
  }

  // Telegram-style notifications (bottom-right, ~every 5s, show 2s)
  var telegramMessages = [
    { from: "Wife", text: "Hey did you pay the rent already?" },
    { from: "Mom", text: "Hi just checking if everything is okay financially" },
    { from: "Dad", text: "Car needs maintenance this month can you help?" },
    { from: "Wife", text: "Electricity bill is overdue again" },
    { from: "Mom", text: "Doctor appointment tomorrow insurance did not cover it" },
    { from: "Wife", text: "We need groceries today not tomorrow" },
    { from: "Dad", text: "Bank called about the loan payment" },
    { from: "Wife", text: "My card got declined again what is going on" },
    { from: "Mom", text: "Your cousin asked if you are still doing crypto stuff" },
    { from: "Wife", text: "Landlord texted me please respond" },
    { from: "Dad", text: "I can cover it this time but not next month" },
    { from: "Mom", text: "Maybe it is time to find something more stable" },
    { from: "Wife", text: "I am serious we need money this week" },
    { from: "Mom", text: "Just worried about you thats all" },
    { from: "Wife", text: "Please tell me you have a plan" },
    { from: "Alex", text: "Hey man when can you send back the money?" },
    { from: "Mike", text: "Not rushing but just checking about the loan" },
    { from: "Dan", text: "You said last week remember?" },
    { from: "Sarah", text: "Any update on the repayment?" },
    { from: "Leo", text: "Bro I really need it this month" },
    { from: "Nick", text: "Let me know if something changed" },
    { from: "Alex", text: "Its been quiet just asking" },
    { from: "Mike", text: "Even partial payment is fine" },
    { from: "Dan", text: "I am getting stressed about it" },
    { from: "Sarah", text: "Please do not ghost me" },
    { from: "Leo", text: "Rent is due for me too" },
    { from: "Nick", text: "Just be honest if you cannot yet" },
    { from: "Alex", text: "Can you give me a date at least" },
    { from: "Mike", text: "Hope you are good but I need the money" },
    { from: "Dan", text: "Let me know today please" }
  ];

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  var telegramQueue = shuffleArray(telegramMessages);
  var telegramIndex = 0;

  function getTelegramInitial(name) {
    return (name || "?").charAt(0).toUpperCase();
  }

  var currentNotificationAudio = null;

  function isSoundMuted() {
    var btn = document.getElementById("tray-sound");
    return btn && (btn.getAttribute("aria-pressed") === "true" || btn.classList.contains("tray-sound-muted"));
  }

  function playCriticalStopSound() {
    if (isSoundMuted()) return;
    try {
      var snd = new Audio("assets/critical-stop.mp3");
      snd.volume = 0.8;
      snd.play().catch(function () {});
    } catch (e) {}
  }

  function playNotificationSound() {
    if (isSoundMuted()) return;
    try {
      var audio = new Audio("assets/notification.mp3");
      currentNotificationAudio = audio;
      audio.volume = 1;
      audio.addEventListener("ended", function () {
        currentNotificationAudio = null;
      });
      audio.play().catch(function () {
        currentNotificationAudio = null;
      });
    } catch (e) {
      currentNotificationAudio = null;
    }
  }

  function stopAllNotificationSounds() {
    if (currentNotificationAudio) {
      try {
        currentNotificationAudio.pause();
        currentNotificationAudio.currentTime = 0;
      } catch (e) {}
      currentNotificationAudio = null;
    }
  }

  (function initTraySoundToggle() {
    var traySoundBtn = document.getElementById("tray-sound");
    var traySoundIcon = traySoundBtn && traySoundBtn.querySelector(".tray-sound-icon");
    if (!traySoundBtn || !traySoundIcon) return;
    traySoundBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var muted = traySoundBtn.getAttribute("aria-pressed") === "true";
      muted = !muted;
      if (muted) {
        stopAllNotificationSounds();
        if (bgMusic) bgMusic.pause();
      } else {
        if (bgMusic) bgMusic.play().catch(function () {});
      }
      traySoundBtn.setAttribute("aria-pressed", muted ? "true" : "false");
      traySoundBtn.classList.toggle("tray-sound-muted", muted);
      traySoundIcon.textContent = muted ? "🔇" : "🔊";
      traySoundBtn.title = muted ? "All sounds off (click to unmute)" : "All sounds on (click to mute)";
    });
  })();

  // Click sound (Windows navigation) on any click
  var clickSound = new Audio("assets/click.mp3");
  clickSound.volume = 0.4;
  document.addEventListener("click", function () {
    if (isSoundMuted()) return;
    clickSound.currentTime = 0;
    clickSound.play().catch(function () {});
  });

  function showTelegramNotification() {
    var msg = telegramQueue[telegramIndex % telegramQueue.length];
    telegramIndex += 1;
    var container = document.getElementById("telegram-notifications");
    if (!container) return;

    var now = new Date();
    var timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    var avatarHtml;
    if (msg.from === "Wife") {
      avatarHtml = '<img class="telegram-notification-avatar telegram-notification-avatar-img" src="assets/avatar-wife.png" alt="Wife">';
    } else if (msg.from === "Mom") {
      avatarHtml = '<img class="telegram-notification-avatar telegram-notification-avatar-img" src="assets/avatar-mom.png" alt="Mom">';
    } else if (msg.from === "Dad") {
      avatarHtml = '<img class="telegram-notification-avatar telegram-notification-avatar-img" src="assets/avatar-dad.png" alt="Dad">';
    } else {
      avatarHtml = '<span class="telegram-notification-avatar">' + getTelegramInitial(msg.from) + "</span>";
    }
    var el = document.createElement("div");
    el.className = "telegram-notification";
    el.setAttribute("role", "alert");
    el.innerHTML =
      avatarHtml +
      '<div class="telegram-notification-body">' +
      '<div class="telegram-notification-name">' + (msg.from || "") + "</div>" +
      '<div class="telegram-notification-text">' + (msg.text || "") + "</div>" +
      '<div class="telegram-notification-time">' + timeStr + "</div>" +
      "</div>";
    container.appendChild(el);

    playNotificationSound();

    setTimeout(function () {
      el.classList.add("hiding");
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 280);
    }, 2000);
  }

  function scheduleNextTelegram() {
    var delay = 5000 + (Math.random() * 2000 - 1000);
    setTimeout(function () {
      showTelegramNotification();
      scheduleNextTelegram();
    }, delay);
  }

  scheduleNextTelegram();

  // Invoices: 5 bills, every 60s from bottom, Pay / Decline (run away), close runs away
  var invoiceImages = ["invoice_1.png", "invoice_2.png", "invoice_3.png", "invoice_4.png", "invoice_5.png"];
  var invoiceIndex = 0;
  var invoicePopup = document.getElementById("invoice-popup");
  var invoiceImageEl = document.getElementById("invoice-image");
  var invoiceClose = document.getElementById("invoice-close");
  var invoicePay = document.getElementById("invoice-pay");
  var invoiceDecline = document.getElementById("invoice-decline");
  var invoiceDeclineWrap = document.getElementById("invoice-decline-wrap");
  var invoiceOverlay = document.getElementById("invoice-overlay");
  var invoiceOverlayOk = document.getElementById("invoice-overlay-ok");

  function showInvoice() {
    if (!invoicePopup || !invoiceImageEl) return;
    var src = "assets/" + invoiceImages[invoiceIndex % invoiceImages.length];
    invoiceImageEl.src = src;
    invoiceIndex += 1;
    invoicePopup.style.display = "";
    invoicePopup.style.left = "50%";
    invoicePopup.style.transform = "translateX(-50%)";
    invoicePopup.style.bottom = "48px";
    if (invoiceDecline) {
      invoiceDecline.style.left = "50%";
      invoiceDecline.style.top = "50%";
      invoiceDecline.style.transform = "translate(-50%, -50%)";
    }
  }

  function hideInvoice() {
    if (invoicePopup) invoicePopup.style.display = "none";
  }

  function movePopupAwayFrom(x, y) {
    if (!invoicePopup || invoicePopup.style.display === "none") return;
    var rect = invoicePopup.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = x - cx;
    var dy = y - cy;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    var shift = 140;
    var nx = (dx / dist) * shift;
    var ny = (dy / dist) * shift;
    var currentLeft = rect.left;
    var currentBottom = window.innerHeight - rect.bottom;
    var newLeft = currentLeft + nx;
    var newBottom = Math.max(20, currentBottom + ny);
    newLeft = Math.max(20, Math.min(window.innerWidth - rect.width - 20, newLeft));
    invoicePopup.style.transform = "none";
    invoicePopup.style.left = newLeft + "px";
    invoicePopup.style.bottom = newBottom + "px";
  }

  function moveDeclineAwayFrom(x, y) {
    if (!invoiceDecline || !invoiceDeclineWrap) return;
    var wrapRect = invoiceDeclineWrap.getBoundingClientRect();
    var btnRect = invoiceDecline.getBoundingClientRect();
    var bx = btnRect.left + btnRect.width / 2;
    var by = btnRect.top + btnRect.height / 2;
    var dx = x - bx;
    var dy = y - by;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    if (dist < 90) {
      var run = 70;
      var nx = (dx / dist) * run;
      var ny = (dy / dist) * run;
      var wrapW = wrapRect.width;
      var wrapH = wrapRect.height;
      var curLeft = parseFloat(invoiceDecline.style.left) || 50;
      var curTop = parseFloat(invoiceDecline.style.top) || 50;
      var newLeft = curLeft + (nx / wrapW) * 100;
      var newTop = curTop + (ny / wrapH) * 100;
      newLeft = Math.max(0, Math.min(100, newLeft));
      newTop = Math.max(0, Math.min(100, newTop));
      invoiceDecline.style.left = newLeft + "%";
      invoiceDecline.style.top = newTop + "%";
      invoiceDecline.style.transform = "translate(-50%, -50%)";
    }
  }

  if (invoiceClose) {
    invoiceClose.addEventListener("click", function () {
      playCriticalStopSound();
    });
    invoiceClose.addEventListener("mouseenter", function () {
      document.addEventListener("mousemove", onMouseMoveClose);
    });
    invoiceClose.addEventListener("mouseleave", function () {
      document.removeEventListener("mousemove", onMouseMoveClose);
    });
  }
  var onMouseMoveClose = function (e) {
    movePopupAwayFrom(e.clientX, e.clientY);
  };

  if (invoiceDecline) {
    invoiceDecline.addEventListener("click", function () {
      playCriticalStopSound();
    });
  }
  if (invoiceDeclineWrap) {
    invoiceDeclineWrap.addEventListener("mouseenter", function () {
      document.addEventListener("mousemove", onMouseMoveDecline);
    });
    invoiceDeclineWrap.addEventListener("mouseleave", function () {
      document.removeEventListener("mousemove", onMouseMoveDecline);
    });
  }
  var onMouseMoveDecline = function (e) {
    moveDeclineAwayFrom(e.clientX, e.clientY);
  };

  if (invoicePay) {
    invoicePay.addEventListener("click", function () {
      if (invoiceOverlay) invoiceOverlay.style.display = "flex";
    });
  }

  if (invoiceOverlayOk) {
    invoiceOverlayOk.addEventListener("click", function () {
      if (invoiceOverlay) invoiceOverlay.style.display = "none";
      hideInvoice();
    });
  }

  if (invoiceOverlay) {
    invoiceOverlay.addEventListener("click", function (e) {
      if (e.target === invoiceOverlay) {
        invoiceOverlay.style.display = "none";
        hideInvoice();
      }
    });
  }

  setInterval(showInvoice, 60000);
  setTimeout(showInvoice, 8000);
})();
