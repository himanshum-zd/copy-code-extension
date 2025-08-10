document.addEventListener("DOMContentLoaded", () => {
  const inspectButton = document.getElementById("inspectElement")
  const fullPageButton = document.getElementById("getFullPage")
  const statusElement = document.getElementById("status")

  // Handle inspect element button click
  inspectButton.addEventListener("click", async () => {
    try {
      statusElement.textContent = "Starting inspection mode..."
      statusElement.style.color = "#0070f3"

      // Get the active tab
      const [tab] = await window.chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab) {
        statusElement.textContent = "Error: No active tab found"
        statusElement.style.color = "#ff0000"
        return
      }

      // Inject content script if needed
      await window.chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      })

      // Send message to content script
      await window.chrome.tabs.sendMessage(tab.id, { action: "startInspection" })

      statusElement.textContent = "Click on any element on the page to inspect it"

      // Close popup after a short delay
      setTimeout(() => {
        window.close()
      }, 1000)
    } catch (error) {
      console.error("Error starting inspection:", error)
      statusElement.textContent = "Error: " + error.message
      statusElement.style.color = "#ff0000"
    }
  })

  // Handle get full page button click
  fullPageButton.addEventListener("click", async () => {
    try {
      statusElement.textContent = "Extracting full page code..."
      statusElement.style.color = "#0070f3"

      // Get the active tab
      const [tab] = await window.chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab) {
        statusElement.textContent = "Error: No active tab found"
        statusElement.style.color = "#ff0000"
        return
      }

      // Inject content script if needed
      await window.chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      })

      // Send message to content script
      await window.chrome.tabs.sendMessage(tab.id, { action: "getFullPage" })

      statusElement.textContent = "Full page code extracted"

      // Close popup after a short delay
      setTimeout(() => {
        window.close()
      }, 1000)
    } catch (error) {
      console.error("Error getting full page:", error)
      statusElement.textContent = "Error: " + error.message
      statusElement.style.color = "#ff0000"
    }
  })
})
