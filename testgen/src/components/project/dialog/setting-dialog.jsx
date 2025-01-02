"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Icon } from "@iconify/react"

export function SettingsDialog({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState("general")
    const [projectSettings, setProjectSettings] = useState({
        projectBaseUrl: "",
        testDirectoryPath: "",
        snapshotDirectoryPath: "",
        numWorkers: 1,
        headlessMode: false,
        browser: "chrome"
    })

    const handleSettingChange = (key, value) => {
        setProjectSettings(prev => ({
            ...prev,
            [key]: value
        }))
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[600px] bg-[#0A0A0B] border-[#1C1C1F] text-white">
                    <DialogHeader>
                        <DialogTitle>Settings</DialogTitle>
                        <DialogDescription className="text-[#777777]">
                            Configure your project settings and test environment.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="general" className="w-full" value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2 bg-[#1C1C1F]">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="notifications">Notifications</TabsTrigger>
                        </TabsList>

                        <TabsContent value="general" className="space-y-4">
                            <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <div className="text-sm text-[#E6E6E6]">Project base URL</div>
                                    <Input 
                                        placeholder="https://example.com" 
                                        
                                        value={projectSettings.projectBaseUrl}
                                        onChange={(e) => handleSettingChange('projectBaseUrl', e.target.value)}
                                        className="bg-[#1C1C1F] border-0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-sm text-[#E6E6E6]">Test directory path</div>
                                    <Input 
                                        placeholder="Enter a directory path for tests" 
                                        value={projectSettings.testDirectoryPath}
                                        onChange={(e) => handleSettingChange('testDirectoryPath', e.target.value)}
                                        className="bg-[#1C1C1F] border-0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-sm text-[#E6E6E6]">Snapshot directory path</div>
                                    <Input 
                                        placeholder="Enter a path" 
                                        value={projectSettings.snapshotDirectoryPath}
                                        onChange={(e) => handleSettingChange('snapshotDirectoryPath', e.target.value)}
                                        className="bg-[#1C1C1F] border-0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-sm text-[#E6E6E6]">Number of Workers</div>
                                    <Input 
                                        type="number"
                                        placeholder="Enter a number between 1 and 10"  
                                        min="1"
                                        max="10"
                                        value={projectSettings.numWorkers}
                                        onChange={(e) => handleSettingChange('numWorkers', parseInt(e.target.value))}
                                        className="bg-[#1C1C1F] border-0"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-[#E6E6E6]">Headless Mode</div>
                                    <Switch 
                                        checked={projectSettings.headlessMode}
                                        onCheckedChange={(checked) => handleSettingChange('headlessMode', checked)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-sm text-[#E6E6E6]">Select Project Browser</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button 
                                            variant={projectSettings.browser === 'chrome' ? 'default' : 'outline'}
                                            onClick={() => handleSettingChange('browser', 'chrome')}
                                            className="flex items-center gap-2"
                                        >
                                            <Icon icon={'openmoji:chrome'} height={30} width={30} />
                                            Chrome
                                        </Button>
                                        <Button 
                                            variant={projectSettings.browser === 'firefox' ? 'default' : 'outline'}
                                            onClick={() => handleSettingChange('browser', 'firefox')}
                                            className="flex items-center gap-2"
                                        >
                                            <Icon icon={'openmoji:firefox'} height={22} width={22} />
                                            Firefox
                                        </Button>
                                        <Button 
                                            variant={projectSettings.browser === 'edge' ? 'default' : 'outline'}
                                            onClick={() => handleSettingChange('browser', 'edge')}
                                            className="flex items-center gap-2"
                                        >
                                            <Icon icon={'openmoji:edge'} height={22} width={22} />
                                            Edge
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="notifications" className="space-y-4">
                            <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <div>Email Notifications</div>
                                    <div className="flex items-center space-x-2">
                                        <Input type="checkbox" className="w-4 h-4" />
                                        <span className="text-sm">Receive email notifications</span>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-between space-x-2 mt-4">
                        <Button variant="outline" onClick={onClose} className="border-[#1C1C1F] bg-[] hover:bg-[#1C1C1F]">
                            Cancel
                        </Button>
                        <Button onClick={onClose}>
                            Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )

}