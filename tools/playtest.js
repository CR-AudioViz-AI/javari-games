#!/usr/bin/env node
// tools/playtest.js — end-to-end game testing before Roy ever sees it
//
// Roy asked whether I can test a game end to end before handing it over. Until
// tonight the honest answer was no: I could confirm HTTP 200 and grep the
// bundle, which is why HE found the spawn facing the wrong way, the pointer
// lock, and both INP warnings. Every visual and control bug reached him first.
//
// This closes that gap. Headless Chrome renders WebGL under SwiftShader — no
// GPU needed — so the harness can actually:
//
//   load the page and catch every console error and unhandled rejection
//   confirm a canvas exists AND that WebGL context creation succeeded
//   click through the title screen into gameplay
//   drive real key and mouse input, then screenshot what the player sees
//   measure long tasks, which is what an INP warning actually is
//   report the frame rate the renderer is achieving
//
// It is not a substitute for a human playing it. It cannot tell me a scene is
// ugly or that a hint is confusing. It CAN tell me the screen is black, the
// camera faces a wall, nothing renders, or the main thread is blocked — which
// is every bug that reached Roy so far.
//
// Usage: node tools/playtest.js <url> <out.png> [seconds]
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
const puppeteer = require('puppeteer')

const URL = process.argv[2]
const OUT = process.argv[3] || '/tmp/playtest.png'
const SECS = Number(process.argv[4] || 8)

;(async () => {
  let browser
  const problems = []
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader',
             '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--ignore-gpu-blocklist'],
    })
    const page = await browser.newPage()
    await page.setViewport({ width: 1000, height: 600 })

    page.on('pageerror', e => problems.push('UNCAUGHT: ' + String(e).slice(0, 150)))
    page.on('console', m => { if (m.type() === 'error') problems.push('CONSOLE: ' + m.text().slice(0, 150)) })
    page.on('requestfailed', r => problems.push('REQUEST: ' + r.url().slice(-60)))

    // Long tasks are what an INP warning is made of. Observe them from the start.
    await page.evaluateOnNewDocument(() => {
      window.__long = []
      try {
        new PerformanceObserver(list => {
          for (const e of list.getEntries()) window.__long.push(Math.round(e.duration))
        }).observe({ entryTypes: ['longtask'] })
      } catch { /* unsupported */ }
      window.__frames = 0
      const tick = () => { window.__frames++; requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    })

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await new Promise(r => setTimeout(r, 3000))

    const canvas = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      if (!c) return { canvas: false }
      const gl = c.getContext('webgl2') || c.getContext('webgl')
      return { canvas: true, w: c.width, h: c.height, webgl: !!gl }
    })
    if (!canvas.canvas) problems.push('NO CANVAS on the page')
    else if (!canvas.webgl) problems.push('CANVAS EXISTS but WebGL context failed')

    // Click any start button so the harness reaches actual gameplay rather
    // than screenshotting a title card, which is what the first attempt did.
    const started = await page.evaluate(() => {
      const words = ['enter', 'start', 'play', 'launch', 'begin', 'attack', 'run', 'sound']
      const btns = [...document.querySelectorAll('button')]
      const go = btns.find(b => words.some(w => (b.textContent || '').toLowerCase().includes(w)))
      if (go) { go.click(); return (go.textContent || '').trim() }
      return null
    })

    await new Promise(r => setTimeout(r, 1200))

    // Drive real input: walk forward, look around.
    await page.keyboard.down('w')
    for (let i = 0; i < 6; i++) {
      await page.keyboard.down('ArrowRight')
      await new Promise(r => setTimeout(r, 220))
      await page.keyboard.up('ArrowRight')
      await new Promise(r => setTimeout(r, 180))
    }
    await new Promise(r => setTimeout(r, SECS * 1000))
    await page.keyboard.up('w')

    const perf = await page.evaluate(() => ({
      long: window.__long || [], frames: window.__frames || 0,
    }))

    // Is the canvas actually showing something, or is it a black rectangle?
    const lum = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      if (!c) return null
      const t = document.createElement('canvas')
      t.width = 60; t.height = 40
      const g = t.getContext('2d')
      try { g.drawImage(c, 0, 0, 60, 40) } catch { return null }
      const d = g.getImageData(0, 0, 60, 40).data
      let sum = 0, max = 0, distinct = new Set()
      for (let i = 0; i < d.length; i += 4) {
        const v = (d[i] + d[i + 1] + d[i + 2]) / 3
        sum += v; if (v > max) max = v
        distinct.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4))
      }
      return { mean: Math.round(sum / (d.length / 4)), max: Math.round(max), colours: distinct.size }
    })

    await page.screenshot({ path: OUT })

    const fps = Math.round(perf.frames / (SECS + 4.5))
    const worst = perf.long.length ? Math.max(...perf.long) : 0

    if (lum && lum.mean < 6) problems.push(`SCENE IS BLACK — mean luminance ${lum.mean}`)
    if (lum && lum.colours < 8) problems.push(`SCENE IS FLAT — only ${lum.colours} distinct colours`)
    if (fps < 24) problems.push(`LOW FRAME RATE — ${fps} fps`)
    if (worst > 200) problems.push(`LONG TASK ${worst}ms — this is what an INP warning is`)
    if (!started) problems.push('NO START BUTTON FOUND — could not reach gameplay')

    console.log('')
    console.log('  url        ' + URL)
    console.log('  canvas     ' + JSON.stringify(canvas))
    console.log('  started    ' + (started || 'no button matched'))
    console.log('  frame rate ' + fps + ' fps over ' + (SECS + 4.5) + 's')
    console.log('  long tasks ' + perf.long.length + (worst ? ', worst ' + worst + 'ms' : ''))
    console.log('  luminance  ' + JSON.stringify(lum))
    console.log('  shot       ' + OUT)
    console.log('')
    if (problems.length) {
      console.log('  PROBLEMS (' + problems.length + '):')
      for (const p of [...new Set(problems)].slice(0, 12)) console.log('    ' + p)
    } else {
      console.log('  no problems detected')
    }
  } catch (e) {
    console.log('  HARNESS FAILED: ' + String(e).slice(0, 200))
  } finally {
    if (browser) await browser.close()
    process.exit(0)
  }
})()
