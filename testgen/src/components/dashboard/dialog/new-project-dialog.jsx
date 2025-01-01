"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { apiHandler } from "@/lib/api/apiHandler"

export function NewProjectDialog({ open, onOpenChange, projectToEdit, onSuccess }) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    teamName: "",
    projectName: "",
    projectDescription: "",
    projectTag: "",
    codeLanguage: "",
    email: ""
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [progressMessage, setProgressMessage] = useState("")

  useEffect(() => {
    if (projectToEdit) {
      setFormData({
        teamName: projectToEdit.teamName || "",
        projectName: projectToEdit.name || "",
        projectDescription: projectToEdit.description || "",
        projectTag: projectToEdit.tag || "",
        codeLanguage: projectToEdit.type || "",
        email: projectToEdit.email || ""
      })
    } else {
      setFormData({
        teamName: "",
        projectName: "",
        projectDescription: "",
        projectTag: "",
        codeLanguage: "",
        email: ""
      })
    }
  }, [projectToEdit])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.projectName.trim()) {
      newErrors.projectName = "Project name is required"
    }

    if (!formData.projectDescription.trim()) {
      newErrors.projectDescription = "Project description is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setProgressMessage("")

    try {
      if (projectToEdit) {
        const response = await apiHandler.projects.edit(projectToEdit.name, formData)
        if (response.success) {
          toast({
            title: "Success",
            description: "Project updated successfully"
          })
          onOpenChange(false)
          if (onSuccess) onSuccess()
        } else {
          toast({
            title: "Error",
            description: response.error,
            variant: "destructive"
          })
        }
      } else {
        const response = await apiHandler.projects.create(formData)
        if (response.success) {
          toast({
            title: "Success",
            description: "Project created successfully"
          })
          onOpenChange(false)
          if (onSuccess) onSuccess()
        } else {
          toast({
            title: "Error",
            description: response.error,
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: `Failed to ${projectToEdit ? 'update' : 'create'} project`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setProgressMessage("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#0A0A0B] border-[#1C1C1F] p-0 max-h-[90vh] overflow-hidden flex flex-col backdrop-blur-lg">        <div className="p-3 border-b border-[#1C1C1F]">
        <Breadcrumb
          items={[
            "Organization: johnwick.alphabin@gmail.com",
            projectToEdit ? "Edit project" : "Create a new project"
          ]}
        />
      </div>

        <div className="px-6 pb-6 overflow-y-auto scrollbar-thin scrollbar-thumb-[#666666] scrollbar-track-transparent hover:scrollbar-thumb-[#777777]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white pt-6">{projectToEdit ? "Edit project" : "Create a new project"}</DialogTitle>
            <p className="text-sm text-[#777777]">
              Your project will have its own dedicated instance and full Postgres database.
              <br />
              An API will be set up so you can easily interact with your new database.
            </p>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            <div className="space-y-2">
              <label className="text-sm text-white">Team name</label>
              <Input
                placeholder="John Wick team"
                type="text"
                value={formData.teamName}
                onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                className={cn(
                  "border-[#1C1C1F] bg-[#0A0A0B] text-white placeholder:text-[#777777] h-11",
                  errors.teamName && "border-red-500"
                )}
              />
              {errors.teamName && (
                <p className="text-sm text-red-500">{errors.teamName}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white">Project Name</label>
              <Input
                placeholder="Project name"
                type="text"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                className={cn(
                  "border-[#1C1C1F] bg-[#0A0A0B] text-white placeholder:text-[#777777] h-11",
                  errors.projectName && "border-red-500"
                )}
              />
              {errors.projectName && (
                <p className="text-sm text-red-500">{errors.projectName}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white">Project Description</label>
              <Textarea
                placeholder="Your words"
                value={formData.projectDescription}
                onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                className={cn(
                  "border-[#1C1C1F] bg-[#0A0A0B] text-white placeholder:text-[#777777] min-h-[100px]",
                  errors.projectDescription && "border-red-500"
                )}
              />
              {errors.projectDescription && (
                <p className="text-sm text-red-500">{errors.projectDescription}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white">Email</label>
              <Input
                placeholder="Your email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={cn(
                  "border-[#1C1C1F] bg-[#0A0A0B] text-white placeholder:text-[#777777] h-11",
                  errors.email && "border-red-500"
                )}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white">Project tag</label>
              <Select
                value={formData.projectTag}
                defaultValue="test-case"
                onValueChange={(value) => setFormData({ ...formData, projectTag: value })}
              >
                <SelectTrigger
                  className={cn(
                    "border-[#1C1C1F] bg-[#0A0A0B] text-white h-11",
                    errors.projectTag && "border-red-500"
                  )}
                >
                  <SelectValue placeholder="Test case" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0B] border-[#1C1C1F]">
                  <SelectItem value="test-case" className="text-white focus:bg-[#1C1C1F] focus:text-white">
                    Test case
                  </SelectItem>
                  <SelectItem value="automation" className="text-white focus:bg-[#1C1C1F] focus:text-white">
                    Automation
                  </SelectItem>
                  <SelectItem value="integration" className="text-white focus:bg-[#1C1C1F] focus:text-white">
                    Integration
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.projectTag && (
                <p className="text-sm text-red-500">{errors.projectTag}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white">Code language</label>
              <Select
                value={formData.codeLanguage}
                defaultValue="playwright"
                onValueChange={(value) => setFormData({ ...formData, codeLanguage: value })}
              >
                <SelectTrigger
                  className={cn(
                    "border-[#1C1C1F] bg-[#0A0A0B] text-white h-11",
                    errors.codeLanguage && "border-red-500"
                  )}
                >
                  <SelectValue placeholder="Playwright" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0B] border-[#1C1C1F]">
                  <SelectItem value="playwright" className="text-white focus:bg-[#1C1C1F] focus:text-white">
                    <div className="flex items-center gap-2">
                      Playwright
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.codeLanguage && (
                <p className="text-sm text-red-500">{errors.codeLanguage}</p>
              )}
            </div>
          </div>

          {isLoading && progressMessage && (
            <div className="mt-4 p-4 bg-[#1C1C1F] rounded-md">
              <p className="text-sm text-[#777777]">{progressMessage}</p>
            </div>
          )}
          <div className="flex justify-end gap-4 mt-8">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#006239] text-white hover:bg-[#006239]/90"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  {projectToEdit ? "Updating..." : "Creating..."}
                </div>
              ) : (
                projectToEdit ? "Update project" : "Create project"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
