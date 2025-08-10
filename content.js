// Global variables
let isInspectingDomNew = false
let highlightedElementDomNew = null
let modal = null

// Declare chrome variable
const chromeWhere = window.chrome

// Check if script is already loaded to prevent duplicate execution
if (window.wciLoaded) {
  console.log("Web Component Inspector already loaded")
} else {
  window.wciLoaded = true

  // Listen for messages from the popup
  chromeWhere.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request)

    if (request.action === "startInspection") {
      startInspectionMode()
      sendResponse({ success: true })
    } else if (request.action === "getFullPage") {
      getFullPageCode()
      sendResponse({ success: true })
    }

    return true // Keep the message channel open for async response
  })
}

// Start inspection mode
function startInspectionMode() {
  console.log("Starting inspection mode")
  isInspectingDomNew = true

  // Remove existing overlay if any
  const existingOverlay = document.getElementById("wci-overlay-message")
  if (existingOverlay) existingOverlay.remove()

  // Create overlay message
  const overlay = document.createElement("div")
  overlay.id = "wci-overlay-message"
  overlay.textContent = "Click on any element to inspect (Press ESC to cancel)"
  document.body.appendChild(overlay)

  // Add event listeners
  document.addEventListener("mouseover", handleMouseOver, true)
  document.addEventListener("mouseout", handleMouseOut, true)
  document.addEventListener("click", handleClick, true)

  // Add escape key listener to cancel inspection
  const escapeListener = (e) => {
    if (e.key === "Escape") {
      stopInspectionMode()
      document.removeEventListener("keydown", escapeListener)
    }
  }
  document.addEventListener("keydown", escapeListener)
}

// Stop inspection mode
function stopInspectionMode() {
  console.log("Stopping inspection mode")
  isInspectingDomNew = false

  // Remove overlay message
  const overlay = document.getElementById("wci-overlay-message")
  if (overlay) overlay.remove()

  // Remove event listeners
  document.removeEventListener("mouseover", handleMouseOver, true)
  document.removeEventListener("mouseout", handleMouseOut, true)
  document.removeEventListener("click", handleClick, true)

  // Remove highlight
  if (highlightedElementDomNew) {
    highlightedElementDomNew.style.outline = ""
    highlightedElementDomNew = null
  }
}

// Handle mouse over event
function handleMouseOver(e) {
  if (!isInspectingDomNew) return

  // Prevent highlighting the overlay or modal
  if (e.target.id === "wci-overlay-message" || e.target.closest("#wci-modal")) return

  e.preventDefault()
  e.stopPropagation()

  // Remove previous highlight
  if (highlightedElementDomNew) {
    highlightedElementDomNew.style.outline = ""
  }

  // Highlight the element
  highlightedElementDomNew = e.target
  highlightedElementDomNew.style.outline = "2px solid #0070f3"
  highlightedElementDomNew.style.outlineOffset = "1px"
}

// Handle mouse out event
function handleMouseOut(e) {
  if (!isInspectingDomNew || !highlightedElementDomNew) return

  e.preventDefault()
  e.stopPropagation()

  // Don't remove highlight if moving to a child element
  if (highlightedElementDomNew.contains(e.relatedTarget)) return

  // Remove highlight
  highlightedElementDomNew.style.outline = ""
  highlightedElementDomNew = null
}
function downloadFileInspector(content, filename, mimeType = "text/plain") {
  console.log("Attempting to download :", filename, "Type:", mimeType)

  try {
    // Method 1: Direct blob download
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)

    // Create temporary download link
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.style.display = "none"
    a.style.position = "absolute"
    a.style.left = "-9999px"

    // Add to DOM, click, and remove
    document.body.appendChild(a)

    // Force click
    a.click()

    // Clean up
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a)
      }
      URL.revokeObjectURL(url)
    }, 100)

    console.log(`Successfully downloaded: ${filename}`)
    return true
  } catch (error) {
    console.error("Direct download failed:", error)

    // Method 2: Try Chrome downloads API
    try {
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          {
            action: "downloadFile",
            data: {
              content,
              fileName: filename,
            },
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error("Chrome runtime error:", chrome.runtime.lastError)
              // Method 3: Fallback - copy to clipboard
              fallbackDownload(content, filename)
            } else {
              console.log("Download via background script successful")
            }
          },
        )
        return true
      }
    } catch (runtimeError) {
      console.error("Runtime message failed:", runtimeError)
    }

    // Method 3: Final fallback
    fallbackDownload(content, filename)
    return false
  }
}

// Fallback download method
function fallbackDownload(content, filename) {
  try {
    // Try to copy to clipboard as fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(content)
        .then(() => {
          alert(`Could not download ${filename}. Content has been copied to clipboard instead.`)
        })
        .catch(() => {
          // Final fallback - show content in new window
          showContentInNewWindow(content, filename)
        })
    } else {
      showContentInNewWindow(content, filename)
    }
  } catch (error) {
    console.error("All download methods failed:", error)
    alert("Download failed. Please check browser permissions.")
  }
}

function createCompleteHtmlFileNew(html, css, js) {
  console.log("Creating complete HTML file", html)
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Extracted Component</title>
<style>
${css}
</style>
</head>
<body>
${html}
<script>
${js}
</script>
</body>
</html>
  `.trim();
}
// Handle click event

// Handle click event
function handleClick(e) {
  if (!isInspectingDomNew) return

  // Prevent clicking the overlay or modal
  if (e.target.id === "wci-overlay-message" || e.target.closest("#wci-modal")) return

  e.preventDefault()
  e.stopPropagation()

  // Get the actual element we want to inspect
  // Use the highlighted element instead of e.target to avoid issues
  const element = highlightedElementDomNew || e.target

  // Skip if it's an unwanted element type
  if (
    element.tagName.toLowerCase() === "script" ||
    element.tagName.toLowerCase() === "style" ||
    element.tagName.toLowerCase() === "meta" ||
    element.tagName.toLowerCase() === "link" ||
    element.id === "wci-overlay-message" ||
    element.closest("#wci-modal")
  ) {
    console.log("Skipping unwanted element:", element.tagName)
    return
  }

  console.log("Element clicked for inspection:", element)
  console.log("Element tag name:", element.tagName)
  console.log("Element classes:", element.className)
  console.log("Element ID:", element.id)

  // Get the element's code
  const elementCode = extractElementCode(element)

  console.log("Extracted element code HTML:", elementCode.html.substring(0, 200) + "...")

  // Create complete HTML file for the component and download it
  const componentHtml = createCompleteHtmlFileNew(elementCode.html, elementCode.css, elementCode.js)
  downloadFileInspector(componentHtml, `component-${Date.now()}.html`, "text/html")

  // Stop inspection mode
  stopInspectionMode()

  // Show the modal with the code
  showModal(elementCode)
}


// Extract element code
function extractElementCode(element) {
  console.log("Extracting code for element:", element)
  console.log("Element tag name:", element.tagName)
  console.log("Element outer HTML preview:", element.outerHTML.substring(0, 100) + "...")

  // Get HTML - make sure we're getting the right element
  let html = element.outerHTML

  // If the element is an anchor with display none, try to get a better element
  if (element.tagName.toLowerCase() === "a" && getComputedStyle(element).display === "none") {
    console.log("Detected hidden anchor, looking for better element...")

    // Try to find a visible parent or sibling
    let betterElement = element.parentElement
    while (betterElement && getComputedStyle(betterElement).display === "none") {
      betterElement = betterElement.parentElement
    }

    if (betterElement && betterElement !== document.body) {
      console.log("Using better element:", betterElement)
      html = betterElement.outerHTML
      element = betterElement // Update the element reference
    }
  }

  console.log("Final HTML to extract:", html.substring(0, 200) + "...")

  // Get CSS
  const styles = getComputedStyle(element)
  let css = ""

  // Create a CSS selector for the element
  const selector = generateSelector(element)
  console.log("Generated CSS selector:", selector)

  css += `${selector} {\n`

  // Get only the most relevant CSS properties
  const importantProperties = [
    "display",
    "position",
    "width",
    "height",
    "margin",
    "padding",
    "background",
    "background-color",
    "color",
    "font-family",
    "font-size",
    "border",
    "border-radius",
    "box-shadow",
    "text-align",
    "flex",
    "grid",
  ]

  importantProperties.forEach((property) => {
    const value = styles.getPropertyValue(property)
    if (value && value !== "initial" && value !== "normal" && value !== "auto") {
      css += `  ${property}: ${value};\n`
    }
  })

  css += `}\n`

  // Get JavaScript (basic template)
  let js = `// JavaScript for ${selector}\n`
  js += `const element = document.querySelector('${selector}');\n\n`
  js += `if (element) {\n`
  js += `  // Add event listeners\n`
  js += `  element.addEventListener('click', function(e) {\n`
  js += `    console.log('Element clicked:', e.target);\n`
  js += `    // Add your click handler code here\n`
  js += `  });\n\n`
  js += `  element.addEventListener('mouseover', function(e) {\n`
  js += `    // Add your mouseover handler code here\n`
  js += `  });\n`
  js += `} else {\n`
  js += `  console.log('Element not found with selector: ${selector}');\n`
  js += `}\n`

  return {
    html,
    css,
    js,
  }
}

// Generate a CSS selector for an element
function generateSelector(element) {
  if (element.id) {
    return `#${element.id}`
  }

  if (element.className && typeof element.className === "string") {
    const classes = element.className
      .split(" ")
      .filter((c) => c && !c.includes("wci-"))
      .map((c) => `.${c}`)
      .join("")
    if (classes) {
      return element.tagName.toLowerCase() + classes
    }
  }

  // Generate a more specific selector using parent elements
  let selector = element.tagName.toLowerCase()
  const parent = element.parentElement

  if (parent && parent !== document.body) {
    const parentSelector = generateSelector(parent)
    selector = `${parentSelector} > ${selector}`
  }

  return selector
}
function createCompleteHtmlFile(html, css, js) {
  // Parse the HTML to inject CSS and JS
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  // Create style element for CSS
  if (css.trim()) {
    const styleElement = doc.createElement("style")
    styleElement.textContent = css

    // Insert in head if it exists, otherwise create head
    let head = doc.querySelector("head")
    if (!head) {
      head = doc.createElement("head")
      doc.documentElement.insertBefore(head, doc.body)
    }
    head.appendChild(styleElement)
  }

  // Create script element for JS
  if (js.trim()) {
    const scriptElement = doc.createElement("script")
    scriptElement.textContent = js

    // Insert at the end of body
    if (doc.body) {
      doc.body.appendChild(scriptElement)
    }
  }

  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML
}

// Download file function
function downloadFile(content, filename, mimeType = "text/plain") {
  try {
    // Create blob
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)

    // Create temporary download link
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.style.display = "none"

    // Add to DOM, click, and remove
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    // Clean up the URL
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)

    console.log(`Downloaded: ${filename}`)
  } catch (error) {
    console.error("Download failed:", error)

    // Fallback: try using Chrome runtime message
    if (chrome && chrome.runtime) {
      chrome.runtime.sendMessage({
        action: "downloadFile",
        data: {
          content,
          fileName: filename,
        },
      })
    }
  }
}

// Get full page code
function getFullPageCode() {
  console.log("Getting full page code")

  // Get HTML
  const html = document.documentElement.outerHTML

  // Get CSS (inline styles and computed styles for major elements)
  let css = "/* Extracted CSS from the page */\n\n"

  // Get all style elements
  const styleElements = document.querySelectorAll("style")
  styleElements.forEach((style, index) => {
    css += `/* Inline Style ${index + 1} */\n`
    css += style.textContent + "\n\n"
  })

  // Get external stylesheets (limited by CORS)
  const linkElements = document.querySelectorAll('link[rel="stylesheet"]')
  linkElements.forEach((link, index) => {
    css += `/* External Stylesheet ${index + 1}: ${link.href} */\n`
    css += `/* Note: External stylesheets cannot be fully extracted due to CORS policy */\n\n`
  })

  // Get JavaScript
  let js = "/* Extracted JavaScript from the page */\n\n"

  // Get all script elements
  const scripts = document.querySelectorAll("script")
  scripts.forEach((script, index) => {
    if (!script.src && script.textContent.trim()) {
      js += `/* Inline Script ${index + 1} */\n`
      js += script.textContent + "\n\n"
    } else if (script.src) {
      js += `/* External Script ${index + 1}: ${script.src} */\n`
      js += `/* Note: External scripts cannot be extracted due to security policy */\n\n`
    }
  })

  // Create complete HTML file with embedded CSS and JS
  const completeHtml = createCompleteHtmlFile(html, css, js)

  // Download the complete HTML file automatically
  downloadFile(completeHtml, "complete-page.html", "text/html")

  // Show the modal with the code
  showModal(
    {
      html,
      css,
      js,
    },
    true,
  )
}
// Show modal with code
function showModal(code, isFullPage = false) {
  console.log("Showing modal with code")

  // Remove existing modal if any
  const existingModal = document.getElementById("wci-modal")
  if (existingModal) existingModal.remove()

  // Create modal
  modal = document.createElement("div")
  modal.id = "wci-modal"
  document.body.appendChild(modal)

  // Set modal content
  modal.innerHTML = `
    <div class="wci-modal-content">
      <div class="wci-modal-header">
        <h2>${isFullPage ? "Full Page Code" : "Component Code"}</h2>
        <button class="wci-close-btn">&times;</button>
      </div>
      <div class="wci-modal-body">
        <div class="wci-tabs">
          <button class="wci-tab-btn active" data-tab="html">HTML</button>
          <button class="wci-tab-btn" data-tab="css">CSS</button>
          <button class="wci-tab-btn" data-tab="js">JavaScript</button>
        </div>
        <div class="wci-tab-content">
          <div class="wci-tab-pane active" id="wci-html-tab">
            <pre id="htmlPreview">${escapeHTML(code.html)}</pre>
            <button class="wci-download-btn" data-type="html">Download HTML</button>
          </div>
          <div class="wci-tab-pane" id="wci-css-tab">
            <pre>${escapeHTML(code.css)}</pre>
            <button class="wci-download-btn" data-type="css">Download CSS</button>
          </div>
          <div class="wci-tab-pane" id="wci-js-tab">
            <pre>${escapeHTML(code.js)}</pre>
            <button class="wci-download-btn" data-type="js">Download JavaScript</button>
          </div>
        </div>
      </div>
    </div>
  `

  // Show modal
  modal.style.display = "block"

  // Add event listeners
  const closeBtn = modal.querySelector(".wci-close-btn")
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none"
  })

  // Tab switching
  const tabBtns = modal.querySelectorAll(".wci-tab-btn")
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Remove active class from all buttons and panes
      tabBtns.forEach((b) => b.classList.remove("active"))
      const panes = modal.querySelectorAll(".wci-tab-pane")
      panes.forEach((p) => p.classList.remove("active"))

      // Add active class to clicked button and corresponding pane
      btn.classList.add("active")
      const tabId = `wci-${btn.dataset.tab}-tab`
      const targetPane = document.getElementById(tabId)
      if (targetPane) {
        targetPane.classList.add("active")
      }
    })
  })

  const downloadBtns = modal.querySelectorAll(".wci-download-btn")
  downloadBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()

      const type = btn.dataset.type
      const content = code[type]

      if (!content) {
        console.error("No content found for type:", type)
        alert("No content available for download")
        return
      }

      const timestamp = Date.now()
      const fileName = isFullPage ? `page-${timestamp}.${type}` : `component-${timestamp}.${type}`

      // Determine MIME type
      let mimeType = "text/plain"
      if (type === "html") {
        mimeType = "text/html"
      } else if (type === "css") {
        mimeType = "text/css"
      } else if (type === "js") {
        mimeType = "application/javascript"
      }

      console.log(`Downloading ${type} file:`, fileName)

      // Use the download function
      downloadFile(content, fileName, mimeType)
    })
  })

  // Close modal when clicking outside
  const outsideClickHandler = (e) => {
    if (e.target === modal) {
      modal.style.display = "none"
      document.removeEventListener("click", outsideClickHandler)
    }
  }

  // Add the event listener after a short delay to prevent immediate closing
  setTimeout(() => {
    document.addEventListener("click", outsideClickHandler)
  }, 100)
}

// Escape HTML to prevent XSS

function escapeHTML(str) {
  console.log("Escaping HTML:", str)
  if (!str) return ""

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}


// document.getElementById('htmlPreview').textContent = escapeHTML(code.html);

// Handle download click
// document.querySelector('.wci-download-btn[data-type="html"]').addEventListener('click', () => {
//   const content = code.html; // The raw HTML code you want to save
//   const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
//   const url = URL.createObjectURL(blob);

//   const a = document.createElement('a');
//   a.href = url;
//   a.download = 'component.html';
//   document.body.appendChild(a);
//   a.click();

//   document.body.removeChild(a);
//   URL.revokeObjectURL(url);
// });