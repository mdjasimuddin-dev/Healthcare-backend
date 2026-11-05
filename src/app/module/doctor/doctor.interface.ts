export interface IApplyAsDoctorPayload {
  user: {
    name: string;
    email: string;
  };
  doctor: {
    address?: string;
    specialization: string;
    licenseNumber: string;
    qualifications: string;
    experienceYears: number;
    bio?: string;
    consultationsFee: number;
    contactNumber?: string;
  };
}

export interface IVerifyDoctorEmailPayload {
  email: string;
  otp: string;
}
