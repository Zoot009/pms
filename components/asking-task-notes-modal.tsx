'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, FileText, User, Clock, Edit2, Save, X } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface AskingTaskNote {
  id: string
  title: string
  notes: string
  currentStage: string
  completedAt: string | null
  updatedAt: string
  service: {
    name: string
  }
  completedUser: {
    displayName: string | null
    email: string
  } | null
  notesUpdatedUser: {
    displayName: string | null
    email: string
  } | null
}

interface AskingTaskNotesModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  orderNumber: string
}

export function AskingTaskNotesModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
}: AskingTaskNotesModalProps) {
  const [notes, setNotes] = useState<AskingTaskNote[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editedNoteText, setEditedNoteText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen && orderId) {
      fetchNotes()
    }
  }, [isOpen, orderId])

  const fetchNotes = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get(`/api/orders/${orderId}/asking-task-notes`)
      setNotes(response.data.askingTasks)
    } catch (error) {
      console.error('Error fetching asking task notes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditNote = (noteId: string, currentNotes: string) => {
    setEditingNoteId(noteId)
    setEditedNoteText(currentNotes)
  }

  const handleCancelEdit = () => {
    setEditingNoteId(null)
    setEditedNoteText('')
  }

  const handleSaveNote = async (noteId: string) => {
    try {
      setIsSaving(true)
      await axios.patch(`/api/asking-tasks/${noteId}/notes`, {
        notes: editedNoteText,
      })
      
      // Update local state
      setNotes(prevNotes =>
        prevNotes.map(note =>
          note.id === noteId
            ? { ...note, notes: editedNoteText, updatedAt: new Date().toISOString() }
            : note
        )
      )
      
      toast.success('Note updated successfully')
      setEditingNoteId(null)
      setEditedNoteText('')
    } catch (error) {
      console.error('Error updating note:', error)
      toast.error('Failed to update note')
    } finally {
      setIsSaving(false)
    }
  }

  const getStageBadge = (stage: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' }> = {
      ASKED: { variant: 'secondary' },
      SHARED: { variant: 'default' },
      VERIFIED: { variant: 'default' },
      INFORMED_TEAM: { variant: 'outline' },
    }
    const config = variants[stage] || { variant: 'outline' }
    return <Badge variant={config.variant}>{stage.replace('_', ' ')}</Badge>
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Asking Task Notes - Order #{orderNumber}
          </DialogTitle>
          <DialogDescription>
            View all notes from asking tasks for this order
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notes available for asking tasks in this order</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <Card key={note.id} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <h3 className="font-semibold text-lg">
                          {note.service.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {note.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStageBadge(note.currentStage)}
                        {editingNoteId !== note.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditNote(note.id, note.notes)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Notes Content */}
                    {editingNoteId === note.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedNoteText}
                          onChange={(e) => setEditedNoteText(e.target.value)}
                          rows={6}
                          className="resize-none"
                          placeholder="Edit notes..."
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveNote(note.id)}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm whitespace-pre-wrap">{note.notes}</p>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {note.completedUser && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>
                            Completed by: {note.completedUser.displayName || note.completedUser.email}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {note.completedAt
                            ? format(new Date(note.completedAt), 'MMM d, yyyy, hh:mm a')
                            : format(new Date(note.updatedAt), 'MMM d, yyyy, hh:mm a')
                          }
                        </span>
                      </div>
                      {note.notesUpdatedUser && (
                        <div className="flex items-center gap-1">
                          <Edit2 className="h-3 w-3" />
                          <span>
                            Last edited by: {note.notesUpdatedUser.displayName || note.notesUpdatedUser.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
