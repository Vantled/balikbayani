"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, FileText, Loader2, Calculator } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useDirectHireApplications } from "@/hooks/use-direct-hire-applications"
import { convertToUSD, getUSDEquivalent, AVAILABLE_CURRENCIES, type Currency } from "@/lib/currency-converter"

interface CreateApplicationModalProps {
  onClose: () => void
}

export default function CreateApplicationModal({ onClose }: CreateApplicationModalProps) {
  const [activeTab, setActiveTab] = useState("form1")
  const [loading, setLoading] = useState(false)
  const [controlNumberPreview, setControlNumberPreview] = useState("")
  const { toast } = useToast()
  const { createApplication } = useDirectHireApplications()
  
  const [formData, setFormData] = useState({
    name: "",
    sex: "male",
    jobsite: "",
    position: "",
    salary: "",
    salaryCurrency: "USD" as Currency,
    evaluator: ""
  })

  // Generate control number preview
  const generateControlNumberPreview = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const monthDay = `${month}${day}`;
    
    // For preview, we'll use a placeholder count that will be updated by the backend
    const monthlyCountStr = "001";
    const yearlyCountStr = "001";
    
    return `DHPSW-ROIVA-${year}-${monthDay}-${monthlyCountStr}-${yearlyCountStr}`;
  };

  // Get converted USD amount for display
  const getUSDEquivalentDisplay = (): string => {
    if (!formData.salary || isNaN(parseFloat(formData.salary))) return "";
    return getUSDEquivalent(parseFloat(formData.salary), formData.salaryCurrency);
  };

  useEffect(() => {
    setControlNumberPreview(generateControlNumberPreview());
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            <h2 className="text-lg font-medium">Fill Out Form</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-blue-600">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="form1">Form 1</TabsTrigger>
              <TabsTrigger value="form2">Form 2</TabsTrigger>
            </TabsList>

            <TabsContent value="form1" className="space-y-4">
              {/* Control No - Preview */}
              <div>
                <Label className="text-sm font-medium">Control No. (Preview)</Label>
                <Input 
                  value={controlNumberPreview} 
                  disabled
                  className="mt-1 bg-gray-50 font-mono text-sm" 
                  placeholder="Generating preview..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is a preview. The actual control number will be generated upon creation.
                </p>
              </div>

              {/* Name of Worker */}
              <div>
                <Label className="text-sm font-medium">Name of Worker:</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1" 
                  placeholder="Enter worker name" 
                />
              </div>

              {/* Sex */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Sex:</Label>
                <RadioGroup 
                  value={formData.sex} 
                  onValueChange={(value) => setFormData({ ...formData, sex: value })}
                  className="flex space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">Female</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Jobsite */}
              <div>
                <Label className="text-sm font-medium">Jobsite:</Label>
                <Input 
                  value={formData.jobsite}
                  onChange={(e) => setFormData({ ...formData, jobsite: e.target.value })}
                  className="mt-1" 
                  placeholder="Enter jobsite"
                />
              </div>

              {/* Position */}
              <div>
                <Label className="text-sm font-medium">Position:</Label>
                <Input 
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="mt-1" 
                  placeholder="Enter position"
                />
              </div>

              {/* Salary with Currency */}
              <div>
                <Label className="text-sm font-medium">Salary:</Label>
                <div className="flex gap-2 mt-1">
                  <div className="flex-1">
                    <Input 
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      type="number"
                      step="0.01"
                      placeholder="Enter salary amount" 
                    />
                  </div>
                  <div className="w-32">
                    <select 
                      className="w-full border rounded px-3 py-2 text-sm"
                      value={formData.salaryCurrency} 
                      onChange={(e) => setFormData({ ...formData, salaryCurrency: e.target.value as Currency })}
                    >
                      {AVAILABLE_CURRENCIES.map((currency) => (
                        <option key={currency.value} value={currency.value}>
                          {currency.value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {formData.salary && formData.salaryCurrency !== "USD" && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded-md">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700">
                      USD Equivalent: {getUSDEquivalentDisplay()}
                    </span>
                  </div>
                )}
              </div>

              {/* Evaluator */}
              <div>
                <Label className="text-sm font-medium">Evaluator:</Label>
                <Input 
                  value={formData.evaluator}
                  onChange={(e) => setFormData({ ...formData, evaluator: e.target.value })}
                  className="mt-1" 
                  placeholder="Enter evaluator name"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  className="bg-[#1976D2] hover:bg-[#1565C0]" 
                  onClick={() => setActiveTab("form2")}
                  disabled={!formData.name || !formData.jobsite || !formData.position || !formData.salary}
                >
                  Next
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="form2" className="space-y-6">
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Document Upload</h3>
                <p className="text-gray-500 mb-6">
                  Document upload functionality will be available in the next update.
                </p>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Passport</p>
                  <p>• Visa/Work Permit</p>
                  <p>• Employment Contract</p>
                  <p>• TESDA NC/PRC License</p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={onClose}>
                  Save as Draft
                </Button>
                <Button 
                  className="bg-[#1976D2] hover:bg-[#1565C0]" 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      // Convert salary to USD for storage
                      const salaryInUSD = formData.salaryCurrency === "USD" 
                        ? parseFloat(formData.salary)
                        : convertToUSD(parseFloat(formData.salary), formData.salaryCurrency);

                      const applicationData = {
                        name: formData.name,
                        sex: formData.sex,
                        salary: salaryInUSD,
                        jobsite: formData.jobsite,
                        position: formData.position,
                        evaluator: formData.evaluator,
                        status: 'pending'
                      };

                      const result = await createApplication(applicationData);
                      if (result) {
                        onClose();
                        toast({
                          title: 'Application created successfully!',
                          description: `${formData.name} has been added to the system`,
                        });
                      }
                    } catch (error) {
                      toast({
                        title: 'Error creating application',
                        description: 'Failed to create the application. Please try again.',
                        variant: 'destructive'
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
