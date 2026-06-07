import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Clock, CheckCircle2, XCircle, Loader2, Eye, ArrowLeft, ArrowRight, Filter } from "lucide-react"
import { api } from "../lib/api"
import { formatDate } from "../lib/utils"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "Pending", variant: "outline", icon: <Clock className="w-4 h-4" /> },
  queued: { label: "Queued", variant: "outline", icon: <Clock className="w-4 h-4" /> },
  processing: { label: "Processing", variant: "secondary", icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  completed: { label: "Completed", variant: "default", icon: <CheckCircle2 className="w-4 h-4" /> },
  failed: { label: "Failed", variant: "destructive", icon: <XCircle className="w-4 h-4" /> },
}

export default function ProcessedImagesList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get("page")) || 1
  const status = searchParams.get("status") || ""
  const limit = 12

  const { data, isLoading, error } = useQuery({
    queryKey: ["processedImages", page, status],
    queryFn: () => api.getProcessedImages({ status: status || undefined, page, limit }),
    refetchInterval: 5000,
  })

  const totalPages = data ? Math.ceil(data.total / limit) : 0

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    if (key !== "page") params.set("page", "1")
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Process History</h1>
          <p className="text-muted-foreground">View all your face swap and restore operations</p>
        </div>
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> New Swap
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={status} onValueChange={(v) => updateFilter("status", v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground">Failed to load processes</p>
          </CardContent>
        </Card>
      ) : !data || data.items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No processes found</p>
            <Link to="/">
              <Button>Start a Face Swap</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.items.map((record) => {
              const cfg = statusConfig[record.status] || { label: record.status, variant: "outline" as const, icon: null }
              return (
                <Link key={record.id} to={`/processed/${record.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base capitalize">
                          {record.job_type === "face_swap" ? "Face Swap" : "Face Restore"} #{record.id}
                        </CardTitle>
                        <Badge variant={cfg.variant} className="flex items-center gap-1">
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                      </div>
                      <CardDescription>{formatDate(record.created_at)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 h-24">
                        {record.source_image && (
                          <img
                            src={api.getImageUrl(record.source_image)}
                            alt="Source"
                            className="w-full h-full object-cover rounded"
                          />
                        )}
                        {record.target_image && (
                          <img
                            src={api.getImageUrl(record.target_image)}
                            alt="Target"
                            className="w-full h-full object-cover rounded"
                          />
                        )}
                        {record.result_image && (
                          <img
                            src={api.getImageUrl(record.result_image)}
                            alt="Result"
                            className="w-full h-full object-cover rounded col-span-2"
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateFilter("page", String(page - 1))}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateFilter("page", String(page + 1))}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
