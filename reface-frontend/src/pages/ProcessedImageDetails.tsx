import { useParams, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Clock, CheckCircle2, XCircle, Loader2, Hash, Calendar, Sparkles, RotateCw } from "lucide-react"
import { api } from "../lib/api"
import { formatDate, timeTaken } from "../lib/utils"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "Pending", variant: "outline", icon: <Clock className="w-4 h-4" /> },
  queued: { label: "Queued", variant: "outline", icon: <Clock className="w-4 h-4" /> },
  processing: { label: "Processing", variant: "secondary", icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  completed: { label: "Completed", variant: "default", icon: <CheckCircle2 className="w-4 h-4" /> },
  failed: { label: "Failed", variant: "destructive", icon: <XCircle className="w-4 h-4" /> },
}

export default function ProcessedImageDetails() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ["processedImage", id],
    queryFn: () => api.getProcessedImage(Number(id)),
    enabled: !!id,
    refetchInterval: (query) => {
      const state = query.state.data
      return state && (state.status === "pending" || state.status === "queued" || state.status === "processing") ? 3000 : false
    },
  })

  const retryMutation = useMutation({
    mutationFn: () => {
      if (!data) throw new Error("No data")
      return data.job_type === "face_swap"
        ? api.retryProcess(data.id)
        : api.retryRestore(data.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processedImage", id] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 space-y-4">
        <XCircle className="w-12 h-12 text-destructive mx-auto" />
        <p className="text-muted-foreground">Process not found</p>
        <Link to="/processed"><Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
      </div>
    )
  }

  const canRetry = data.status === "completed" || data.status === "failed"
  const cfg = statusConfig[data.status] || { label: data.status, variant: "outline" as const, icon: null }
  const pastResults = data.result_images.length > 1 ? data.result_images.slice(1) : []

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to="/processed">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight capitalize">
          {data.job_type === "face_swap" ? "Face Swap" : "Face Restore"} #{data.id}
        </h1>
        <Badge variant={cfg.variant} className="flex items-center gap-1">
          {cfg.icon}
          {cfg.label}
        </Badge>
        {canRetry && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 ml-auto"
            onClick={() => retryMutation.mutate()}
            disabled={retryMutation.isPending}
          >
            <RotateCw className={`w-4 h-4 ${retryMutation.isPending ? "animate-spin" : ""}`} />
            {retryMutation.isPending ? "Retrying..." : "Retry"}
          </Button>
        )}
      </div>

      {data.status === "processing" && (
        <Card className="bg-secondary/50">
          <CardContent className="py-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p className="text-sm">Processing your image...</p>
          </CardContent>
        </Card>
      )}

      {data.status === "failed" && data.error_message && (
        <Card className="border-destructive">
          <CardContent className="py-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">{data.error_message}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {data.job_type === "face_swap" ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Source Image</label>
              <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                {data.source_image && (
                  <img src={api.getImageUrl(data.source_image)} alt="Source" className="w-full h-full object-cover" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Target Image</label>
              <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                {data.target_image && (
                  <img src={api.getImageUrl(data.target_image)} alt="Target" className="w-full h-full object-cover" />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Original Image</label>
            <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
              {data.source_image && (
                <img src={api.getImageUrl(data.source_image)} alt="Original" className="w-full h-full object-cover" />
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Result</label>
          <div className="aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
            {data.result_image ? (
              <img src={api.getImageUrl(data.result_image)} alt="Result" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-muted-foreground">
                {data.status === "completed" ? (
                  <XCircle className="w-8 h-8 mx-auto" />
                ) : (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                )}
                <p className="text-sm mt-2 capitalize">{data.status}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {pastResults.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Previous Results ({pastResults.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pastResults.map((url, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden border bg-muted">
                <img src={api.getImageUrl(url)} alt={`Previous result ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">ID:</span>
              <span className="font-mono">{data.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span>{formatDate(data.created_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Duration:</span>
              <span>{timeTaken(data.created_at, data.finished_at)}</span>
            </div>
            {data.job_type === "face_swap" && (
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Restore:</span>
                <span>{data.restore_enabled ? "Enabled" : "Disabled"}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
