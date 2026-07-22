/*
 * Small progressive-enhancement layer: the light/dark toggle and the font-size
 * controls. The initial theme and font size are already applied before paint by
 * the inline script in <head>, so this file only wires up the buttons and keeps
 * the chosen state in localStorage.
 */
(function () {
  "use strict"

  var root = document.documentElement
  var THEME_KEY = "mt-theme"
  var FONT_KEY = "mt-font-scale"

  var MIN_SCALE = 0.85
  var MAX_SCALE = 1.5
  var STEP = 0.1

  // ── Theme ──────────────────────────────────────────────────────────────
  function currentTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light"
  }

  function setTheme(theme) {
    root.setAttribute("data-theme", theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch (e) {}
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(theme === "dark"))
    })
  }

  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.setAttribute("aria-pressed", String(currentTheme() === "dark"))
    btn.addEventListener("click", function () {
      setTheme(currentTheme() === "dark" ? "light" : "dark")
    })
  })

  // Follow the OS preference as long as the visitor hasn't made an explicit choice.
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)")
    var onChange = function (e) {
      var stored
      try {
        stored = localStorage.getItem(THEME_KEY)
      } catch (err) {
        stored = null
      }
      if (!stored) root.setAttribute("data-theme", e.matches ? "dark" : "light")
    }
    if (mq.addEventListener) mq.addEventListener("change", onChange)
    else if (mq.addListener) mq.addListener(onChange)
  }

  // ── Font size ──────────────────────────────────────────────────────────
  function currentScale() {
    var v = parseFloat(getComputedStyle(root).getPropertyValue("--content-scale"))
    return v > 0 ? v : 1
  }

  function setScale(scale) {
    scale = Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)) * 1000) / 1000
    root.style.setProperty("--content-scale", String(scale))
    try {
      localStorage.setItem(FONT_KEY, String(scale))
    } catch (e) {}
    refreshFontButtons(scale)
  }

  function refreshFontButtons(scale) {
    document.querySelectorAll('[data-font="dec"]').forEach(function (b) {
      b.disabled = scale <= MIN_SCALE + 0.0001
    })
    document.querySelectorAll('[data-font="inc"]').forEach(function (b) {
      b.disabled = scale >= MAX_SCALE - 0.0001
    })
  }

  document.querySelectorAll("[data-font]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var delta = btn.getAttribute("data-font") === "inc" ? STEP : -STEP
      setScale(currentScale() + delta)
    })
  })

  refreshFontButtons(currentScale())
})()
