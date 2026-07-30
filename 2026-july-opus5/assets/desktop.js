/*
 * 2026-july-opus5 — desktop behaviour.
 *
 * Everything here is an enhancement. With JavaScript off the site still renders
 * in the visitor's preferred colour scheme, every link works, and the start menu
 * simply stays closed — its contents are duplicated in the menu bar above.
 */
;(function () {
  'use strict'

  var root = document.documentElement
  var THEME_KEY = 'mt98.theme'
  var SCALE_KEY = 'mt98.scale'
  var SCALES = [0.85, 0.925, 1, 1.1, 1.25, 1.4]

  function write(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      /* Private browsing, quota, a locked-down profile — none of it is fatal. */
    }
  }

  /* ------------------------------------------------------------- appearance */

  var systemDark = window.matchMedia('(prefers-color-scheme: dark)')

  function currentTheme() {
    var stored = root.dataset.theme
    if (stored === 'light' || stored === 'dark') return stored
    return systemDark.matches ? 'dark' : 'light'
  }

  function paintThemeButtons() {
    var dark = currentTheme() === 'dark'
    var buttons = document.querySelectorAll('[data-theme-toggle]')
    for (var i = 0; i < buttons.length; i++) {
      var button = buttons[i]
      button.setAttribute('aria-pressed', dark ? 'true' : 'false')
      var label = button.querySelector('.theme-label')
      if (label) {
        label.textContent = dark ? 'Light' : 'Dark'
        button.setAttribute('aria-label', dark ? 'Light mode' : 'Dark mode')
      }
      button.title = dark ? 'Switch to the classic light scheme' : 'Switch to the dark scheme'
    }
  }

  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark'
    root.dataset.theme = next
    write(THEME_KEY, next)
    paintThemeButtons()
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-theme-toggle]')
    if (!trigger) return
    event.preventDefault()
    toggleTheme()
    closeStartMenu()
  })

  /* A visitor who never chose a theme keeps following their system. */
  systemDark.addEventListener('change', paintThemeButtons)
  paintThemeButtons()

  /* ------------------------------------------------------------- text size */

  function currentScaleIndex() {
    var value = parseFloat(getComputedStyle(root).getPropertyValue('--reading-scale')) || 1
    var closest = 0
    for (var i = 1; i < SCALES.length; i++) {
      if (Math.abs(SCALES[i] - value) < Math.abs(SCALES[closest] - value)) closest = i
    }
    return closest
  }

  var scaleIndex = currentScaleIndex()

  function applyScale() {
    root.style.setProperty('--reading-scale', String(SCALES[scaleIndex]))
    write(SCALE_KEY, String(SCALES[scaleIndex]))
    var buttons = document.querySelectorAll('[data-scale]')
    for (var i = 0; i < buttons.length; i++) {
      var step = Number(buttons[i].getAttribute('data-scale'))
      var atEnd = step < 0 ? scaleIndex === 0 : scaleIndex === SCALES.length - 1
      buttons[i].disabled = atEnd
    }
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-scale]')
    if (!trigger) return
    var next = scaleIndex + Number(trigger.getAttribute('data-scale'))
    if (next < 0 || next >= SCALES.length) return
    scaleIndex = next
    applyScale()
  })

  applyScale()

  /* ------------------------------------------------------------ start menu */

  var startButton = document.querySelector('.start-btn')
  var startMenu = document.getElementById('start-menu')

  function closeStartMenu() {
    if (!startMenu || startMenu.hidden) return
    startMenu.hidden = true
    startButton.setAttribute('aria-expanded', 'false')
  }

  if (startButton && startMenu) {
    startButton.addEventListener('click', function (event) {
      event.stopPropagation()
      var open = startMenu.hidden
      startMenu.hidden = !open
      startButton.setAttribute('aria-expanded', open ? 'true' : 'false')
      if (open) {
        var first = startMenu.querySelector('.start-item')
        if (first) first.focus()
      }
    })

    document.addEventListener('click', function (event) {
      if (!startMenu.contains(event.target) && event.target !== startButton) closeStartMenu()
    })

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || startMenu.hidden) return
      closeStartMenu()
      startButton.focus()
    })

    startMenu.addEventListener('focusout', function (event) {
      if (!startMenu.contains(event.relatedTarget) && event.relatedTarget !== startButton) {
        closeStartMenu()
      }
    })
  }

  /* ----------------------------------------------------------- system tray */

  var clock = document.querySelector('[data-clock]')
  if (clock) {
    clock.hidden = false
    var tick = function () {
      var now = new Date()
      clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      clock.title = now.toLocaleDateString([], {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }
    tick()
    setInterval(tick, 20000)
  }
})()
