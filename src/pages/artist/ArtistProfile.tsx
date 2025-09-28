import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { artistAPI, lookupAPI } from '@/services/api';
import { MemberDetails, MemberDetailsForm, Title, BankName, MaritalStatus, MemberCategory, Gender } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Save, 
  Upload, 
  Eye, 
  Edit, 
  FileText, 
  Image, 
  CheckCircle, 
  Clock, 
  XCircle,
  AlertCircle
} from 'lucide-react';

const ArtistProfile: React.FC = () => {
  const [profile, setProfile] = useState<MemberDetails | null>(null);
  const [form, setForm] = useState<MemberDetailsForm>({
    firstName: '',
    surname: '',
    email: '',
    phoneNumber: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [documents, setDocuments] = useState<any>({});
  const [currentUploads, setCurrentUploads] = useState<Record<string, { file: File | null; title: string }>>({
    passportPhoto: { file: null, title: 'Passport Photo' },
    idDocument: { file: null, title: 'ID Document' },
    bankConfirmationLetter: { file: null, title: 'Bank Confirmation Letter' },
    proofOfPayment: { file: null, title: 'Proof of Payment' },
  });
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  
  // Lookup data
  const [lookups, setLookups] = useState<{
    titles: Title[];
    bankNames: BankName[];
    maritalStatuses: MaritalStatus[];
    memberCategories: MemberCategory[];
    genders: Gender[];
  }>({
    titles: [],
    bankNames: [],
    maritalStatuses: [],
    memberCategories: [],
    genders: [],
  });
  
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load lookup data
        const [titles, bankNames, maritalStatuses, memberCategories, genders] = await Promise.all([
          lookupAPI.getTitles().catch(() => []),
          lookupAPI.getBankNames().catch(() => []),
          lookupAPI.getMaritalStatuses().catch(() => []),
          lookupAPI.getMemberCategories().catch(() => []),
          lookupAPI.getGenders().catch(() => []),
        ]);
        
        setLookups({
          titles,
          bankNames,
          maritalStatuses,
          memberCategories,
          genders,
        });

        // Try to load existing profile and documents
        try {
          const profileData = await artistAPI.getDocuments();
          if (profileData.memberDetails) {
            setProfile(profileData.memberDetails);
            setForm({
              firstName: profileData.memberDetails.firstName || '',
              surname: profileData.memberDetails.surname || '',
              email: profileData.memberDetails.email || '',
              phoneNumber: profileData.memberDetails.phoneNumber || '',
              idNumber: profileData.memberDetails.idNumber,
              pseudonym: profileData.memberDetails.pseudonym || '',
              groupNameORStageName: profileData.memberDetails.groupNameORStageName || '',
              noOFDependents: profileData.memberDetails.noOFDependents,
              typeOfWork: profileData.memberDetails.typeOfWork || '',
              line1: profileData.memberDetails.line1 || '',
              line2: profileData.memberDetails.line2 || '',
              city: profileData.memberDetails.city || '',
              region: profileData.memberDetails.region || '',
              poBox: profileData.memberDetails.poBox || '',
              postalCode: profileData.memberDetails.postalCode || '',
              country: profileData.memberDetails.country || '',
              birthDate: profileData.memberDetails.birthDate || '',
              placeOfBirth: profileData.memberDetails.placeOfBirth || '',
              idOrPassportNumber: profileData.memberDetails.idOrPassportNumber || '',
              nationality: profileData.memberDetails.nationality || '',
              occupation: profileData.memberDetails.occupation || '',
              nameOfEmployer: profileData.memberDetails.nameOfEmployer || '',
              addressOfEmployer: profileData.memberDetails.addressOfEmployer || '',
              nameOfTheBand: profileData.memberDetails.nameOfTheBand || '',
              dateFounded: profileData.memberDetails.dateFounded || '',
              numberOfBand: profileData.memberDetails.numberOfBand,
              accountHolderName: profileData.memberDetails.accountHolderName || '',
              bankAccountNumber: profileData.memberDetails.bankAccountNumber || '',
              bankAccountType: profileData.memberDetails.bankAccountType || '',
              bankBranchName: profileData.memberDetails.bankBranchName || '',
              bankBranchNumber: profileData.memberDetails.bankBranchNumber || '',
              titleId: profileData.memberDetails.tittle?.id,
              maritalStatusId: profileData.memberDetails.maritalStatus?.id,
              memberCategoryId: profileData.memberDetails.memberCategory?.id,
              genderId: profileData.memberDetails.gender?.id,
              bankNameId: profileData.memberDetails.bankName?.id,
            });
            setHasProfile(true);
          }
          setDocuments(profileData);
        } catch (error) {
          // Profile doesn't exist yet, which is fine
          setHasProfile(false);
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Listen for profile status updates
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key !== 'namsa:update') return;
      try {
        const payload = JSON.parse(e.newValue || '{}');
        if (payload?.type === 'profile') {
          loadData();
          toast({ title: 'Profile Status Updated', description: 'Your profile status was updated by an admin.' });
        }
      } catch (err) {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      if (hasProfile) {
        // Update existing profile
        const updatedProfile = await artistAPI.updateProfile(form);
        setProfile(updatedProfile);
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      } else {
        // Create new profile
        const newProfile = await artistAPI.createProfile(form);
        setProfile(newProfile);
        setHasProfile(true);
        toast({
          title: "Success",
          description: "Profile created successfully",
        });
      }
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (documentType: string) => {
    const uploadData = currentUploads[documentType];
    if (!uploadData.file) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(prev => ({ ...prev, [documentType]: true }));
      
      switch (documentType) {
        case 'passportPhoto':
          await artistAPI.uploadPassportPhoto(uploadData.file, uploadData.title);
          break;
        case 'idDocument':
          await artistAPI.uploadIdDocument(uploadData.file, uploadData.title);
          break;
        case 'bankConfirmationLetter':
          await artistAPI.uploadBankConfirmationLetter(uploadData.file, uploadData.title);
          break;
        case 'proofOfPayment':
          await artistAPI.uploadProofOfPayment(uploadData.file, uploadData.title);
          break;
      }

      // Clear the upload
      setCurrentUploads(prev => ({
        ...prev,
        [documentType]: { file: null, title: uploadData.title }
      }));
      
      toast({
        title: "Upload Successful",
        description: `${uploadData.title} uploaded successfully!`,
      });
      
      // Reload documents
      const docs = await artistAPI.getDocuments();
      setDocuments(docs);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error?.response?.data?.message || `Failed to upload ${uploadData.title}`,
        variant: "destructive",
      });
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const updateUpload = (documentType: string, field: 'file' | 'title', value: any) => {
    setCurrentUploads(prev => ({
      ...prev,
      [documentType]: {
        ...prev[documentType],
        [field]: value
      }
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-namsa-success text-white"><CheckCircle className="w-3 h-3 mr-1" />APPROVED</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />REJECTED</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />PENDING</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="My Profile">
        <div className="space-y-6 animate-pulse">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-96 bg-muted rounded-lg"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Profile">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your artist profile and upload required documents
          </p>
        </div>

        {/* Profile Status */}
        {profile && (
          <Card className={`border-2 ${
            (profile.status?.statusName || (profile as any).status?.status) === 'APPROVED' 
              ? 'border-namsa-success bg-namsa-success/5' 
              : (profile.status?.statusName || (profile as any).status?.status) === 'REJECTED'
              ? 'border-namsa-error bg-namsa-error/5'
              : 'border-namsa-warning bg-namsa-warning/5'
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Profile Status</span>
                {getStatusBadge((profile.status?.statusName || (profile as any).status?.status || 'PENDING'))}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Artist ID</span>
                  <div className="text-lg font-semibold">{(profile as any).ArtistId || (profile as any).artistId || 'Pending'}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">IPI Number</span>
                  <div className="text-lg font-semibold">{(profile as any).IPI_number || (profile as any).ipiNumber || 'Pending'}</div>
                </div>
              </div>
              {(profile as any).notes && (
                <div className="mt-4">
                  <span className="text-sm text-muted-foreground">Admin Notes</span>
                  <div className="mt-1 p-3 bg-muted rounded-lg text-sm">{(profile as any).notes}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile Information
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {hasProfile ? 'Update Profile' : 'Create Profile'}
                </CardTitle>
                <CardDescription>
                  {hasProfile 
                    ? 'Update your artist profile information'
                    : 'Complete your artist profile to start uploading music'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="titleId">Title</Label>
                        <Select value={form.titleId?.toString() || ''} onValueChange={(value) => handleSelectChange('titleId', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select title" />
                          </SelectTrigger>
                          <SelectContent>
                            {lookups.titles.map((title) => (
                              <SelectItem key={title.id} value={title.id.toString()}>{title.titleName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={form.firstName}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="surname">Surname *</Label>
                        <Input
                          id="surname"
                          name="surname"
                          value={form.surname}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number *</Label>
                        <Input
                          id="phoneNumber"
                          name="phoneNumber"
                          value={form.phoneNumber}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="idNumber">ID Number</Label>
                        <Input
                          id="idNumber"
                          name="idNumber"
                          type="number"
                          value={form.idNumber || ''}
                          onChange={(e) => setForm(prev => ({ ...prev, idNumber: e.target.value ? parseInt(e.target.value) : undefined }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="pseudonym">Pseudonym</Label>
                        <Input
                          id="pseudonym"
                          name="pseudonym"
                          value={form.pseudonym || ''}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="groupNameORStageName">Group/Stage Name</Label>
                        <Input
                          id="groupNameORStageName"
                          name="groupNameORStageName"
                          value={form.groupNameORStageName || ''}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="birthDate">Birth Date</Label>
                        <Input
                          id="birthDate"
                          name="birthDate"
                          type="date"
                          value={form.birthDate || ''}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="placeOfBirth">Place of Birth</Label>
                        <Input
                          id="placeOfBirth"
                          name="placeOfBirth"
                          value={form.placeOfBirth || ''}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="nationality">Nationality</Label>
                        <Input
                          id="nationality"
                          name="nationality"
                          value={form.nationality || ''}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="occupation">Occupation</Label>
                        <Input
                          id="occupation"
                          name="occupation"
                          value={form.occupation || ''}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Address Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Address Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="line1">Address Line 1</Label>
                        <Input
                          id="line1"
                          name="line1"
                          value={form.line1 || ''}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="line2">Address Line 2</Label>
                        <Input
                          id="line2"
                          name="line2"
                          value={form.line2 || ''}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          name="city"
                          value={form.city || ''}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="region">Region</Label>
                        <Input
                          id="region"
                          name="region"
                          value={form.region || ''}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          name="country"
                          value={form.country || ''}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          name="postalCode"
                          value={form.postalCode || ''}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Banking Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Banking Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankNameId">Bank Name</Label>
                        <Select value={form.bankNameId?.toString() || ''} onValueChange={(value) => handleSelectChange('bankNameId', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {lookups.bankNames.map((bank) => (
                              <SelectItem key={bank.id} value={bank.id.toString()}>{bank.bankName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="accountHolderName">Account Holder Name</Label>
                        <Input
                          id="accountHolderName"
                          name="accountHolderName"
                          value={form.accountHolderName || ''}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
                        <Input
                          id="bankAccountNumber"
                          name="bankAccountNumber"
                          value={form.bankAccountNumber || ''}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : (hasProfile ? 'Update Profile' : 'Create Profile')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-6">
              {/* Current Documents */}
              {(documents.passportPhoto || documents.idDocument || documents.bankConfirmationLetter || documents.proofOfPayment) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-namsa-success" />
                      Uploaded Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {documents.passportPhoto && (
                      <div className="flex justify-between items-center p-4 border rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            Passport Photo
                          </p>
                          <p className="text-sm text-muted-foreground">{documents.passportPhoto.imageTitle}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => window.open(documents.passportPhoto.imageUrl, '_blank')}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Badge variant="default" className="bg-namsa-success">Uploaded</Badge>
                        </div>
                      </div>
                    )}
                    {documents.idDocument && (
                      <div className="flex justify-between items-center p-4 border rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            ID Document
                          </p>
                          <p className="text-sm text-muted-foreground">{documents.idDocument.documentTitle}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => window.open(documents.idDocument.fileUrl, '_blank')}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Badge variant="default" className="bg-namsa-success">Uploaded</Badge>
                        </div>
                      </div>
                    )}
                    {documents.bankConfirmationLetter && (
                      <div className="flex justify-between items-center p-4 border rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Bank Confirmation Letter
                          </p>
                          <p className="text-sm text-muted-foreground">{documents.bankConfirmationLetter.documentTitle}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => window.open(documents.bankConfirmationLetter.fileUrl, '_blank')}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Badge variant="default" className="bg-namsa-success">Uploaded</Badge>
                        </div>
                      </div>
                    )}
                    {documents.proofOfPayment && (
                      <div className="flex justify-between items-center p-4 border rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Proof of Payment
                          </p>
                          <p className="text-sm text-muted-foreground">{documents.proofOfPayment.documentTitle}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => window.open(documents.proofOfPayment.fileUrl, '_blank')}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Badge variant="default" className="bg-namsa-success">Uploaded</Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Upload New Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Required Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Passport Photo */}
                  <Card className="border-dashed">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Image className="h-5 w-5" />
                        Passport Photo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Document Title</Label>
                        <Input
                          value={currentUploads.passportPhoto.title}
                          onChange={(e) => updateUpload('passportPhoto', 'title', e.target.value)}
                          placeholder="Enter document title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Select Image File</Label>
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => updateUpload('passportPhoto', 'file', e.target.files?.[0] || null)} 
                        />
                      </div>
                      {currentUploads.passportPhoto.file && (
                        <div className="text-sm p-3 bg-muted rounded-lg">
                          <p className="font-medium">{currentUploads.passportPhoto.file.name}</p>
                          <p className="text-muted-foreground">Size: {(currentUploads.passportPhoto.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          type="button"
                          onClick={() => handleDocumentUpload('passportPhoto')}
                          disabled={!currentUploads.passportPhoto.file || uploading.passportPhoto}
                          className="flex-1"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading.passportPhoto ? 'Uploading...' : 'Upload Photo'}
                        </Button>
                        {documents.passportPhoto && (
                          <Button type="button" variant="outline" onClick={() => window.open(documents.passportPhoto.imageUrl, '_blank')}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Current
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* ID Document */}
                  <Card className="border-dashed">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        ID Document
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Document Title</Label>
                        <Input
                          value={currentUploads.idDocument.title}
                          onChange={(e) => updateUpload('idDocument', 'title', e.target.value)}
                          placeholder="Enter document title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Select PDF File</Label>
                        <Input 
                          type="file" 
                          accept="application/pdf" 
                          onChange={(e) => updateUpload('idDocument', 'file', e.target.files?.[0] || null)} 
                        />
                      </div>
                      {currentUploads.idDocument.file && (
                        <div className="text-sm p-3 bg-muted rounded-lg">
                          <p className="font-medium">{currentUploads.idDocument.file.name}</p>
                          <p className="text-muted-foreground">Size: {(currentUploads.idDocument.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          type="button"
                          onClick={() => handleDocumentUpload('idDocument')}
                          disabled={!currentUploads.idDocument.file || uploading.idDocument}
                          className="flex-1"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading.idDocument ? 'Uploading...' : 'Upload Document'}
                        </Button>
                        {documents.idDocument && (
                          <Button type="button" variant="outline" onClick={() => window.open(documents.idDocument.fileUrl, '_blank')}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Current
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bank Confirmation Letter */}
                  <Card className="border-dashed">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Bank Confirmation Letter
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Document Title</Label>
                        <Input
                          value={currentUploads.bankConfirmationLetter.title}
                          onChange={(e) => updateUpload('bankConfirmationLetter', 'title', e.target.value)}
                          placeholder="Enter document title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Select PDF File</Label>
                        <Input 
                          type="file" 
                          accept="application/pdf" 
                          onChange={(e) => updateUpload('bankConfirmationLetter', 'file', e.target.files?.[0] || null)} 
                        />
                      </div>
                      {currentUploads.bankConfirmationLetter.file && (
                        <div className="text-sm p-3 bg-muted rounded-lg">
                          <p className="font-medium">{currentUploads.bankConfirmationLetter.file.name}</p>
                          <p className="text-muted-foreground">Size: {(currentUploads.bankConfirmationLetter.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          type="button"
                          onClick={() => handleDocumentUpload('bankConfirmationLetter')}
                          disabled={!currentUploads.bankConfirmationLetter.file || uploading.bankConfirmationLetter}
                          className="flex-1"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading.bankConfirmationLetter ? 'Uploading...' : 'Upload Letter'}
                        </Button>
                        {documents.bankConfirmationLetter && (
                          <Button type="button" variant="outline" onClick={() => window.open(documents.bankConfirmationLetter.fileUrl, '_blank')}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Current
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Proof of Payment */}
                  <Card className="border-dashed">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Proof of Payment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Document Title</Label>
                        <Input
                          value={currentUploads.proofOfPayment.title}
                          onChange={(e) => updateUpload('proofOfPayment', 'title', e.target.value)}
                          placeholder="Enter document title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Select PDF File</Label>
                        <Input 
                          type="file" 
                          accept="application/pdf" 
                          onChange={(e) => updateUpload('proofOfPayment', 'file', e.target.files?.[0] || null)} 
                        />
                      </div>
                      {currentUploads.proofOfPayment.file && (
                        <div className="text-sm p-3 bg-muted rounded-lg">
                          <p className="font-medium">{currentUploads.proofOfPayment.file.name}</p>
                          <p className="text-muted-foreground">Size: {(currentUploads.proofOfPayment.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          type="button"
                          onClick={() => handleDocumentUpload('proofOfPayment')}
                          disabled={!currentUploads.proofOfPayment.file || uploading.proofOfPayment}
                          className="flex-1"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading.proofOfPayment ? 'Uploading...' : 'Upload Proof'}
                        </Button>
                        {documents.proofOfPayment && (
                          <Button type="button" variant="outline" onClick={() => window.open(documents.proofOfPayment.fileUrl, '_blank')}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Current
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ArtistProfile;