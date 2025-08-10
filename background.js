// Declare the chrome variable
const chrome = window.chrome

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadFile") {
    const { content, fileName } = request.data

    try {
      // Create a blob with the content
      const blob = new Blob([content], { type: "text/plain" })

      // Create a URL for the blob
      const url = URL.createObjectURL(blob)

      // Download the file
      chrome.downloads.download(
        {
          url: url,
          filename: fileName,
          saveAs: false, // Changed to false for automatic download
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error("Download failed:", chrome.runtime.lastError)
          } else {
            console.log("Download started with ID:", downloadId)
          }

          // Clean up the URL
          setTimeout(() => {
            URL.revokeObjectURL(url)
          }, 1000)
        },
      )

      sendResponse({ success: true })
    } catch (error) {
      console.error("Background download error:", error)
      sendResponse({ success: false, error: error.message })
    }
  }

  return true // Keep the message channel open for async response
})
