"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/ui/Header"
import { Sidebar } from "@/components/ui/Sidebar"
import { NewProjectDialog } from "@/components/dashboard/dialog/new-project-dialog"
import { NewTeamDialog } from "@/components/dashboard/dialog/new-team-dialog"
import { Drama, FlaskConical, Search } from "lucide-react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"
import { apiHandler } from "../../lib/api/apiHandler"
import { toast } from "../ui/use-toast"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function Dashboard() {
    const [newProjectOpen, setNewProjectOpen] = useState(false)
    const [newTeamOpen, setNewTeamOpen] = useState(false)
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedProject, setSelectedProject] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchProjects()
    }, [])

    const fetchProjects = async () => {
        try {
            setLoading(true)
            const response = await apiHandler.projects.fetchAll()
            if (response.success) {
                setProjects(response.data)
            } else {
                toast(response.error)
            }
        } catch (err) {
            toast('Failed to fetch projects')
        } finally {
            setLoading(false)
        }
    }

    const handleProjectDelete = async (project) => {
        setSelectedProject(project)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        try {
            const response = await apiHandler.projects.delete(selectedProject.name)
            if (response.success) {
                toast({
                    title: "Success",
                    description: "Project deleted successfully"
                })
                fetchProjects()
            } else {
                toast({
                    title: "Error",
                    description: response.error,
                    variant: "destructive"
                })
            }
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to delete project",
                variant: "destructive"
            })
        } finally {
            setDeleteDialogOpen(false)
            setSelectedProject(null)
        }
    }

    const handleProjectEdit = (project) => {
        setSelectedProject(project)
        setNewProjectOpen(true)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0B]">
                <Sidebar />
                <div className="pl-60">
                    <Header />
                    <main className="p-10">
                        <div className="flex justify-center items-center h-screen">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#006239]"></div>
                        </div>
                    </main>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0A0A0B]">
            <Sidebar />

            <div className="pl-60">
                <Header />

                <main className="p-10">
                    <div className="flex-col gap-6 flex">
                        {/* Top Section */}
                        <div className="lg:flex md:flex-row items-center gap-4 justify-between">
                            <div className="lg:flex md:content sm:content items-center gap-2">
                                <Button
                                    size="sm"
                                    className="bg-[#006239] text-white hover:bg-[#006239]/90"
                                    onClick={() => setNewProjectOpen(true)}
                                >
                                    New Team Project
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-[#1C1C1F] hover:bg-[#1C1C1F] text-[#E6E6E6]"
                                    onClick={() => setNewTeamOpen(true)}
                                >
                                    Create new team
                                </Button>
                                <div className="lg:ml-5 relative flex-1 max-w-[320px]">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ffffff]" />
                                    <Input
                                        type="search"
                                        placeholder="Search for a project"
                                        className="h-9 pl-9"
                                    />
                                </div>
                            </div>

                            <div className="text-lg font-semibold text-[#E6E6E6]">
                                johnwick.alphabin@gmail.com
                            </div>
                        </div>

                        {/* Projects Grid */}
                        {projects.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {projects.map((project) => (
                                    <Card key={project.id} className="bg-[#0A0A0B] border-[#1C1C1F] hover:bg-[#1C1C1F] transition-colors group grid">
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-10 h-10 rounded-full bg-[#1C1C1F] flex items-center justify-center">
                                                        <div className="w-8 h-8 rounded-full bg-[#006239] flex items-center justify-center">
                                                            <Drama className="w-5 h-5 text-[#66666]" />
                                                        </div>
                                                    </div>
                                                    <span className="text-sm text-[#777777]">{project.type || 'Default - Playwright'}</span>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-[#777777] opacity-0 group-hover:opacity-100"
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-32 bg-[#0A0A0B] border-[#1C1C1F]">
                                                        <DropdownMenuItem onClick={() => handleProjectEdit(project)}>
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={() => handleProjectDelete(project)}
                                                        >
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <h3 className="text-lg font-semibold text-[#E6E6E6] mt-4">
                                                {project?.name || "Untitled Project"}
                                            </h3>
                                            <p className="text-sm text-[#777777] mt-1">
                                                {project?.description || "No description"}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="p-6 pt-0">
                                            <Button
                                                variant="ghost"
                                                className="h-8 w-8 p-0 ml-auto text-[#777777]"
                                                onClick={() => window.location.href = `/project/${project.name}`}
                                            >
                                                →
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="rounded-md border border-dashed border-[#1C1C1F] bg-[#0A0A0B] mt-5 p-20 text-center">
                        <h3 className="text-lg font-semibold text-[#E6E6E6]">{projects.length > 0 ? "Add projects" : "No projects found"}</h3>
                        <p className="text-sm text-[#777777] mt-1">
                            {projects.length > 0 ? "Add more projects for your team" : "Get started by creating a new project"}
                        </p>
                        <Button
                            className="bg-[#006239] text-white hover:bg-[#006239]/90 mt-4"
                            onClick={() => setNewProjectOpen(true)}
                        >
                            New Project
                        </Button>
                    </div>
                </main>
            </div>


            <NewProjectDialog
                open={newProjectOpen}
                onOpenChange={setNewProjectOpen}
                projectToEdit={selectedProject}
                onSuccess={() => {
                    setSelectedProject(null)
                    fetchProjects()
                }}
            />
            <NewTeamDialog open={newTeamOpen} onOpenChange={setNewTeamOpen} />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the project
                            "{selectedProject?.name}" and all of its data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSelectedProject(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}