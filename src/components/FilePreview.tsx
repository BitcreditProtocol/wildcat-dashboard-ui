import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, FileText, Loader2, Download } from "lucide-react"
import { toast } from "sonner"
import { client } from "@/lib/api-client"

export interface AttachmentItem {
  name: string
  hash?: string
  url?: string // The full file_url from the bill
}

interface FilePreviewProps {
  files: AttachmentItem[]
}

export function FilePreview({ files }: FilePreviewProps) {
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set())
  const [downloadingAll, setDownloadingAll] = useState(false)

  const openByName = async (file: AttachmentItem) => {
    try {
      if (!file.url) {
        toast.error("File URL not available")
        return false
      }

      // Use the correct decrypt endpoint with file_url query parameter
      const response = await client.get<Blob>({
        url: `/v1/admin/ebill/get_file_from_request_to_mint?file_url=${encodeURIComponent(file.url)}`,
      })

      if (!response.data) {
        console.error("No data received from attachment endpoint")
        toast.error("No data received from server")
        return false
      }

      const blob = response.data instanceof Blob ? response.data : new Blob([response.data as BlobPart])

      if (blob.size === 0) {
        console.error("Received empty blob")
        toast.error("Received empty file")
        return false
      }

      const blobUrl = window.URL.createObjectURL(blob)

      const newWindow = window.open(blobUrl, "_blank")

      if (!newWindow) {
        toast.error("Failed to open file. Please check your popup blocker settings.")
        window.URL.revokeObjectURL(blobUrl)
        return false
      }

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl)
      }, 1000)

      return true
    } catch (error) {
      console.error("Failed to open file:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      if (errorMessage.includes("resource not found") || errorMessage.includes("404")) {
        toast.error("File not found on server. The file metadata may be incomplete or the file was not properly linked to this bill.")
      } else {
        toast.error(`Failed to open file: ${errorMessage}`)
      }
      return false
    }
  }

  // Download a single file by name via decrypting endpoint
  const downloadByName = async (file: AttachmentItem) => {
    try {
      if (!file.url) {
        console.error("File URL not available")
        return false
      }

      // Use the correct decrypt endpoint with file_url query parameter
      const response = await client.get<Blob>({
        url: `/v1/admin/ebill/get_file_from_request_to_mint?file_url=${encodeURIComponent(file.url)}`,
      })

      if (!response.data) {
        console.error("No data received from attachment endpoint")
        return false
      }

      const blob = response.data instanceof Blob ? response.data : new Blob([response.data as BlobPart])

      if (blob.size === 0) {
        console.error("Received empty blob")
        return false
      }

      const blobUrl = window.URL.createObjectURL(blob)

      // Download the file
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = file.name
      document.body.appendChild(link)
      link.click()

      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)

      return true
    } catch (error) {
      console.error("Failed to download file:", error)
      return false
    }
  }

  const handleDownloadAll = async () => {
    setDownloadingAll(true)
    let successCount = 0
    let failCount = 0

    try {
      for (const f of files) {
        const ok = await downloadByName(f)
        if (ok) successCount++
        else failCount++
        // Small delay between downloads to avoid overwhelming the browser
        await new Promise((resolve) => setTimeout(resolve, 250))
      }

      if (successCount > 0) {
        toast.success(`Downloaded ${successCount} file${successCount > 1 ? "s" : ""}`)
      }
      if (failCount > 0) {
        toast.error(`Failed to download ${failCount} file${failCount > 1 ? "s" : ""}`)
      }
    } finally {
      setDownloadingAll(false)
    }
  }

  const handleDownload = async (file: AttachmentItem) => {
    const key = file.name
    setDownloadingFiles((prev) => new Set(prev).add(key))

    try {
      const ok = await openByName(file)
      if (ok) {
        toast.success(`Opened ${file.name}`)
      } else {
        toast.error(`Failed to open ${file.name}`)
      }
    } finally {
      setDownloadingFiles((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  if (!files || files.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Attachments ({files.length})
            {files.length > 0 && !files[0].hash && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                (File metadata unavailable - downloads may not work)
              </span>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleDownloadAll()}
            disabled={downloadingAll}
            className="shrink-0"
          >
            {downloadingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download All
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {files.map((file) => {
            const isDownloading = downloadingFiles.has(file.name)
            const filename = file.name

            return (
              <div
                key={filename}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium truncate">{filename}</span>
                    {file.hash && (
                      <span className="text-xs text-muted-foreground truncate">{file.hash}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDownload(file)}
                  disabled={isDownloading}
                  className="ml-2 shrink-0"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
