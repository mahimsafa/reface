import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { Upload, Image as ImageIcon, Shuffle, Sparkles, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { api } from "../lib/api"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Badge } from "../components/ui/badge"

function ImageDropzone({ label, file, onDrop }: { label: string; file: File | null; onDrop: (f: File[]) => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
  })

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-lg cursor-pointer transition-colors h-48 flex items-center justify-center ${
        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
      }`}
    >
      <input {...getInputProps()} />
      {file ? (
        <img src={URL.createObjectURL(file)} alt={label} className="w-full h-full object-cover rounded-lg" />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="w-8 h-8" />
          <span className="text-sm">{label}</span>
          <span className="text-xs">Drop or click to upload</span>
        </div>
      )}
    </div>
  )
}

function SingleImageDropzone({ label, file, onDrop }: { label: string; file: File | null; onDrop: (f: File[]) => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
  })

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-lg cursor-pointer transition-colors h-64 flex items-center justify-center ${
        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
      }`}
    >
      <input {...getInputProps()} />
      {file ? (
        <img src={URL.createObjectURL(file)} alt={label} className="w-full h-full object-cover rounded-lg" />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="w-10 h-10" />
          <span className="text-sm">{label}</span>
          <span className="text-xs">Drop or click to upload</span>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [targetFile, setTargetFile] = useState<File | null>(null)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [enableRestore, setEnableRestore] = useState(false)
  const [activeTab, setActiveTab] = useState("swap")

  const swapMutation = useMutation({
    mutationFn: async () => {
      if (!sourceFile || !targetFile) throw new Error("Please select both images")
      const formData = new FormData()
      formData.append("source_image", sourceFile)
      formData.append("target_image", targetFile)
      formData.append("restore", String(enableRestore))
      const record = await api.upload(formData)
      await api.queueProcess(record.id)
      return record
    },
    onSuccess: (record) => {
      navigate(`/processed/${record.id}`)
    },
  })

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!restoreFile) throw new Error("Please select an image")
      const formData = new FormData()
      formData.append("image", restoreFile)
      return api.uploadRestore(formData)
    },
    onSuccess: (record) => {
      navigate(`/processed/${record.id}`)
    },
  })

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Reface Studio</h1>
        <p className="text-muted-foreground">Swap faces or restore facial details with AI</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="swap" className="flex items-center gap-2">
            <Shuffle className="w-4 h-4" /> Face Swap
          </TabsTrigger>
          <TabsTrigger value="restore" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Face Restore
          </TabsTrigger>
        </TabsList>

        <TabsContent value="swap" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Face Swap</CardTitle>
              <CardDescription>
                Upload a source face and a target image. The face from the source will be swapped onto the target.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Source Face</label>
                  <ImageDropzone label="Source Image" file={sourceFile} onDrop={(f) => setSourceFile(f[0])} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Image</label>
                  <ImageDropzone label="Target Image" file={targetFile} onDrop={(f) => setTargetFile(f[0])} />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableRestore}
                  onChange={(e) => setEnableRestore(e.target.checked)}
                  className="rounded border-muted-foreground"
                />
                <span className="text-sm">Apply face restoration after swap</span>
              </label>

              <Button
                className="w-full gap-2"
                size="lg"
                disabled={!sourceFile || !targetFile || swapMutation.isPending}
                onClick={() => swapMutation.mutate()}
              >
                {swapMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <><Shuffle className="w-4 h-4" /> Swap Faces</>
                )}
              </Button>

              {swapMutation.isSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" /> Processing started
                </div>
              )}
              {swapMutation.isError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="w-4 h-4" /> {swapMutation.error.message}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="restore" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Face Restore</CardTitle>
              <CardDescription>
                Upload an image to restore and enhance facial details using AI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SingleImageDropzone label="Upload Image to Restore" file={restoreFile} onDrop={(f) => setRestoreFile(f[0])} />

              <Button
                className="w-full gap-2"
                size="lg"
                disabled={!restoreFile || restoreMutation.isPending}
                onClick={() => restoreMutation.mutate()}
              >
                {restoreMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Restoring...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Restore Face</>
                )}
              </Button>

              {restoreMutation.isSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" /> Restoration started
                </div>
              )}
              {restoreMutation.isError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="w-4 h-4" /> {restoreMutation.error.message}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
