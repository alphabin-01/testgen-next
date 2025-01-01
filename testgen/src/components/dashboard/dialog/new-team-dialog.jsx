"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {  Lock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"


export function NewTeamDialog({ open, onOpenChange }) {
  const { toast } = useToast()
  
  const [formData, setFormData] = useState({
    teamName: "",
    email: "",
    plan: "free",
    cardNumber: "",
    expiryDate: "",
    securityCode: "",
    country: "India"
  })
  const [errors, setErrors] = useState({})

  // Reset errors when dialog closes
  useEffect(() => {
    if (!open) {
      setErrors({})
      setFormData({
        teamName: "",
        email: "",
        plan: "free",
        cardNumber: "",
        expiryDate: "",
        securityCode: "",
        country: "India"
      })
    }
  }, [open])

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.teamName.trim()) {
      newErrors.teamName = "Team name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (formData.plan !== "free") {
      if (!formData.cardNumber.trim()) {
        newErrors.cardNumber = "Card number is required"
      }
      if (!formData.expiryDate.trim()) {
        newErrors.expiryDate = "Expiry date is required"
      }
      if (!formData.securityCode.trim()) {
        newErrors.securityCode = "Security code is required"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      // Handle successful submission
      toast({
        title: "Team created successfully!",
        variant: "success",
      })
      
      setFormData({
        teamName: "",
        email: "",
        plan: "free",
        cardNumber: "",
        expiryDate: "",
        securityCode: "",
        country: "India"
      });
      
      setErrors({});
      onOpenChange(false)
    }
  }

  const handlePlanChange = (value) => {
    setFormData({ ...formData, plan: value });
    if (value !== "free") {
      toast({
        title: "Payment required",
        description: "Please enter your payment details to continue.",
        variant: "info",
      });
    }
  }

  const handleCardNumberChange = (e) => {
    const value = e.target.value;
    if (value.length > 16) {
      toast({
        title: "Invalid card number",
        description: "Card number should not exceed 16 digits.",
        variant: "warning",
      });
      return;
    }
    setFormData({ ...formData, cardNumber: value });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#0A0A0B] border-[#1C1C1F] p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-3 border-b border-[#1C1C1F]">
          <Breadcrumb 
            items={[
              "Organization: johnwick.alphabin@gmail.com",
              "Create a new team project"
            ]} 
          />
        </div>
        
        <div className="px-6 pb-6 overflow-y-auto scrollbar-thin scrollbar-thumb-[#666666] scrollbar-track-transparent hover:scrollbar-thumb-[#777777]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white pt-6">This is your team project within alphabin</DialogTitle>
            <p className="text-sm text-[#777777]">
              For example, you can use the name of your company or department.
            </p>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            <div className="space-y-2">
              <label className="text-sm text-white">Team name</label>
              <Input 
                placeholder="What would best describe your team" 
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
              <label className="text-sm text-white">Email</label>
              <Input 
                placeholder="What's the name of your company or team?" 
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
              <div className="flex items-center gap-2">
                <label className="text-sm text-white">Plan</label>
                <div className="text-[#777777] text-sm flex items-center gap-1">
                  <span>Pricing</span>
                </div>
              </div>
              <Select 
                defaultValue="free"
                value={formData.plan}
                onValueChange={handlePlanChange}
              >
                <SelectTrigger className="border-[#1C1C1F] bg-[#0A0A0B] text-white h-11">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0B] border-[#1C1C1F]">
                  <SelectItem value="free" className="text-white focus:bg-[#1C1C1F] focus:text-white">
                    Free - $0/month
                  </SelectItem>
                  <SelectItem value="pro" className="text-white focus:bg-[#1C1C1F] focus:text-white">
                    Pro - $25/month
                  </SelectItem>
                  <SelectItem value="team" className="text-white focus:bg-[#1C1C1F] focus:text-white">
                    Team - $599/month
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.plan !== "free" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#777777]" />
                  <span className="text-sm text-white">Secure, 1-click checkout with Link</span>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-white">Card number</label>
                    <Input 
                      placeholder="4242 4242 4242 4242"
                      type="text"
                      value={formData.cardNumber}
                      onChange={handleCardNumberChange}
                      className={cn(
                        "border-[#1C1C1F] bg-[#0A0A0B] text-white placeholder:text-[#777777] h-11",
                        errors.cardNumber && "border-red-500"
                      )}
                    />
                    {errors.cardNumber && (
                      <p className="text-sm text-red-500">{errors.cardNumber}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-white">Expiry date</label>
                      <Input 
                        placeholder="MM/YY"
                        type="text"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className={cn(
                          "border-[#1C1C1F] bg-[#0A0A0B] text-white placeholder:text-[#777777] h-11",
                          errors.expiryDate && "border-red-500"
                        )}
                      />
                      {errors.expiryDate && (
                        <p className="text-sm text-red-500">{errors.expiryDate}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm text-white">Security code</label>
                      <Input 
                        placeholder="CVC"
                        type="text"
                        value={formData.securityCode}
                        onChange={(e) => setFormData({ ...formData, securityCode: e.target.value })}
                        className={cn(
                          "border-[#1C1C1F] bg-[#0A0A0B] text-white placeholder:text-[#777777] h-11",
                          errors.securityCode && "border-red-500"
                        )}
                      />
                      {errors.securityCode && (
                        <p className="text-sm text-red-500">{errors.securityCode}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-white">Country</label>
                    <Select 
                      value={formData.country}
                      onValueChange={(value) => setFormData({ ...formData, country: value })}
                    >
                      <SelectTrigger className="border-[#1C1C1F] bg-[#0A0A0B] text-white h-11">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0B] border-[#1C1C1F]">
                        <SelectItem value="India" className="text-white focus:bg-[#1C1C1F] focus:text-white">
                          India
                        </SelectItem>
                        <SelectItem value="US" className="text-white focus:bg-[#1C1C1F] focus:text-white">
                          United States
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-xs text-[#777777]">
                      By providing your card information, you allow Supabase Pte Ltd to charge your card for future
                      payments in accordance with their terms.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <Button
              variant="outline"
              className="border-[#1C1C1F] hover:bg-[#1C1C1F] text-white"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#006239] text-white hover:bg-[#006239]/90"
              onClick={handleSubmit}
            >
              Create team
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
