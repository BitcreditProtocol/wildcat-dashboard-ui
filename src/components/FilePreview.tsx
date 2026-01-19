import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileText, Loader2, Archive } from "lucide-react"
import { getEbillAttachment } from "@/generated/client/sdk.gen"
import { toast } from "sonner"

interface FilePreviewProps {
  billId: string
  fileUrls: string[]
}

export function FilePreview({ billId, fileUrls }: FilePreviewProps) {
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set())
  const [downloadingAll, setDownloadingAll] = useState(false)

  const extractFilename = (url: string): string => {
    // Extract the hash from the URL (last part of the path)
    const parts = url.split('/')
    return parts[parts.length - 1] || 'file'
  }

  const handleDownloadAll = async () => {
    setDownloadingAll(true)
    let successCount = 0
    let failCount = 0

    try {
      for (const fileUrl of fileUrls) {
        const filename = extractFilename(fileUrl)

        try {
          const result = await getEbillAttachment({
            path: {
              bid: billId,
              fname: filename,
            },
          })

          const response = result.data
          const blob = new Blob([response as BlobPart])
          const url = window.URL.createObjectURL(blob)

          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()

          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)

          successCount++

          // Small delay between downloads to avoid overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (error) {
          console.error(`Failed to download ${filename}:`, error)
          failCount++
        }
      }

      if (successCount > 0) {
        toast.success(`Downloaded ${successCount} file${successCount > 1 ? 's' : ''}`)
      }
      if (failCount > 0) {
        toast.error(`Failed to download ${failCount} file${failCount > 1 ? 's' : ''}`)
      }
    } finally {
      setDownloadingAll(false)
    }
  }

  const handleDownload = async (fileUrl: string) => {
    const filename = extractFilename(fileUrl)
    setDownloadingFiles(prev => new Set(prev).add(fileUrl))

    try {
      const result = await getEbillAttachment({
        path: {
          bid: billId,
          fname: filename,
        },
      })

      // The response should contain the file data
      const response = result.data

      // Create a blob from the response
      const blob = new Blob([response as BlobPart])
      const url = window.URL.createObjectURL(blob)

      // Create a temporary link and trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(`Downloaded ${filename}`)
    } catch (error) {
      console.error("Failed to download file:", error)
      toast.error(`Failed to download ${filename}`)
    } finally {
      setDownloadingFiles(prev => {
        const next = new Set(prev)
        next.delete(fileUrl)
        return next
      })
    }
  }

  if (!fileUrls || fileUrls.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Attachments ({fileUrls.length})</CardTitle>
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
                <Archive className="h-4 w-4 mr-2" />
                Download All
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* ...existing code... */}
        <div className="flex flex-col gap-2">
          {fileUrls.map((fileUrl) => {
            const isDownloading = downloadingFiles.has(fileUrl)
            const filename = extractFilename(fileUrl)

            return (
              <div
                key={fileUrl}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium truncate">{filename}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {fileUrl}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDownload(fileUrl)}
                  disabled={isDownloading}
                  className="ml-2 shrink-0"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download
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
